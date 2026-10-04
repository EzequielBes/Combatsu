import { SLIDE_FEEL } from '../data/feel';
import type { ImpactTier } from './impactTier';

/**
 * Deslizamento do inimigo atingido (RCT-01, RCT-02, RCT-05, RCT-06): `heavy` 24 px em 180 ms, `decisive` 48 px em
 * 240 ms, `light` não desliza. `blocked` (parede) encerra na hora. O relógio avança em `update(dt)` (tempo de jogo).
 */
export class Slide {
  private totalPx = 0;
  private durationMs = 0;
  private elapsed = 0;
  private dir: -1 | 1 = 1;
  private running = false;

  /** Começa (ou reinicia) o deslizamento; `dir` é o lado para onde o inimigo vai. */
  start(tier: ImpactTier, dir: -1 | 1): void {
    this.running = false;
    if (tier === 'light') return;
    const cfg = SLIDE_FEEL[tier];
    this.totalPx = cfg.px;
    this.durationMs = cfg.ms;
    this.elapsed = 0;
    this.dir = dir;
    this.running = true;
  }

  /** Avança o tempo e devolve o deslocamento horizontal (px, com sinal) deste passo. */
  update(dtMs: number, blocked: boolean): number {
    if (!this.running) return 0;
    if (blocked) {
      this.running = false;
      return 0;
    }
    const before = Math.min(this.elapsed, this.durationMs);
    this.elapsed += dtMs;
    const after = Math.min(this.elapsed, this.durationMs);
    if (this.elapsed >= this.durationMs) this.running = false;
    return this.dir * this.totalPx * ((after - before) / this.durationMs);
  }

  /** Px que ainda faltam; `null` quando não está deslizando (fim, parede ou `light`). */
  get remainingPx(): number | null {
    if (!this.running) return null;
    return this.totalPx * (1 - Math.min(this.elapsed, this.durationMs) / this.durationMs);
  }
}
