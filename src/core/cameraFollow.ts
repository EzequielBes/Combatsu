import type { Vec2 } from './hit';

export interface Size {
  w: number;
  h: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FollowConfig {
  /** Zona morta em volta do centro: dentro dela o alvo se mexe sem a câmera andar. */
  deadzone: Size;
  /** Fração do caminho até o alvo que a câmera anda num quadro de 60 Hz. */
  lerp: number;
  /** Tamanho da vista em px de mundo (canvas dividido pelo zoom). */
  view: Size;
  /** Limites do mundo. */
  bounds: Bounds;
}

const FRAME_60_MS = 1000 / 60;

/** Um eixo do `clampCenter`: com a vista maior que os limites, o centro encosta no começo deles (CAM-05). */
function clampAxis(c: number, view: number, start: number, length: number): number {
  const min = start + view / 2;
  const max = Math.max(min, start + length - view / 2);
  return Math.min(max, Math.max(min, c));
}

/** Mantém a vista inteira dentro dos limites do mundo (CAM-04), como o `clampX`/`clampY` da câmera do Phaser. */
export function clampCenter(center: Vec2, view: Size, bounds: Bounds): Vec2 {
  return {
    x: clampAxis(center.x, view.w, bounds.x, bounds.w),
    y: clampAxis(center.y, view.h, bounds.y, bounds.h),
  };
}

/** Um eixo do `followCenter`: só anda o que o alvo passou da borda da zona morta, vezes o fator do quadro. */
function followAxis(c: number, target: number, half: number, k: number): number {
  if (target < c - half) return c + (target - (c - half)) * k;
  if (target > c + half) return c + (target - (c + half)) * k;
  return c;
}

/**
 * Centro da câmera depois de `dtMs` seguindo o alvo (CAM-01..05). O estado fica em ponto flutuante e o
 * amortecimento é por tempo: `lerp` é o que a câmera anda num quadro de 60 Hz, e dois quadros de 120 Hz dão no
 * mesmo. O seguidor do Phaser fazia o lerp por quadro e arredondava o resultado para baixo dentro da
 * realimentação, o que fazia o alvo tremer contra a câmera.
 */
export function followCenter(center: Vec2, target: Vec2, cfg: FollowConfig, dtMs: number): Vec2 {
  const k = 1 - Math.pow(1 - cfg.lerp, dtMs / FRAME_60_MS);
  return clampCenter(
    {
      x: followAxis(center.x, target.x, cfg.deadzone.w / 2, k),
      y: followAxis(center.y, target.y, cfg.deadzone.h / 2, k),
    },
    cfg.view,
    cfg.bounds,
  );
}

/**
 * Scroll da câmera do Phaser para um centro (CAM-06): centro menos metade do canvas, na grade de pixel de tela
 * (múltiplos de `1 / zoom`). O arredondamento vale só para o desenho; o centro continua em ponto flutuante.
 */
export function scrollFor(center: Vec2, canvas: Size, zoom: number): Vec2 {
  const snap = (v: number): number => Math.round(v * zoom) / zoom;
  return { x: snap(center.x - canvas.w / 2), y: snap(center.y - canvas.h / 2) };
}
