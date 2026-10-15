import { describe, expect, it } from 'vitest';
import { ThunderFist, thunderStats, type ThunderBuild, type ThunderTarget } from '../../src/core/thunderFist';
import type { ThunderAxisId, ThunderBranchId } from '../../src/data/thunderFist';

const ZERO: Record<ThunderAxisId, number> = { cargas: 0, saltos: 0, dano: 0, atordoa: 0, eficiencia: 0, recarga: 0 };
const build = (
  axes: Partial<Record<ThunderAxisId, number>> = {},
  branch: ThunderBranchId | null = null,
): ThunderBuild => ({
  axes: { ...ZERO, ...axes },
  branch,
});

/** Alvo de 20×40 com o centro em (cx, cy). */
const tgt = (id: number, cx: number, cy = 0, kind: 'enemy' | 'boss' = 'enemy', maxHp = 100): ThunderTarget => ({
  id,
  kind,
  box: { x: cx - 10, y: cy - 20, width: 20, height: 40 },
  maxHp,
});

const charged = (b: ThunderBuild): ThunderFist => {
  const fist = new ThunderFist(thunderStats(b));
  fist.cast();
  return fist;
};
const light = (targetId: number) => ({ targetId, strength: 'light' as const });
const heavy = (targetId: number) => ({ targetId, strength: 'heavy' as const });
const ROW = [tgt(1, 0), tgt(2, 100), tgt(3, 200), tgt(4, 300)];

describe('TRV-01: números base', () => {
  it('3 cargas, 2 saltos de 120 px, dano 8, atordoa 0, custo 30, recarga 6000, janela 8000, hitstop 18', () => {
    expect(thunderStats(build())).toMatchObject({
      level: 1,
      branch: null,
      awakened: false,
      charges: 3,
      jumps: 2,
      jumpRadiusPx: 120,
      damage: 8,
      stunMs: 0,
      bossStunMs: 0,
      cost: 30,
      cooldownMs: 6000,
      windowMs: 8000,
      hopHitstopMs: 18,
      killRefundPct: 0,
    });
    expect(new ThunderFist(thunderStats(build())).cast()).toEqual({ cost: 30 });
  });
});

describe('TRV-02: cada eixo no 3', () => {
  it.each([
    ['cargas', { charges: 6 }],
    ['saltos', { jumps: 4, jumpRadiusPx: 160 }],
    ['dano', { damage: 16 }],
    ['atordoa', { stunMs: 300, bossStunMs: 75 }],
    ['eficiencia', { cost: 18 }],
    ['recarga', { cooldownMs: 3500, killRefundPct: 0.3 }],
  ] as const)('%s', (axis, expected) => {
    expect(thunderStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });

  it('o 2º ponto de Saltos ainda não aumenta o raio', () => {
    expect(thunderStats(build({ saltos: 2 }))).toMatchObject({ jumps: 4, jumpRadiusPx: 120 });
  });
});

describe('TRV-03: o raio em cadeia', () => {
  it('o golpeado toma o raio (salto 0) e o raio salta 2 vezes para o mais perto; micro de 8', () => {
    const d = charged(build()).onStrike(light(1), ROW);
    expect(d?.bolt).toEqual([
      { targetId: 1, hop: 0, from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, damage: 8, stunMs: 0, bite: 0, band: 'micro' },
      { targetId: 2, hop: 1, from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, damage: 8, stunMs: 0, bite: 0, band: 'micro' },
      {
        targetId: 3,
        hop: 2,
        from: { x: 100, y: 0 },
        to: { x: 200, y: 0 },
        damage: 8,
        stunMs: 0,
        bite: 0,
        band: 'micro',
      },
    ]);
    expect(d?.column).toBeNull();
    expect(d?.chargesLeft).toBe(2);
  });

  it('não repete alvo: sem outro vivo no raio, a cadeia para', () => {
    const d = charged(build()).onStrike(light(1), [tgt(1, 0), tgt(2, 50), tgt(3, 200)]);
    expect(d?.bolt.map((h) => h.targetId)).toEqual([1, 2]);
  });

  it('vizinho a 120 px conta, a 121 não; empate pelo menor id', () => {
    expect(charged(build()).onStrike(light(1), [tgt(1, 0), tgt(2, 120)])?.bolt).toHaveLength(2);
    expect(charged(build()).onStrike(light(1), [tgt(1, 0), tgt(2, 121)])?.bolt).toHaveLength(1);
    const tie = charged(build()).onStrike(light(1), [tgt(1, 0), tgt(5, 0, 80), tgt(3, 0, -80)]);
    expect(tie?.bolt.map((h) => h.targetId)).toEqual([1, 3]); // do 3, o 5 fica a 160 px
  });

  it('Saltos no 3: 4 saltos e raio de 160', () => {
    const far = [0, 160, 320, 480, 640, 800].map((x, i) => tgt(i + 1, x));
    expect(
      charged(build({ saltos: 3 }))
        .onStrike(light(1), far)
        ?.bolt.map((h) => h.targetId),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('Atordoa no 3: cada acerto atordoa 300 (chefe 75)', () => {
    const d = charged(build({ atordoa: 3 })).onStrike(light(1), [tgt(1, 0), tgt(2, 100, 0, 'boss', 3000)]);
    expect(d?.bolt.map((h) => h.stunMs)).toEqual([300, 75]);
  });
});

describe('TRV-04: cargas e janela', () => {
  it('cada golpe que acerta gasta 1; sem carga não solta; golpe que erra não gasta', () => {
    const fist = charged(build());
    expect(fist.onStrike(light(9), ROW)).toBeNull();
    expect(fist.charges).toBe(3);
    fist.onStrike(light(1), ROW);
    fist.onStrike(heavy(1), ROW);
    expect(fist.onStrike(light(1), ROW)?.chargesLeft).toBe(0);
    expect(fist.onStrike(light(1), ROW)).toBeNull();
  });

  it('sem conjurar não há carga; no fim da janela de 8000 ms as cargas se apagam', () => {
    expect(new ThunderFist(thunderStats(build())).onStrike(light(1), ROW)).toBeNull();
    const fist = charged(build());
    fist.update(7999);
    expect(fist.onStrike(light(1), ROW)).not.toBeNull();
    fist.update(1);
    expect(fist.windowLeftMs).toBe(0);
    expect(fist.charges).toBe(0);
    expect(fist.onStrike(light(1), ROW)).toBeNull();
  });

  it('reconjurar repõe o máximo, sem somar', () => {
    const fist = charged(build({ cargas: 1 }));
    fist.onStrike(light(1), ROW);
    expect(fist.charges).toBe(3);
    fist.cast();
    expect(fist.charges).toBe(4);
    expect(fist.windowLeftMs).toBe(8000);
  });
});

describe('TRV-05: Tempestade', () => {
  const storm = build({ cargas: 1 }, 'tempestade');

  it('o golpe forte com carga solta o raio vertical: micro de 16 em quem tem o centro a até 24 px do x', () => {
    const ts = [tgt(1, 0), tgt(2, 24, -200), tgt(3, 25, -200), tgt(4, -10, -300, 'boss', 3000)];
    const d = charged(storm).onStrike(heavy(1), ts);
    expect(d?.column).toEqual({
      x: 0,
      hits: [
        { targetId: 1, damage: 16, knockdown: false, bite: 0, band: 'micro' },
        { targetId: 4, damage: 16, knockdown: false, bite: 0, band: 'micro' },
        { targetId: 2, damage: 16, knockdown: false, bite: 0, band: 'micro' },
      ],
    });
  });

  it('golpe fraco, ou golpe forte sem o ramo, não solta o raio vertical', () => {
    expect(charged(storm).onStrike(light(1), ROW)?.column).toBeNull();
    expect(charged(build()).onStrike(heavy(1), ROW)?.column).toBeNull();
  });
});

describe('TRV-06: Estática', () => {
  it('cada acerto atordoa mais 250 ms (chefe 63); com Atordoa no 3, 550 (chefe 138)', () => {
    expect(thunderStats(build({ cargas: 1 }, 'estatica'))).toMatchObject({ stunMs: 250, bossStunMs: 63 });
    expect(thunderStats(build({ atordoa: 3 }, 'estatica'))).toMatchObject({ stunMs: 550, bossStunMs: 138 });
    const d = charged(build({ cargas: 1 }, 'estatica')).onStrike(light(1), ROW);
    expect(d?.bolt.map((h) => h.stunMs)).toEqual([250, 250, 250]);
  });
});

describe('TRV-07: Raio Celeste (Despertar da Tempestade)', () => {
  it('o raio vertical derruba os comuns e tira 4% (chefe 1%), uma vez por alvo na carga', () => {
    const fist = charged(build({ cargas: 3, saltos: 1 }, 'tempestade'));
    const ts = [tgt(1, 0, 0, 'enemy', 200), tgt(2, 10, -200, 'boss', 3000)];
    expect(fist.onStrike(heavy(1), ts)?.column?.hits).toEqual([
      { targetId: 1, damage: 16, knockdown: true, bite: 8, band: 'micro' },
      { targetId: 2, damage: 16, knockdown: false, bite: 30, band: 'micro' },
    ]);
    expect(fist.onStrike(heavy(1), ts)?.column?.hits.map((h) => h.bite)).toEqual([0, 0]);
  });

  it('no Nv 4 (sem Despertar) não derruba nem tira %', () => {
    const d = charged(build({ cargas: 3 }, 'tempestade')).onStrike(heavy(1), ROW);
    expect(d?.column?.hits).toEqual([{ targetId: 1, damage: 16, knockdown: false, bite: 0, band: 'micro' }]);
  });
});

describe('TRV-08: Descarga (Despertar da Estática)', () => {
  const awake = build({ cargas: 3, dano: 1 }, 'estatica');
  const ts = [tgt(1, 0), tgt(2, 100, 0, 'boss', 3000), tgt(3, 200), tgt(4, 300)];

  it('o raio que alcança quem esta carga ainda atordoa tira 4% (chefe 1%) e ganha 1 salto, uma vez por raio', () => {
    const fist = charged(awake);
    expect(fist.onStrike(light(1), ts)?.bolt.map((h) => [h.targetId, h.bite])).toEqual([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(fist.onStrike(light(1), ts)?.bolt.map((h) => [h.targetId, h.bite])).toEqual([
      [1, 4],
      [2, 30],
      [3, 4],
      [4, 0],
    ]);
  });

  it('depois do atordoamento acabar não descarrega; no Nv 4 (sem Despertar), nunca', () => {
    const fist = charged(awake);
    fist.onStrike(light(1), ts);
    fist.update(250);
    expect(fist.onStrike(light(1), ts)?.bolt.map((h) => h.bite)).toEqual([0, 0, 0]);
    const plain = charged(build({ cargas: 3 }, 'estatica'));
    plain.onStrike(light(1), ts);
    expect(plain.onStrike(light(1), ts)?.bolt.map((h) => h.bite)).toEqual([0, 0, 0]);
  });
});

describe('TRV-09: abate com Recarga no 3', () => {
  it('o 1º abate da carga devolve 30% (1050 ms), os seguintes 0; reconjurar abre de novo; abaixo do teto, 0', () => {
    const fist = charged(build({ recarga: 3 }));
    expect(fist.claimKillRefund()).toBe(1050);
    expect(fist.claimKillRefund()).toBe(0);
    fist.cast();
    expect(fist.claimKillRefund()).toBe(1050);
    expect(charged(build({ recarga: 2 })).claimKillRefund()).toBe(0);
  });
});

describe('bordas da entrada', () => {
  it('eixo acima de 3 ou ramo no Nv 1 lança RangeError', () => {
    expect(() => thunderStats(build({ cargas: 4 }))).toThrow(RangeError);
    expect(() => thunderStats(build({}, 'estatica'))).toThrow(RangeError);
  });
});
