/*
 * Poses do player HD: o corpo de ~60 texels (as proporções do heroico alto vezes 1,875), o idle de 4 quadros e o
 * gancho ascendente de 8. Os alvos ficam em coordenadas do frame de 96x80 (bordas de texel), com o eixo do corpo na
 * coluna 36 e o chão na linha 79. Puro, sem `phaser`.
 */
import { easeInOutCubic, inbetween } from '../rig/interpolate';
import { buildPose } from '../rig/poses/build';
import { aimLimb, solve, type Pose, type Proportions } from '../rig/skeleton';
import { ANKLE_HEIGHT } from './body';

/** Escala do heroico alto (32 texels) para o corpo HD (60). */
const K = 1.875;

/** O corpo HD. As espessuras de `thick` não são lidas pelo rasterizador HD (ele tem os próprios perfis). */
export const BODY_HD: Proportions = {
  name: 'hd',
  height: 60,
  head: 15,
  neck: 3,
  torso: 12.4,
  shoulderNear: 2.6,
  shoulderFar: 2.6,
  upperArm: 9,
  foreArm: 8.8,
  thigh: 13.6,
  shin: 12.7,
  foot: 5.2,
  footFar: 5.2,
  pelvisNear: 2.6,
  pelvisFar: 2.6,
  thick: {
    arm: { shoulder: 3, elbow: 2.5, wrist: 2 },
    leg: { hip: 3.8, knee: 3, ankle: 2.3 },
    hand: 1,
    shoe: 1.4,
    torso: { hip: 5, waist: 4.3, shoulder: 6.4, collar: 3, shoulderFrom: 10, taper: true, buttons: [] },
  },
};

export interface HdStage {
  w: number;
  h: number;
  originCol: number;
}

const LEGS = BODY_HD.thigh + BODY_HD.shin;
const ARM = BODY_HD.upperArm + BODY_HD.foreArm;

/** Linha do tornozelo com o pé no chão (a última linha do frame fica para o contorno). */
const groundOf = (s: HdStage): number => s.h - 1 - ANKLE_HEIGHT;

/** Interpolar ângulos não mantém o pé no chão: o tornozelo que afunda volta à linha do chão. */
function grounded(p: Pose, g: number): Pose {
  const j = solve(p);
  let out = p;
  for (const [leg, ankle] of [
    ['legNear', j.ankleNear],
    ['legFar', j.ankleFar],
  ] as const) {
    if (ankle.y > g) out = aimLimb(out, leg, { x: ankle.x, y: g }, 1);
  }
  return out;
}

/**
 * Idle: guarda de luta. Joelhos dobrados, tronco um pouco à frente, a mão da frente (de perto) adiantada na altura do
 * peito e a de trás junto ao queixo. `breath` (0..1) abaixa o quadril e as mãos acompanham.
 */
export function idlePose(s: HdStage, breath: number): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  return buildPose({
    body: BODY_HD,
    hip: { x: cx - 0.6, y: g - LEGS + 3.2 + breath },
    spine: 175,
    neck: 5,
    armNear: { rel: { x: ARM * 0.68, y: ARM * 0.36 + breath * 0.5 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.3, y: -ARM * 0.12 + breath * 0.5 }, bend: -1 },
    legNear: { ankle: { x: cx + 9, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 8.4, y: g }, foot: 90 },
  });
}

/** Poses-chave do gancho ascendente (o arco e o timing aprovados no heroico alto, na escala HD). */
function uppercutKeys(s: HdStage): { wind: Pose; mid: Pose; hit: Pose; recover: Pose } {
  const cx = s.originCol;
  const g = groundOf(s);
  const hy = g - LEGS;
  const hitHip = cx + 2 * K;
  const wind = buildPose({
    body: BODY_HD,
    hip: { x: cx - 0.6 * K, y: hy + 0.23 * LEGS },
    spine: 170,
    neck: 8,
    armNear: { rel: { x: ARM * 0.42, y: ARM * 0.4 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.44, y: -ARM * 0.08 }, bend: -1 },
    legNear: { ankle: { x: cx + 4.2 * K, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 4.8 * K, y: g }, foot: 90 },
  });
  const mid = buildPose({
    body: BODY_HD,
    hip: { x: cx + 0.2 * K, y: hy - 0.45 * K },
    spine: 176,
    armNear: { rel: { x: ARM * 0.65, y: ARM * 0.25 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.36, y: -ARM * 0.1 }, bend: -1 },
    legNear: { ankle: { x: cx + 3.8 * K, y: g - 0.6 * K }, foot: 70 },
    legFar: { ankle: { x: cx - 3.8 * K, y: g - 0.6 * K }, foot: 80 },
  });
  const hit = buildPose({
    body: BODY_HD,
    hip: { x: hitHip, y: hy - 1.1 * K },
    spine: 194,
    neck: 10,
    shoulderNear: -90,
    armNear: { to: { x: cx + 7 * K, y: g - 31.5 * K }, bend: -1 },
    armFar: { rel: { x: ARM * 0.3, y: -ARM * 0.2 }, bend: -1 },
    legNear: { ankle: { x: hitHip + 3.6 * K, y: g - 1.2 * K }, foot: 60 },
    legFar: { ankle: { x: hitHip - 5.6 * K, y: g - 1.6 * K }, foot: 35 },
  });
  const recover = buildPose({
    body: BODY_HD,
    hip: { x: cx + 0.2 * K, y: hy + 0.4 },
    spine: 180,
    armNear: { rel: { x: ARM * 0.5, y: ARM * 0.1 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.36, y: ARM * 0.14 }, bend: -1 },
    legNear: { ankle: { x: cx + 3.6 * K, y: g }, foot: 90 },
    legFar: { ankle: { x: cx - 3.6 * K, y: g }, foot: 90 },
  });
  return { wind, mid, hit, recover };
}

/**
 * Os 8 quadros do gancho: antecipação agachada e a subida (startup), pico e overshoot (active), e a volta em 4
 * quadros até a postura do idle (recovery). O pico é uma pose-chave, não um intermediário.
 */
export function uppercutPoses(s: HdStage): Pose[] {
  const k = uppercutKeys(s);
  const idle = idlePose(s, 0);
  const g = groundOf(s);
  const steps: readonly (readonly [Pose, Pose, number])[] = [
    [k.wind, k.mid, 0],
    [k.mid, k.hit, 0.35],
    [k.mid, k.hit, 1],
    [k.mid, k.hit, 1.06],
    [k.hit, k.recover, easeInOutCubic(0.4)],
    [k.hit, k.recover, easeInOutCubic(0.8)],
    [k.recover, idle, 0.35],
    [k.recover, idle, 0.8],
  ];
  return steps.map(([from, to, t]) => grounded(inbetween(from, to, t), g));
}
