/**
 * Números do feel do combate (feature impacto-amaldiçoado): rastro, impacto em camadas, passo à frente,
 * deslizamento, câmera e linhas de foco. Tudo num lugar só para ajustar sem caçar valor solto.
 * Sem `phaser` aqui (AD-001).
 */

/** Rastro do golpe (TRL-04, TRL-05): largura em px e tempo de jogo até alpha 0. */
export const TRAIL_FEEL = {
  light: { widthPx: 4, fadeMs: 140 },
  heavy: { widthPx: 8, fadeMs: 220 },
} as const;

/** Impacto em camadas: estilhaços (IMP-07), anel (IMP-08), espinhos (IMP-09), rachadura (IMP-15) e teto (EDG-03). */
export const IMPACT_FEEL = {
  shardCount: 6,
  shardConeDeg: 35,
  shardLifeMs: 180,
  ringFromPx: 6,
  ringToPx: 28,
  ringMs: 160,
  spikeCount: 6,
  spikeMinPx: 18,
  spikeMaxPx: 30,
  crackMs: 1200,
  /** Acima disso, estilhaços e resíduos novos são pulados. */
  fxCap: 40,
} as const;

/** Passo à frente do golpe de chão (POS-07, POS-08), em px no total. */
export const STEP_FEEL = { lightPx: 4, heavyPx: 10 } as const;

/** Deslizamento do inimigo (RCT-01, RCT-02) e resíduo (RCT-03). */
export const SLIDE_FEEL = {
  heavy: { px: 24, ms: 180 },
  decisive: { px: 48, ms: 240 },
  residueEveryMs: 40,
  residueFadeMs: 300,
} as const;

/** Câmera: tranco (CAM-01), pulso de zoom (CAM-02) e câmera lenta (CAM-03, CAM-07, CAM-08). */
export const CAMERA_FEEL = {
  kickPx: 4,
  kickMs: 120,
  zoomBase: 1.5,
  zoomPeak: 1.6,
  zoomInMs: 60,
  zoomHoldMs: 200,
  zoomOutMs: 120,
  slowScale: 0.4,
  slowMs: 350,
} as const;

/** Linhas de foco no golpe decisivo (FOC-01, FOC-02). */
export const FOCUS_FEEL = { lines: 24, ms: 180, clearRadiusPx: 120 } as const;
