import { DEFENSE, STRUCTURE } from '../data/moves';
import type { Hit } from './hit';

export type GuardState = 'none' | 'guard' | 'parry';

/**
 * Guarda e janela de parry (GRD-01, PAR-01, PAR-04): segurar a tecla dá `guard`; apertar abre `parry` por 150 ms
 * desde que 300 ms tenham passado do aperto anterior. O tempo entra por `update(dt)`.
 */
export class Guard {
  private now = 0;
  private held = false;
  private canGuard = true;
  private lastPressAt = Number.NEGATIVE_INFINITY;
  private parryUntil = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly parryWindowMs: number = DEFENSE.parryWindowMs,
    private readonly parryCooldownMs: number = DEFENSE.parryCooldownMs,
  ) {}

  /** Um aperto da tecla de guarda. `canGuard` = no chão, sem golpe, esquiva ou técnica; senão o aperto não abre nada. */
  press(canGuard = true): void {
    const since = this.now - this.lastPressAt;
    this.lastPressAt = this.now;
    if (!canGuard) return;
    if (since >= this.parryCooldownMs) this.parryUntil = this.now + this.parryWindowMs;
  }

  /** Avança o tempo e lê o estado da tecla: `held` = segurando, `canGuard` = pode defender agora. */
  update(dtMs: number, held: boolean, canGuard = true): void {
    this.now += dtMs;
    this.held = held;
    this.canGuard = canGuard;
    if (!canGuard) this.parryUntil = Number.NEGATIVE_INFINITY;
  }

  get state(): GuardState {
    if (!this.canGuard) return 'none';
    if (this.now < this.parryUntil) return 'parry';
    return this.held ? 'guard' : 'none';
  }
}

export type HitOutcome = 'parry' | 'dodged' | 'block' | 'hit';

export interface IncomingHit {
  hit: Pick<Hit, 'damage' | 'unblockable'>;
  /** O centro do atacante está do lado para onde o jogador olha. */
  attackerInFront: boolean;
  isBoss: boolean;
  guard: GuardState;
  /** Esquiva ativa dentro da invencibilidade (0–180 ms). */
  dodgeInvulnerable: boolean;
}

export interface HitResolution {
  outcome: HitOutcome;
  /** Dano que o jogador realmente leva. */
  damage: number;
  /** Estrutura somada ao jogador (STR-03, PAR-06). */
  playerStructureGain: number;
}

/**
 * Única decisão de dano do jogador (GRD-02..04, GRD-06, PAR-02, PAR-05, PAR-06, DOD-02): ordem fixa
 * parry → esquiva → guarda → golpe cheio, então parry e esquiva no mesmo frame resultam só em parry.
 * O parry vale contra qualquer golpe inimigo, de qualquer lado; a guarda só de frente e nunca contra imbloqueável.
 */
export function resolveIncomingHit(input: IncomingHit): HitResolution {
  const { hit, attackerInFront, isBoss, guard, dodgeInvulnerable } = input;
  if (guard === 'parry') return { outcome: 'parry', damage: 0, playerStructureGain: 0 };
  if (dodgeInvulnerable) return { outcome: 'dodged', damage: 0, playerStructureGain: 0 };
  if (guard === 'guard' && attackerInFront && !hit.unblockable) {
    return {
      outcome: 'block',
      damage: isBoss ? Math.round(hit.damage * DEFENSE.bossChipFraction) : 0,
      playerStructureGain: isBoss ? STRUCTURE.player.blockBoss : STRUCTURE.player.blockRegular,
    };
  }
  return { outcome: 'hit', damage: hit.damage, playerStructureGain: 0 };
}
