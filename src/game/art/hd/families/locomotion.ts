/*
 * Locomoção do player HD: corrida, pulo, ápice, queda e pouso.
 *
 * A corrida é um ciclo de 8 quadros, quatro instantes para cada perna: contato (o calcanhar toca à frente, a perna
 * quase esticada), amortecimento (o ponto mais baixo, o peso cai sobre o joelho dobrado), impulso (o pé já atrás do
 * quadril, na ponta, empurrando o chão) e voo (o ponto mais alto, a perna de trás esticada e o joelho da frente alto).
 * O tronco vai bem inclinado para a frente, os punhos fechados bombeiam em oposição às pernas e a cabeça fica firme
 * enquanto o tronco balança. No ar, a origem continua sendo a sola do corpo físico (linha 79): as pernas recolhem
 * acima dela.
 */
import { dir, type Vec2 } from '../../rig/skeleton';
import type { ArmTarget, PoseSpec } from '../../rig/poses/build';
import type { HdFamily, HdFrameSpec } from '../frames';
import { BODY_HD, type Kit } from '../kit';

type LegSpec = PoseSpec['legNear'];

/** Quadros do ciclo da corrida (dois passos de quatro quadros). */
export const RUN_FRAMES = 8;

/**
 * Quanto o pé de apoio recua a cada quadro, em texels (1 texel = 1 px de mundo). É o que o corpo anda no mundo durante
 * um quadro: a duração do quadro sai daqui e da velocidade de corrida (`sheet.ts`), e o pé não patina no chão.
 */
export const RUN_STEP = 14.7;

/** Quadril da corrida à frente do eixo do corpo, e o tornozelo no contato à frente da raiz da perna. */
const HIP_AHEAD = 3;
const CONTACT_AHEAD = 14;

/**
 * Perna num instante do ciclo. `plant` é o pé no chão: quantos quadros faz que ele pousou e o ângulo do pé (acima de
 * 90 o calcanhar apoia com a ponta para cima; abaixo, o calcanhar sobe e a ponta fica presa ao chão). `swing` é a perna
 * no ar, pelos ângulos de mundo da coxa e da canela (0 para baixo, 90 para a frente) e o do tornozelo em relação à
 * canela (90 neutro): com a canela sempre em ângulo menor que o da coxa, o joelho só dobra para a frente.
 */
type LegKey = { plant: number; foot: number } | { swing: readonly [thigh: number, shin: number, flex: number] };

/** Os oito instantes de uma perna, a partir do quadro em que ela pousa. A outra perna está quatro quadros adiante. */
const LEG_CYCLE: readonly LegKey[] = [
  // Contato: o calcanhar toca à frente, a ponta do pé para cima.
  { plant: 0, foot: 110 },
  // Amortecimento: o pé chapado sob o joelho dobrado.
  { plant: 1, foot: 90 },
  // Impulso: o pé atrás do quadril, o calcanhar sobe e a ponta empurra.
  { plant: 2, foot: 52 },
  // Voo: a perna sai do chão esticada para trás, o pé em ponta.
  { swing: [-46, -60, 55] },
  // A canela dobra para cima enquanto a outra perna pousa.
  { swing: [-38, -95, 48] },
  // Passagem: o joelho vem para a frente com o calcanhar recolhido junto ao quadril.
  { swing: [18, -110, 70] },
  // O joelho sobe à frente e a canela começa a abrir.
  { swing: [58, -52, 85] },
  // Voo da outra perna: joelho alto, a canela desce buscando o chão.
  { swing: [70, 6, 100] },
];

/** O corpo nos quatro instantes do passo: quanto o quadril desce abaixo de `k.hy` e a inclinação do tronco. */
const BODY_CYCLE = [
  { sink: 4.3, spine: 149 },
  { sink: 6.6, spine: 145 },
  { sink: 4.4, spine: 146 },
  { sink: 1.7, spine: 150 },
] as const;

/** Ângulo de mundo da cabeça (tronco mais pescoço): o pescoço desfaz quase todo o balanço do tronco. */
const HEAD_ANGLE = 171;
const HEAD_FOLLOW = 0.25;

function runLeg(k: Kit, hip: Vec2, side: number, key: LegKey): LegSpec {
  const rootX = k.cx + HIP_AHEAD + side;
  if ('swing' in key) {
    const [thigh, shin, flex] = key.swing;
    const a = dir(thigh);
    const b = dir(shin);
    return {
      ankle: {
        x: rootX + a.x * BODY_HD.thigh + b.x * BODY_HD.shin,
        y: hip.y + a.y * BODY_HD.thigh + b.y * BODY_HD.shin,
      },
      foot: shin + flex,
      bend: 1,
    };
  }
  // O ponto preso ao chão recua `RUN_STEP` por quadro: o calcanhar enquanto o pé está chapado ou de ponta para cima, a
  // ponta do pé quando o calcanhar sobe.
  const heel = rootX + CONTACT_AHEAD - key.plant * RUN_STEP;
  const lift = key.foot < 90 ? dir(key.foot) : { x: 1, y: 0 };
  return {
    ankle: { x: heel + BODY_HD.foot * (1 - lift.x), y: k.g - BODY_HD.foot * lift.y },
    foot: key.foot,
    bend: 1,
  };
}

/**
 * Braço da corrida para um balanço `swing` de -1 (todo para trás) a 1 (todo para a frente). O braço gira no ombro com
 * o cotovelo dobrado perto de 90 graus: à frente o punho sobe até o peito, atrás o cotovelo sobe e o punho fica junto
 * ao quadril. O antebraço fica sempre em ângulo maior que o do braço, então o cotovelo dobra sempre para o mesmo lado
 * (aponta para trás): é o que impede o braço de "virar ao contrário" de um passo para o outro.
 */
export function runArm(swing: number): ArmTarget {
  const upper = -25 + 60 * swing;
  const fore = upper + 92 + 8 * swing;
  const a = dir(upper);
  const b = dir(fore);
  return {
    rel: { x: a.x * BODY_HD.upperArm + b.x * BODY_HD.foreArm, y: a.y * BODY_HD.upperArm + b.y * BODY_HD.foreArm },
    bend: -1,
  };
}

/**
 * Balanço do braço de perto no quadro `i`. O braço anda em oposição à perna do mesmo lado, numa onda só por ciclo: a
 * perna de perto está toda à frente no quadro 7 (joelho alto) e toda atrás no 3 (acabou de empurrar), e o braço de
 * perto faz o contrário. O braço de longe é o mesmo caminho meio ciclo adiante (o balanço com o sinal trocado). A onda
 * cai entre os quadros: os extremos duram dois quadros (o braço segura no fim do curso, como num bombeio de verdade) e
 * os dois punhos nunca se cruzam no mesmo ponto bem em cima de um quadro.
 */
export const runArmSwing = (i: number): number => -Math.cos((2 * Math.PI * (i + 0.5)) / RUN_FRAMES);

/**
 * Giro do tronco fingido de perfil: o ombro do braço que vai à frente avança com ele e o outro recua. O ombro de perto
 * mede para trás do eixo do peito e o de longe para a frente, então os dois encolhem quando o braço de perto avança.
 */
const SHOULDER_TWIST = 1.5;
const runShoulders = (nearSwing: number): { near: number; far: number } => ({
  near: BODY_HD.shoulderNear - SHOULDER_TWIST * nearSwing,
  far: BODY_HD.shoulderFar - SHOULDER_TWIST * nearSwing,
});

/** Quadril, tronco, cabeça e pernas do quadro `i` da corrida; a corrida com objeto usa as mesmas pernas. */
export function runBody(k: Kit, i: number): Pick<PoseSpec, 'hip' | 'spine' | 'neck' | 'legNear' | 'legFar'> {
  const half = RUN_FRAMES / 2;
  const body = BODY_CYCLE[i % half]!;
  const hip = { x: k.cx + HIP_AHEAD, y: k.hy + body.sink };
  const head = HEAD_ANGLE + (body.spine - 147.5) * HEAD_FOLLOW;
  return {
    hip,
    spine: body.spine,
    neck: head - body.spine,
    legNear: runLeg(k, hip, BODY_HD.pelvisNear, LEG_CYCLE[i % RUN_FRAMES]!),
    legFar: runLeg(k, hip, -BODY_HD.pelvisFar, LEG_CYCLE[(i + half) % RUN_FRAMES]!),
  };
}

/** Quadro `i` (0..7) da corrida: a perna de perto pousa no quadro 0 e a de longe no 4. */
function runFrame(k: Kit, i: number): HdFrameSpec {
  const swing = runArmSwing(i);
  return {
    pose: k.pose({
      ...runBody(k, i),
      armNear: runArm(swing),
      armFar: runArm(-swing),
      shoulders: runShoulders(swing),
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
  const run = Object.fromEntries(Array.from({ length: RUN_FRAMES }, (_, i) => [`run-${i}`, runFrame(k, i)]));
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
