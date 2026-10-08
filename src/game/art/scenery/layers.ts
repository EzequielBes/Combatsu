import type { ModuleTheme } from '../../../core/module';
import { TILE } from '../../../core/level';

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

/** Largura de vista em px de mundo (640 no canvas normal e no HD, ver `hd/screen.ts`). */
export const VIEW_W = 640;

/**
 * Coordenada, numa camada com rolagem `factor`, do ponto de mundo `worldX`: a câmera centrada em X enxerga o ponto
 * em `factor · X + (1 − factor) · VIEW_W / 2` da camada. Vale para fundo (< 1) e primeiro plano (> 1).
 */
export function toLayerX(worldX: number, factor: number): number {
  return factor * worldX + (1 - factor) * (VIEW_W / 2);
}

/**
 * Faixas de tema de uma camada com rolagem `factor` (CEN-07): uma por trecho, encostadas na fronteira do trecho
 * convertida para a camada; a primeira vai até `x0` e a última até `x1`.
 */
export function layerBands(spans: readonly ThemeSpan[], x0: number, x1: number, factor: number): LayerBand[] {
  return spans.map((sp, i) => ({
    x0: i === 0 ? x0 : toLayerX(sp.col0 * TILE, factor),
    x1: i === spans.length - 1 ? x1 : toLayerX((sp.col1 + 1) * TILE, factor),
    theme: sp.theme,
  }));
}

/** Fronteiras internas entre faixas vizinhas (CEN-02), na coordenada da camada; vazio com uma faixa só. */
export function seams(bands: readonly { x1: number }[]): number[] {
  return bands.slice(0, -1).map((b) => b.x1);
}
