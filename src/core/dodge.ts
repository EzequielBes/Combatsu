import { DODGE } from '../data/moves';

export interface DodgeStart {
  grounded: boolean;
  /** Golpe ou técnica em andamento (o cancelamento da recovery é decidido por quem chama, DOD-06). */
  busy: boolean;
  /** Direção horizontal segurada: -1, 0 ou 1. */
  held: -1 | 0 | 1;
  /** Para onde o jogador está virado. */
  facing: -1 | 1;
}

/**
 * Esquiva (DOD-01..05, DOD-08, DOD-10): dash de 96 px em 200 ms, invencível de 0 a 180 ms, recarga de 450 ms desde
 * o início, recusada no ar. Esquiva perfeita (golpe que chegaria na invencibilidade) vale uma vez por esquiva e abre
 * uma janela de 1000 ms em que o próximo golpe do jogador causa ×1,5, uma vez. O relógio avança em `update(dt)`.
 */
export class Dodge {
  private now = 0;
  private startedAt = Number.NEGATIVE_INFINITY;
  private dir: -1 | 1 = 1;
  private perfectDone = false;
  private counterUntil = Number.NEGATIVE_INFINITY;
  private counterReady = false;

  constructor(private readonly tuning: typeof DODGE = DODGE) {}

  private get elapsed(): number {
    return this.now - this.startedAt;
  }

  get active(): boolean {
    return this.elapsed < this.tuning.durationMs;
  }

  get invulnerable(): boolean {
    return this.elapsed < this.tuning.invulnMs;
  }

  get cooldownMs(): number {
    return Math.max(0, this.tuning.cooldownMs - this.elapsed);
  }

  /** Direção do dash em curso (-1 esquerda, 1 direita). */
  get direction(): -1 | 1 {
    return this.dir;
  }

  /** Começa a esquiva; `false` se recusada (no ar, golpe/técnica em andamento ou recarga). */
  start(ctx: DodgeStart): boolean {
    if (!ctx.grounded || ctx.busy || this.cooldownMs > 0) return false;
    this.startedAt = this.now;
    this.dir = ctx.held !== 0 ? ctx.held : ((-ctx.facing) as -1 | 1);
    this.perfectDone = false;
    return true;
  }

  /** Avança o tempo e devolve o deslocamento horizontal em px deste passo (só enquanto o dash está ativo). */
  update(dtMs: number): number {
    const before = Math.min(Math.max(this.elapsed, 0), this.tuning.durationMs);
    this.now += dtMs;
    const after = Math.min(Math.max(this.elapsed, 0), this.tuning.durationMs);
    return this.dir * this.tuning.distancePx * ((after - before) / this.tuning.durationMs);
  }

  /**
   * Um golpe chegou ao jogador. `true` na primeira vez durante a invencibilidade desta esquiva (esquiva perfeita,
   * DOD-03); abre a janela do bônus de contra-ataque (DOD-08).
   */
  registerIncomingHit(): boolean {
    if (!this.invulnerable || this.perfectDone) return false;
    this.perfectDone = true;
    this.counterUntil = this.now + this.tuning.counterWindowMs;
    this.counterReady = true;
    return true;
  }

  /** Dano de um golpe do jogador: ×1,5 arredondado (metade para cima) uma vez em até 1000 ms da esquiva perfeita. */
  applyCounterBonus(damage: number): number {
    if (!this.counterReady || this.now > this.counterUntil) return damage;
    this.counterReady = false;
    return Math.round(damage * this.tuning.counterMultiplier);
  }

  reset(): void {
    this.startedAt = Number.NEGATIVE_INFINITY;
    this.perfectDone = false;
    this.counterUntil = Number.NEGATIVE_INFINITY;
    this.counterReady = false;
  }
}
