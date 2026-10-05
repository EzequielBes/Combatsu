import { DODGE } from '../data/moves';

/**
 * Câmera lenta da esquiva perfeita (DOD-07): `timeScale` 0,3 por 400 ms de tempo REAL e depois volta a 1.
 * Quem chama passa o dt real (não escalado) em `update`.
 */
export class SlowMo {
  private elapsed = Number.POSITIVE_INFINITY;
  private curScale: number;
  private curMs: number;

  constructor(
    private readonly scale: number = DODGE.slowScale,
    private readonly durationMs: number = DODGE.slowMs,
  ) {
    this.curScale = scale;
    this.curMs = durationMs;
  }

  /**
   * Liga (ou reinicia, sem empilhar) a câmera lenta. Sem argumentos usa o padrão da esquiva perfeita; com eles,
   * `trigger(0.4, 350)` serve a quebra de postura, o Contra e o último inimigo da onda (CAM-03, CAM-04).
   */
  trigger(scale: number = this.scale, ms: number = this.durationMs): void {
    this.curScale = scale;
    this.curMs = ms;
    this.elapsed = 0;
  }

  update(realDtMs: number): void {
    if (this.elapsed < this.curMs) this.elapsed += realDtMs;
  }

  get active(): boolean {
    return this.elapsed < this.curMs;
  }

  get timeScale(): number {
    return this.active ? this.curScale : 1;
  }

  /** Nova run: volta a 1. */
  reset(): void {
    this.elapsed = Number.POSITIVE_INFINITY;
  }
}
