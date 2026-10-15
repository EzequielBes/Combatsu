import { describe, expect, it } from 'vitest';
import { AxisBuild } from '../../src/core/axisBuild';
import { axisAt } from '../../src/core/axisRule';
import { Loadout, type TechLevel } from '../../src/core/loadout';
import { RED_BASE, resolveTechStats } from '../../src/core/techStats';
import {
  AWAKENING_NAMES,
  AXIS_NAMES,
  BODY_AWAKENINGS,
  BODY_AXES,
  BODY_AXIS_IDS,
  BODY_BRANCHES,
  BRANCH_AWAKENING,
  BRANCH_NAMES,
  EMITTER,
  ITEM_BRANCHES,
  RED_AWAKENINGS,
  RED_AXES,
  RED_AXIS_IDS,
  RED_BRANCHES,
  type RedAxisId,
} from '../../src/data/techAxes';
import { CE, TECH_GEOMETRY } from '../../src/data/techniques';
import type { AxisTable } from '../../src/data/techRule';

/** Lê a linha inteira pelo `axisAt`, como o jogo lê: 0, 1, 2 e 3 pontos. */
const row = <T>(table: AxisTable<T>): T[] => [0, 1, 2, 3].map((p) => axisAt(table, p));

describe('RED_AXES: tabela do VRM-03 linha a linha (0/1/2/3 pontos)', () => {
  it.each([
    ['potencia.touch', RED_AXES.potencia.touch, [30, 35, 40, 45]],
    ['potencia.detonation', RED_AXES.potencia.detonation, [25, 29, 33, 37]],
    ['potencia.force', RED_AXES.potencia.force, [8, 9, 10, 11]],
    ['escala.radius', RED_AXES.escala.radius, [96, 120, 144, 168]],
    ['escala.orbTexels', RED_AXES.escala.orbTexels, [12, 14, 16, 18]],
    ['escala.sensorPx', RED_AXES.escala.sensorPx, [6, 7, 8, 9]],
    ['conjuracao.signMs', RED_AXES.conjuracao.signMs, [250, 200, 165, 125]],
    ['conjuracao.chargeMs', RED_AXES.conjuracao.chargeMs, [350, 280, 225, 175]],
    ['eficiencia.cost', RED_AXES.eficiencia.cost, [30, 26, 22, 18]],
    ['recarga.cooldownMs', RED_AXES.recarga.cooldownMs, [4500, 3600, 2900, 2300]],
    ['perfuracao.shard', RED_AXES.perfuracao.shard, [0, 6, 9, 12]],
    ['perfuracao.shardNeighbors', RED_AXES.perfuracao.shardNeighbors, [0, 1, 2, 2]],
  ] as const)('%s', (_name, table, expected) => {
    expect(row(table)).toEqual(expected);
  });

  it('a 4ª posição não existe: 4 pontos num eixo lança (o teto é o TECH_RULE.axisCap)', () => {
    expect(() => axisAt(RED_AXES.potencia.touch, 4)).toThrow(RangeError);
  });

  it('extras: +1 anel e +10 ms de hitstop por ponto de Potência (VRM-04.6), pós-imagem na Conjuração 3, estilhaço a 60 px', () => {
    expect(RED_AXES.potencia.ringsPerPoint).toBe(1);
    expect(RED_AXES.potencia.hitstopPerPointMs).toBe(10);
    expect(RED_AXES.conjuracao.afterimageAt).toBe(3);
    expect(RED_AXES.perfuracao.shardReachPx).toBe(60);
  });

  it('a base (0 pontos) bate com a geometria de hoje do orbe: raio 96, orbe 12, sensor 6, força 8', () => {
    const g = TECH_GEOMETRY.vermelho;
    expect([g.radius, g.orbTexels, g.sensorPx, g.force]).toEqual([
      RED_AXES.escala.radius[0],
      RED_AXES.escala.orbTexels[0],
      RED_AXES.escala.sensorPx[0],
      RED_AXES.potencia.force[0],
    ]);
  });

  it('repulsão round(4 × toque / 30) dá 4/5/5/6 de 0 a 3 pontos de Potência (VRM-04.7)', () => {
    const base = TECH_GEOMETRY.vermelho.repulse.damage;
    const touch0 = RED_AXES.potencia.touch[0];
    const repulse = row(RED_AXES.potencia.touch).map((touch) => Math.round((base * touch) / touch0));
    expect(repulse).toEqual([4, 5, 5, 6]);
  });
});

describe('BODY_AXES: números do CRP-02 a CRP-07 (0/1/2/3 pontos)', () => {
  it('Impacto ×1/1,1/1,2/1,3 (CRP-02) e Peso ×1/1,2/1,4/1,6, derruba no 2 e atordoa na parede no 3 (CRP-03, VRM-16)', () => {
    expect(row(BODY_AXES.impacto.impactMul)).toEqual([1, 1.1, 1.2, 1.3]);
    expect(row(BODY_AXES.peso.forceMul)).toEqual([1, 1.2, 1.4, 1.6]);
    expect(BODY_AXES.peso.knockdownFrom).toBe(2);
    expect(BODY_AXES.peso.wallStunAt).toBe(3);
  });

  it('Ritmo ×1/0,92/0,85/0,78 com pós-imagem no 3 (CRP-04) e Alcance +0/6/10/14 px (CRP-05)', () => {
    expect(row(BODY_AXES.ritmo.recoveryMul)).toEqual([1, 0.92, 0.85, 0.78]);
    expect(BODY_AXES.ritmo.afterimageAt).toBe(3);
    expect(row(BODY_AXES.alcance.reachPx)).toEqual([0, 6, 10, 14]);
  });

  it('Fluxo: energia por acerto 3/4/5/6 = CE.meleeGain + pontos (CRP-06)', () => {
    expect(row(BODY_AXES.fluxo.energyBonus).map((b) => CE.meleeGain + b)).toEqual([3, 4, 5, 6]);
  });

  it('Fúria: 3/4/5 % por acúmulo até 15/24/35 % (CRP-07)', () => {
    expect(row(BODY_AXES.furia.furyStep)).toEqual([0, 0.03, 0.04, 0.05]);
    expect(row(BODY_AXES.furia.furyCap)).toEqual([0, 0.15, 0.24, 0.35]);
  });
});

describe('ramos, Despertares e o emissor (VRM-12 a VRM-15, CRP-09 a CRP-12)', () => {
  it('Vermelho: Ricochete 200 px, 1 rebote, 70 %; Contido 1200 ms e raio ×1,4', () => {
    expect(RED_BRANCHES.ricochete).toEqual({ reboundRangePx: 200, rebounds: 1, afterFirstMul: 0.7 });
    expect(RED_BRANCHES.contido).toEqual({ holdMs: 1200, radiusMul: 1.4 });
  });

  it('Vermelho: Fliperama 3 rebotes, +15 %, proporcional na 3ª; Máximo campo 1200/200 ms, chip 3, 150 px/s, parede 600 ms', () => {
    expect(RED_AWAKENINGS.fliperama).toEqual({ rebounds: 3, speedStep: 0.15, pctAt: 3 });
    expect(RED_AWAKENINGS.vermelhoMaximo).toEqual({
      fieldMs: 1200,
      fieldTickMs: 200,
      fieldChip: 3,
      pushSpeed: 150,
      wallStunMs: 600,
    });
  });

  it('Corpo: Cadência a cada 4 com +50 %; Onda 80 px a 600 px/s com 40 %; Martelo 48 px; Punho que Rasga 160 px e 100 ms', () => {
    expect(BODY_BRANCHES.cadencia).toEqual({ every: 4, damageMul: 1.5 });
    expect(BODY_BRANCHES.ondaDoPunho).toEqual({ rangePx: 80, speed: 600, damageFrac: 0.4 });
    expect(BODY_AWAKENINGS.marteloNegro).toEqual({ areaPx: 48 });
    expect(BODY_AWAKENINGS.punhoQueRasga).toEqual({ rangePx: 160, secondWaveMs: 100 });
    expect(EMITTER).toEqual({ maxPerWindow: 4, windowMs: 1000 });
  });

  it('cada item tem os ramos a/b e cada ramo abre o seu Despertar', () => {
    expect(ITEM_BRANCHES).toEqual({ vermelho: ['ricochete', 'contido'], corpo: ['cadencia', 'ondaDoPunho'] });
    expect(BRANCH_AWAKENING).toEqual({
      ricochete: 'fliperama',
      contido: 'vermelhoMaximo',
      cadencia: 'marteloNegro',
      ondaDoPunho: 'punhoQueRasga',
    });
  });

  it('todo eixo, ramo e Despertar tem nome, e a ordem do desempate é a da spec', () => {
    expect(RED_AXIS_IDS).toEqual(['potencia', 'escala', 'conjuracao', 'eficiencia', 'recarga', 'perfuracao']);
    expect(BODY_AXIS_IDS).toEqual(['impacto', 'peso', 'ritmo', 'alcance', 'fluxo', 'furia']);
    for (const id of [...RED_AXIS_IDS, ...BODY_AXIS_IDS]) expect(AXIS_NAMES[id]).toMatch(/\S/);
    expect(Object.values(BRANCH_NAMES)).toEqual(['Ricochete', 'Contido', 'Cadência', 'Onda do Punho']);
    expect(Object.values(AWAKENING_NAMES)).toEqual([
      'Fliperama',
      'Vermelho Máximo',
      'Martelo Negro',
      'Punho que Rasga',
    ]);
  });
});

/**
 * Modelo da tabela de Assumptions da spec (ESC-03.9): dano sustentado = dano por conjuração ÷ período, com período =
 * max(recarga + sinal + carga, custo ÷ regen) e alvos na detonação = 2 × raio / 96 (inimigos em fila no chão); 1 comum
 * atravessado com os vizinhos do estilhaço à mão.
 */
function sustained(points: Partial<Record<RedAxisId, number>>): number {
  const p = (axis: RedAxisId): number => points[axis] ?? 0;
  const touch = axisAt(RED_AXES.potencia.touch, p('potencia'));
  const detonation = axisAt(RED_AXES.potencia.detonation, p('potencia'));
  const targets = (2 * axisAt(RED_AXES.escala.radius, p('escala'))) / RED_AXES.escala.radius[0];
  const shards =
    axisAt(RED_AXES.perfuracao.shard, p('perfuracao')) * axisAt(RED_AXES.perfuracao.shardNeighbors, p('perfuracao'));
  const castMs =
    axisAt(RED_AXES.recarga.cooldownMs, p('recarga')) +
    axisAt(RED_AXES.conjuracao.signMs, p('conjuracao')) +
    axisAt(RED_AXES.conjuracao.chargeMs, p('conjuracao'));
  const energyMs = (axisAt(RED_AXES.eficiencia.cost, p('eficiencia')) / CE.regen) * 1000;
  return (touch + detonation * targets + shards) / Math.max(castMs, energyMs);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length / 2;
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[Math.floor(mid)];
}

describe('eixo dominante do Vermelho (ESC-03.9)', () => {
  const atCap = RED_AXIS_IDS.map((axis) => sustained({ [axis]: 3 }));

  it('nenhum eixo no 3 passa de 1,35 × o dano sustentado do eixo mediano (os números do plano dão ~1,12×)', () => {
    const mid = median(atCap);
    for (const value of atCap) expect(value).toBeLessThanOrEqual(1.35 * mid);
    expect(Math.max(...atCap) / mid).toBeCloseTo(1.12, 2);
  });

  it('todo eixo no 3 sobe o dano sustentado da base, menos a Eficiência sozinha (o Vermelho vive preso à recarga)', () => {
    const base = sustained({});
    for (const [i, axis] of RED_AXIS_IDS.entries()) {
      if (axis === 'eficiencia') expect(atCap[i]).toBe(base);
      else expect(atCap[i]).toBeGreaterThan(base);
    }
  });

  it('Eficiência 2 em cima da Recarga 3 sobe o dano sustentado da Recarga 3 sozinha (o eixo não está morto)', () => {
    expect(sustained({ recarga: 3, eficiencia: 2 })).toBeGreaterThan(sustained({ recarga: 3 }));
  });
});

/** `AxisBuild` com `n` pontos em cada eixo pedido, comprados pelo `add` (como a loja compra). */
function buildWith(points: Partial<Record<RedAxisId, number>>): AxisBuild {
  const axes = new AxisBuild();
  for (const [axis, n] of Object.entries(points) as [RedAxisId, number][]) {
    for (let i = 0; i < n; i++) expect(axes.add('vermelho', axis).ok).toBe(true);
  }
  return axes;
}

const MUL = 1.35;
const VOW = 1.2;
const red = (axes: AxisBuild, level: TechLevel = 1, damageMul = 1, vowDamageMul = 1, costMul = 1) =>
  resolveTechStats({ id: 'vermelho', level, axes, damageMul, vowDamageMul, costMul });

describe('VRM-01: o Vermelho sem ponto de eixo', () => {
  it('custa 30, recarrega em 4500 ms e voa 320 px; o resto fica como hoje', () => {
    const s = red(new AxisBuild());
    expect([s.level, s.cost, s.cooldownMs, s.signMs, s.chargeMs, s.releaseMs, s.recoverMs]).toEqual([
      1, 30, 4500, 250, 350, 100, 250,
    ]);
    expect(s.damage).toEqual({ hit: 30, detonation: 25 });
    expect(s.red).toEqual({
      ...TECH_GEOMETRY.vermelho,
      rangePx: 320,
      speed: 760,
      radius: 96,
      orbTexels: 12,
      sensorPx: 6,
      force: 8,
      rings: 1,
      repulseDamage: 4,
      shard: 0,
      shardNeighbors: 0,
      hitstopBonusMs: 0,
      afterimage: false,
      killRefundPct: 0,
      branch: null,
      awakened: false,
    });
  });

  it('sem `axes` na entrada resolve igual a um AxisBuild vazio (o RED_BASE)', () => {
    const bare = resolveTechStats({ id: 'vermelho', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    expect(bare).toEqual(red(new AxisBuild()));
    expect(bare.red).toEqual(RED_BASE);
  });

  it.each([1, 2, 3] as const)('o nível %i do slot não muda nada: sem LEVEL_FACTOR nem −5 de custo (VRM-03.5)', (lv) => {
    expect(red(new AxisBuild(), lv, MUL, VOW)).toEqual(red(new AxisBuild(), 1, MUL, VOW));
  });

  it.each([1, 2, 3] as const)(
    'Loadout.stats com o Vermelho equipado no Nv %i = Nv − 1 pontos de Potência (ponte da T14)',
    (lv) => {
      const loadout = new Loadout();
      loadout.equip(0, 'vermelho', lv);
      loadout.damageMul = MUL;
      loadout.vowDamageMul = VOW;
      const expected = new AxisBuild();
      for (let i = 1; i < lv; i++) expected.add('vermelho', 'potencia');
      expect(loadout.stats('vermelho')).toEqual(red(expected, 1, MUL, VOW));
      expect(loadout.cost('vermelho')).toBe(30);
      loadout.startCooldown(0);
      expect(loadout.cooldownOf(0)).toBe(4500);
      expect(loadout.damage('vermelho', 10)).toBe(Math.round(10 * MUL * VOW));
    },
  );
});

/** O que cada eixo muda no stat resolvido com `n` pontos, com dano × 1,35 × 1,2 e custo × 1. */
function expectedFor(axis: RedAxisId, n: number) {
  const dmg = (base: number) => Math.round(base * MUL * VOW);
  /** Pontos do eixo `a` neste caso: `n` no eixo testado, 0 nos outros. */
  const pts = (a: RedAxisId) => (a === axis ? n : 0);
  const touch = RED_AXES.potencia.touch[pts('potencia')];
  return {
    level: 1 + n,
    cost: RED_AXES.eficiencia.cost[pts('eficiencia')],
    cooldownMs: RED_AXES.recarga.cooldownMs[pts('recarga')],
    signMs: RED_AXES.conjuracao.signMs[pts('conjuracao')],
    chargeMs: RED_AXES.conjuracao.chargeMs[pts('conjuracao')],
    damage: { hit: dmg(touch), detonation: dmg(RED_AXES.potencia.detonation[pts('potencia')]) },
    red: {
      radius: RED_AXES.escala.radius[pts('escala')],
      orbTexels: RED_AXES.escala.orbTexels[pts('escala')],
      sensorPx: RED_AXES.escala.sensorPx[pts('escala')],
      force: RED_AXES.potencia.force[pts('potencia')],
      rings: 1 + pts('potencia'),
      hitstopBonusMs: 10 * pts('potencia'),
      repulseDamage: dmg((4 * touch) / 30),
      shard: dmg(RED_AXES.perfuracao.shard[pts('perfuracao')]),
      shardNeighbors: RED_AXES.perfuracao.shardNeighbors[pts('perfuracao')],
      afterimage: pts('conjuracao') === 3,
      killRefundPct: pts('recarga') === 3 ? 0.3 : 0,
      rangePx: 320,
      speed: 760,
    },
  };
}

describe('VRM-03.5: resolveTechStats do Vermelho = a tabela, eixo a eixo de 0 a 3 pontos', () => {
  const cases = RED_AXIS_IDS.flatMap((axis) => [0, 1, 2, 3].map((n) => [axis, n] as const));
  it.each(cases)('%s com %i pontos', (axis, n) => {
    const s = red(buildWith({ [axis]: n }), 1, MUL, VOW);
    expect(s).toMatchObject(expectedFor(axis, n));
  });

  it('Potência 3 com Rosário e voto: toque round(45 × 1,35 × 1,2) = 73, detonação 60, repulsão 10, estilhaço 0', () => {
    const s = red(buildWith({ potencia: 3 }), 1, MUL, VOW);
    expect([s.damage.hit, s.damage.detonation, s.red?.repulseDamage, s.red?.shard]).toEqual([73, 60, 10, 0]);
  });

  it('repulsão 4/5/5/6 de 0 a 3 pontos de Potência sem multiplicador (VRM-04.7)', () => {
    const repulse = [0, 1, 2, 3].map((n) => red(buildWith({ potencia: n })).red?.repulseDamage);
    expect(repulse).toEqual([4, 5, 5, 6]);
  });

  it('o costMul arredonda o custo da Eficiência no fim: Eficiência 2 com 1,35 = round(22 × 1,35) = 30', () => {
    expect(red(buildWith({ eficiencia: 2 }), 1, 1, 1, 1.35).cost).toBe(30);
  });

  it('os eixos somam: Potência 2 + Escala 2 + Recarga 1 = Nv 6, raio 144, toque 40, recarga 3600', () => {
    const s = red(buildWith({ potencia: 2, escala: 2, recarga: 1 }));
    expect([s.level, s.red?.radius, s.damage.hit, s.cooldownMs]).toEqual([6, 144, 40, 3600]);
  });

  it('ramo e Despertar vêm do AxisBuild: Ricochete no Nv 2, Fliperama no Nv 5', () => {
    const axes = buildWith({ potencia: 1 });
    expect(axes.setBranch('vermelho', 'ricochete')).toBe(true);
    expect(red(axes).red).toMatchObject({ branch: 'ricochete', awakened: false });
    for (const axis of ['escala', 'recarga', 'perfuracao'] as const) axes.add('vermelho', axis);
    expect(red(axes).red).toMatchObject({ branch: 'ricochete', awakened: true });
  });
});
