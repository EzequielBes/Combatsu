/** Tuning da onda de inimigos por rodada (WAVE-01, WAVE-03, WAVE-04); lógica em T5. */
export interface WaveTuning {
  base: number;
  max: number;
  maxAlive: number;
  pointGapMs: number;
}
