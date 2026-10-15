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
  /** Px de mundo por texel do frame; padrão `ART_SCALE` (a folha HD usa 1). */
  texelPx?: number;
}

/**
 * Ponto de golpe em coordenadas de mundo (TRL-03). O texel vale `frame.texelPx` px (padrão `ART_SCALE`); facing -1 espelha o deslocamento
 * horizontal em volta da coluna de origem. O ponto é o centro do texel.
 */
export function strikeToWorld(
  pt: StrikeTexel,
  at: { x: number; footY: number },
  facing: 1 | -1,
  frame: FrameOrigin,
): Vec2 {
  const texel = frame.texelPx ?? ART_SCALE;
  return {
    x: at.x + facing * (pt.col - frame.originCol) * texel,
    y: at.footY - (frame.rows - pt.row - 0.5) * texel,
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

/** Comprimento do caminho: a soma dos trechos. */
export function pathLength(path: readonly Vec2[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
  return total;
}

/**
 * CRP-05: alonga a ponta do caminho `px` na direção do último trecho que anda (o rastro do golpe com o Alcance do
 * Corpo); começo e meio ficam. Sem trecho que ande, ou com `px` 0, devolve o caminho igual.
 */
export function extendPath(path: readonly Vec2[], px: number): Vec2[] {
  const last = path[path.length - 1];
  const from = [...path].reverse().find((p) => p.x !== last?.x || p.y !== last?.y);
  if (px <= 0 || !last || !from) return [...path];
  const len = Math.hypot(last.x - from.x, last.y - from.y);
  const tip = { x: last.x + ((last.x - from.x) / len) * px, y: last.y + ((last.y - from.y) / len) * px };
  return [...path.slice(0, -1), tip];
}
