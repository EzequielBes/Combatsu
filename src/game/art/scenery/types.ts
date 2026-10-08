import type { Brush } from './brush';

/** Região de uma faixa numa camada: de `x0` a `x1`, com a linha do chão da camada e o fundo até onde pintar. */
export interface LayerArea {
  x0: number;
  x1: number;
  ground: number;
  bottom: number;
  /** Arquétipo do chefe na arena (ARN-04); `null` fora dela. */
  variant: 'oni' | 'tecela' | null;
}

/** Pinta uma faixa de camada; o pincel já vem recortado em [`x0`, `x1`). */
export type LayerPainter = (b: Brush, area: LayerArea) => void;

/** Pintores de um tema (CEN-07): camada média (0,3) e próxima (0,6); `far` troca a distante (ARN-01). */
export interface ThemeScenery {
  far?: LayerPainter;
  mid: LayerPainter;
  near: LayerPainter;
}
