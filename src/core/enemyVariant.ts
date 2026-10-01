import type { Rng } from './rng';

/** Aparências do inimigo comum (EVR-01). */
export const ENEMY_VARIANTS = ['corcunda', 'rastejante', 'bruto'] as const;
export type EnemyVariant = (typeof ENEMY_VARIANTS)[number];

/** Sorteia uma aparência, uniforme, com o stream recebido (EVR-04). */
export function pickEnemyVariant(rng: Rng): EnemyVariant {
  return ENEMY_VARIANTS[rng.int(0, ENEMY_VARIANTS.length - 1)];
}

/** Id de aparência válido ou `null` (EVR-05, override de debug). */
export function parseVariant(s: string | null | undefined): EnemyVariant | null {
  return (ENEMY_VARIANTS as readonly string[]).includes(s ?? '') ? (s as EnemyVariant) : null;
}
