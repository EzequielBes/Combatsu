/*
 * Quadros do player HD: o idle de 4 quadros e o gancho ascendente de 8, rasterizados a partir das poses. É o que a
 * folha `player-hd` (`sheet.ts`) e as pranchas (`tools/hd-boards.mjs`) leem. Puro, sem `phaser`.
 */
import type { Pose } from '../rig/skeleton';
import { paintBody } from './body';
import type { Expression } from './head';
import { HD_COLORS } from './palette';
import { idlePose, uppercutPoses, type HdStage } from './poses';
import { HdCanvas, finish } from './raster';

/** Frame do player HD: 96x80, eixo do corpo na coluna 36 e o pé na última linha. */
export const HD_STAGE: HdStage = { w: 96, h: 80, originCol: 36 };

export interface HdRender {
  colors: readonly number[];
  frames: Record<string, Uint8Array>;
  /** Ponto de golpe (o punho de perto) por frame lógico do golpe. */
  strikes: Record<string, { col: number; row: number }>;
}

/** Respiração do idle por quadro: desce, segura embaixo e volta. */
const BREATH = [0, 0.6, 1, 0.5];

interface Drawn {
  pixels: Uint8Array;
  fist: { col: number; row: number };
}

function draw(pose: Pose, expr: Expression, headOverNearArm: boolean): Drawn {
  const c = new HdCanvas(HD_STAGE.w, HD_STAGE.h);
  const j = paintBody(c, pose, { expr, headOverNearArm });
  return { pixels: finish(c), fist: { col: Math.floor(j.wristNear.x), row: Math.floor(j.wristNear.y) } };
}

export function renderHdPlayer(): HdRender {
  const frames: Record<string, Uint8Array> = {};
  BREATH.forEach((b, i) => {
    frames[`hd-idle-${i}`] = draw(idlePose(HD_STAGE, b), 'focus', false).pixels;
  });
  const gancho = uppercutPoses(HD_STAGE).map((p) => draw(p, 'effort', false));
  gancho.forEach((d, i) => {
    frames[`hd-gancho-${i}`] = d.pixels;
  });
  return {
    colors: HD_COLORS,
    frames,
    strikes: { 'ganchoAscendente-wind': gancho[0].fist, 'ganchoAscendente-hit': gancho[2].fist },
  };
}
