import { ART_SCALE } from '../game/art/palette';
import { TRAIL_FEEL } from '../data/feel';
import type { Strength, Vec2 } from './hit';

/** Texel do frame (coluna e linha, a partir do canto superior esquerdo). */
export interface StrikeTexel {
  col: number;
  row: number;
}

/** Origem do frame: a coluna do corpo e o total de linhas; a origem vertical é o pé, na base do frame. */
export interface FrameOrigin {
  originCol: number;
  rows: number;
}

/**
 * Ponto de golpe em coordenadas de mundo (TRL-03). O texel vale `ART_SCALE` px; facing -1 espelha o deslocamento
 * horizontal em volta da coluna de origem. O ponto é o centro do texel.
 */
export function strikeToWorld(
  pt: StrikeTexel,
  at: { x: number; footY: number },
  facing: 1 | -1,
  frame: FrameOrigin,
): Vec2 {
  return {
    x: at.x + facing * (pt.col - frame.originCol) * ART_SCALE,
    y: at.footY - (frame.rows - pt.row - 0.5) * ART_SCALE,
  };
}

/** Ponto de golpe em px relativos ao centro do corpo, com o jogador virado para a direita (POS-01). */
export function strikeToBody(pt: StrikeTexel, bodyH: number, frame: FrameOrigin): Vec2 {
  const world = strikeToWorld(pt, { x: 0, footY: bodyH / 2 }, 1, frame);
  return { x: world.x, y: world.y };
}

/** Largura e tempo de apagar do rastro por força do golpe (TRL-04, TRL-05). */
export function trailStyle(strength: Strength): { widthPx: number; fadeMs: number } {
  const t = TRAIL_FEEL[strength];
  return { widthPx: t.widthPx, fadeMs: t.fadeMs };
}
