/*
 * Gancho ascendente e idle para qualquer proporção do boneco (estudo de proporções). As poses-chave são montadas a partir
 * das medidas do corpo (altura das pernas, comprimento do braço), mantendo o arco e o timing do soco aprovado: guarda,
 * antecipação (agacha além do wind), wind, subida, hit com overshoot e recover, na mesma sequência de 12 quadros.
 * Os alvos são pontos do frame de 32x30 (bordas de texel); o tornozelo no chão fica na linha 28,2.
 */
import { easeInOutCubic, inbetween } from '../interpolate';
import { rasterize, wristTexel, type RasterResult } from '../rasterize';
import { solve, type Pose, type Proportions, type Vec2 } from '../skeleton';
import { buildPose as build } from './build';

/** Linha do tornozelo com o pé no chão. */
export const GROUND = 28.2;

/** Ajustes finos por corpo; o que não vier daqui sai das proporções. */
export interface Tuning {
  /** Ponto do frame que o punho do hit mira (o texel dele vira o ponto de golpe). */
  strike: Vec2;
  /** Posição x do quadril no hit. */
  hitHipX: number;
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
}

export const DEFAULT_TUNING: Tuning = { strike: { x: 17.2, y: 6.2 }, hitHipX: 11.2, hitRise: 1.1, hitSpine: 188, hitNeck: 20, tiptoe: 1.4, crouch: 0.23, hitStride: 3.4 };

export interface UppercutSet {
  body: Proportions;
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
export function idleFor(body: Proportions): Pose {
  const L = body.thigh + body.shin;
  const a = body.upperArm + body.foreArm;
  return build({
    body,
    hip: { x: 10, y: GROUND - L },
    spine: 180,
    armNear: { rel: { x: 0.5, y: a * 0.94 }, bend: -1 },
    armFar: { rel: { x: 0.9, y: a * 0.95 }, bend: -1 },
    legNear: { ankle: { x: 12.8, y: GROUND }, foot: 90 },
    legFar: { ankle: { x: 7.4, y: GROUND }, foot: 90 },
  });
}

export function uppercutFor(body: Proportions, tune: Partial<Tuning> = {}): UppercutSet {
  const t = { ...DEFAULT_TUNING, ...tune };
  const L = body.thigh + body.shin;
  const a = body.upperArm + body.foreArm;
  const hy = GROUND - L;
  const c = t.crouch * L;

  const guard = build({
    body,
    hip: { x: 10, y: hy + 0.2 },
    spine: 178,
    armNear: { rel: { x: a * 0.4, y: -0.4 }, bend: -1 },
    armFar: { rel: { x: a * 0.34, y: -a * 0.12 }, bend: -1 },
    legNear: { ankle: { x: 13.4, y: GROUND }, foot: 90 },
    legFar: { ankle: { x: 6.6, y: GROUND }, foot: 90 },
  });
  const wind = build({
    body,
    hip: { x: 9.4, y: hy + c },
    spine: 172,
    armNear: { rel: { x: a * 0.42, y: a * 0.35 }, bend: -1 },
    armFar: { rel: { x: a * 0.4, y: -a * 0.1 }, bend: -1 },
    legNear: { ankle: { x: 14.2, y: GROUND }, foot: 90 },
    legFar: { ankle: { x: 5.2, y: GROUND }, foot: 90 },
  });
  const mid = build({
    body,
    hip: { x: 10.2, y: hy - 0.45 },
    spine: 176,
    armNear: { rel: { x: a * 0.62, y: -a * 0.5 }, bend: -1 },
    armFar: { rel: { x: a * 0.36, y: -a * 0.1 }, bend: -1 },
    legNear: { ankle: { x: 13.8, y: GROUND - 0.6 }, foot: 70 },
    legFar: { ankle: { x: 6.2, y: GROUND - 0.6 }, foot: 80 },
  });
  const hit = build({
    body,
    hip: { x: t.hitHipX, y: hy - t.hitRise },
    spine: t.hitSpine,
    neck: t.hitNeck,
    shoulderNear: -90,
    armNear: { to: t.strike, bend: -1 },
    armFar: { rel: { x: a * 0.22, y: -a * 0.42 }, bend: -1 },
    legNear: { ankle: { x: t.hitHipX + t.hitStride, y: GROUND - t.tiptoe }, foot: 55 },
    legFar: { ankle: { x: t.hitHipX - t.hitStride, y: GROUND - t.tiptoe - 0.6 }, foot: 35 },
  });
  const recover = build({
    body,
    hip: { x: 10.2, y: hy },
    spine: 180,
    armNear: { rel: { x: a * 0.46, y: -a * 0.46 }, bend: -1 },
    armFar: { rel: { x: a * 0.36, y: -a * 0.12 }, bend: -1 },
    legNear: { ankle: { x: 13.6, y: GROUND }, foot: 90 },
    legFar: { ankle: { x: 6.4, y: GROUND }, foot: 90 },
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
  const sequencePoses = steps.map(([from, to, tt, ease]) => inbetween(from, to, ease && tt > 0 && tt < 1 ? ease(tt) : tt));
  const sequence = sequencePoses.map((p) => rasterize(p));
  const hitR = rasterize(hit);
  return {
    body,
    idle: idleFor(body),
    guard,
    wind,
    mid,
    hit,
    recover,
    frames: { wind: rasterize(wind), hit: hitR, recover: rasterize(recover) },
    strike: wristTexel(hitR.joints),
    sequencePoses,
    sequence,
  };
}

/** Quanto falta ao braço de perto, no hit, para o punho chegar ao alvo (distância do ombro ao alvo menos o braço; 0 = alcança). */
export function reachShortfall(set: UppercutSet, target: Vec2): number {
  const j = solve(set.hit);
  const a = set.body.upperArm + set.body.foreArm;
  return Math.max(0, Math.hypot(target.x - j.shoulderNear.x, target.y - j.shoulderNear.y) - a);
}
