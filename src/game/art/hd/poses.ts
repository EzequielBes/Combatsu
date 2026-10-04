/*
 * Poses do player HD: o corpo de ~60 texels (as proporções do heroico alto vezes 1,875), o idle de 4 quadros e o
 * gancho ascendente de 8. Os alvos ficam em coordenadas do frame de 96x80 (bordas de texel), com o eixo do corpo na
 * coluna 36 e o chão na linha 79. Puro, sem `phaser`.
 */
import { inbetween } from '../rig/interpolate';
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

/** Tornozelos da guarda, à frente (perna de perto) e atrás (de longe) do eixo. */
const STANCE = { near: 9, far: -8.4 };

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
 * Guarda de luta: joelhos dobrados, tronco inclinado para o alvo e queixo recolhido, a mão da frente (de perto)
 * adiantada na altura do esterno e a de trás junto ao queixo. `sink` abaixa o quadril (a respiração do idle e o
 * assentamento depois do golpe) e as mãos acompanham.
 */
function guardPose(s: HdStage, sink: number): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  return buildPose({
    body: BODY_HD,
    hip: { x: cx - 0.6, y: g - LEGS + 3.2 + sink },
    spine: 168,
    neck: 9,
    armNear: { rel: { x: ARM * 0.64, y: ARM * 0.32 + sink * 0.5 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.36, y: -ARM * 0.08 + sink * 0.5 }, bend: -1 },
    legNear: { ankle: { x: cx + STANCE.near, y: g }, foot: 90 },
    legFar: { ankle: { x: cx + STANCE.far, y: g }, foot: 90 },
  });
}

/** Idle: a guarda respirando; `breath` vai de 0 a 1. */
export const idlePose = (s: HdStage, breath: number): Pose => guardPose(s, breath);

/** Antecipação: agacha fundo, o punho desce para perto do quadril e o tronco fecha sobre ele. */
function windPose(s: HdStage): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  return buildPose({
    body: BODY_HD,
    hip: { x: cx - 0.6 * K, y: g - LEGS + 0.23 * LEGS },
    spine: 166,
    neck: 10,
    armNear: { rel: { x: ARM * 0.42, y: ARM * 0.44 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.4, y: -ARM * 0.08 }, bend: -1 },
    legNear: { ankle: { x: cx + STANCE.near, y: g }, foot: 90 },
    legFar: { ankle: { x: cx + STANCE.far, y: g }, foot: 90 },
  });
}

/** Meio da subida: o corpo ainda meio agachado e o punho já passando pela frente do peito. */
function midPose(s: HdStage): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  return buildPose({
    body: BODY_HD,
    hip: { x: cx + 0.6 * K, y: g - LEGS + 0.1 * LEGS },
    spine: 174,
    neck: 6,
    armNear: { rel: { x: ARM * 0.72, y: ARM * 0.2 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.34, y: -ARM * 0.1 }, bend: -1 },
    legNear: { ankle: { x: cx + STANCE.near, y: g }, foot: 90 },
    legFar: { ankle: { x: cx + STANCE.far, y: g - 0.4 * K }, foot: 75 },
  });
}

/**
 * Pico: pernas esticadas na ponta dos pés, quadril à frente, tronco aberto para trás e o punho na altura da testa,
 * à frente do rosto, com o cotovelo dobrado embaixo dele. `over` (0 ou 1) é o overshoot: tudo sobe mais um pouco.
 */
function hitPose(s: HdStage, over: number): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  const hip = cx + 2 * K + 1;
  return buildPose({
    body: BODY_HD,
    hip: { x: hip, y: g - LEGS - 1.1 * K - over },
    spine: 190,
    neck: 6 + over * 5,
    shoulderNear: -90,
    armNear: { to: { x: cx + 9.8 * K + over * 2, y: g - 26.6 * K - over * 3 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.5, y: -ARM * 0.22 }, bend: -1 },
    legNear: { ankle: { x: hip + 3.6 * K, y: g - 1.2 * K - over * 0.6 }, foot: 60 },
    legFar: { ankle: { x: hip - 5.6 * K, y: g - 1.2 * K - over * 0.6 }, foot: over ? 40 : 50 },
  });
}

/** Descida: o corpo volta ao chão e o braço do golpe recolhe dobrado, com o punho na altura do ombro. */
function downPose(s: HdStage): Pose {
  const cx = s.originCol;
  const g = groundOf(s);
  return buildPose({
    body: BODY_HD,
    hip: { x: cx + 1.2 * K, y: g - LEGS + 1 },
    spine: 180,
    neck: 6,
    armNear: { rel: { x: ARM * 0.68, y: ARM * 0.02 }, bend: -1 },
    armFar: { rel: { x: ARM * 0.46, y: -ARM * 0.1 }, bend: -1 },
    legNear: { ankle: { x: cx + STANCE.near, y: g }, foot: 90 },
    legFar: { ankle: { x: cx + STANCE.far, y: g }, foot: 90 },
  });
}

/**
 * Os 8 quadros do gancho: antecipação agachada e a subida (startup), pico e overshoot (active), e a volta em 4
 * quadros (recovery): desce do overshoot, assenta o peso abaixo da guarda e sobe para ela.
 */
export function uppercutPoses(s: HdStage): Pose[] {
  const g = groundOf(s);
  const wind = windPose(s);
  const mid = midPose(s);
  const hit = hitPose(s, 0);
  const over = hitPose(s, 1);
  const land = guardPose(s, 2.4);
  const down = downPose(s);
  const idle = guardPose(s, 0);
  const steps: readonly (readonly [Pose, Pose, number])[] = [
    [wind, mid, 0],
    [mid, hit, 0.45],
    [mid, hit, 1],
    [hit, over, 1],
    [over, down, 1],
    [down, land, 0.6],
    [land, idle, 0],
    [land, idle, 0.6],
  ];
  return steps.map(([from, to, t]) => grounded(inbetween(from, to, t), g));
}
