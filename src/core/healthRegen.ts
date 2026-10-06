import type { PlayerRegenTuning } from '../data/tuning';

/** Teto da regeneração passiva para um hp máximo `maxHp` (REG-03). */
export const regenCap = (maxHp: number, t: PlayerRegenTuning): number => Math.floor(maxHp * t.capFraction);

/** Cura de fim de rodada para um hp máximo `maxHp` (REG-05). */
export const roundClearHeal = (maxHp: number, t: PlayerRegenTuning): number => Math.round(maxHp * t.roundClearFraction);

/**
 * Regeneração passiva da vida do player (REG-01..04): depois de `delayMs` sem levar dano, devolve `perSec` HP por
 * segundo até `capFraction` do teto. Só cura HP inteiros (a fração fica guardada para o frame seguinte), e levar
 * dano zera o atraso e a fração. Não mexe na vida: `update` devolve quanto curar e a cena chama `heal`.
 */
export class HealthRegen {
  private sinceHurtMs = 0;
  private acc = 0;

  constructor(private readonly t: PlayerRegenTuning) {}

  /** O player perdeu vida neste frame (REG-02): recomeça a espera. */
  hurt(): void {
    this.sinceHurtMs = 0;
    this.acc = 0;
  }

  /** Nova run: como se tivesse acabado de levar dano. */
  reset(): void {
    this.hurt();
  }

  /** HP inteiros a curar neste frame; 0 morto, dentro do atraso ou já no teto (REG-01, REG-03, REG-04). */
  update(dtMs: number, hp: number, maxHp: number, dead: boolean): number {
    if (dead) {
      this.hurt();
      return 0;
    }
    this.sinceHurtMs += dtMs;
    const cap = regenCap(maxHp, this.t);
    if (this.sinceHurtMs < this.t.delayMs || hp >= cap) {
      this.acc = 0;
      return 0;
    }
    this.acc += (this.t.perSec * dtMs) / 1000;
    const n = Math.min(Math.floor(this.acc), cap - hp);
    this.acc -= n;
    return n;
  }
}
