import type { EnemyAITuning } from '../core/enemyAI';
import type { EnemyTuning } from '../core/enemyBrain';
import type { HealthTuning } from '../core/health';
import type { AttackStep } from '../core/combo';
import type { MoveTuning } from '../core/movement';
import type { DifficultyTuning } from '../core/difficulty';
import type { WaveTuning } from '../core/waves';
import type { RunTuning } from '../core/run';

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

/** Escala de dificuldade por rodada (DIF-01, DIF-05, DIF-06): cresce até um teto. */
export const DIFFICULTY: DifficultyTuning = {
  hpPerRound: 0.12,
  hpCap: 3.0,
  damagePerRound: 0.08,
  damageCap: 2.5,
  speedPerRound: 0.03,
  speedCap: 1.4,
};

/** Onda de inimigos por rodada (WAVE-01, WAVE-03, WAVE-04). */
export const WAVE: WaveTuning = { base: 3, max: 12, maxAlive: 4, pointGapMs: 800 };

/** Tempos da máquina de estados da run (RUN-10, RUN-11, RHUD-02). */
export const RUN: RunTuning = { intermissionMs: 2500, gameOverLockMs: 1000, spawnGraceMs: 600, bannerMs: 1500 };

/**
 * Tuning do chefe (BOSS-06, BAT-01..04, BAI-01, BAI-03, BAI-04, BAI-07..09, BAI-11, BAI-13, BWIN-01, BWIN-02,
 * BTIER-01, BTIER-02, BTIER-04, BTIER-05, BTIER-07): todos os números das Assumptions da spec de
 * `boss-a-cada-5`. Fases indexadas 0..2 (fase 1, 2, 3).
 */
export const BOSS = {
  /** Entrada parado e invulnerável antes de poder atacar (BOSS-06). */
  introMs: 1500,
  /** Fração de hp/maxHp em que a fase muda: <= phase2 vira fase 2, <= phase3 vira fase 3 (BAI-01). */
  phaseThresholds: { phase2: 0.66, phase3: 0.33 },
  /** Rugido ao mudar de fase: invulnerável, sem atacar (BAI-04). */
  roarMs: 900,
  /** Impulso horizontal no player ao começar o rugido, px/step (BAI-13). */
  roarImpulse: 6,
  /** Atordoamento com a postura zerada: sem mover, sem atacar (BAI-08). */
  staggerMs: 1200,
  poise: {
    max: 100,
    /** Por segundo, depois de `regenDelayMs` sem apanhar (BAI-09). */
    regenPerSec: 15,
    regenDelayMs: 2000,
  },
  /** windupMult multiplica o preparo base de cada ataque (BAI-03); restMs = descanso depois de um ataque (BAI-11). */
  phases: [
    { windupMult: 1.0, restMs: 900 },
    { windupMult: 0.85, restMs: 700 },
    { windupMult: 0.7, restMs: 500 },
  ] as const,
  /** Investida: preparo base, velocidade, alcance máximo e dano forte (BAT-01, BAT-09). */
  charge: { windupMs: 600, speed: 320, maxDist: 360, damage: 18 },
  /** Salto: preparo base, duração do salto e dano forte do pouso (BAT-02, BAT-10). */
  leap: { windupMs: 500, durationMs: 700, damage: 20 },
  /** Onda de choque do pouso: velocidade, alcance, altura e dano leve (BAT-03). */
  shockwave: { speed: 240, maxDist: 600, height: 20, damage: 12 },
  /** Rajada: preparo base, quantidade padrão, intervalo, velocidade, dano leve e alcance do projétil (BAT-04). */
  volley: { windupMs: 700, count: 3, intervalMs: 150, speed: 260, damage: 10, maxDist: 1200 },
  /** Escala por tier (BTIER-01, BTIER-02): hp = round(hpBase * min(1 + hpPerTier*(tier-1), hpCap)); dano dos
   * ataques = base * min(1 + damagePerTier*(tier-1), damageCap), arredondado. */
  tier: { hpBase: 600, hpPerTier: 0.5, hpCap: 4.0, damagePerTier: 0.15, damageCap: 2.0 },
  /** Arquétipos (BTIER-04, BTIER-05, BTIER-07): a Tecelã multiplica a velocidade do projétil e troca o volleyCount. */
  archetypes: {
    oni: { name: 'Oni do Portão' },
    tecela: { name: 'Tecelã de Maldições', volleyCount: 5, projectileSpeedMult: 1.25 },
  },
  /** Cura do player ao derrotar o chefe, fração de maxHp com teto (BWIN-01). */
  healFraction: 0.3,
  /** Duração da faixa "Chefe derrotado!" (BHUD-03). */
  defeatBannerMs: 2000,
} as const;
