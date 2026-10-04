/*
 * Gancho ascendente e idle para qualquer proporção do boneco (estudo de proporções). As poses-chave são montadas a partir
 * das medidas do corpo (altura das pernas, comprimento do braço), mantendo o arco e o timing do soco aprovado: guarda,
 * antecipação (agacha além do wind), wind, subida, hit com overshoot e recover, na mesma sequência de 12 quadros.
 * Os alvos ficam em coordenadas do `RigFrame` (bordas de texel): o eixo do corpo na coluna `originCol` e o tornozelo
 * no chão na linha `groundOf(frame)` (28,2 no frame de 32x30).
 */
import { easeInOutCubic, inbetween } from '../interpolate';
import { RIG_FRAME_32, groundOf, rasterize, wristTexel, type RasterResult, type RigFrame } from '../rasterize';
import { headOf } from '../presets';
import { aimLimb, solve, type Pose, type Proportions, type Vec2 } from '../skeleton';
import { buildPose as build } from './build';

/** Linha do tornozelo com o pé no chão, no frame de 32x30. */
export const GROUND = groundOf(RIG_FRAME_32);

/** Ponto relativo ao corpo: texels à frente do eixo e acima do chão (vale em qualquer frame). */
export interface Reach {
  ahead: number;
  up: number;
}

/** Converte um `Reach` para o ponto do frame. */
export const toFrame = (frame: RigFrame, r: Reach): Vec2 => ({ x: frame.originCol + r.ahead, y: groundOf(frame) - r.up });

/** Ajustes finos por corpo; o que não vier daqui sai das proporções. */
export interface Tuning {
  /** Ponto que o punho do hit mira (o texel dele vira o ponto de golpe). */
  strike: Reach;
  /** Quanto o quadril avança no hit, à frente do eixo. */
  hitHipAhead: number;
  /** Subida do quadril no hit, acima da altura em pé. */
  hitRise: number;
  /** Inclinação do tronco no hit (graus; acima de 180 inclina para trás). */
  hitSpine: number;
  /** Ângulo local do pescoço no hit. */
  hitNeck: number;
  /** Quanto os tornozelos sobem no hit (ponta dos pés). */
  tiptoe: number;
  /** Fração da altura das pernas que o wind agacha. */
  crouch: number;
  /** Afastamento do tornozelo de perto e de longe em relação ao quadril no hit. */
  hitStride: number;
  /** Punho de perto no meio da subida, como fração do braço à frente e acima do ombro (sobe pela frente do peito). */
  midFist: { ahead: number; up: number };
  /** A cabeça cobre o braço de perto nos quadros do golpe (ver `RasterOptions.headOverNearArm`). */
  headOverNearArm: boolean;
  /** Tornozelos do idle, à frente (perto) e atrás (longe) do eixo. */
  idleStance: { near: number; far: number };
}

export const DEFAULT_TUNING: Tuning = {
  strike: { ahead: 7.2, up: 22 },
  hitHipAhead: 1.2,
  hitRise: 1.1,
  hitSpine: 188,
  hitNeck: 20,
  tiptoe: 1.4,
  crouch: 0.23,
  hitStride: 3.4,
  midFist: { ahead: 0.62, up: 0.5 },
  headOverNearArm: false,
  idleStance: { near: 2.8, far: -2.6 },
};

export interface UppercutSet {
  body: Proportions;
  frame: RigFrame;
  idle: Pose;
  guard: Pose;
  wind: Pose;
  mid: Pose;
  hit: Pose;
  recover: Pose;
  /** Os 3 frames do jogo (wind, hit, recover). */
  frames: { wind: RasterResult; hit: RasterResult; recover: RasterResult };
  /** Ponto de golpe do hit: o texel do pulso. */
  strike: { col: number; row: number };
  sequencePoses: readonly Pose[];
  sequence: readonly RasterResult[];
}

/** Idle: em pé, braços soltos junto ao corpo, pés a meio passo. */
export function idleFor(body: Proportions, frame: RigFrame = RIG_FRAME_32, stance = DEFAULT_TUNING.idleStance): Pose {
  const L = body.thigh + body.shin;
  const a = body.upperArm + body.foreArm;
  const cx = frame.originCol;
  const g = groundOf(frame);
  return build({
    body,
    hip: { x: cx, y: g - L },
    spine: 180,
    handScale: 0.6,
    armNear: { rel: { x: -0.1, y: a * 0.94 }, bend: -1 },
    armFar: { rel: { x: 0.5, y: a * 0.95 }, bend: -1 },
    legNear: { ankle: { x: cx + stance.near, y: g }, foot: 90 },
    legFar: { ankle: { x: cx + stance.far, y: g }, foot: 90 },
  });
}

export function uppercutFor(body: Proportions, tune: Partial<Tuning> = {}, frame: RigFrame = RIG_FRAME_32): UppercutSet {
  const t = { ...DEFAULT_TUNING, ...tune };
  const L = body.thigh + body.shin;
  const a = body.upperArm + body.foreArm;
  const cx = frame.originCol;
  const g = groundOf(frame);
  const hy = g - L;
  const c = t.crouch * L;
  const hitHipX = cx + t.hitHipAhead;

  const guard = build({
    body,
    hip: { x: cx, y: hy + 0.2 },
    spine: 178,
    handScale: 0.8,
    armNear: { rel: { x: a * 0.5, y: a * 0.2 }, bend: -1 },
    armFar: { rel: { x: a * 0.36, y: a * 0.12 }, bend: -1 },
    legNear: { ankle: { x: cx + 3.4, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 3.4, y: g }, foot: 90 },
  });
  const wind = build({
    body,
    hip: { x: cx - 0.6, y: hy + c },
    spine: 172,
    handScale: 0.8,
    armNear: { rel: { x: a * 0.42, y: a * 0.35 }, bend: -1 },
    armFar: { rel: { x: a * 0.4, y: -a * 0.1 }, bend: -1 },
    legNear: { ankle: { x: cx + 4.2, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 4.8, y: g }, foot: 90 },
  });
  const mid = build({
    body,
    hip: { x: cx + 0.2, y: hy - 0.45 },
    spine: 176,
    handScale: 0.9,
    armNear: { rel: { x: a * t.midFist.ahead, y: -a * t.midFist.up }, bend: -1 },
    armFar: { rel: { x: a * 0.36, y: -a * 0.1 }, bend: -1 },
    legNear: { ankle: { x: cx + 3.8, y: g - 0.6 }, foot: 70 },
    legFar: { ankle: { x: cx - 3.8, y: g - 0.6 }, foot: 80 },
  });
  const hit = build({
    body,
    hip: { x: hitHipX, y: hy - t.hitRise },
    spine: t.hitSpine,
    neck: t.hitNeck,
    shoulderNear: -90,
    armNear: { to: toFrame(frame, t.strike), bend: -1 },
    armFar: { rel: { x: a * 0.22, y: -a * 0.42 }, bend: -1 },
    legNear: { ankle: { x: hitHipX + t.hitStride, y: g - t.tiptoe }, foot: 55 },
    legFar: { ankle: { x: hitHipX - t.hitStride, y: g - t.tiptoe - 0.6 }, foot: 35 },
  });
  const recover = build({
    body,
    hip: { x: cx + 0.2, y: hy },
    spine: 180,
    handScale: 0.8,
    armNear: { rel: { x: a * 0.5, y: a * 0.1 }, bend: -1 },
    armFar: { rel: { x: a * 0.36, y: a * 0.14 }, bend: -1 },
    legNear: { ankle: { x: cx + 3.6, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 3.6, y: g }, foot: 90 },
  });

  // Os mesmos 12 quadros do gancho aprovado: antecipação, wind, subida acelerando, hit, overshoot e a volta.
  const steps: ReadonlyArray<[Pose, Pose, number, ((x: number) => number)?]> = [
    [guard, wind, 0],
    [guard, wind, 1.3],
    [guard, wind, 1],
    [wind, mid, 0.5],
    [wind, mid, 1],
    [mid, hit, 0.4],
    [mid, hit, 0.75],
    [mid, hit, 1],
    [mid, hit, 1.07],
    [hit, recover, 0.35, easeInOutCubic],
    [hit, recover, 0.75, easeInOutCubic],
    [hit, recover, 1],
  ];
  // Interpolar ângulos não mantém o pé no chão: o tornozelo que afunda num intermediário volta à linha do chão.
  const grounded = (p: Pose): Pose => {
    const j = solve(p);
    let out = p;
    for (const [limb, ankle] of [['legNear', j.ankleNear], ['legFar', j.ankleFar]] as const) {
      if (ankle.y > g) out = aimLimb(out, limb, { x: ankle.x, y: g }, 1);
    }
    return out;
  };
  const sequencePoses = steps.map(([from, to, tt, ease]) => grounded(inbetween(from, to, ease && tt > 0 && tt < 1 ? ease(tt) : tt)));
  // Nos golpes a cabeça é a de luta (esforço); os corpos sem ela caem na de idle.
  const head = headOf(body, 'fight');
  const raster = (p: Pose): RasterResult => rasterize(p, { frame, head, headOverNearArm: t.headOverNearArm });
  const sequence = sequencePoses.map(raster);
  const hitR = raster(hit);
  return {
    body,
    frame,
    idle: idleFor(body, frame, t.idleStance),
    guard,
    wind,
    mid,
    hit,
    recover,
    frames: { wind: raster(wind), hit: hitR, recover: raster(recover) },
    strike: wristTexel(hitR.joints),
    sequencePoses,
    sequence,
  };
}

/** Quanto falta ao braço de perto, no hit, para o punho chegar ao alvo (distância do ombro ao alvo menos o braço; 0 = alcança). */
export function reachShortfall(set: UppercutSet, target: Reach): number {
  const j = solve(set.hit);
  const a = set.body.upperArm + set.body.foreArm;
  const p = toFrame(set.frame, target);
  return Math.max(0, Math.hypot(p.x - j.shoulderNear.x, p.y - j.shoulderNear.y) - a);
}
