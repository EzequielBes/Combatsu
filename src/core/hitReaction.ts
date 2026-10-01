import type { Strength } from './hit';

/** Reação de um inimigo que sobrevive a um golpe leve; `impact` é a pose do golpe forte. */
export type HitReaction = 'head-a' | 'head-b' | 'uppercut' | 'body' | 'impact';

/** Durações (ms) dos 3 frames de cada reação leve (HRX-03). */
export const REACTION_DURATIONS: readonly number[] = [60, 90, 70];

const BODY_MOVES: ReadonlySet<string> = new Set([
  'socoBaixo', 'rasteira', 'cotovelada', 'joelhada', 'chuteFrontal', 'chuteEmpurrao',
]);
const UPPERCUT_MOVES: ReadonlySet<string> = new Set(['gancho', 'ganchoAscendente', 'chuteAlto']);

/**
 * Reação visual ao golpe (HRX-01): forte → `impact`; golpes de corpo → `body`; golpes ascendentes → `uppercut`;
 * o resto alterna cabeça-a/cabeça-b (`last` é a última reação de cabeça, para a alternância).
 */
export function pickHitReaction(
  hit: { strength: Strength; moveName?: string },
  last: HitReaction | null,
): HitReaction {
  if (hit.strength === 'heavy') return 'impact';
  const name = hit.moveName;
  if (name !== undefined && BODY_MOVES.has(name)) return 'body';
  if (name !== undefined && UPPERCUT_MOVES.has(name)) return 'uppercut';
  return last === 'head-a' ? 'head-b' : 'head-a';
}
