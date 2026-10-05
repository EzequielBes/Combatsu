import { DUCK } from '../data/moves';

/**
 * Abaixar (DEF-07, DEF-12, DEF-15, EDG-06): parado por 320 ms, a recarga de 450 ms conta do início (dividida com a
 * esquiva por quem chama) e um `registerEvade` vale uma vez por abaixar. Mesmo relógio do `Dodge`: o tempo anda em
 * `update(dt)` e o abaixar acaba exatamente em `durationMs`.
 */
export class Duck {
  private now = 0;
  private startedAt = Number.NEGATIVE_INFINITY;
  private evaded = false;

  constructor(private readonly tuning: { durationMs: number; cooldownMs: number } = DUCK) {}

  private get elapsed(): number {
    return this.now - this.startedAt;
  }

  /** Abaixado agora: em 319 ms ainda vale, em 320 ms já não (EDG-06). */
  get active(): boolean {
    return this.elapsed < this.tuning.durationMs;
  }

  get cooldownMs(): number {
    return Math.max(0, this.tuning.cooldownMs - this.elapsed);
  }

  /** Começa o abaixar. Quem chama já conferiu chão, recarga e golpe em andamento (DEF-07, DEF-15, DEF-16). */
  start(): void {
    this.startedAt = this.now;
    this.evaded = false;
  }

  update(dtMs: number): void {
    this.now += dtMs;
  }

  /** Um golpe `high` foi evitado. `true` na primeira vez de cada abaixar (DEF-12); fora dele, `false`. */
  registerEvade(): boolean {
    if (!this.active || this.evaded) return false;
    this.evaded = true;
    return true;
  }

  reset(): void {
    this.startedAt = Number.NEGATIVE_INFINITY;
    this.evaded = false;
  }
}
