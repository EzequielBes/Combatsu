import { RED_AXES, type RedBranchId } from '../data/techAxes';
import { LEVEL_FACTOR, TECH_GEOMETRY, TECHNIQUES, type TechId } from '../data/techniques';
import { AxisBuild } from './axisBuild';
import { axisAt, killRefundPct } from './axisRule';
import { kokusenDamage, type KokusenScale } from './kokusen';
import type { TechLevel } from './loadout';

/**
 * O Vermelho resolvido pelos eixos (VRM-01, VRM-03, VRM-04): a geometria do `TECH_GEOMETRY.vermelho` com raio, orbe,
 * sensor, força e anéis lidos da tabela, mais os campos que só os eixos dão. Os danos do toque e da detonação ficam no
 * `TechStats.damage` (`hit`/`detonation`), como nas outras técnicas.
 */
export interface RedStats {
  radius: number;
  orbTexels: 12 | 14 | 16 | 18;
  sensorPx: number;
  speed: number;
  rangePx: number;
  force: number;
  /** Repulsão da soltura (RDA-08): o `damage` é o da base; o dano resolvido é o `repulseDamage`. */
  repulse: typeof TECH_GEOMETRY.vermelho.repulse;
  ringPx: number;
  /** VRM-04.6: 1 + pontos de Potência. */
  rings: number;
  /** VRM-04.7: `round(4 × toque da Potência / 30 × damageMul × vowDamageMul)`. */
  repulseDamage: number;
  /** VRM-08: dano do estilhaço já com os multiplicadores (0 sem Perfuração). */
  shard: number;
  shardNeighbors: 0 | 1 | 2;
  /** VRM-04.6: hitstop a mais na detonação, 10 ms por ponto de Potência. */
  hitstopBonusMs: number;
  /** VRM-06: pós-imagem do player na soltura com a Conjuração 3. */
  afterimage: boolean;
  /** VRM-07, TRL-06: fração da recarga devolvida no 1º abate (0 ou 0,3). */
  killRefundPct: number;
  branch: RedBranchId | null;
  awakened: boolean;
}

/**
 * O `TechStats` resolvido de uma conjuração (TST-01): custo, recarga, os quatro tempos de fase, os danos já escalados
 * e a geometria da técnica. O Vermelho sai dos eixos (VRM-03); as outras quatro seguem a regra do `Loadout`
 * (`TECHNIQUES` × `LEVEL_FACTOR` × multiplicadores, custo −5 por nível). Sem `phaser` aqui.
 */
export interface TechStats {
  id: TechId;
  /** Nível do slot; no Vermelho, 1 + pontos de eixo (1 a 6, VRM-02). */
  level: number;
  /** Já com o `costMul`. */
  cost: number;
  cooldownMs: number;
  signMs: number;
  chargeMs: number;
  releaseMs: number;
  recoverMs: number;
  /** Cada chave de `TECHNIQUES[id].damage` já com nível (ou eixo, no Vermelho) e multiplicadores. */
  damage: Record<string, number>;
  /** ESC-02: dano do Kokusen do Divergente, com o piso da rodada; 0 nas outras técnicas. */
  kokusenDamage: number;
  red?: RedStats;
  blue?: typeof TECH_GEOMETRY.azul;
  cut?: typeof TECH_GEOMETRY.corte;
  purple?: typeof TECH_GEOMETRY.roxo;
}

export interface TechStatsInput {
  id: TechId;
  /** Nível do slot; o Vermelho o ignora e lê o nível dos eixos. */
  level: TechLevel;
  /** Pontos de eixo do Vermelho (VRM-03); sem eles, o Vermelho sem ponto nenhum (VRM-01). */
  axes?: AxisBuild;
  /** ARS-06: relíquia Rosário. */
  damageMul: number;
  /** VOW-10/12/16/17: votos, por cima da relíquia. */
  vowDamageMul: number;
  /** VOW-13: Fluxo selado. */
  costMul: number;
  /** ESC-02: Força, golpe pesado e HP da rodada; sem ela, o Kokusen de uma rodada 1 sem build. */
  kokusenScale?: KokusenScale;
}

/** Escala neutra do Kokusen: Força 0, sem multiplicador e HP da rodada 1 (45). */
export const NO_KOKUSEN_SCALE: KokusenScale = { forca: 0, meleeMul: 1, hpMul: 1 };

/** Eixos vazios: o Vermelho sem ponto (nunca recebe ponto; só é lido). */
const NO_AXES = new AxisBuild();

/** Geometria das outras técnicas, na chave que o `TechStats` usa; o Divergente não tem. */
function geometryOf(id: TechId): Pick<TechStats, 'blue' | 'cut' | 'purple'> {
  if (id === 'azul') return { blue: TECH_GEOMETRY.azul };
  if (id === 'corte') return { cut: TECH_GEOMETRY.corte };
  if (id === 'roxo') return { purple: TECH_GEOMETRY.roxo };
  return {};
}

/**
 * Fator de nível do dano (TEC-06): `LEVEL_FACTOR[level − 1]`; o Vermelho cresce pelos eixos e não usa o
 * `LEVEL_FACTOR` (VRM-03.5), então o fator dele é 1.
 */
export function levelFactor(stats: Pick<TechStats, 'id' | 'level'>): number {
  return stats.id === 'vermelho' ? 1 : LEVEL_FACTOR[stats.level - 1];
}

/**
 * Dano de `base` com o fator de nível e os dois multiplicadores (TEC-06: arredonda meio para cima, só no fim).
 * Compartilhado com o `Loadout.damage`, que ainda recebe bases fora da tabela.
 */
export function scaleDamage(base: number, factor: number, damageMul: number, vowDamageMul: number): number {
  return Math.round(base * factor * damageMul * vowDamageMul);
}

/**
 * O bloco `red` do Vermelho com estes pontos (VRM-03, VRM-04): cada linha lida por `axisAt`, danos com os dois
 * multiplicadores e sem `LEVEL_FACTOR`.
 */
export function resolveRed(axes: AxisBuild, damageMul: number, vowDamageMul: number): RedStats {
  const p = axes.axesOf('vermelho');
  const base = TECH_GEOMETRY.vermelho;
  const touch = axisAt(RED_AXES.potencia.touch, p.potencia);
  return {
    ...base,
    radius: axisAt(RED_AXES.escala.radius, p.escala),
    orbTexels: axisAt(RED_AXES.escala.orbTexels, p.escala),
    sensorPx: axisAt(RED_AXES.escala.sensorPx, p.escala),
    force: axisAt(RED_AXES.potencia.force, p.potencia),
    rings: base.rings + RED_AXES.potencia.ringsPerPoint * p.potencia,
    repulseDamage: scaleDamage((base.repulse.damage * touch) / RED_AXES.potencia.touch[0], 1, damageMul, vowDamageMul),
    shard: scaleDamage(axisAt(RED_AXES.perfuracao.shard, p.perfuracao), 1, damageMul, vowDamageMul),
    shardNeighbors: axisAt(RED_AXES.perfuracao.shardNeighbors, p.perfuracao),
    hitstopBonusMs: RED_AXES.potencia.hitstopPerPointMs * p.potencia,
    afterimage: p.conjuracao >= RED_AXES.conjuracao.afterimageAt,
    killRefundPct: killRefundPct(p.recarga),
    branch: axes.branch('vermelho'),
    awakened: axes.awakened('vermelho'),
  };
}

/** O bloco `red` do Vermelho sem ponto e sem multiplicador (VRM-01). */
export const RED_BASE: RedStats = resolveRed(NO_AXES, 1, 1);

/** PRC-05: piso do custo de energia, 60% do custo do Nv 1 em `TECHNIQUES`, depois do eixo, do nível e do `costMul`. */
export function costFloor(id: TechId): number {
  return Math.ceil(0.6 * TECHNIQUES[id].cost);
}

/** VRM-01, VRM-03: o Vermelho pela tabela dos eixos; soltura e recuperação ficam no `TECHNIQUES`. */
function resolveVermelho(input: TechStatsInput): TechStats {
  const { damageMul, vowDamageMul, costMul } = input;
  const axes = input.axes ?? NO_AXES;
  const p = axes.axesOf('vermelho');
  const def = TECHNIQUES.vermelho;
  return {
    id: 'vermelho',
    level: axes.level('vermelho'),
    cost: Math.max(costFloor('vermelho'), Math.round(axisAt(RED_AXES.eficiencia.cost, p.eficiencia) * costMul)),
    cooldownMs: axisAt(RED_AXES.recarga.cooldownMs, p.recarga),
    signMs: axisAt(RED_AXES.conjuracao.signMs, p.conjuracao),
    chargeMs: axisAt(RED_AXES.conjuracao.chargeMs, p.conjuracao),
    releaseMs: def.releaseMs,
    recoverMs: def.recoverMs,
    damage: {
      hit: scaleDamage(axisAt(RED_AXES.potencia.touch, p.potencia), 1, damageMul, vowDamageMul),
      detonation: scaleDamage(axisAt(RED_AXES.potencia.detonation, p.potencia), 1, damageMul, vowDamageMul),
    },
    kokusenDamage: 0,
    red: resolveRed(axes, damageMul, vowDamageMul),
  };
}

/**
 * ESC-02.4: o Kokusen do Divergente parte do 2º impacto cru com o fator de nível, nunca do `damage.second` do stat (que
 * já traz `damageMul` e `vowDamageMul`: o voto contaria duas vezes).
 */
function divergentKokusen(level: TechLevel, scale: KokusenScale = NO_KOKUSEN_SCALE): number {
  const second = Math.round(TECHNIQUES.divergente.damage.second * LEVEL_FACTOR[level - 1]);
  return kokusenDamage(second, scale);
}

/**
 * Resolve o stat de `id` (TST-01). O Vermelho sai dos eixos (VRM-03); nas outras o custo e o dano seguem a mesma conta
 * e a mesma ordem de `Loadout.cost`/`Loadout.damage` (`Math.round` no fim), no `level` do slot.
 */
export function resolveTechStats(input: TechStatsInput): TechStats {
  if (input.id === 'vermelho') return resolveVermelho(input);
  const { id, level, damageMul, vowDamageMul, costMul } = input;
  const def = TECHNIQUES[id];
  const factor = levelFactor({ id, level });
  const damage: Record<string, number> = {};
  for (const [key, base] of Object.entries(def.damage)) {
    damage[key] = scaleDamage(base, factor, damageMul, vowDamageMul);
  }
  return {
    id,
    level,
    cost: Math.max(costFloor(id), Math.round((def.cost - 5 * (level - 1)) * costMul)),
    cooldownMs: def.cooldownMs,
    signMs: def.signMs,
    chargeMs: def.chargeMs,
    releaseMs: def.releaseMs,
    recoverMs: def.recoverMs,
    damage,
    kokusenDamage: id === 'divergente' ? divergentKokusen(level, input.kokusenScale) : 0,
    ...geometryOf(id),
  };
}
