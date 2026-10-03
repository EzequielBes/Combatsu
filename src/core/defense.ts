import { DEFENSE, STRUCTURE } from '../data/moves';
import type { Hit, HitString } from './hit';

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

export type HitOutcome = 'parry' | 'dodged' | 'countered' | 'ducked' | 'jumped' | 'block' | 'hit';

export interface IncomingHit {
  hit: Pick<Hit, 'damage' | 'unblockable' | 'height'>;
  /** O centro do atacante está do lado para onde o jogador olha. */
  attackerInFront: boolean;
  isBoss: boolean;
  guard: GuardState;
  /** Esquiva ativa dentro da invencibilidade (0–180 ms). */
  dodgeInvulnerable: boolean;
  /** Contra em `startup` ou `active` (CNT-11). */
  counterInvulnerable: boolean;
  /** Abaixar ativo (DEF-11). */
  ducking: boolean;
  /** Sem chão sob os pés ou subindo, lido na hora do golpe (DEF-17). */
  airborne: boolean;
}

export interface HitResolution {
  outcome: HitOutcome;
  /** Dano que o jogador realmente leva. */
  damage: number;
  /** Estrutura somada ao jogador (STR-03, PAR-06). */
  playerStructureGain: number;
}

const AVOIDED = (outcome: HitOutcome): HitResolution => ({ outcome, damage: 0, playerStructureGain: 0 });

/**
 * Única decisão de dano do jogador (DEF-20, GRD-02..04, GRD-06, PAR-05, PAR-06, DOD-02): o primeiro desfecho válido de
 * parry → esquiva invencível → Contra → abaixar (golpe `high`) → pulo (golpe `low`) → guarda → golpe cheio.
 * Parry e guarda só valem com o atacante à frente e contra golpe sem `unblockable` (DEF-01, DEF-02).
 */
export function resolveIncomingHit(input: IncomingHit): HitResolution {
  const { hit, attackerInFront, isBoss, guard, dodgeInvulnerable, counterInvulnerable, ducking, airborne } = input;
  if (guard === 'parry' && attackerInFront && !hit.unblockable) return AVOIDED('parry');
  if (dodgeInvulnerable) return AVOIDED('dodged');
  if (counterInvulnerable) return AVOIDED('countered');
  if (ducking && hit.height === 'high') return AVOIDED('ducked');
  if (airborne && hit.height === 'low') return AVOIDED('jumped');
  if (guard === 'guard' && attackerInFront && !hit.unblockable) {
    return {
      outcome: 'block',
      damage: isBoss ? Math.round(hit.damage * DEFENSE.bossChipFraction) : 0,
      playerStructureGain: isBoss ? STRUCTURE.player.blockBoss : STRUCTURE.player.blockRegular,
    };
  }
  return { outcome: 'hit', damage: hit.damage, playerStructureGain: 0 };
}

/**
 * Deflexão (DFL-10, DFL-12, DFL-16): conta os parries por id de sequência. O parry do último golpe de uma sequência de
 * 2 ou mais golpes dá `true` quando todos os anteriores também foram aparados; golpe sem sequência nunca dá.
 */
export class DeflectTracker {
  private readonly parried = new Map<number, Set<number>>();

  /** Registra um parry; `true` só no do último golpe de uma sequência de 2+ golpes aparada inteira. */
  onParry(s: HitString | undefined): boolean {
    if (!s) return false;
    const seen = this.parried.get(s.id) ?? new Set<number>();
    seen.add(s.index);
    this.parried.set(s.id, seen);
    if (s.index !== s.length) return false;
    // A sequência acabou: esquece o id, que não volta a valer.
    this.parried.delete(s.id);
    if (s.length < 2) return false;
    for (let i = 1; i < s.length; i++) if (!seen.has(i)) return false;
    return true;
  }

  reset(): void {
    this.parried.clear();
  }
}
