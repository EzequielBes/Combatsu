import type { Brush } from './brush';

/** Região de uma faixa numa camada: de `x0` a `x1`, com a linha do chão da camada e o fundo até onde pintar. */
export interface LayerArea {
  x0: number;
  x1: number;
  ground: number;
  bottom: number;
}

/** Pinta uma faixa de camada; o pincel já vem recortado em [`x0`, `x1`). */
export type LayerPainter = (b: Brush, area: LayerArea) => void;

/** Pintores de um tema (CEN-07): camada média (0,3) e próxima (0,6). */
export interface ThemeScenery {
  mid: LayerPainter;
  near: LayerPainter;
}
