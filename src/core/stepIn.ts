import type { Strength } from './hit';
import { STEP_FEEL } from '../data/feel';

/**
 * Passo à frente do golpe de chão (POS-07..09): 10 px (forte) ou 4 px (leve) distribuídos por todo o startup,
 * sempre fechando o total em `startupMs`. `blocked` (corpo no inimigo ou na parede) zera o que faltava. O relógio
 * avança em `update(dt)`, como o `Dodge`.
 */
export class StepIn {
  private totalPx = 0;
  private startupMs = 0;
  private elapsed = 0;
  private done = true;

  /** Começa (ou reinicia) o avanço de um golpe com o startup dado. */
  start(strength: Strength, startupMs: number): void {
    this.totalPx = strength === 'heavy' ? STEP_FEEL.heavyPx : STEP_FEEL.lightPx;
    this.startupMs = startupMs;
    this.elapsed = 0;
    this.done = startupMs <= 0;
  }

  /** `true` enquanto falta passo a dar: o adaptador roda `update` até aqui virar `false`, mesmo no quadro em que o
   * golpe já saiu do startup (senão o último pedaço se perde, L-059). */
  get running(): boolean {
    return !this.done;
  }

  /** Avança o tempo e devolve os px (a favor do facing) deste passo; 0 depois do startup ou do contato. */
  update(dtMs: number, blocked: boolean): number {
    if (this.done) return 0;
    if (blocked) {
      this.done = true;
      return 0;
    }
    const before = Math.min(this.elapsed, this.startupMs);
    this.elapsed += dtMs;
    const after = Math.min(this.elapsed, this.startupMs);
    if (this.elapsed >= this.startupMs) this.done = true;
    return this.totalPx * ((after - before) / this.startupMs);
  }
}
