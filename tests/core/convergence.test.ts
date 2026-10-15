import { describe, expect, it } from 'vitest';
import {
  chargeMul,
  convergenceStats,
  fireBeam,
  type BeamContext,
  type BeamTarget,
  type ConvergenceBuild,
} from '../../src/core/convergence';
import type { ConvergenceAxisId, ConvergenceBranchId } from '../../src/data/convergence';

const ZERO: Record<ConvergenceAxisId, number> = { perfuracao: 0, carga: 0, largura: 0, vida: 0, dano: 0, recarga: 0 };
const build = (
  axes: Partial<Record<ConvergenceAxisId, number>> = {},
  branch: ConvergenceBranchId | null = null,
): ConvergenceBuild => ({ axes: { ...ZERO, ...axes }, branch });

/** Alvo de 20×40 com o centro em (cx, cy). */
const tgt = (id: number, cx: number, cy = 0, kind: 'enemy' | 'boss' = 'enemy', hp = 100, maxHp = 100): BeamTarget => ({
  id,
  kind,
  box: { x: cx - 10, y: cy - 20, width: 20, height: 40 },
  hp,
  maxHp,
});

const fire = (b: ConvergenceBuild, targets: BeamTarget[], extra: Partial<BeamContext> = {}) =>
  fireBeam(convergenceStats(b), { origin: { x: 0, y: 0 }, facing: 1, hp: 100, heldMs: 2000, targets, ...extra });

const ok = (r: ReturnType<typeof fire>) => {
  if (!r.ok) throw new Error('recusou');
  return r;
};

describe('CNV-01: números base', () => {
  it('perfura 2, carga 600, largura 4, vida 6, dano 28, recarga 3500, energia 20, alcance 320', () => {
    expect(convergenceStats(build())).toMatchObject({
      level: 1,
      branch: null,
      awakened: false,
      pierce: 2,
      chargeMs: 600,
      widthPx: 4,
      hpCost: 6,
      damage: 28,
      cooldownMs: 3500,
      cost: 20,
      rangePx: 320,
      killRefundPct: 0,
    });
  });
});

describe('CNV-02: cada eixo no 3', () => {
  it.each([
    ['perfuracao', { pierce: Infinity }],
    ['carga', { chargeMs: 300 }],
    ['largura', { widthPx: 10 }],
    ['vida', { hpCost: 0 }],
    ['dano', { damage: 52 }],
    ['recarga', { cooldownMs: 2000, killRefundPct: 0.3 }],
  ] as const)('%s', (axis, expected) => {
    expect(convergenceStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });
});

describe('CNV-03: carga', () => {
  it('tocar dá 50%, metade da carga 75%, carga cheia e além 100%', () => {
    const s = convergenceStats(build());
    expect(chargeMul(s, 0)).toBe(0.5);
    expect(chargeMul(s, 300)).toBeCloseTo(0.75);
    expect(chargeMul(s, 600)).toBe(1);
    expect(chargeMul(s, 5000)).toBe(1);
    expect(chargeMul(convergenceStats(build({ carga: 3 })), 300)).toBe(1);
  });

  it('o dano do feixe segue a carga, arredondado', () => {
    const tap = ok(fire(build(), [tgt(1, 100)], { heldMs: 0 }));
    expect(tap.damage).toBe(14);
    expect(tap.fullCharge).toBe(false);
    expect(ok(fire(build(), [tgt(1, 100)], { heldMs: 100 })).damage).toBe(Math.round(28 * (0.5 + 0.5 / 6)));
    expect(ok(fire(build(), [tgt(1, 100)])).fullCharge).toBe(true);
  });
});

describe('CNV-04: custo em vida com piso', () => {
  it('vida igual ao custo recusa com a energia de volta; custo + 1 passa', () => {
    expect(fire(build(), [tgt(1, 100)], { hp: 6 })).toEqual({ ok: false, reason: 'hp', refund: 20 });
    const r = ok(fire(build(), [tgt(1, 100)], { hp: 7 }));
    expect(r.hpCost).toBe(6);
    expect(r.cost).toBe(20);
  });

  it('com o custo em vida 0, nunca recusa (nem com 1 de vida)', () => {
    expect(fire(build({ vida: 3 }), [tgt(1, 100)], { hp: 1 }).ok).toBe(true);
  });
});

describe('CNV-05: o feixe', () => {
  it('atravessa na ordem da entrada até a perfuração; o fim é o último atravessado', () => {
    const r = ok(fire(build(), [tgt(3, 200), tgt(1, 60), tgt(2, 120), tgt(4, -60)]));
    expect(r.hits).toEqual([
      { targetId: 1, damage: 28, bite: 0, killed: false, band: 'normal' },
      { targetId: 2, damage: 28, bite: 0, killed: false, band: 'normal' },
    ]);
    expect(r.end).toEqual({ x: 120, y: 0 });
  });

  it('com perfuração "todos" vai até 320 px; caixa que começa em 320 entra, em 322 não', () => {
    const r = ok(fire(build({ perfuracao: 3 }), [tgt(1, 60), tgt(2, 120), tgt(3, 200), tgt(4, 330), tgt(5, 332)]));
    expect(r.hits.map((h) => h.targetId)).toEqual([1, 2, 3, 4]);
    expect(r.end).toEqual({ x: 320, y: 0 });
  });

  it('a faixa tem a largura do eixo: caixa a 2 px acima entra, a 3 px não; com largura 10, 5 px entra', () => {
    const above = (id: number, gap: number) => ({
      ...tgt(id, 100),
      box: { x: 90, y: -gap - 40, width: 20, height: 40 },
    });
    expect(ok(fire(build(), [above(1, 2)])).hits).toHaveLength(1);
    expect(ok(fire(build(), [above(1, 3)])).hits).toHaveLength(0);
    expect(ok(fire(build({ largura: 3 }), [above(1, 5)])).hits).toHaveLength(1);
  });

  it('olhando para a esquerda, vale à esquerda', () => {
    const r = ok(fire(build(), [tgt(1, -100), tgt(2, 100)], { facing: -1 }));
    expect(r.hits.map((h) => h.targetId)).toEqual([1]);
    expect(r.end).toEqual({ x: -320, y: 0 });
  });

  it('a parede da sonda corta o feixe; parede antes do 1º alvo não atinge ninguém', () => {
    const r = ok(fire(build({ perfuracao: 3 }), [tgt(1, 60), tgt(2, 200)], { wall: () => 150 }));
    expect(r.hits.map((h) => h.targetId)).toEqual([1]);
    expect(r.end).toEqual({ x: 150, y: 0 });
    expect(ok(fire(build(), [tgt(1, 60)], { wall: () => 30 })).hits).toEqual([]);
  });

  it('sonda negativa (boca dentro da parede) não vira a faixa para trás', () => {
    const r = ok(fire(build(), [tgt(1, -30)], { wall: () => -20 }));
    expect(r.hits).toEqual([]);
    expect(r.end).toEqual({ x: 0, y: 0 });
  });

  it('entrada empatada sai pelo menor id', () => {
    const twin = { ...tgt(2, 60), box: { x: 50, y: -20, width: 30, height: 40 } };
    const r = ok(fire(build({ perfuracao: 1 }), [tgt(3, 60), twin, tgt(1, 200)]));
    expect(r.hits.map((h) => h.targetId)).toEqual([2, 3, 1]);
  });

  it('marca o abate e não atinge quem já está morto', () => {
    const r = ok(fire(build(), [tgt(1, 60, 0, 'enemy', 28), tgt(2, 90, 0, 'enemy', 0), tgt(3, 120)]));
    expect(r.hits.map((h) => [h.targetId, h.killed])).toEqual([
      [1, true],
      [3, false],
    ]);
  });
});

describe('CNV-06: Supernova', () => {
  it('o fim estoura em estilhaços micro de 50% em 48 px, nos vivos', () => {
    const r = ok(fire(build({ dano: 1 }, 'supernova'), [tgt(1, 60), tgt(2, 120), tgt(3, 170), tgt(4, 179)]));
    expect(r.shards).toEqual({
      center: { x: 120, y: 0 },
      radiusPx: 48,
      hits: [
        { targetId: 2, damage: 18, bite: 0, killed: false, band: 'micro' },
        { targetId: 3, damage: 18, bite: 0, killed: false, band: 'micro' },
      ],
    });
  });

  it('estilhaços à mesma distância saem pelo menor id', () => {
    const r = ok(fire(build({ vida: 1 }, 'supernova'), [tgt(1, 60), tgt(2, 120), tgt(5, 120, 30), tgt(4, 120, -30)]));
    expect(r.shards?.hits.map((h) => h.targetId)).toEqual([2, 4, 5]);
  });

  it('o atravessado que o feixe matou não toma estilhaço; o feixe na parede estoura na parede', () => {
    const r = ok(fire(build({ vida: 1 }, 'supernova'), [tgt(1, 60, 0, 'enemy', 10)], { wall: () => 80 }));
    expect(r.end).toEqual({ x: 80, y: 0 });
    expect(r.shards?.hits).toEqual([]);
  });

  it('sem o ramo não há estilhaço nem dobra', () => {
    const r = ok(fire(build(), [tgt(1, 60)]));
    expect(r.shards).toBeNull();
    expect(r.bends).toEqual([]);
  });
});

describe('CNV-07: Curva', () => {
  it('do fim, dobra 1 vez para o vivo mais perto ainda não atingido a até 160 px, com dano cheio', () => {
    const r = ok(
      fire(build({ largura: 1 }, 'curva'), [
        tgt(1, 60),
        tgt(2, 120),
        tgt(3, 120, 100),
        tgt(4, 120, -150),
        tgt(5, 120, 200),
      ]),
    );
    expect(r.bends).toEqual([
      {
        from: { x: 120, y: 0 },
        to: { x: 120, y: 100 },
        hit: { targetId: 3, damage: 28, bite: 0, killed: false, band: 'normal' },
      },
    ]);
  });

  it('o vivo mais perto é o alvo: quem já morreu fica de fora', () => {
    const r = ok(
      fire(build({ largura: 1 }, 'curva'), [tgt(1, 60), tgt(2, 120), tgt(3, 120, 50, 'enemy', 0), tgt(4, 120, 90)]),
    );
    expect(r.bends.map((b) => b.hit.targetId)).toEqual([4]);
  });

  it('sem ninguém atingido, dobra a partir do fim do alcance; a 161 px não dobra', () => {
    const r = ok(fire(build({ largura: 1 }, 'curva'), [tgt(1, 320, 160)]));
    expect(r.bends.map((b) => b.hit.targetId)).toEqual([1]);
    expect(ok(fire(build({ largura: 1 }, 'curva'), [tgt(1, 320, 161)])).bends).toEqual([]);
  });
});

describe('CNV-08: Supernova Carmesim (Despertar)', () => {
  const awake = build({ perfuracao: 1, dano: 3 }, 'supernova');

  it('estilhaços em 96 px, com 4% (chefe 1%) de cada atingido', () => {
    const r = ok(
      fire(awake, [tgt(1, 60), tgt(2, 120, 0, 'boss', 3000, 3000), tgt(3, 200), tgt(4, 300, 0, 'enemy', 200, 200)]),
    );
    expect(r.hits.map((h) => h.targetId)).toEqual([1, 2, 3]);
    expect(r.shards?.radiusPx).toBe(96);
    expect(r.shards?.hits).toEqual([
      { targetId: 3, damage: 26, bite: 4, killed: false, band: 'micro' },
      { targetId: 2, damage: 26, bite: 30, killed: false, band: 'micro' },
      { targetId: 4, damage: 26, bite: 8, killed: false, band: 'micro' },
    ]);
  });

  it('no Nv 4 (sem Despertar) o raio segue 48 e sem componente', () => {
    const r = ok(fire(build({ perfuracao: 3 }, 'supernova'), [tgt(1, 60)]));
    expect(r.shards?.radiusPx).toBe(48);
    expect(r.shards?.hits.every((h) => h.bite === 0)).toBe(true);
  });
});

describe('CNV-09: Sangue Perfurante (Despertar)', () => {
  it('dobra até 3 vezes, de alvo em alvo, e cada dobrado toma 4% (chefe 1%)', () => {
    const awake = build({ largura: 3, dano: 1 }, 'curva');
    const r = ok(
      fire(awake, [
        tgt(1, 60),
        tgt(2, 120),
        tgt(3, 120, 100, 'enemy', 100, 200),
        tgt(4, 120, 200, 'boss', 3000, 3000),
        tgt(5, 120, 300),
        tgt(6, 120, 400),
      ]),
    );
    expect(r.bends.map((b) => [b.hit.targetId, b.hit.damage, b.hit.bite])).toEqual([
      [3, 36, 8],
      [4, 36, 30],
      [5, 36, 4],
    ]);
    expect(r.bends[1].from).toEqual({ x: 120, y: 100 });
  });

  it('o componente conta para o abate da dobra', () => {
    const r = ok(
      fire(build({ largura: 3, dano: 1 }, 'curva'), [tgt(1, 60), tgt(2, 120), tgt(3, 120, 100, 'enemy', 40, 200)]),
    );
    expect(r.bends[0].hit).toMatchObject({ damage: 36, bite: 8, killed: true });
  });
});

describe('CNV-10: abate com Recarga no 3', () => {
  it('o feixe que mata devolve 30% da recarga; sem abate ou abaixo do teto, 0', () => {
    expect(ok(fire(build({ recarga: 3 }), [tgt(1, 60, 0, 'enemy', 20)])).refundMs).toBe(600);
    expect(ok(fire(build({ recarga: 3 }), [tgt(1, 60)])).refundMs).toBe(0);
    expect(ok(fire(build({ recarga: 2 }), [tgt(1, 60, 0, 'enemy', 20)])).refundMs).toBe(0);
  });

  it('o abate pela dobra ou pelo estilhaço também conta', () => {
    const curve = ok(fire(build({ recarga: 3 }, 'curva'), [tgt(1, 320, 100, 'enemy', 5)]));
    expect(curve.bends[0].hit.killed).toBe(true);
    expect(curve.refundMs).toBe(600);
    const nova = ok(fire(build({ recarga: 3 }, 'supernova'), [tgt(1, 60), tgt(2, 120), tgt(3, 150, 0, 'enemy', 5)]));
    expect(nova.hits.some((h) => h.killed)).toBe(false);
    expect(nova.shards?.hits.find((h) => h.targetId === 3)?.killed).toBe(true);
    expect(nova.refundMs).toBe(600);
  });
});

describe('bordas da entrada', () => {
  it('eixo acima de 3 ou ramo no Nv 1 lança RangeError', () => {
    expect(() => convergenceStats(build({ dano: 4 }))).toThrow(RangeError);
    expect(() => convergenceStats(build({}, 'curva'))).toThrow(RangeError);
  });
});
