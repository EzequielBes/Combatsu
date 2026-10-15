import type { DamageKind } from '../core/damageNumber';
import type { PowerAura, PowerTier, ToneKeys } from '../core/power';

/** Campos do snapshot de debug da fundação de poder (POW-13), fora do `debugApi.ts` para ele não crescer. */

/**
 * Números de dano: quantos estão vivos, o último tocado (valor já somado e tipo; `null` antes do primeiro) e onde cada
 * vivo está desenhado (base do texto em px de mundo, com a subida e o espalhamento).
 */
export interface DamageNumbersSnapshot {
  live: number;
  last: { value: number; kind: DamageKind } | null;
  spots: { x: number; y: number }[];
}

/** Força do corpo (POW-07, POW-08): pontos, patamar e o que eles mudam; `aura` é o estado real da chama na mão. */
export interface PowerSnapshot {
  points: number;
  tier: PowerTier;
  impactScale: number;
  hitstopBonusMs: { light: number; heavy: number };
  tone: ToneKeys;
  aura: PowerAura;
  /** Lado da chama: x médio das línguas menos o x de desenho do player (POW-10.13); `null` sem língua acesa. */
  auraDx: number | null;
}

/** Atributos da folha (POW-01, POW-13): o forte sem Passo sombrio, o dano das técnicas e o custo de energia. */
export interface StatsSnapshot {
  meleeMul: number;
  techDamageMul: number;
  costMul: number;
}
