/*
 * Chutes do player HD: frontal, alto, joelhada e empurrão (aqui) e giratório, rasteira e carregado (`kicks2.ts`).
 * Todo chute tem câmara (o joelho sobe dobrado antes de a perna estender e recolhe de novo na volta) e é vendido pela
 * perna de apoio e pelo tronco em contrapeso.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import { chargedKick, kickKit, spinKick, sweep, type KickKit } from './kicks2';

/**
 * Chute frontal (o chute do botão básico): o joelho sobe dobrado até a altura do alvo, a canela estala em torno do
 * joelho parado e o pé bate com a bola do pé, de tornozelo flexionado. O pé de apoio não sai do lugar, o quadril
 * avança no estalo e o tronco deita para trás em contrapeso; a volta passa pela mesma câmara.
 */
function frontKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      ...t.nearKick(1.5 + over, 1.5 + over * 0.6, 108, 100 + over * 6, 55),
      spine: 200 + over * 3,
      neck: -17,
      armNear: t.arm(-0.35, 0.75, 1),
      armFar: t.arm(0.4, -0.05),
      legFar: t.plantFar(),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      ...t.nearKick(-4, 2.5, 122, -20, 95),
      spine: 178,
      neck: 2,
      armNear: t.arm(0.45, 0.3),
      armFar: t.arm(0.38, -0.08),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      ...t.nearKick(-2, 2, 126, 52, 85),
      spine: 187,
      neck: -6,
      armNear: t.arm(0.05, 0.75),
      armFar: t.arm(0.4, -0.05),
      legFar: t.plantFar(),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      ...t.nearKick(-2.5, 2, 120, -8, 95),
      spine: 185,
      neck: -4,
      armNear: t.arm(0.25, 0.6),
      armFar: t.arm(0.4, -0.05),
      legFar: t.plantFar(),
    }),
    recover: k.guard(2.4),
  };
}

/**
 * Chute alto: câmara alta e fechada, a perna de apoio estica na ponta do pé e a perna sobe numa linha só do quadril ao
 * peito do pé, em ponta, com o tronco deitado para trás na continuação dessa linha.
 */
function highKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      ...t.nearKick(-2 + over, 0, 127 + over * 2, 121 + over * 6, 15),
      spine: 213 + over * 4,
      neck: -24,
      armNear: t.arm(-0.6, 0.55, 1),
      armFar: t.arm(0.42, 0.15),
      legFar: t.plantFar(0.4, 1.2),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      ...t.nearKick(-4, 2.5, 130, -12, 70),
      spine: 180,
      neck: 2,
      armNear: t.arm(0.45, 0.2),
      armFar: t.arm(0.38, -0.08),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      ...t.nearKick(-3, 1, 136, 44, 30),
      spine: 200,
      neck: -14,
      armNear: t.arm(-0.2, 0.75, 1),
      armFar: t.arm(0.42, 0.1),
      legFar: t.plantFar(0.2, 0.6),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      ...t.nearKick(-3, 1.5, 128, 8, 70),
      spine: 192,
      neck: -8,
      armNear: t.arm(0.1, 0.75),
      armFar: t.arm(0.4, 0),
      legFar: t.plantFar(),
    }),
    recover: k.guard(3),
  };
}

/** Joelhada: entra, agarra a cabeça do alvo com as duas mãos e a puxa para baixo contra o joelho que sobe. */
function kneeStrike(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(6 + over, 0.5),
      spine: 192 + over * 2,
      neck: -6,
      armNear: t.armTo(17, 31 - over * 2),
      armFar: t.armTo(20, 33 - over * 2),
      legNear: t.leg(18, 24 + over * 2, 30),
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
      armNear: t.armTo(18, 40),
      armFar: t.armTo(21, 42),
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

/**
 * Chute de empurrão: joelho no peito com a sola já virada para o alvo, e a sola inteira empurra em linha reta com o
 * quadril atrás do pé. O calcanhar de apoio sobe um pouco no empurrão, sem o pé sair do lugar.
 */
function pushKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      ...t.nearKick(3 + over * 1.5, 2.5 + over, 86 - over * 2, 76 + over * 4, 92),
      spine: 200 + over * 2,
      neck: -16,
      armNear: t.arm(-0.5, 0.6, 1),
      armFar: t.arm(0.35, 0.05),
      legFar: t.plantFar(0.3 + over * 0.3, 0.5 + over * 0.7),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      ...t.nearKick(-5, 4, 136, 8, 100),
      spine: 172,
      neck: 6,
      armNear: t.arm(0.45, 0.2),
      armFar: t.arm(0.38, -0.08),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      ...t.nearKick(-2.5, 3, 118, 46, 96),
      spine: 190,
      neck: -8,
      armNear: t.arm(0.1, 0.7),
      armFar: t.arm(0.36, 0),
      legFar: t.plantFar(),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      ...t.nearKick(-1.5, 3, 122, 14, 95),
      spine: 186,
      neck: -4,
      armNear: t.arm(0.3, 0.55),
      armFar: t.arm(0.38, 0),
      legFar: t.plantFar(),
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
