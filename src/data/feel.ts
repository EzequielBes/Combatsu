/**
 * Números do feel do combate (feature impacto-amaldiçoado): rastro, impacto em camadas, passo à frente,
 * deslizamento, câmera e linhas de foco. Tudo num lugar só para ajustar sem caçar valor solto.
 * Sem `phaser` aqui (AD-001).
 */

/**
 * Salto desenhado do golpe, por nome: o sprite sobe e desce numa parábola enquanto o corpo físico fica no chão. Sai do
 * chão em `fromActive` do `active`, pousa em `toRecovery` do `recovery` e chega a `peakPx` (px de mundo) no meio. Os
 * quadros da folha ficam com a sola no chão; é este número que os levanta, quadro a quadro, sem degrau.
 */
export const MOVE_HOP: Readonly<Record<string, { fromActive: number; toRecovery: number; peakPx: number }>> = {
  ganchoAscendente: { fromActive: 0.5, toRecovery: 0.5, peakPx: 16 },
};

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

/**
 * Faixas de acerto das técnicas (POW-03, POW-14): o micro congela 15 ms no leve e 20 ms no forte, com teto de 60 ms
 * somados numa janela deslizante de 1000 ms de relógio real; o chip nunca congela. `sparkSize` é o tamanho da faísca.
 */
export const HIT_BAND_FEEL = {
  micro: { lightMs: 15, heavyMs: 20, capMs: 60, windowMs: 1000, sparkSize: 10 },
  chip: { sparkSize: 6 },
} as const;

/**
 * Números de dano (POW-05): vida de 700 ms subindo 18 px; acertos no mesmo alvo a até 300 ms do último somado viram um
 * número só; no máximo 12 vivos; o Kokusen dá um "pop" de 1,6 a 1,0 em 120 ms. Tamanho do texto em px: `small` abaixo
 * de `midFrom` de dano, `mid` até `bigFrom` exclusive e `big` dali para cima (micro e chip ficam sempre em `small`).
 */
export const DAMAGE_NUMBER_FEEL = {
  lifeMs: 700,
  risePx: 18,
  mergeMs: 300,
  cap: 12,
  popScale: 1.6,
  popMs: 120,
  sizePx: { small: 12, mid: 16, big: 20 },
  midFrom: 15,
  bigFrom: 40,
} as const;

/**
 * Força (POW-07 a POW-10): pontos com teto de 10 para a escala contínua e patamares em 2, 5 e 8 pontos. Por ponto
 * (p): impacto +0,05, tranco de câmera +0,3 px sobre o `CAMERA_FEEL.kickPx`, `force` e deslize +0,03, rastro +1 px a
 * cada 2 pontos. Por patamar (0 a 3): bônus de hitstop sobre o `HITSTOP_MS`, tom do impacto forte em chaves da
 * `PALETTE` (sombra, corpo, miolo, corpo e miolo alternados) e o `power` da chama da aura. O tremor entra no patamar
 * `shakeFromTier`. O `handOffset` da aura nasce medido na prancha (T20).
 */
export const POWER_FEEL = {
  capPoints: 10,
  tierFrom: [2, 5, 8],
  scalePerPoint: 0.05,
  kickPxPerPoint: 0.3,
  forcePerPoint: 0.03,
  slidePerPoint: 0.03,
  trailEveryPoints: 2,
  hitstopBonusMs: { light: [0, 0, 5, 10], heavy: [0, 10, 20, 30] },
  shakeFromTier: 2,
  tones: [
    { shadow: 'd', body: 'c', core: 'C', altBody: 'u', altCore: 'U' },
    { shadow: 'd', body: 'C', core: 'w', altBody: 'c', altCore: 'W' },
    { shadow: 'r', body: 'R', core: 'w', altBody: 't', altCore: 'T' },
    { shadow: 'R', body: 'b', core: 'R', altBody: 'r', altCore: 'W' },
  ],
  auraPower: { embers: 0.3, flame: 0.6 },
} as const;
