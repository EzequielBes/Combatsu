import type { ModuleTheme } from '../../../core/module';
import { TILE } from '../../../core/level';
import { SCREEN } from '../hd/screen';

/** Trecho de um módulo na área, em colunas de tile com a parede, como o `AreaSpan` do `stage.ts` (THM-02). */
export interface ThemeSpan {
  theme: ModuleTheme;
  col0: number;
  col1: number;
}

/** Faixa de um tema numa camada: de `x0` a `x1` na coordenada da própria camada. */
export interface LayerBand {
  x0: number;
  x1: number;
  theme: ModuleTheme;
}

/**
 * Meia largura do canvas em px (640 em HD, 480 na versão antiga). O Phaser amplia a câmera em volta do centro do
 * canvas, então é este o termo da conversão, não a meia vista de mundo (320): com 320 as faixas de tema e os
 * pilares das emendas ficavam deslocados da emenda real dos módulos (achado na F23, 08/10).
 */
export const CANVAS_CX = SCREEN.w / 2;

/**
 * Coordenada, numa camada com rolagem `factor`, do ponto de mundo `worldX`: com a câmera centrada em X, o Phaser
 * desenha a camada em `(x − factor · scrollX − cx) · zoom + cx`, com `scrollX = X − cx`; o ponto aparece no centro
 * da tela quando `x = factor · X + (1 − factor) · cx`. Vale para fundo (< 1) e primeiro plano (> 1).
 */
export function toLayerX(worldX: number, factor: number, cx = CANVAS_CX): number {
  return factor * worldX + (1 - factor) * cx;
}

/**
 * Faixas de tema de uma camada com rolagem `factor` (CEN-07): uma por trecho, encostadas na fronteira do trecho
 * convertida para a camada; a primeira vai até `x0` e a última até `x1`.
 */
export function layerBands(
  spans: readonly ThemeSpan[],
  x0: number,
  x1: number,
  factor: number,
  cx = CANVAS_CX,
): LayerBand[] {
  return spans.map((sp, i) => ({
    x0: i === 0 ? x0 : toLayerX(sp.col0 * TILE, factor, cx),
    x1: i === spans.length - 1 ? x1 : toLayerX((sp.col1 + 1) * TILE, factor, cx),
    theme: sp.theme,
  }));
}

/** Folga (px) em volta do que a câmera alcança, para o tranco da câmera não mostrar a borda da pintura. */
export const EXTENT_MARGIN = 64;

/**
 * Intervalo, num eixo, da coordenada de uma camada com rolagem `factor` que a câmera consegue mostrar: com zoom ≥ 1
 * a tela mostra `factor · scroll + [0, screenPx]`, e o centro da câmera fica dentro do mundo, então
 * `scroll ∈ [−screenPx / 2, worldPx − screenPx / 2]`. Fora daqui a pintura nunca aparece.
 */
export function layerExtent(factor: number, worldPx: number, screenPx: number): { min: number; max: number } {
  const a = factor * (-screenPx / 2);
  const b = factor * (worldPx - screenPx / 2);
  return { min: Math.min(a, b) - EXTENT_MARGIN, max: Math.max(a, b) + screenPx + EXTENT_MARGIN };
}

/** Fronteiras internas entre faixas vizinhas (CEN-02), na coordenada da camada; vazio com uma faixa só. */
export function seams(bands: readonly { x1: number }[]): number[] {
  return bands.slice(0, -1).map((b) => b.x1);
}
