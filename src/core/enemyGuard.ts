import { ENEMY_GUARD, STRUCTURE } from '../data/moves';
import type { Strength } from './hit';

/** Fonte de sorteio do núcleo (`Rng` de `rng.ts`, AD-006). */
export interface GuardRoll {
  chance(p: number): boolean;
}

export interface GuardTrigger {
  round: number;
  /** O inimigo está em `idle` (parado, sem atacar nem reagir). */
  idle: boolean;
  /** O jogador está virado para o inimigo. */
  playerFacingEnemy: boolean;
  /** Distância horizontal do jogador ao inimigo em px. */
  distancePx: number;
}

export interface EnemyHitInput {
  damage: number;
  strength: Strength;
  /** Golpe que a guarda não segura (chuteCarregado, EBL-04). */
  unblockable?: boolean;
  /** O golpe vem do lado para onde o inimigo está virado. */
  fromFront: boolean;
  /** Estrutura que o golpe soma normalmente (`MoveDef.structureGain`). */
  structureGain: number;
}

export interface EnemyHitResult {
  /** Dano que o inimigo leva. */
  damage: number;
  structureGain: number;
  /** A guarda segurou o golpe (evento `enemyBlock:<id>`). */
  blocked: boolean;
  /** A guarda acabou neste golpe (EBL-05). */
  guardEnded: boolean;
}

/**
 * Guarda do inimigo comum (EBL-01..05): ao ver o jogador iniciar um golpe leve de frente e perto, levanta a
 * guarda por 600 ms com chance `min(0.1 + 0.03 × (rodada − 1), 0.4)`. Guardando: leve de frente = 0 de dano e +8
 * de estrutura; forte = dano cheio e a guarda acaba; o carregado passa por cima.
 */
export class EnemyGuard {
  private leftMs = 0;

  constructor(private readonly roll: GuardRoll) {}

  /** Chance de levantar a guarda na rodada (EBL-01). */
  static chanceFor(round: number): number {
    return Math.min(ENEMY_GUARD.baseChance + ENEMY_GUARD.perRound * (round - 1), ENEMY_GUARD.cap);
  }

  get guarding(): boolean {
    return this.leftMs > 0;
  }

  /** O jogador iniciou um golpe leve; sorteia só se as condições da spec valem. `true` se a guarda subiu. */
  onPlayerLightMove(t: GuardTrigger, chanceOverride?: number): boolean {
    if (this.guarding || !t.idle || !t.playerFacingEnemy || t.distancePx > ENEMY_GUARD.triggerRangePx) return false;
    if (!this.roll.chance(chanceOverride ?? EnemyGuard.chanceFor(t.round))) return false;
    this.leftMs = ENEMY_GUARD.durationMs;
    return true;
  }

  update(dtMs: number): void {
    if (this.leftMs > 0) this.leftMs = Math.max(0, this.leftMs - dtMs);
  }

  /** Resolve um golpe do jogador contra o inimigo (dano, estrutura e fim da guarda). */
  resolveHit(hit: EnemyHitInput): EnemyHitResult {
    if (!this.guarding || !hit.fromFront) {
      return { damage: hit.damage, structureGain: hit.structureGain, blocked: false, guardEnded: false };
    }
    if (hit.strength === 'light' && !hit.unblockable) {
      return { damage: 0, structureGain: STRUCTURE.enemy.guardedLightGain, blocked: true, guardEnded: false };
    }
    this.leftMs = 0;
    return { damage: hit.damage, structureGain: hit.structureGain, blocked: false, guardEnded: true };
  }

  reset(): void {
    this.leftMs = 0;
  }
}
