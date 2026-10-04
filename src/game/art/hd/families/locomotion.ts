/*
 * Locomoção do player HD: corrida, pulo, ápice, queda e pouso.
 *
 * A corrida é um ciclo de 6 quadros com dois passos espelhados (contato, descida e impulso de cada perna): o tronco
 * vai bem inclinado para a frente, os punhos fechados bombeiam em oposição às pernas e a cabeça sobe e desce com o
 * quadril. No ar, a origem continua sendo a sola do corpo físico (linha 79): as pernas recolhem acima dela.
 */
import type { HdFamily, HdFrameSpec } from '../frames';
import type { Kit } from '../kit';
import type { ArmTarget } from '../../rig/poses/build';

interface Leg {
  /** Tornozelo: texels à frente do eixo e acima da linha do tornozelo no chão. */
  ahead: number;
  up: number;
  foot: number;
  bend?: 1 | -1;
}

/** Um instante do passo: a perna que lidera (a que acabou de pousar), a que vem atrás e o corpo. */
interface Stride {
  lead: Leg;
  trail: Leg;
  /** Quadril: avanço em relação ao eixo e quanto desce abaixo de `k.hy`. */
  hipX: number;
  sink: number;
  spine: number;
  neck: number;
  /** Braço do lado da perna que lidera (vai para trás) e o oposto (vai para a frente), a partir do ombro. */
  armBack: { x: number; y: number };
  armFwd: { x: number; y: number };
}

/** Os três instantes de um passo: contato, descida (o peso cai sobre a perna) e impulso (a perna empurra o chão). */
const STRIDE: readonly Stride[] = [
  {
    lead: { ahead: 17, up: 1.2, foot: 108 },
    trail: { ahead: -17, up: 5.5, foot: 14 },
    hipX: 3,
    sink: 4.4,
    spine: 143,
    neck: 27,
    armBack: { x: -0.66, y: 0.3 },
    armFwd: { x: 0.66, y: 0.04 },
  },
  {
    lead: { ahead: 7, up: 0, foot: 90 },
    trail: { ahead: -13, up: 15, foot: 10 },
    hipX: 3.6,
    sink: 5.8,
    spine: 140,
    neck: 28,
    armBack: { x: -0.5, y: 0.46 },
    armFwd: { x: 0.58, y: 0.22 },
  },
  {
    lead: { ahead: -11, up: 1.6, foot: 56 },
    trail: { ahead: 14, up: 13, foot: 84 },
    hipX: 4.4,
    sink: 3.8,
    spine: 145,
    neck: 25,
    armBack: { x: -0.52, y: 0.4 },
    armFwd: { x: 0.56, y: 0.3 },
  },
];

function leg(k: Kit, hipX: number, l: Leg) {
  return { ankle: { x: k.cx + hipX + l.ahead, y: k.g - l.up }, foot: l.foot, bend: l.bend ?? 1 };
}

/**
 * Balanço do braço de perto em cada quadro, de -1 (todo para trás) a 1 (todo para a frente). O braço anda em oposição
 * à perna do mesmo lado e de forma contínua: enquanto a perna de perto vai da frente para trás (quadros 0 a 3), o braço
 * de perto vem de trás para a frente, e volta nos quadros seguintes. O braço de longe faz o contrário.
 */
const NEAR_ARM_SWING = [-1, -0.45, 0.55, 1, 0.45, -0.55];

/**
 * Braço da corrida para um balanço `swing`: o punho à frente sobe até o peito, atrás desce até o quadril, e no meio do
 * caminho passa baixo, rente ao corpo. O cotovelo dobra sempre para o mesmo lado (para trás), como num braço de
 * verdade: é o que impede o braço de "virar ao contrário" de um passo para o outro.
 */
function runArm(k: Kit, swing: number, far: boolean): ArmTarget {
  // O ombro de longe fica à frente do eixo: o braço de longe recua mais para o punho de trás sair da silhueta.
  const back = far && swing < 0 ? 0.3 * -swing : 0;
  const x = 0.1 + 0.56 * swing - back;
  const y = 0.24 - 0.16 * swing + 0.14 * (1 - Math.abs(swing));
  return { rel: { x: k.arm * x, y: k.arm * y }, bend: -1 };
}

/** Quadro `i` (0..5) da corrida: nos três primeiros lidera a perna de perto, nos três últimos a de longe. */
function runFrame(k: Kit, i: number): HdFrameSpec {
  const s = STRIDE[i % 3]!;
  const nearLeads = i < 3;
  const swing = NEAR_ARM_SWING[i]!;
  return {
    pose: k.pose({
      hip: { x: k.cx + s.hipX, y: k.hy + s.sink },
      spine: s.spine,
      neck: s.neck,
      armNear: runArm(k, swing, false),
      armFar: runArm(k, -swing, true),
      legNear: leg(k, s.hipX, nearLeads ? s.lead : s.trail),
      legFar: leg(k, s.hipX, nearLeads ? s.trail : s.lead),
    }),
  };
}

function jumpFrames(k: Kit): Record<string, HdFrameSpec> {
  return {
    // Agachamento de impulso: quadril fundo, tronco fechado sobre os joelhos e os braços armados atrás.
    'jump-0': {
      pose: k.pose({
        hip: { x: k.cx - 1.5, y: k.hy + 10 },
        spine: 150,
        neck: 22,
        armNear: { rel: { x: -k.arm * 0.5, y: k.arm * 0.5 }, bend: -1 },
        armFar: { rel: { x: -k.arm * 0.2, y: k.arm * 0.7 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near - 2, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx + k.stance.far + 1, y: k.g - 1 }, foot: 70 },
      }),
      expr: 'effort',
    },
    // Decolagem: o corpo estica, a perna de trás empurra na ponta do pé, o joelho da frente sobe e os braços sobem.
    'jump-1': {
      pose: k.pose({
        hip: { x: k.cx + 1, y: k.hy - 3 },
        spine: 174,
        neck: 6,
        armNear: { rel: { x: -k.arm * 0.35, y: k.arm * 0.6 }, bend: 1 },
        armFar: { rel: { x: k.arm * 0.7, y: -k.arm * 0.5 }, bend: -1 },
        legNear: { ankle: { x: k.cx + 7, y: k.g - 16 }, foot: 50 },
        legFar: { ankle: { x: k.cx - 6, y: k.g - 6.5 }, foot: 34 },
      }),
      expr: 'effort',
    },
    // Ápice: corpo recolhido, joelhos dobrados e braços abertos em equilíbrio.
    'apex-0': {
      pose: k.pose({
        hip: { x: k.cx, y: k.hy - 3 },
        spine: 168,
        neck: 10,
        armNear: { rel: { x: k.arm * 0.8, y: -k.arm * 0.2 }, bend: -1 },
        armFar: { rel: { x: -k.arm * 0.8, y: -k.arm * 0.1 }, bend: 1 },
        legNear: { ankle: { x: k.cx + 6, y: k.g - 18 }, foot: 60 },
        legFar: { ankle: { x: k.cx - 9, y: k.g - 14 }, foot: 30 },
      }),
    },
  };
}

/** Queda de lutador: um punho à frente, o outro atrás, pernas buscando o chão; `sway` (0 ou 1) alterna o conjunto. */
function fallFrame(k: Kit, sway: number): HdFrameSpec {
  return {
    pose: k.pose({
      hip: { x: k.cx, y: k.hy - 2 },
      spine: 176 + sway * 2,
      neck: 8,
      armNear: { rel: { x: k.arm * (0.7 + sway * 0.12), y: -k.arm * (0.25 + sway * 0.1) }, bend: -1 },
      armFar: { rel: { x: -k.arm * (0.5 + sway * 0.12), y: k.arm * (0.3 - sway * 0.16) }, bend: 1 },
      legNear: { ankle: { x: k.cx + 7 - sway * 2, y: k.g - 5 - sway * 3 }, foot: 60 },
      legFar: { ankle: { x: k.cx - 6 + sway, y: k.g - 10 + sway * 3 }, foot: 30 },
    }),
  };
}

function landFrames(k: Kit): Record<string, HdFrameSpec> {
  const feet = {
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  };
  return {
    // Impacto: bem agachado, o tronco dobra sobre o joelho da frente e a mão de perto quase toca o chão.
    'land-0': {
      pose: k.pose({
        hip: { x: k.cx - 4, y: k.hy + 12 },
        spine: 138,
        neck: 30,
        armNear: { to: k.at(20, 4), bend: -1 },
        armFar: { rel: { x: -k.arm * 0.88, y: -k.arm * 0.3 }, bend: 1 },
        legNear: feet.legNear,
        legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 1.4 }, foot: 60 },
      }),
      hands: { near: 'open' },
      expr: 'effort',
    },
    // Subida: o quadril sobe a meio caminho da guarda e as mãos já voltam para a frente do peito.
    'land-1': {
      pose: k.pose({
        hip: { x: k.cx - 1, y: k.hy + 7 },
        spine: 160,
        neck: 14,
        armNear: { rel: { x: k.arm * 0.6, y: k.arm * 0.44 }, bend: -1 },
        armFar: { rel: { x: k.arm * 0.3, y: k.arm * 0.1 }, bend: -1 },
        ...feet,
      }),
    },
  };
}

export function locomotionFamily(k: Kit): HdFamily {
  const run = Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`run-${i}`, runFrame(k, i)]));
  return {
    frames: {
      ...run,
      ...jumpFrames(k),
      'fall-0': fallFrame(k, 0),
      'fall-1': fallFrame(k, 1),
      ...landFrames(k),
    },
  };
}
