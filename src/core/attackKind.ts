import type { EnemyVariant } from './enemyVariant';
import type { Hit } from './hit';
import type { ToolKey } from './loot';

/**
 * Tipo do golpe do inimigo comum (HGT-01..06): `white` é alto, bloqueável e aparável; `red` é alto e imbloqueável;
 * `low` é baixo e imbloqueável.
 */
export type AttackKind = 'white' | 'red' | 'low';

const KINDS: readonly string[] = ['white', 'red', 'low'];

/** Porrete é `red` em qualquer aparência; rastejante sem porrete é `low`; o resto é `white` (HGT-01..03). */
export function attackKindFor(i: { variant: EnemyVariant; weapon: ToolKey | null }): AttackKind {
  if (i.weapon === 'cursedClub') return 'red';
  return i.variant === 'rastejante' ? 'low' : 'white';
}

/** Os campos do `Hit` que o tipo decide (HGT-04..06). */
export function hitFieldsFor(kind: AttackKind): Pick<Hit, 'height' | 'unblockable'> {
  if (kind === 'white') return { height: 'high' };
  return { height: kind === 'red' ? 'high' : 'low', unblockable: true };
}

/** Tipo de golpe válido ou `null` (HGT-13, EDG-08, override de debug). */
export function parseAttackKind(s: string | null | undefined): AttackKind | null {
  return KINDS.includes(s ?? '') ? (s as AttackKind) : null;
}

/** Tamanho de sequência válido (inteiro de 1 a 4) ou `null` (DFL-14, EDG-09, override de debug). */
export function parseStringLength(s: string | null | undefined): number | null {
  return /^[1-4]$/.test(s ?? '') ? Number(s) : null;
}

/** Chave da `PALETTE` do flash de compromisso e do marcador de cada tipo (CMT-02, HGT-09). */
export const KIND_COLOR: Record<AttackKind, string> = { white: 'w', red: 't', low: 'A' };
