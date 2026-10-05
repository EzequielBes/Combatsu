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
import {
  expandMove,
  type HandShape,
  type HdFamily,
  type HdFrameSpec,
  type HdMoveSpec,
  type StrikeLimb,
} from './frames';
import { makeKit, type HdStage, type Kit } from './kit';
import { HD_COLORS } from './palette';
import { HdCanvas, finish } from './raster';
import { strikePoint } from './smear';
import { swayLooseFrames } from './sway';

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
  /** Mãos de cada quadro, em px a partir do pé do corpo (x para a frente, y negativo para cima). */
  anchors: Record<string, HdAnchors>;
}

/** Onde ficam as mãos num quadro: o centro de cada mão e a ponta dos dedos da mão de perto. */
export interface HdAnchors {
  near: Vec2;
  far: Vec2;
  tip: Vec2;
  /**
   * Giro (graus, sentido horário, com o player olhando para a direita) de um objeto na mão de perto: 0 quando o
   * antebraço aponta para cima, e o objeto fica em pé; 90 com o antebraço para a frente, e o objeto deita.
   */
  nearAngle: number;
}

/** Do pulso à ponta de cada forma de mão, ao longo do antebraço (as medidas de `hand.ts`). */
const TIP_LENGTH: Record<HandShape, number> = { fist: 4.3, open: 6.4, sign: 8.2, relaxed: 5.1, palm: 3 };

/** Ponto a `len` texels além do pulso, na direção do antebraço, relativo ao pé do corpo. */
function beyondWrist(elbow: Vec2, wrist: Vec2, len: number): Vec2 {
  const d = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y) || 1;
  return {
    x: wrist.x + ((wrist.x - elbow.x) / d) * len - HD_STAGE.originCol,
    y: wrist.y + ((wrist.y - elbow.y) / d) * len - HD_STAGE.h,
  };
}

function anchorsOf(j: Joints, spec: HdFrameSpec): HdAnchors {
  return {
    near: beyondWrist(j.elbowNear, j.wristNear, 2),
    far: beyondWrist(j.elbowFar, j.wristFar, 2),
    tip: beyondWrist(j.elbowNear, j.wristNear, TIP_LENGTH[spec.hands?.near ?? 'fist']),
    nearAngle: (Math.atan2(j.wristNear.y - j.elbowNear.y, j.wristNear.x - j.elbowNear.x) * 180) / Math.PI + 90,
  };
}

type Joints = Record<JointName, Vec2>;

/** Texel da parte que acerta (`strikePoint`: a ponta do osso; no punho, o centro dele, que passa do pulso). */
function strikeTexel(j: Joints, limb: StrikeLimb): { col: number; row: number } {
  const p = strikePoint(j, limb);
  return { col: Math.floor(p.x), row: Math.floor(p.y) };
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
    farFront: spec.farFront,
    turned: spec.turned,
    sway: spec.sway,
    smear: spec.smear,
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
  swayLooseFrames(frames, k.guard());
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
  const anchors: HdRender['anchors'] = {};
  for (const [name, spec] of Object.entries(specs)) {
    frames[name] = drawn(spec).pixels;
    anchors[name] = anchorsOf(drawn(spec).joints, spec);
  }
  const strikes: HdRender['strikes'] = {};
  for (const [name, move] of Object.entries(moves)) {
    for (const key of [`${name}-wind`, `${name}-hit`])
      strikes[key] = strikeTexel(drawn(specs[key]).joints, move.strike);
  }
  return { colors: HD_COLORS, frames, strikes, moves: Object.keys(moves), anchors };
}
