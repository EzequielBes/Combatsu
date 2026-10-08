/*
 * Segundo e terceiro golpes com objeto do player HD (o primeiro de cada pegada mora em `carry.ts`). Com eles, cada
 * pegada tem um combo de três golpes de silhuetas diferentes:
 * - leve (faca, lâmina, garrafa): corte em diagonal, revés na horizontal e estocada com passo à frente;
 * - pesada (porrete, bastão, cadeira): pancada por cima, varrida lateral e golpe de baixo para cima.
 * O objeto não faz parte do sprite: o jogo o prende à mão de perto, então é a mão que desenha o arco do golpe.
 */
import type { HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import type { Pose } from '../../rig/skeleton';

/** Pose de carregar da pegada (`sink` afunda o quadril); vem de `carry.ts`, para a volta do golpe casar com ela. */
type Hold = (k: Kit, sink: number) => Pose;

const planted = (k: Kit) => ({
  legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
  legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
});

/** Perna da frente plantada e a de trás no bico do pé, empurrando: `push` levanta o calcanhar. */
const driving = (k: Kit, step: number, push: number) => ({
  legNear: { ankle: { x: k.cx + k.stance.near + step, y: k.g }, foot: 90 },
  legFar: { ankle: { x: k.cx + k.stance.far - 1, y: k.g - 1.2 - push }, foot: 64 - push * 12 },
});

/**
 * Revés: a arma cruza o peito até o ombro de longe e volta na horizontal, à altura do pescoço, abrindo o tronco. É
 * o golpe mais curto dos três: liga o corte em diagonal à estocada.
 */
function backhand(k: Kit, hold: Hold): HdMoveSpec {
  const hit = (over: number): Pose =>
    k.pose({
      hip: { x: k.cx + 4.5 + over, y: k.hy + 5.5 },
      spine: 162 - over * 3,
      neck: 12 + over * 2,
      shoulderNear: -90,
      armNear: { to: k.at(33 - over * 2, 41 + over * 6), bend: -1 },
      armFar: { rel: { x: -k.arm * 0.12, y: k.arm * 0.16 }, bend: -1 },
      ...driving(k, 0, over),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 2, y: k.hy + 4.5 },
      spine: 176,
      neck: 6,
      armNear: { to: k.at(-2, 39), bend: 1 },
      armFar: { rel: { x: k.arm * 0.36, y: k.arm * 0.02 }, bend: -1 },
      ...planted(k),
    }),
    mid: k.pose({
      hip: { x: k.cx + 1, y: k.hy + 5 },
      spine: 169,
      neck: 9,
      shoulderNear: -60,
      armNear: { to: k.at(15, 40), bend: -1 },
      armFar: { rel: { x: k.arm * 0.16, y: k.arm * 0.08 }, bend: -1 },
      ...planted(k),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: { x: k.cx + 3.5, y: k.hy + 5 },
      spine: 164,
      neck: 12,
      shoulderNear: -60,
      armNear: { to: k.at(23, 40), bend: -1 },
      armFar: { rel: { x: k.arm * 0.1, y: k.arm * 0.1 }, bend: -1 },
      ...planted(k),
    }),
    recover: hold(k, 2),
    back: hold(k, 0),
  };
}

/**
 * Estocada: a mão recolhe junto às costelas com o peso atrás e dispara reta, com um passo fundo da perna da frente
 * e o tronco deitado na linha do braço. Fecha o combo: é o golpe de maior alcance e o de volta mais lenta.
 */
function thrust(k: Kit, hold: Hold): HdMoveSpec {
  const hit = (over: number): Pose =>
    k.pose({
      hip: { x: k.cx + 9 + over * 1.5, y: k.hy + 9 + over * 0.5 },
      spine: 148 - over * 3,
      neck: 26 + over * 2,
      shoulderNear: -90,
      armNear: { to: k.at(39 + over * 1.5, 36), bend: -1 },
      armFar: { rel: { x: -k.arm * 0.34, y: k.arm * 0.06 }, bend: 1 },
      ...driving(k, 7, 1 + over),
    });
  return {
    strike: 'handNear',
    expr: 'effort',
    wind: k.pose({
      hip: { x: k.cx - 4, y: k.hy + 6.5 },
      spine: 182,
      neck: 0,
      armNear: { to: k.at(-1, 34), bend: 1 },
      armFar: { rel: { x: k.arm * 0.62, y: -k.arm * 0.04 }, bend: -1 },
      legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 0.8 }, foot: 78 },
      legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
    }),
    mid: k.pose({
      hip: { x: k.cx + 2.5, y: k.hy + 7 },
      spine: 164,
      neck: 14,
      shoulderNear: -70,
      armNear: { to: k.at(18, 35), bend: 1 },
      armFar: { rel: { x: k.arm * 0.2, y: k.arm * 0.02 }, bend: -1 },
      ...driving(k, 4, 0),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: { x: k.cx + 6, y: k.hy + 8 },
      spine: 156,
      neck: 20,
      shoulderNear: -70,
      armNear: { to: k.at(27, 34), bend: -1 },
      armFar: { rel: { x: -k.arm * 0.1, y: k.arm * 0.06 }, bend: -1 },
      ...driving(k, 5, 0),
    }),
    recover: hold(k, 3),
    back: hold(k, 0),
  };
}

/**
 * Varrida: o peso sai do ombro para trás do quadril e atravessa na horizontal, à altura do peito, com as duas mãos
 * e o tronco girando junto. Pega mais de um inimigo lado a lado.
 */
function sweep(k: Kit, hold: Hold): HdMoveSpec {
  const hit = (over: number): Pose => {
    const grip = k.at(31 - over * 3, 37 + over * 8);
    return k.pose({
      hip: { x: k.cx + 6 + over, y: k.hy + 7 },
      spine: 156 - over * 2,
      neck: 16 + over * 3,
      shoulderNear: -90,
      armNear: { to: grip, bend: -1 },
      armFar: { to: { x: grip.x - 4, y: grip.y - 1 }, bend: -1 },
      ...driving(k, 1, over),
    });
  };
  return {
    strike: 'handNear',
    expr: 'effort',
    wind: k.pose({
      hip: { x: k.cx - 4, y: k.hy + 6.5 },
      spine: 186,
      neck: -2,
      armNear: { to: k.at(-16, 37), bend: 1 },
      armFar: { to: k.at(-12, 35), bend: 1 },
      legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 0.8 }, foot: 76 },
      legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
    }),
    mid: k.pose({
      hip: { x: k.cx, y: k.hy + 6 },
      spine: 172,
      neck: 8,
      shoulderNear: -60,
      armNear: { to: k.at(8, 33), bend: -1 },
      armFar: { to: k.at(4, 31), bend: -1 },
      ...planted(k),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: { x: k.cx + 4, y: k.hy + 7 },
      spine: 160,
      neck: 16,
      shoulderNear: -60,
      armNear: { to: k.at(21, 33), bend: -1 },
      armFar: { to: k.at(17, 31), bend: -1 },
      ...planted(k),
    }),
    recover: hold(k, 3),
    back: hold(k, 0),
  };
}

/**
 * Golpe de baixo para cima: o corpo agacha com o peso atrás, perto do chão, e levanta junto com a arma num arco que
 * termina acima da cabeça. Fecha o combo pesado, e o corpo fica esticado e aberto na volta.
 */
function riser(k: Kit, hold: Hold): HdMoveSpec {
  return {
    strike: 'handNear',
    expr: 'shout',
    wind: k.pose({
      hip: { x: k.cx - 3, y: k.hy + 10 },
      spine: 160,
      neck: 12,
      armNear: { to: k.at(-10, 15), bend: -1 },
      armFar: { to: k.at(-6, 17), bend: -1 },
      ...planted(k),
    }),
    mid: k.pose({
      hip: { x: k.cx + 1.5, y: k.hy + 8 },
      spine: 162,
      neck: 12,
      shoulderNear: -60,
      armNear: { to: k.at(15, 19), bend: -1 },
      armFar: { to: k.at(11, 21), bend: -1 },
      ...planted(k),
    }),
    hit: k.pose({
      hip: { x: k.cx + 4.5, y: k.hy + 3.5 },
      spine: 174,
      neck: 2,
      shoulderNear: -90,
      armNear: { to: k.at(28, 50), bend: -1 },
      armFar: { to: k.at(24, 48), bend: -1 },
      ...driving(k, 1, 0.6),
    }),
    over: k.pose({
      hip: { x: k.cx + 4, y: k.hy + 1.5 },
      spine: 184,
      neck: -8,
      shoulderNear: -90,
      armNear: { to: k.at(16, 65), bend: -1 },
      armFar: { to: k.at(12, 63), bend: -1 },
      ...driving(k, 1, 1.4),
    }),
    down: k.pose({
      hip: { x: k.cx + 1.5, y: k.hy + 3 },
      spine: 180,
      neck: -2,
      armNear: { to: k.at(-9, 57), bend: 1 },
      armFar: { to: k.at(-6, 54), bend: 1 },
      ...planted(k),
    }),
    recover: hold(k, 3),
    back: hold(k, 0),
  };
}

/** Os golpes 2 e 3 de cada pegada, com os nomes que o animador procura (`swing-2`, `heavy-swing-3`...). */
export function extraSwings(k: Kit, holdLight: Hold, holdHeavy: Hold, heavyPrefix: string): Record<string, HdMoveSpec> {
  return {
    'swing-2': backhand(k, holdLight),
    'swing-3': thrust(k, holdLight),
    [`${heavyPrefix}swing-2`]: sweep(k, holdHeavy),
    [`${heavyPrefix}swing-3`]: riser(k, holdHeavy),
  };
}
