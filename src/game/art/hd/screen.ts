/*
 * Tamanho da tela do spike de alta densidade. Sem `?hd=1` o canvas é 960x540 e os zooms valem como nos dados; com a
 * chave o canvas é 1280x720 e todo zoom do mundo cresce por 4/3 (o campo de visão continua 640x360 px de mundo).
 * A UI segue desenhada para 960x540 (`UI_SIZE`): a câmera de UI a amplia por `uiScale` para cobrir o canvas.
 */
import { HD_ON } from './flag';

export interface ScreenConfig {
  /** Tamanho do canvas em px. */
  w: number;
  h: number;
  /** Fator aplicado a todo zoom do mundo (1 sem HD, 4/3 com HD). */
  zoomFactor: number;
}

/** Tela para o modo pedido (puro, para o Vitest). */
export function screenFor(hd: boolean): ScreenConfig {
  return hd ? { w: 1280, h: 720, zoomFactor: 4 / 3 } : { w: 960, h: 540, zoomFactor: 1 };
}

/** Tela da página aberta. */
export const SCREEN = screenFor(HD_ON);

/** Tamanho lógico da UI: o layout é sempre lido em 960x540, qualquer que seja o canvas. */
export const UI_SIZE = { w: 960, h: 540 } as const;

/** Zoom da câmera de UI e dos pontos de tela: canvas dividido pelo tamanho lógico (1 sem HD). */
export const UI_SCALE = SCREEN.w / UI_SIZE.w;

/** Zoom do mundo para o valor de dados `z` (pensado em 960x540). */
export const zoom = (z: number, config: ScreenConfig = SCREEN): number => z * config.zoomFactor;
