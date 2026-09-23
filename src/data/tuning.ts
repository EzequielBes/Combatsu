import type { EnemyAITuning } from '../core/enemyAI';
import type { EnemyTuning } from '../core/enemyBrain';
import type { HealthTuning } from '../core/health';
import type { AttackStep } from '../core/combo';
import type { MoveTuning } from '../core/movement';

/** Pulo máximo ≈ 130 px (4 tiles); toque ≈ 30 px. Ajustar jogando. */
export const PLAYER_MOVE: MoveTuning = {
  runSpeed: 220,
  accelGround: 2400,
  accelAir: 1400,
  gravity: 1800,
  maxFallSpeed: 900,
  jumpSpeed: 420,
  maxJumpHoldMs: 180,
  jumpCutFactor: 0.45,
  coyoteMs: 90,
  jumpBufferMs: 110,
};

/** Vida do player (HP-01..04). */
export const PLAYER_HEALTH: HealthTuning = { maxHp: 100, invulnMs: 700, staggerMs: 200, respawnMs: 1000 };

/** Recuo do player ao levar golpe (px/s na horizontal), mantido durante o atordoamento (HP-03). */
export const PLAYER_KNOCKBACK = 180;

/** Soco, soco, chute. force = impulso em px por step do Matter. */
export const PLAYER_COMBO: AttackStep[] = [
  {
    name: 'jab',
    damage: 8,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 120,
    hitbox: { offsetX: 22, offsetY: -4, width: 26, height: 18 },
  },
  {
    name: 'direto',
    damage: 8,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 140,
    hitbox: { offsetX: 22, offsetY: -4, width: 26, height: 18 },
  },
  {
    name: 'chute',
    damage: 18,
    strength: 'heavy',
    force: 9,
    startupMs: 110,
    activeMs: 100,
    recoveryMs: 260,
    hitbox: { offsetX: 26, offsetY: 6, width: 32, height: 20 },
  },
];

export const COMBO_WINDOW_MS = 260;

/** Golpe com objeto na mão: sempre forte; dano e força vêm do PropDef. */
export const PROP_SWING: AttackStep = {
  name: 'golpe-com-objeto',
  damage: 0,
  strength: 'heavy',
  force: 0,
  startupMs: 120,
  activeMs: 140,
  recoveryMs: 220,
};

/** 60 de hp = ~2 combos completos, ou 3 cadeiradas. */
export const ENEMY: EnemyTuning = {
  maxHp: 60,
  hitstunMs: 220,
  ragdollStunMs: 1100,
  getUpMs: 350,
  deathRagdollMs: 2200,
  dissolveMs: 700,
};

export const ENEMY_RESPAWN_MS = 1500;

/** IA simples do inimigo (AI-01..03): distâncias só na horizontal, em px; velocidades em px/s. */
export const ENEMY_AI: EnemyAITuning = {
  patrolRange: 48,
  patrolSpeed: 35,
  chaseRange: 200,
  chaseSpeed: 70,
  attackRange: 40,
  windupMs: 450,
  attackMs: 120,
  restMs: 800,
};

/** Garra do inimigo: a hitbox fica ligada enquanto a IA está em `attack` (activeMs = ENEMY_AI.attackMs). */
export const ENEMY_ATTACK: AttackStep = {
  name: 'garra',
  damage: 12,
  strength: 'light',
  force: 4,
  startupMs: 0,
  activeMs: 120,
  recoveryMs: 0,
  hitbox: { offsetX: 20, offsetY: -2, width: 24, height: 20 },
};
