import type { ComboPhase } from './combo';
import type { EnemyAIState } from './enemyAI';
import type { EnemyState } from './enemyBrain';

export type PlayerAnim =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'apex'
  | 'land'
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
  /** ms desde o último pouso; `Infinity` se nunca pousou. */
  landMs: number;
}

/** Abaixo disso (px/s) o personagem está parado para a animação. */
export const RUN_THRESHOLD = 10;

/** Duração (ms) da animação de pouso depois de tocar o chão (SPR-10). */
export const LAND_MS = 120;
/** Abaixo disso (px/s) em |vy|, no ar, o personagem está no ápice do pulo (SPR-11). */
export const APEX_VY = 60;

/**
 * Animação do player (CHR-01), com precedência hurt > golpe/swing/throw > ar > carry > land > run > idle.
 * No ar: apex se |vy| < APEX_VY, senão jump se vy < 0, senão fall. Segurando objeto no chão, run/idle viram
 * carry-run/carry-idle e não mostram land (no ar a precedência do ar vale, porque não há variante carry de pulo).
 * No chão, land vale enquanto landMs < LAND_MS, mesmo correndo.
 */
export function pickPlayerAnim(i: PlayerAnimInput): PlayerAnim {
  if (i.hurt) return 'hurt';
  if (i.attack) return i.attack.name;
  if (!i.grounded) {
    if (Math.abs(i.vy) < APEX_VY) return 'apex';
    return i.vy < 0 ? 'jump' : 'fall';
  }
  const running = Math.abs(i.vx) > RUN_THRESHOLD;
  if (i.holding) return running ? 'carry-run' : 'carry-idle';
  if (i.landMs < LAND_MS) return 'land';
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
