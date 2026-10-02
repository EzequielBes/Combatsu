/**
 * Tempos do efeito do Vermelho (RDA-07, RDA-10, RDA-12). Sem `phaser` aqui para os testes lerem os valores exatos.
 */

/** Um frame a 60 fps (mesma convenção de KokusenFx.ts). */
export const FRAME_MS = 1000 / 60;
/** RDA-12: um fantasma de rastro por frame... */
export const TRAIL_EVERY_MS = FRAME_MS;
/** ...que some em 180 ms. */
export const TRAIL_FADE_MS = 180;
/** RDA-07: os dois arcos `T` dão uma volta a cada 400 ms. */
export const DISTORT_PERIOD_MS = 400;
/** RDA-10: o cone da repulsão fica 120 ms. */
export const REPULSE_MS = 120;
