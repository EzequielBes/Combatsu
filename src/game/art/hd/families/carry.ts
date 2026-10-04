/*
 * Player HD com objeto: parado e correndo com o objeto na mão, o golpe com o objeto e o arremesso.
 *
 * O objeto não faz parte do sprite: com `?hd=1` o jogo o desenha por cima, preso à mão do quadro (`hdAnchors`). O
 * objeto leve (garrafa, faca) fica na mão de perto; o pesado (cadeira, clava) na de longe; no golpe, na de perto,
 * deitado. Como o sprite não sabe qual objeto é, as duas mãos ficam sempre onde qualquer um dos dois faça sentido: a
 * de perto segurando à frente na altura da cintura, a de longe erguida ao lado do ombro de trás.
 */
import type { HdFamily, HdFrameSpec, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import type { Pose, Vec2 } from '../../rig/skeleton';

/** Mão de perto: o objeto leve à frente, na altura da cintura. */
const frontGrip = (k: Kit, dx = 0, dy = 0): Vec2 => k.at(12 + dx, 31 + dy);
/** Mão de longe: o objeto pesado apoiado no ombro de trás. */
const backGrip = (k: Kit, dx = 0, dy = 0): Vec2 => k.at(-9 + dx, 41 + dy);

/** Base armada: joelhos dobrados, uma mão à frente na cintura e a outra erguida no ombro de trás. */
function hold(k: Kit, sink: number): Pose {
  return k.pose({
    hip: { x: k.cx - 0.4, y: k.hy + 4.2 + sink },
    spine: 168,
    neck: 9,
    armNear: { to: frontGrip(k, 0, -sink * 0.7), bend: -1 },
    armFar: { to: backGrip(k, 0, -sink * 0.7), bend: 1 },
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  });
}

interface Leg {
  ahead: number;
  up: number;
  foot: number;
}

/** Os dois instantes do passo da corrida comum que a corrida com objeto usa: contato e impulso. */
const STRIDE = [
  { lead: { ahead: 17, up: 1.2, foot: 108 }, trail: { ahead: -17, up: 5.5, foot: 14 }, hipX: 3, sink: 4.6, bob: 0 },
  { lead: { ahead: -9, up: 1.6, foot: 58 }, trail: { ahead: 12, up: 14, foot: 72 }, hipX: 4.2, sink: 3.4, bob: 1.2 },
] as const;

/** Corrida com o objeto: o contato e o impulso de cada perna da corrida comum, com os braços presos ao objeto. */
function carryRun(k: Kit): Record<string, HdFrameSpec> {
  const frame = (i: number): HdFrameSpec => {
    const s = STRIDE[i % 2]!;
    const nearLeads = i < 2;
    const leg = (l: Leg) => ({ ankle: { x: k.cx + s.hipX + l.ahead, y: k.g - l.up }, foot: l.foot });
    const sway = nearLeads ? -1 : 1;
    return {
      pose: k.pose({
        hip: { x: k.cx + s.hipX, y: k.hy + s.sink },
        spine: 150,
        neck: 22,
        armNear: { to: frontGrip(k, 3 + sway, s.bob - 1), bend: -1 },
        armFar: { to: backGrip(k, 3 - sway, s.bob - 1), bend: 1 },
        legNear: leg(nearLeads ? s.lead : s.trail),
        legFar: leg(nearLeads ? s.trail : s.lead),
      }),
    };
  };
  return Object.fromEntries([0, 1, 2, 3].map((i) => [`carry-run-${i}`, frame(i)]));
}

/** Pico da pancada: o corpo vai sobre a perna da frente e o braço estica na altura do tronco do alvo. `over` atravessa. */
function swingHit(k: Kit, over: number): Pose {
  const grip = k.at(31 + over, 31 - over * 7);
  return k.pose({
    hip: { x: k.cx + 5 + over * 1.5, y: k.hy + 6.5 + over * 1.5 },
    spine: 150 - over * 5,
    neck: 24 + over * 3,
    shoulderNear: -90,
    armNear: { to: grip, bend: -1 },
    armFar: { to: { x: grip.x - 4, y: grip.y + 1 }, bend: -1 },
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 1.4 - over * 1.4 }, foot: 62 - over * 14 },
  });
}

/** A pancada de cadeira: recolhe o objeto atrás do ombro, passa por cima da cabeça e desce com o corpo inteiro. */
function swing(k: Kit): HdMoveSpec {
  const feet = {
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  };
  return {
    strike: 'handNear',
    expr: 'shout',
    wind: k.pose({
      hip: { x: k.cx - 4, y: k.hy + 5.5 },
      spine: 191,
      neck: -6,
      armNear: { to: k.at(-19, 53), bend: -1 },
      armFar: { to: k.at(-16, 50), bend: -1 },
      legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 0.8 }, foot: 76 },
      legFar: feet.legFar,
    }),
    mid: k.pose({
      hip: { x: k.cx + 1.5, y: k.hy + 3 },
      spine: 166,
      neck: 10,
      shoulderNear: -90,
      armNear: { to: k.at(24, 54), bend: 1 },
      armFar: { to: k.at(20, 55), bend: 1 },
      ...feet,
    }),
    hit: swingHit(k, 0),
    over: swingHit(k, 1),
    down: k.pose({
      hip: { x: k.cx + 4, y: k.hy + 8.5 },
      spine: 150,
      neck: 22,
      shoulderNear: -90,
      armNear: { to: k.at(23, 20), bend: -1 },
      armFar: { to: k.at(18, 22), bend: -1 },
      ...feet,
    }),
    recover: hold(k, 2.6),
  };
}

/** Arremesso: o braço arma atrás com o peso na perna de trás e solta com o corpo inteiro indo junto. */
function throwFrames(k: Kit): Record<string, HdFrameSpec> {
  return {
    'throw-0': {
      pose: k.pose({
        hip: { x: k.cx - 4.5, y: k.hy + 5.5 },
        spine: 193,
        neck: -8,
        armNear: { to: k.at(-19, 52), bend: -1 },
        armFar: { rel: { x: k.arm * 0.82, y: -k.arm * 0.1 }, bend: -1 },
        legNear: { ankle: { x: k.cx + 11, y: k.g - 0.8 }, foot: 76 },
        legFar: { ankle: { x: k.cx - 9, y: k.g }, foot: 90 },
      }),
      expr: 'effort',
      hands: { far: 'open' },
    },
    'throw-1': {
      pose: k.pose({
        hip: { x: k.cx + 8, y: k.hy + 6 },
        spine: 146,
        neck: 22,
        shoulderNear: -90,
        armNear: { to: k.at(32, 38), bend: -1 },
        armFar: { to: k.at(-9, 30), bend: 1 },
        legNear: { ankle: { x: k.cx + 15, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx - 13, y: k.g - 6 }, foot: 28 },
      }),
      expr: 'effort',
      hands: { near: 'open' },
    },
  };
}

export function carryFamily(k: Kit): HdFamily {
  return {
    frames: {
      'carry-idle-0': { pose: hold(k, 0) },
      'carry-idle-1': { pose: hold(k, 1) },
      ...carryRun(k),
      ...throwFrames(k),
    },
    moves: { swing: swing(k) },
  };
}
