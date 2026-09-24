import type { EnemyTuning } from './enemyBrain';
import type { EnemyAITuning } from './enemyAI';
import type { AttackStep } from './combo';

/** Tuning da escala de dificuldade por rodada (DIF-01, DIF-05, DIF-06); lógica em T2. */
export interface DifficultyTuning {
  hpPerRound: number;
  hpCap: number;
  damagePerRound: number;
  damageCap: number;
  speedPerRound: number;
  speedCap: number;
}

/** Tuning base do inimigo antes da escala por rodada. */
export interface EnemyBase {
  brain: EnemyTuning;
  ai: EnemyAITuning;
  attack: AttackStep;
}

export interface DifficultyMultipliers {
  hp: number;
  damage: number;
  speed: number;
}

/** Rodada usada nas fórmulas: rodada < 1 ou não inteira vira 1 (DIF-03). */
function effectiveRound(round: number): number {
  return round >= 1 && Number.isInteger(round) ? round : 1;
}

/**
 * Multiplicadores de hp, dano e velocidade para a rodada `r` (DIF-01, DIF-05, DIF-06), cada um crescendo
 * linearmente por rodada até o teto configurado em `t` (DIF-02). Rodada < 1 ou não inteira usa a rodada 1 (DIF-03).
 */
export function multipliersFor(round: number, t: DifficultyTuning): DifficultyMultipliers {
  const r = effectiveRound(round);
  return {
    hp: Math.min(1 + t.hpPerRound * (r - 1), t.hpCap),
    damage: Math.min(1 + t.damagePerRound * (r - 1), t.damageCap),
    speed: Math.min(1 + t.speedPerRound * (r - 1), t.speedCap),
  };
}

/**
 * Tuning do inimigo escalado para a rodada `r` (DIF-04): copia `base` sem mutá-lo, arredondando `maxHp` e `damage`
 * para inteiro e multiplicando só `patrolSpeed`/`chaseSpeed`; os demais campos da IA ficam iguais.
 */
export function scaleFor(round: number, base: EnemyBase, t: DifficultyTuning): EnemyBase {
  const m = multipliersFor(round, t);
  return {
    brain: { ...base.brain, maxHp: Math.round(base.brain.maxHp * m.hp) },
    ai: {
      ...base.ai,
      patrolSpeed: base.ai.patrolSpeed * m.speed,
      chaseSpeed: base.ai.chaseSpeed * m.speed,
    },
    attack: { ...base.attack, damage: Math.round(base.attack.damage * m.damage) },
  };
}
