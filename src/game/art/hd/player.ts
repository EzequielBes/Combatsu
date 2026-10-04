/*
 * Quadros do player HD: junta as famílias de poses, expande os golpes nas suas sequências e rasteriza tudo. É o que a
 * folha `player-hd` (`sheet.ts`) e as pranchas (`tools/hd-boards.mjs`) leem. Puro, sem `phaser`.
 */
import type { JointName, Vec2 } from '../rig/skeleton';
import { paintBody } from './body';
import { aerialFamily } from './families/aerial';
import { coreFamily } from './families/core';
import { carryFamily } from './families/carry';
import { defenseFamily } from './families/defense';
import { kicksFamily } from './families/kicks';
import { locomotionFamily } from './families/locomotion';
import { punchesFamily } from './families/punches';
import { techFamily } from './families/tech';
import { expandMove, type HdFamily, type HdFrameSpec, type HdMoveSpec, type StrikeLimb } from './frames';
import { makeKit, type HdStage, type Kit } from './kit';
import { HD_COLORS } from './palette';
import { HdCanvas, finish } from './raster';

/** Frame do player HD: 96x80, eixo do corpo na coluna 36 e o pé na última linha. */
export const HD_STAGE: HdStage = { w: 96, h: 80, originCol: 36 };

/** As famílias de poses, na ordem em que entram na folha. */
const FAMILIES: readonly ((k: Kit) => HdFamily)[] = [
  coreFamily,
  locomotionFamily,
  carryFamily,
  defenseFamily,
  punchesFamily,
  kicksFamily,
  aerialFamily,
  techFamily,
];

export interface HdRender {
  colors: readonly number[];
  frames: Record<string, Uint8Array>;
  /** Ponto de golpe por frame lógico do golpe (`<golpe>-wind` e `<golpe>-hit`). */
  strikes: Record<string, { col: number; row: number }>;
  /** Golpes com sequência HD. */
  moves: readonly string[];
}

type Joints = Record<JointName, Vec2>;

/** Juntas que definem cada parte que acerta: de onde vem e a ponta. */
const LIMB_JOINTS: Record<StrikeLimb, readonly [JointName, JointName, number]> = {
  handNear: ['elbowNear', 'wristNear', 2.2],
  handFar: ['elbowFar', 'wristFar', 2.2],
  footNear: ['ankleNear', 'toeNear', 0],
  footFar: ['ankleFar', 'toeFar', 0],
  kneeNear: ['hipNear', 'kneeNear', 0],
  elbowNear: ['shoulderNear', 'elbowNear', 0],
};

/** Texel da parte que acerta: a ponta do osso, mais `extra` texels adiante (o centro do punho passa do pulso). */
function strikeTexel(j: Joints, limb: StrikeLimb): { col: number; row: number } {
  const [from, to, extra] = LIMB_JOINTS[limb];
  const a = j[from];
  const b = j[to];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    col: Math.floor(b.x + ((b.x - a.x) / len) * extra),
    row: Math.floor(b.y + ((b.y - a.y) / len) * extra),
  };
}

interface Drawn {
  pixels: Uint8Array;
  joints: Joints;
}

function draw(spec: HdFrameSpec): Drawn {
  const c = new HdCanvas(HD_STAGE.w, HD_STAGE.h);
  const joints = paintBody(c, spec.pose, {
    expr: spec.expr ?? 'focus',
    hands: spec.hands,
    headOverNearArm: spec.headOverNearArm,
  });
  return { pixels: finish(c), joints };
}

/** Todos os quadros como dados (pose e pintura), e os golpes de onde saíram as sequências. */
export function hdFrameSpecs(): { frames: Record<string, HdFrameSpec>; moves: Record<string, HdMoveSpec> } {
  const k = makeKit(HD_STAGE);
  const frames: Record<string, HdFrameSpec> = {};
  const moves: Record<string, HdMoveSpec> = {};
  for (const family of FAMILIES) {
    const f = family(k);
    Object.assign(frames, f.frames);
    for (const [name, move] of Object.entries(f.moves ?? {})) {
      moves[name] = move;
      Object.assign(frames, expandMove(k, name, move));
    }
  }
  return { frames, moves };
}

export function renderHdPlayer(): HdRender {
  const { frames: specs, moves } = hdFrameSpecs();
  // O mesmo quadro pode ter dois nomes (`jab-hit` e `jab@active-0`): rasteriza uma vez só.
  const cache = new Map<HdFrameSpec, Drawn>();
  const drawn = (spec: HdFrameSpec): Drawn => {
    let d = cache.get(spec);
    if (!d) cache.set(spec, (d = draw(spec)));
    return d;
  };
  const frames: Record<string, Uint8Array> = {};
  for (const [name, spec] of Object.entries(specs)) frames[name] = drawn(spec).pixels;
  const strikes: HdRender['strikes'] = {};
  for (const [name, move] of Object.entries(moves)) {
    for (const key of [`${name}-wind`, `${name}-hit`])
      strikes[key] = strikeTexel(drawn(specs[key]).joints, move.strike);
  }
  return { colors: HD_COLORS, frames, strikes, moves: Object.keys(moves) };
}
