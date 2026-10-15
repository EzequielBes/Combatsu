import { describe, expect, it } from 'vitest';
import {
  erupt,
  eruptionStats,
  type EruptionBuild,
  type EruptionCast,
  type EruptionEvent,
  type EruptionTarget,
} from '../../src/core/eruption';
import type { EruptionAxisId, EruptionBranchId } from '../../src/data/eruption';

const ZERO: Record<EruptionAxisId, number> = { altura: 0, erupcoes: 0, queima: 0, dano: 0, eficiencia: 0, recarga: 0 };
const build = (
  axes: Partial<Record<EruptionAxisId, number>> = {},
  branch: EruptionBranchId | null = null,
): EruptionBuild => ({ axes: { ...ZERO, ...axes }, branch });

/** Chão em y = 100; alvo de 20×40 de pé no chão, com o centro x em `cx`. */
const FEET = { x: 0, y: 100 };
const tgt = (id: number, cx: number, kind: 'enemy' | 'boss' = 'enemy', maxHp = 100): EruptionTarget => ({
  id,
  kind,
  box: { x: cx - 10, y: 60, width: 20, height: 40 },
  maxHp,
});
/** Alvo no ar: caixa de `x0` a `x1`, de `top` a `bottom`. */
const boxed = (id: number, x0: number, x1: number, top: number, bottom: number): EruptionTarget => ({
  id,
  kind: 'enemy',
  box: { x: x0, y: top, width: x1 - x0, height: bottom - top },
  maxHp: 100,
});

const cast = (b: EruptionBuild, facing: 1 | -1 = 1) => erupt(eruptionStats(b), FEET, facing).cast;

/** Roda a conjuração em passos de 10 ms e devolve os eventos com o instante. */
function play(c: EruptionCast, targets: EruptionTarget[] | (() => EruptionTarget[]), ms: number) {
  const out: { t: number; e: EruptionEvent }[] = [];
  for (let t = 10; t <= ms; t += 10) {
    for (const e of c.update(10, typeof targets === 'function' ? targets() : targets)) out.push({ t, e });
  }
  return out;
}
const ofType = <T extends EruptionEvent['type']>(log: { t: number; e: EruptionEvent }[], type: T) =>
  log.filter((l) => l.e.type === type).map((l) => ({ t: l.t, e: l.e as Extract<EruptionEvent, { type: T }> }));

describe('ERU-01: números base', () => {
  it('altura 64, 1 erupção, queima 0, dano 24, custo 30, recarga 3500', () => {
    expect(eruptionStats(build())).toMatchObject({
      level: 1,
      branch: null,
      awakened: false,
      heightPx: 64,
      eruptions: 1,
      burnChip: 0,
      damage: 24,
      cost: 30,
      cooldownMs: 3500,
      killRefundPct: 0,
      signMs: 250,
    });
    expect(erupt(eruptionStats(build()), FEET, 1).cost).toBe(30);
  });
});

describe('ERU-02: cada eixo no 3', () => {
  it.each([
    ['altura', { heightPx: 112 }],
    ['erupcoes', { eruptions: 4 }],
    ['queima', { burnChip: 4 }],
    ['dano', { damage: 42 }],
    ['eficiencia', { cost: 18 }],
    ['recarga', { cooldownMs: 2000, killRefundPct: 0.3 }],
  ] as const)('%s', (axis, expected) => {
    expect(eruptionStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });
});

describe('ERU-03: o pilar', () => {
  it('sobe aos 250 ms, 80 px à frente, e acerta (normal) quem toca os 32 px de largura', () => {
    const log = play(cast(build()), [tgt(1, 80), tgt(2, 106), tgt(3, 107), tgt(4, -80)], 600);
    expect(log).toEqual([
      {
        t: 250,
        e: {
          type: 'pillar',
          x: 80,
          hits: [
            { targetId: 1, damage: 24, bite: 0, knockdown: false, band: 'normal' },
            { targetId: 2, damage: 24, bite: 0, knockdown: false, band: 'normal' },
          ],
        },
      },
    ]);
  });

  it('a altura do eixo decide quem está no ar: 64 px no 0, 112 no 3', () => {
    const air = [boxed(1, 70, 90, 0, 36), boxed(2, 70, 90, 0, 35), boxed(3, 70, 90, -40, -12)];
    const low = ofType(play(cast(build()), air, 300), 'pillar')[0].e.hits.map((h) => h.targetId);
    const high = ofType(play(cast(build({ altura: 3 })), air, 300), 'pillar')[0].e.hits.map((h) => h.targetId);
    expect(low).toEqual([1]);
    expect(high).toEqual([1, 2, 3]);
  });

  it('com 4 erupções, a fila anda 56 px e 120 ms por pilar; a caixa tocada por dois toma dos dois', () => {
    const wide = boxed(1, 90, 125, 60, 100);
    const pillars = ofType(play(cast(build({ erupcoes: 3 })), [wide], 700), 'pillar');
    expect(pillars.map((p) => [p.t, p.e.x, p.e.hits.length])).toEqual([
      [250, 80, 1],
      [370, 136, 1],
      [490, 192, 0],
      [610, 248, 0],
    ]);
  });

  it('olhando para a esquerda, sobe à esquerda', () => {
    expect(ofType(play(cast(build(), -1), [tgt(1, -80)], 300), 'pillar')[0].e).toMatchObject({ x: -80 });
  });
});

describe('ERU-04: queima', () => {
  it('sem o eixo não queima; com queima 2, 6 tiques chip de 2 a cada 300 ms, no máximo 2 s', () => {
    expect(ofType(play(cast(build()), [tgt(1, 80)], 2500), 'burn')).toEqual([]);
    const burns = ofType(play(cast(build({ queima: 1 })), [tgt(1, 80)], 2500), 'burn');
    expect(burns.map((b) => b.t)).toEqual([550, 850, 1150, 1450, 1750, 2050]);
    expect(burns[0].e).toEqual({ type: 'burn', targetId: 1, damage: 2, band: 'chip' });
  });

  it('o 2º pilar renova a queima sem somar', () => {
    const wide = boxed(1, 90, 125, 60, 100);
    const burns = ofType(play(cast(build({ erupcoes: 1, queima: 1 })), [wide], 2500), 'burn');
    expect(burns.map((b) => b.t)).toEqual([670, 970, 1270, 1570, 1870, 2170]);
  });

  it('os tiques contam do instante do acerto, não do quadro: um passo de 1 s solta os que venceram nele', () => {
    const c = cast(build({ queima: 1 }));
    const perStep = [1000, 1000, 1000].map((dt) => c.update(dt, [tgt(1, 80)]).filter((e) => e.type === 'burn').length);
    expect(perStep).toEqual([2, 3, 1]);
  });

  it('quem morre perde a queima; no fim, a conjuração acaba', () => {
    let alive = [tgt(1, 80)];
    const c = cast(build({ queima: 3 }));
    const log = play(c, () => alive, 600);
    alive = [];
    log.push(...play(c, () => alive, 2000));
    expect(ofType(log, 'burn')).toHaveLength(1);
    expect(c.done).toBe(true);
  });
});

describe('ERU-05: Meteoro', () => {
  it('cai 400 ms depois num raio de 56 px em volta do ponto no chão, com 1,5× o dano, e derruba o comum', () => {
    const ts = [tgt(1, 80), tgt(2, 145, 'boss', 3000), tgt(3, 147)];
    const log = play(cast(build({ altura: 1 }, 'meteoro')), ts, 900);
    expect(log).toEqual([
      {
        t: 650,
        e: {
          type: 'meteor',
          x: 80,
          hits: [
            { targetId: 1, damage: 36, bite: 0, knockdown: true, band: 'normal' },
            { targetId: 2, damage: 36, bite: 0, knockdown: false, band: 'normal' },
          ],
        },
      },
    ]);
  });
});

describe('ERU-06: Lago de Lava', () => {
  it('cada pilar deixa 64 px de lava por 3 s: chip de 3 a cada 300 ms em quem toca', () => {
    const c = cast(build({ altura: 1 }, 'lagoDeLava'));
    const log = play(c, [tgt(1, 80), tgt(2, 122), tgt(3, 123)], 1000);
    expect(c.lavaView).toEqual([{ x: 80, leftMs: 2250 }]);
    log.push(...play(c, [tgt(1, 80), tgt(2, 122), tgt(3, 123)], 3000));
    const lava = ofType(log, 'lava');
    expect(lava).toHaveLength(10);
    expect(lava[0]).toEqual({
      t: 550,
      e: {
        type: 'lava',
        x: 80,
        hits: [
          { targetId: 1, damage: 3, band: 'chip' },
          { targetId: 2, damage: 3, band: 'chip' },
        ],
      },
    });
    expect(c.lavaView).toEqual([]);
    expect(ofType(log, 'caldeira')).toEqual([]);
  });

  it('a lava é rasa (8 px): quem paira 7 px acima do chão toma, 9 px não', () => {
    const hover = (id: number, gap: number) => boxed(id, 70, 90, 60 - gap, 100 - gap);
    const lava = ofType(play(cast(build({ altura: 1 }, 'lagoDeLava')), [hover(1, 7), hover(2, 9)], 700), 'lava');
    expect(lava[0].e.hits.map((h) => h.targetId)).toEqual([1]);
  });

  it('a lava conta do instante do pilar, não do quadro', () => {
    const c = cast(build({ altura: 1 }, 'lagoDeLava'));
    const perStep = [1000, 1000, 1000, 1000].map(
      (dt) => c.update(dt, [tgt(1, 80)]).filter((e) => e.type === 'lava').length,
    );
    expect(perStep).toEqual([2, 3, 4, 1]); // tiques em 550, 850, ..., 3250
  });

  it('com queima 2, a lava ainda tira 3 (o maior dos dois)', () => {
    const lava = ofType(play(cast(build({ queima: 1 }, 'lagoDeLava')), [tgt(1, 80)], 700), 'lava');
    expect(lava[0].e.hits[0].damage).toBe(3);
  });

  it('com queima 4, a lava tira 4', () => {
    const lava = ofType(play(cast(build({ queima: 3 }, 'lagoDeLava')), [tgt(1, 80)], 700), 'lava');
    expect(lava[0].e.hits[0].damage).toBe(4);
  });
});

describe('ERU-07: Chuva de Meteoros (Despertar)', () => {
  const awake = build({ altura: 3, dano: 1 }, 'meteoro');

  it('o impacto principal tira 4% (chefe 1%); 200 ms depois, estilhaços micro de 50% a 48 px de cada lado', () => {
    const ts = [tgt(1, 80), tgt(2, 130, 'boss', 3000), tgt(3, 10)];
    const log = play(cast(awake), ts, 1000);
    expect(ofType(log, 'meteor')[0].e.hits.map((h) => [h.targetId, h.damage, h.bite])).toEqual([
      [1, 45, 4],
      [2, 45, 30],
    ]);
    expect(ofType(log, 'shard')).toEqual([
      { t: 850, e: { type: 'shard', x: 32, hits: [{ targetId: 3, damage: 15, band: 'micro' }] } },
      { t: 850, e: { type: 'shard', x: 128, hits: [{ targetId: 2, damage: 15, band: 'micro' }] } },
    ]);
  });

  it('o componente sai uma vez por alvo na conjuração, mesmo atingido por dois meteoros', () => {
    const log = play(cast(build({ altura: 3, erupcoes: 1 }, 'meteoro')), [tgt(1, 108)], 1000);
    expect(ofType(log, 'meteor').map((m) => [m.t, m.e.hits.map((h) => h.bite)])).toEqual([
      [650, [4]],
      [770, [0]],
    ]);
  });

  it('o estilhaço tem raio 24: a caixa a 24 px do ponto entra, a 25 não', () => {
    // Estilhaço da frente em x = 128 (chão em y = 100).
    const log = play(cast(awake), [boxed(1, 152, 172, 60, 100), boxed(2, 153, 173, 60, 100)], 1000);
    expect(ofType(log, 'shard')[1].e.hits.map((h) => h.targetId)).toEqual([1]);
  });

  it('no Nv 4 (sem Despertar), nem estilhaço nem componente', () => {
    const log = play(cast(build({ altura: 3 }, 'meteoro')), [tgt(1, 80)], 1000);
    expect(ofType(log, 'shard')).toEqual([]);
    expect(ofType(log, 'meteor')[0].e.hits[0].bite).toBe(0);
  });
});

describe('ERU-08: Caldeira (Despertar)', () => {
  it('quando a lava acaba, ela entra em erupção com o dano do pilar e 4% (chefe 1%)', () => {
    const c = cast(build({ altura: 3, dano: 1 }, 'lagoDeLava'));
    const log = play(c, [tgt(1, 80), tgt(2, 90, 'boss', 3000)], 3400);
    expect(ofType(log, 'pillar')[0].e.hits.every((h) => h.bite === 0)).toBe(true);
    expect(ofType(log, 'caldeira')).toEqual([
      {
        t: 3250,
        e: {
          type: 'caldeira',
          x: 80,
          hits: [
            { targetId: 1, damage: 30, bite: 4, knockdown: false, band: 'normal' },
            { targetId: 2, damage: 30, bite: 30, knockdown: false, band: 'normal' },
          ],
        },
      },
    ]);
    expect(c.done).toBe(true);
  });

  it('a Caldeira também acende a queima', () => {
    const log = play(cast(build({ altura: 3, queima: 1 }, 'lagoDeLava')), [tgt(1, 80)], 5500);
    expect(
      ofType(log, 'burn')
        .filter((b) => b.t > 3250)
        .map((b) => b.t),
    ).toEqual([3550, 3850, 4150, 4450, 4750, 5050]);
  });
});

describe('ERU-09: abate com Recarga no 3', () => {
  it('o 1º abate da conjuração devolve 30% (600 ms), os seguintes 0; abaixo do teto, 0', () => {
    const c = cast(build({ recarga: 3 }));
    expect(c.claimKillRefund()).toBe(600);
    expect(c.claimKillRefund()).toBe(0);
    expect(cast(build({ recarga: 2 })).claimKillRefund()).toBe(0);
  });
});

describe('bordas da entrada', () => {
  it('eixo acima de 3 ou ramo no Nv 1 lança RangeError', () => {
    expect(() => eruptionStats(build({ queima: 4 }))).toThrow(RangeError);
    expect(() => eruptionStats(build({}, 'meteoro'))).toThrow(RangeError);
  });
});
