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
 * de estrutura; forte = dano cheio e a guarda acaba; o carregado passa por cima. A guarda de leitura (RDG-06..08)
 * levantada pela repetição do jogador também segura o forte sem `unblockable`, uma vez: 0 de dano, +8 e a guarda acaba.
 */
export class EnemyGuard {
  private leftMs = 0;
  private readGuard = false;

  constructor(private readonly roll: GuardRoll) {}

  /** Chance de levantar a guarda na rodada (EBL-01). */
  static chanceFor(round: number): number {
    return Math.min(ENEMY_GUARD.baseChance + ENEMY_GUARD.perRound * (round - 1), ENEMY_GUARD.cap);
  }

  get guarding(): boolean {
    return this.leftMs > 0;
  }

  /** A guarda de pé é de leitura (RDG-06): `false` sem guarda, depois que ela termina e depois de `reset()`. */
  get read(): boolean {
    return this.guarding && this.readGuard;
  }

  /**
   * Tenta levantar a guarda com a `chance` dada (RDG-03): com chance 0 ou menos não sorteia (RDG-04), com 1 ou mais
   * levanta sem sortear, e já guardando não faz nada. `read` marca a guarda como de leitura. `true` se subiu.
   */
  tryRaise(chance: number, read: boolean): boolean {
    if (this.guarding || chance <= 0) return false;
    if (chance < 1 && !this.roll.chance(chance)) return false;
    this.leftMs = ENEMY_GUARD.durationMs;
    this.readGuard = read;
    return true;
  }

  /** O jogador iniciou um golpe leve; sorteia só se as condições da spec valem. `true` se a guarda subiu. */
  onPlayerLightMove(t: GuardTrigger, chanceOverride?: number): boolean {
    if (!t.idle || !t.playerFacingEnemy || t.distancePx > ENEMY_GUARD.triggerRangePx) return false;
    return this.tryRaise(chanceOverride ?? EnemyGuard.chanceFor(t.round), false);
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
    if (this.readGuard && !hit.unblockable) {
      this.leftMs = 0;
      return { damage: 0, structureGain: STRUCTURE.enemy.guardedLightGain, blocked: true, guardEnded: true };
    }
    this.leftMs = 0;
    return { damage: hit.damage, structureGain: hit.structureGain, blocked: false, guardEnded: true };
  }

  reset(): void {
    this.leftMs = 0;
    this.readGuard = false;
  }
}
