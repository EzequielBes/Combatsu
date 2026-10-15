import { describe, expect, it } from 'vitest';
import { BoogieState, boogieStats, shockHits, type BoogieBuild, type SwapContext } from '../../src/core/boogie';
import type { SwapCandidate } from '../../src/core/swap';
import type { BoogieAxisId, BoogieBranchId } from '../../src/data/boogie';

const ZERO: Record<BoogieAxisId, number> = { alcance: 0, tontura: 0, cargas: 0, choque: 0, eficiencia: 0, recarga: 0 };
const build = (
  axes: Partial<Record<BoogieAxisId, number>> = {},
  branch: BoogieBranchId | null = null,
): BoogieBuild => ({
  axes: { ...ZERO, ...axes },
  branch,
});

const PLAYER = { x: -10, y: -30, width: 20, height: 60 }; // centro (0, 0)
const enemy = (id: number, x: number, y = 0): SwapCandidate => ({ id, kind: 'enemy', center: { x, y } });
const ctx = (candidates: SwapCandidate[], fits = (): boolean => true): SwapContext => ({
  player: PLAYER,
  facing: 1,
  candidates,
  fits,
});

describe('BOO-01: números base', () => {
  it('alcance 220, custo 20, recarga 2500, sinal 80, soltura 60, 1 carga, sem tontura nem choque', () => {
    const s = boogieStats(build());
    expect(s).toMatchObject({
      level: 1,
      rangePx: 220,
      cost: 20,
      chargeCooldownMs: 2500,
      signMs: 80,
      releaseMs: 60,
      maxCharges: 1,
      stunMs: 0,
      shockDamage: 0,
      branch: null,
      awakened: false,
    });
  });
});

describe('BOO-02: cada eixo no 3', () => {
  it.each([
    ['alcance', { rangePx: 320 }],
    ['tontura', { stunMs: 600 }],
    ['cargas', { maxCharges: 3, chargeCooldownMs: 2000 }],
    ['choque', { shockDamage: 20 }],
    ['eficiencia', { cost: 8 }],
    ['recarga', { chargeCooldownMs: 1200 }],
  ] as const)('%s', (axis, expected) => {
    expect(boogieStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });

  it('Cargas no 2 dá 3 cargas sem o desconto; Cargas 3 com Recarga 2 dá 1600 × 0,8 = 1280', () => {
    expect(boogieStats(build({ cargas: 2 }))).toMatchObject({ maxCharges: 3, chargeCooldownMs: 2500 });
    expect(boogieStats(build({ cargas: 3, recarga: 2 }))).toMatchObject({ chargeCooldownMs: 1280 });
  });
});

describe('BOO-03 e BOO-06: a troca', () => {
  it('troca com o mais perto à frente e o comum fica tonto pelo stat', () => {
    const b = new BoogieState(build({ tontura: 2 }));
    const r = b.swap(ctx([enemy(1, 150), enemy(2, 80)]));
    expect(r).toMatchObject({ ok: true, targetId: 2, kind: 'enemy', stunMs: 400, cost: 20, usedFollowUp: false });
    expect(b.charges).toBe(0);
  });

  it('o chefe troca mas não fica tonto', () => {
    const b = new BoogieState(build({ tontura: 3 }));
    const boss: SwapCandidate = { id: 7, kind: 'boss', center: { x: 100, y: 0 }, size: { width: 40, height: 80 } };
    expect(b.swap(ctx([boss]))).toMatchObject({ ok: true, targetId: 7, stunMs: 0 });
  });
});

describe('BOO-04 e BOO-05: recusa devolve a energia e não gasta carga', () => {
  it('destino bloqueado', () => {
    const b = new BoogieState(build());
    expect(b.swap(ctx([enemy(1, 100)], () => false))).toEqual({ ok: false, reason: 'blockedPlayer', refund: 20 });
    expect(b.charges).toBe(1);
  });

  it('sem alvo à frente', () => {
    const b = new BoogieState(build({ eficiencia: 1 }));
    expect(b.swap(ctx([enemy(1, -100)]))).toEqual({ ok: false, reason: 'noTarget', refund: 16 });
    expect(b.charges).toBe(1);
  });

  it('sem carga', () => {
    const b = new BoogieState(build());
    b.swap(ctx([enemy(1, 100)]));
    expect(b.canCast()).toBe(false);
    expect(b.swap(ctx([enemy(1, 100)]))).toEqual({ ok: false, reason: 'noCharge', refund: 20 });
  });
});

describe('BOO-07: choque nos dois pontos', () => {
  it('chip em quem está a até 40 px da saída ou da chegada, cada um uma vez', () => {
    const b = new BoogieState(build({ choque: 1 }));
    // alvo em 200: chegada em (200, 0). Vizinho 3 perto da chegada, 4 perto da saída, 5 longe dos dois.
    const r = b.swap(ctx([enemy(1, 200), enemy(3, 230), enemy(4, -30), enemy(5, -100)]));
    expect(r.ok && r.shock.map((h) => h.targetId).sort()).toEqual([1, 3, 4]);
    expect(r.ok && r.shock[0]).toEqual({ targetId: 1, damage: 8, band: 'chip' });
  });

  it('choque 0 não atinge ninguém; orbe e projétil nunca levam choque', () => {
    expect(shockHits([{ x: 0, y: 0 }], 0, 40, [enemy(1, 0)])).toEqual([]);
    const orb: SwapCandidate = { id: 2, kind: 'orb', center: { x: 0, y: 0 } };
    expect(shockHits([{ x: 0, y: 0 }], 20, 40, [orb])).toEqual([]);
  });
});

describe('BOO-08: cargas voltam uma por recarga', () => {
  it('com 3 cargas, gasta 2 e recupera uma a cada 2000 ms', () => {
    const b = new BoogieState(build({ cargas: 3 }));
    b.swap(ctx([enemy(1, 100)]));
    b.swap(ctx([enemy(1, 100)]));
    expect(b.charges).toBe(1);
    b.update(1999);
    expect(b.charges).toBe(1);
    b.update(1);
    expect(b.charges).toBe(2);
    expect(b.rechargeLeftMs).toBe(2000);
    b.update(2000);
    expect(b.charges).toBe(3);
    expect(b.rechargeLeftMs).toBe(0);
  });

  it('um passo grande enche mais de uma carga sem passar do teto', () => {
    const b = new BoogieState(build({ cargas: 2 }));
    for (let i = 0; i < 3; i++) b.swap(ctx([enemy(1, 100)]));
    expect(b.charges).toBe(0);
    b.update(100000);
    expect(b.charges).toBe(3);
  });
});

describe('BOO-09: Dupla Palma', () => {
  it('a troca que gasta carga arma a 2ª por 1000 ms, que não gasta carga', () => {
    const b = new BoogieState(build({ alcance: 1 }, 'duplaPalma'));
    expect(b.swap(ctx([enemy(1, 100)]))).toMatchObject({ ok: true, usedFollowUp: false });
    expect(b.charges).toBe(0);
    expect(b.canCast()).toBe(true);
    expect(b.swap(ctx([enemy(2, 100)]))).toMatchObject({ ok: true, usedFollowUp: true, cost: 20 });
    expect(b.followUpArmed).toBe(false);
    expect(b.swap(ctx([enemy(2, 100)]))).toMatchObject({ ok: false, reason: 'noCharge' });
  });

  it('a janela vence em 1000 ms; a 2ª recusada não desarma', () => {
    const b = new BoogieState(build({ alcance: 1 }, 'duplaPalma'));
    b.swap(ctx([enemy(1, 100)]));
    expect(b.swap(ctx([], () => true))).toMatchObject({ ok: false, reason: 'noTarget' });
    expect(b.followUpArmed).toBe(true);
    b.update(1000);
    expect(b.followUpArmed).toBe(false);
  });

  it('sem o ramo, nada de 2ª palma', () => {
    const b = new BoogieState(build({ alcance: 1 }, 'palmaFalsa'));
    b.swap(ctx([enemy(1, 100)]));
    expect(b.followUpArmed).toBe(false);
  });
});

describe('BOO-10: Palma Falsa', () => {
  const near = [
    { id: 1, kind: 'enemy' as const, center: { x: 100, y: 0 } },
    { id: 2, kind: 'enemy' as const, center: { x: -120, y: 0 } },
    { id: 3, kind: 'enemy' as const, center: { x: 121, y: 0 } },
    { id: 9, kind: 'boss' as const, center: { x: 50, y: 0 }, windingUp: true },
  ];

  it('segurar 250 ms ou mais é finta; menos é troca; sem o ramo nunca', () => {
    const b = new BoogieState(build({ alcance: 1 }, 'palmaFalsa'));
    expect(b.isFeint(249)).toBe(false);
    expect(b.isFeint(250)).toBe(true);
    expect(new BoogieState(build({ alcance: 1 }, 'duplaPalma')).isFeint(1000)).toBe(false);
  });

  it('comuns a até 120 px erram com janela de Contra de 400 ms; o chefe fica de fora sem o Despertar', () => {
    const b = new BoogieState(build({ alcance: 1 }, 'palmaFalsa'));
    const r = b.feint({ x: 0, y: 0 }, near);
    expect(r).toEqual({
      ok: true,
      misses: [
        { targetId: 1, counterWindowMs: 400 },
        { targetId: 2, counterWindowMs: 400 },
      ],
      bossCancel: null,
      cost: 20,
    });
    expect(b.charges).toBe(0);
  });

  it('sem o ramo ou sem carga, recusa com a energia de volta', () => {
    expect(new BoogieState(build()).feint({ x: 0, y: 0 }, near)).toMatchObject({ ok: false, reason: 'noBranch' });
    const b = new BoogieState(build({ alcance: 1 }, 'palmaFalsa'));
    b.feint({ x: 0, y: 0 }, near);
    expect(b.feint({ x: 0, y: 0 }, near)).toEqual({ ok: false, reason: 'noCharge', refund: 20 });
  });
});

describe('BOO-11: Finta Total (Despertar da Palma Falsa)', () => {
  const awake = (): BoogieState => new BoogieState(build({ cargas: 3, alcance: 1 }, 'palmaFalsa'));
  const boss = (windingUp: boolean) => ({ id: 9, kind: 'boss' as const, center: { x: 60, y: 0 }, windingUp });

  it('Nv 5 com o ramo desperta', () => {
    expect(awake().stats).toMatchObject({ level: 5, awakened: true });
  });

  it('cancela o chefe em preparo com 1% do HP máximo, uma vez a cada 10 s', () => {
    const b = awake();
    expect(b.feint({ x: 0, y: 0 }, [boss(true)])).toMatchObject({ bossCancel: { targetId: 9, maxHpPct: 0.01 } });
    expect(b.feint({ x: 0, y: 0 }, [boss(true)])).toMatchObject({ bossCancel: null });
    b.update(10000);
    expect(b.feint({ x: 0, y: 0 }, [boss(true)])).toMatchObject({ bossCancel: { targetId: 9 } });
  });

  it('chefe que não está preparando golpe não gasta a Finta Total', () => {
    const b = awake();
    expect(b.feint({ x: 0, y: 0 }, [boss(false)])).toMatchObject({ bossCancel: null });
    expect(b.fintaCooldownMs).toBe(0);
  });
});

describe('BOO-12: Eco da Palma (Despertar da Dupla Palma)', () => {
  const awake = (): BoogieState => new BoogieState(build({ alcance: 3, recarga: 1 }, 'duplaPalma'));

  it('1000 ms depois da 2ª troca, pede a troca de volta com 4% no comum', () => {
    const b = awake();
    b.swap(ctx([enemy(1, 100)]));
    b.swap(ctx([enemy(2, 100)]));
    expect(b.update(999)).toEqual([]);
    expect(b.update(1)).toEqual([{ type: 'echo', targetId: 2, kind: 'enemy', maxHpPct: 0.04 }]);
    expect(b.update(1000)).toEqual([]);
  });

  it('a 1ª troca não deixa eco; chefe 1%, orbe 0', () => {
    const b = awake();
    const boss: SwapCandidate = { id: 7, kind: 'boss', center: { x: 100, y: 0 } };
    b.swap(ctx([enemy(1, 100)]));
    expect(b.update(1000)).toEqual([]);
    const c = awake();
    c.swap(ctx([enemy(1, 100)]));
    c.swap(ctx([boss]));
    expect(c.update(1000)).toEqual([{ type: 'echo', targetId: 7, kind: 'boss', maxHpPct: 0.01 }]);
    const d = awake();
    d.swap(ctx([enemy(1, 100)]));
    d.swap(ctx([{ id: 4, kind: 'orb', center: { x: 50, y: 0 } }]));
    expect(d.update(1000)).toEqual([{ type: 'echo', targetId: 4, kind: 'orb', maxHpPct: 0 }]);
  });

  it('sem o Despertar (Nv 4), a 2ª troca não deixa eco', () => {
    const b = new BoogieState(build({ alcance: 3 }, 'duplaPalma'));
    b.swap(ctx([enemy(1, 100)]));
    b.swap(ctx([enemy(2, 100)]));
    expect(b.update(1000)).toEqual([]);
  });
});
