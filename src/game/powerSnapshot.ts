import type { DamageKind } from '../core/damageNumber';

/** Campos do snapshot de debug da fundação de poder (POW-13), fora do `debugApi.ts` para ele não crescer. */

/** Números de dano: quantos estão vivos e o último tocado (valor já somado e tipo); `null` antes do primeiro. */
export interface DamageNumbersSnapshot {
  live: number;
  last: { value: number; kind: DamageKind } | null;
}
