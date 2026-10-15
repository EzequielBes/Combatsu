import { LEVEL_FACTOR, TECH_GEOMETRY, TECHNIQUES, type TechId } from '../data/techniques';
import type { TechLevel } from './loadout';

/**
 * O `TechStats` resolvido de uma conjuração (TST-01): custo, recarga, os quatro tempos de fase, os danos já escalados
 * e a geometria da técnica. Hoje segue a regra do `Loadout` (`TECHNIQUES` × `LEVEL_FACTOR` × multiplicadores, custo
 * −5 por nível); os eixos do Vermelho entram depois. Sem `phaser` aqui.
 */
export interface TechStats {
  id: TechId;
  level: TechLevel;
  /** Já com o `costMul`. */
  cost: number;
  cooldownMs: number;
  signMs: number;
  chargeMs: number;
  releaseMs: number;
  recoverMs: number;
  /** Cada chave de `TECHNIQUES[id].damage` já com nível e multiplicadores (= `Loadout.damage` de hoje). */
  damage: Record<string, number>;
  red?: typeof TECH_GEOMETRY.vermelho;
  blue?: typeof TECH_GEOMETRY.azul;
  cut?: typeof TECH_GEOMETRY.corte;
  purple?: typeof TECH_GEOMETRY.roxo;
}

export interface TechStatsInput {
  id: TechId;
  level: TechLevel;
  /** ARS-06: relíquia Rosário. */
  damageMul: number;
  /** VOW-10/12/16/17: votos, por cima da relíquia. */
  vowDamageMul: number;
  /** VOW-13: Fluxo selado. */
  costMul: number;
}

/** Geometria de cada técnica, na chave que o `TechStats` usa; o Divergente não tem. */
function geometryOf(id: TechId): Pick<TechStats, 'red' | 'blue' | 'cut' | 'purple'> {
  if (id === 'vermelho') return { red: TECH_GEOMETRY.vermelho };
  if (id === 'azul') return { blue: TECH_GEOMETRY.azul };
  if (id === 'corte') return { cut: TECH_GEOMETRY.corte };
  if (id === 'roxo') return { purple: TECH_GEOMETRY.roxo };
  return {};
}

/**
 * Resolve o stat de `id` no `level` (TST-01). O custo e o dano seguem a mesma conta e a mesma ordem de
 * `Loadout.cost`/`Loadout.damage` (`Math.round` no fim), para o número sair idêntico.
 */
export function resolveTechStats(input: TechStatsInput): TechStats {
  const { id, level, damageMul, vowDamageMul, costMul } = input;
  const def = TECHNIQUES[id];
  const factor = LEVEL_FACTOR[level - 1];
  const damage: Record<string, number> = {};
  for (const [key, base] of Object.entries(def.damage)) {
    damage[key] = Math.round(base * factor * damageMul * vowDamageMul);
  }
  return {
    id,
    level,
    cost: Math.round((def.cost - 5 * (level - 1)) * costMul),
    cooldownMs: def.cooldownMs,
    signMs: def.signMs,
    chargeMs: def.chargeMs,
    releaseMs: def.releaseMs,
    recoverMs: def.recoverMs,
    damage,
    ...geometryOf(id),
  };
}
