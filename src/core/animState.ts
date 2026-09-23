import type { ComboPhase } from './combo';
import type { EnemyAIState } from './enemyAI';
import type { EnemyState } from './enemyBrain';

export type PlayerAnim =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'jab'
  | 'cross'
  | 'kick'
  | 'carry-idle'
  | 'carry-run'
  | 'swing'
  | 'throw'
  | 'hurt';

/** Golpes e ações com objeto que mostram uma animação própria; o nome é o da animação. */
export type AttackAnim = 'jab' | 'cross' | 'kick' | 'swing' | 'throw';

/** Fases de um golpe em andamento (fora de `idle`). */
export type AttackPhase = Exclude<ComboPhase, 'idle'>;

export interface PlayerAnimInput {
  hurt: boolean;
  /** Golpe em andamento, ou null. */
  attack: { name: AttackAnim; phase: AttackPhase } | null;
  grounded: boolean;
  /** px/s; vy negativo = subindo. */
  vx: number;
  vy: number;
  holding: boolean;
}

/** Abaixo disso (px/s) o personagem está parado para a animação. */
export const RUN_THRESHOLD = 10;

/**
 * Animação do player (CHR-01), com precedência hurt > golpe/swing/throw > ar > run > idle.
 * No ar: jump se vy < 0, senão fall. Segurando objeto no chão, run/idle viram carry-run/carry-idle
 * (no ar a precedência do ar vale, porque não há variante carry de pulo).
 */
export function pickPlayerAnim(i: PlayerAnimInput): PlayerAnim {
  if (i.hurt) return 'hurt';
  if (i.attack) return i.attack.name;
  if (!i.grounded) return i.vy < 0 ? 'jump' : 'fall';
  const running = Math.abs(i.vx) > RUN_THRESHOLD;
  if (i.holding) return running ? 'carry-run' : 'carry-idle';
  return running ? 'run' : 'idle';
}

export type AttackFrame = 'wind' | 'hit' | 'recover';

/** Frame do golpe pela fase (CHR-02): o membro esticado (`hit`) aparece exatamente na fase ativa. */
export function attackFrame(phase: AttackPhase): AttackFrame {
  if (phase === 'startup') return 'wind';
  if (phase === 'active') return 'hit';
  return 'recover';
}

export type EnemyAnim = 'idle' | 'walk' | 'windup' | 'attack' | 'hurt' | 'getup';

export interface EnemyAnimInput {
  brain: EnemyState;
  ai: EnemyAIState;
  /** O corpo está andando (|vx| acima de RUN_THRESHOLD). */
  moving: boolean;
}

/**
 * Animação do inimigo (CHR-03). O cérebro (reação a dano) manda sobre a IA:
 *
 * | brain                                          | IA              | moving | animação |
 * | ---------------------------------------------- | --------------- | ------ | -------- |
 * | hitstun                                        | qualquer        | -      | hurt     |
 * | ragdollStun, deadRagdoll, dissolving, gone     | qualquer        | -      | hurt     |
 * | gettingUp                                      | qualquer        | -      | getup    |
 * | idle                                           | windup          | -      | windup   |
 * | idle                                           | attack          | -      | attack   |
 * | idle                                           | rest            | -      | idle     |
 * | idle                                           | patrol, chase   | sim    | walk     |
 * | idle                                           | patrol, chase   | não    | idle     |
 *
 * Em ragdoll o sprite fica escondido (as partes do ragdoll aparecem no lugar), então 'hurt' ali é só o frame que
 * fica guardado.
 */
export function pickEnemyAnim(i: EnemyAnimInput): EnemyAnim {
  if (i.brain === 'gettingUp') return 'getup';
  if (i.brain !== 'idle') return 'hurt';
  if (i.ai === 'windup') return 'windup';
  if (i.ai === 'attack') return 'attack';
  if (i.ai === 'rest') return 'idle';
  return i.moving ? 'walk' : 'idle';
}
