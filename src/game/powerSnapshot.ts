import type { DamageKind } from '../core/damageNumber';
import type { PowerAura, PowerTier, ToneKeys } from '../core/power';

/** Campos do snapshot de debug da fundação de poder (POW-13), fora do `debugApi.ts` para ele não crescer. */

/** Números de dano: quantos estão vivos e o último tocado (valor já somado e tipo); `null` antes do primeiro. */
export interface DamageNumbersSnapshot {
  live: number;
  last: { value: number; kind: DamageKind } | null;
}

/** Força do corpo (POW-07, POW-08): pontos, patamar e o que eles mudam; `aura` é o estado real da chama na mão. */
export interface PowerSnapshot {
  points: number;
  tier: PowerTier;
  impactScale: number;
  hitstopBonusMs: { light: number; heavy: number };
  tone: ToneKeys;
  aura: PowerAura;
}
