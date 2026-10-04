/*
 * Chutes do player HD: frontal, alto, joelhada e empurrão (aqui) e giratório, rasteira e carregado (`kicks2.ts`).
 * Todo chute tem câmara (o joelho sobe dobrado antes de a perna estender e recolhe de novo na volta) e é vendido pela
 * perna de apoio e pelo tronco em contrapeso.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import { chargedKick, kickKit, spinKick, sweep, type KickKit } from './kicks2';

/** Chute frontal: câmara curta e estalo da perna da frente subindo em diagonal até o tronco do alvo. */
function frontKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(-2.5 + over * 1.5, 3),
      spine: 202 + over * 3,
      neck: -16,
      armNear: t.arm(-0.5, 0.7, 1),
      armFar: t.arm(0.4, -0.05),
      legNear: t.leg(26 + over * 2, 29 + over, 125),
      legFar: t.plantFar(0, over),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      hip: t.hip(-4, 3),
      spine: 174,
      neck: 6,
      armNear: t.arm(0.5, 0.2),
      armFar: t.arm(0.38, -0.08),
      legNear: t.leg(6, 17, 45),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      hip: t.hip(-3.5, 2),
      spine: 186,
      neck: -4,
      armNear: t.arm(0.1, 0.7),
      armFar: t.arm(0.4, -0.05),
      legNear: t.leg(15, 20, 80),
      legFar: t.plantFar(),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(-3, 2.5),
      spine: 182,
      neck: 0,
      armNear: t.arm(0.3, 0.5),
      armFar: t.arm(0.4, -0.05),
      legNear: t.leg(9, 16, 50),
      legFar: t.plantFar(),
    }),
    recover: k.guard(2.4),
  };
}

/** Chute alto: a perna de apoio estica na ponta do pé, o tronco deita para trás e o pé sobe até a cabeça do alvo. */
function highKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(-2 + over, -1.5),
      spine: 214 + over * 4,
      neck: -26,
      armNear: t.arm(-0.7, 0.6, 1),
      armFar: t.arm(0.45, 0.25),
      legNear: t.leg(23 + over, 42 + over * 2, 130),
      legFar: t.plantFar(1, 2),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      hip: t.hip(-4, 3),
      spine: 178,
      neck: 4,
      armNear: t.arm(0.45, 0.1),
      armFar: t.arm(0.38, -0.08),
      legNear: t.leg(6, 22, 40),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      hip: t.hip(-3, 0.5),
      spine: 198,
      neck: -12,
      armNear: t.arm(-0.2, 0.75, 1),
      armFar: t.arm(0.42, 0.1),
      legNear: t.leg(15, 30, 80),
      legFar: t.plantFar(0, 1),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(-3, 2),
      spine: 190,
      neck: -6,
      armNear: t.arm(0.1, 0.75),
      armFar: t.arm(0.4, 0),
      legNear: t.leg(10, 22, 50),
      legFar: t.plantFar(),
    }),
    recover: k.guard(3),
  };
}

/** Joelhada: entra, agarra a cabeça do alvo com as duas mãos e a puxa para baixo contra o joelho que sobe. */
function kneeStrike(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(5 + over, 0.5 - over),
      spine: 198 + over * 3,
      neck: -8,
      armNear: t.armTo(11, 44 - over * 2),
      armFar: t.armTo(14, 46 - over * 2),
      legNear: t.leg(18, 21 + over * 2, 30),
      legFar: t.plantFar(4, 2 + over * 0.5),
    });
  return {
    strike: 'kneeNear',
    hands: { near: 'open', far: 'open' },
    wind: k.pose({
      hip: t.hip(1, 4.5),
      spine: 170,
      neck: 8,
      armNear: t.armTo(18, 46),
      armFar: t.armTo(21, 47),
      legNear: t.plantNear(-3, 1),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      hip: t.hip(2.5, 2),
      spine: 180,
      neck: 4,
      armNear: t.armTo(17, 45),
      armFar: t.armTo(20, 46),
      legNear: t.leg(9, 13, 30),
      legFar: t.plantFar(2, 1),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(2, 2.5),
      spine: 180,
      neck: 4,
      armNear: t.arm(0.6, 0.3),
      armFar: t.arm(0.4, 0),
      legNear: t.leg(10, 12, 50),
      legFar: t.plantFar(2),
    }),
    recover: k.guard(2.4),
  };
}

/** Chute de empurrão: joelho no peito e a sola inteira empurra o alvo, com o quadril e o corpo todo atrás do pé. */
function pushKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(0 + over * 2, 2.5),
      spine: 212 + over * 3,
      neck: -24,
      armNear: t.arm(-0.6, 0.65, 1),
      armFar: t.arm(0.35, 0.1),
      legNear: t.leg(27 + over * 2.5, 23, 178),
      legFar: t.plantFar(over * 2, 1 + over),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      hip: t.hip(-5, 4),
      spine: 170,
      neck: 8,
      armNear: t.arm(0.45, 0.15),
      armFar: t.arm(0.38, -0.08),
      legNear: t.leg(5, 21, 120),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      hip: t.hip(-3, 3),
      spine: 190,
      neck: -6,
      armNear: t.arm(0.2, 0.6),
      armFar: t.arm(0.3, 0.3),
      legNear: t.leg(14, 24, 160),
      legFar: t.plantFar(),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(-1, 3),
      spine: 186,
      neck: -2,
      armNear: t.arm(0.3, 0.5),
      armFar: t.arm(0.38, 0),
      legNear: t.leg(11, 15, 70),
      legFar: t.plantFar(1),
    }),
    recover: k.guard(2.8),
  };
}

export function kicksFamily(k: Kit): HdFamily {
  const t = kickKit(k);
  const front = frontKick(k, t);
  return {
    moves: {
      chuteFrontal: front,
      // Nome antigo que o jogo ainda usa numa animação (`kick-wind/hit/recover`).
      kick: front,
      chuteAlto: highKick(k, t),
      joelhada: kneeStrike(k, t),
      chuteGiratorio: spinKick(k, t),
      rasteira: sweep(k, t),
      chuteEmpurrao: pushKick(k, t),
      chuteCarregado: chargedKick(k, t),
    },
  };
}
