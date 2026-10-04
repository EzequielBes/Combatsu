/*
 * Player HD com objeto: parado e correndo com o objeto na mão, o golpe com o objeto e o arremesso.
 *
 * O objeto não faz parte do sprite: o jogo o desenha por cima, num ponto fixo em relação ao centro do corpo físico
 * (18 texels acima da sola), conforme a tabela `SOCKET` de `src/game/Prop.ts`. As mãos vão a esses pontos: a de perto
 * segura o objeto leve à frente (garrafa, faca), a de longe o pesado às costas (cadeira, clava), e no pico do golpe as
 * duas se juntam onde o objeto aparece deitado.
 */
import type { HdFamily, HdFrameSpec, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import type { Pose, Vec2 } from '../../rig/skeleton';

/** Onde o jogo desenha o objeto, em texels à frente do eixo e acima do chão (`SOCKET` de `Prop.ts`). */
const SOCKET = {
  front: { ahead: 14, up: 16 },
  back: { ahead: -8, up: 34 },
  swing: { ahead: 22, up: 20 },
} as const;

/** A mão de perto segura o objeto leve pelo alto (o gargalo da garrafa), acima do centro dele. */
const frontGrip = (k: Kit, dx = 0, dy = 0): Vec2 => k.at(SOCKET.front.ahead - 2.5 + dx, SOCKET.front.up + 6 + dy);
/** A mão de longe prende o objeto pesado às costas. */
const backGrip = (k: Kit, dx = 0, dy = 0): Vec2 => k.at(SOCKET.back.ahead + dx, SOCKET.back.up + dy);

/** Base armada: joelhos dobrados, o objeto leve baixo à frente e o pesado preso às costas. `sink` abaixa o quadril. */
function hold(k: Kit, sink: number): Pose {
  return k.pose({
    hip: { x: k.cx - 0.4, y: k.hy + 4.6 + sink },
    spine: 166,
    neck: 11,
    shoulderNear: -90,
    armNear: { to: frontGrip(k, 0, -sink * 0.4), bend: -1 },
    armFar: { to: backGrip(k, 0, -sink * 0.4), bend: 1 },
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  });
}

/** Corrida com o objeto: a passada de uma corrida comum, com os braços presos ao objeto. */
function carryRun(k: Kit): Record<string, HdFrameSpec> {
  const body = (rise: number, sway: number) => ({
    hip: { x: k.cx + 1.5, y: k.hy + 4.2 - rise },
    spine: 153,
    neck: 20,
    shoulderNear: -90,
    armNear: { to: frontGrip(k, sway, 0), bend: -1 as const },
    armFar: { to: backGrip(k, -sway, 0), bend: 1 as const },
  });
  return {
    // Contato: a perna de perto chega à frente e a de longe empurra na ponta do pé.
    'carry-run-0': {
      pose: k.pose({
        ...body(0, 1),
        legNear: { ankle: { x: k.cx + 15, y: k.g - 1.6 }, foot: 102 },
        legFar: { ankle: { x: k.cx - 14, y: k.g - 3 }, foot: 40 },
      }),
    },
    // Passagem: o peso na perna de perto e o joelho de longe subindo à frente.
    'carry-run-1': {
      pose: k.pose({
        ...body(2.6, 0),
        legNear: { ankle: { x: k.cx + 1, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx - 6, y: k.g - 11 }, foot: 28 },
      }),
    },
    // Contato trocado.
    'carry-run-2': {
      pose: k.pose({
        ...body(0, -1),
        legNear: { ankle: { x: k.cx - 14, y: k.g - 3 }, foot: 40 },
        legFar: { ankle: { x: k.cx + 15, y: k.g - 1.6 }, foot: 102 },
      }),
    },
    // Passagem trocada.
    'carry-run-3': {
      pose: k.pose({
        ...body(2.6, 0),
        legNear: { ankle: { x: k.cx - 6, y: k.g - 11 }, foot: 28 },
        legFar: { ankle: { x: k.cx + 1, y: k.g }, foot: 90 },
      }),
    },
  };
}

/** Pico da pancada: o corpo dobra sobre a perna da frente e as duas mãos descem até o objeto. `over` atravessa. */
function swingHit(k: Kit, over: number): Pose {
  const grip = k.at(SOCKET.swing.ahead + 1 + over, SOCKET.swing.up + 2 - over * 6);
  return k.pose({
    hip: { x: k.cx - 0.5 + over * 1.5, y: k.hy + 4.5 + over * 3 },
    spine: 135 - over * 6,
    neck: 30 + over * 4,
    shoulderNear: -90,
    armNear: { to: grip, bend: -1 },
    armFar: { to: { x: grip.x - 3, y: grip.y - 2 }, bend: -1 },
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
    headOverNearArm: true,
    wind: k.pose({
      hip: { x: k.cx - 4, y: k.hy + 5.5 },
      spine: 191,
      neck: -6,
      armNear: { to: k.at(-25, 45), bend: -1 },
      armFar: { to: k.at(-21, 41), bend: -1 },
      legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 0.8 }, foot: 76 },
      legFar: feet.legFar,
    }),
    mid: k.pose({
      hip: { x: k.cx + 1.5, y: k.hy + 3 },
      spine: 166,
      neck: 10,
      shoulderNear: -90,
      armNear: { to: k.at(21, 54), bend: 1 },
      armFar: { to: k.at(17, 55), bend: 1 },
      ...feet,
    }),
    hit: swingHit(k, 0),
    over: swingHit(k, 1),
    down: k.pose({
      hip: { x: k.cx + 0.5, y: k.hy + 8.5 },
      spine: 142,
      neck: 22,
      shoulderNear: -90,
      armNear: { to: k.at(19, 17), bend: -1 },
      armFar: { to: k.at(15, 20), bend: -1 },
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
