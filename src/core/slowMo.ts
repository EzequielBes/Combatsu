import { DODGE } from '../data/moves';

/**
 * Câmera lenta da esquiva perfeita (DOD-07): `timeScale` 0,3 por 400 ms de tempo REAL e depois volta a 1.
 * Quem chama passa o dt real (não escalado) em `update`.
 */
export class SlowMo {
  private elapsed = Number.POSITIVE_INFINITY;

  constructor(
    private readonly scale: number = DODGE.slowScale,
    private readonly durationMs: number = DODGE.slowMs,
  ) {}

  /** Liga (ou reinicia) a câmera lenta. */
  trigger(): void {
    this.elapsed = 0;
  }

  update(realDtMs: number): void {
    if (this.elapsed < this.durationMs) this.elapsed += realDtMs;
  }

  get active(): boolean {
    return this.elapsed < this.durationMs;
  }

  get timeScale(): number {
    return this.active ? this.scale : 1;
  }

  /** Nova run: volta a 1. */
  reset(): void {
    this.elapsed = Number.POSITIVE_INFINITY;
  }
}
