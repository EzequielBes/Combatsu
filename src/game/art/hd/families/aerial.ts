/*
 * Golpes aéreos do player HD: soco aéreo, voadora e pisão. No ar a origem do sprite continua sendo a sola do corpo
 * físico (linha 79), então o corpo fica acima dela: as poses ligam entre si por uma pose de ar recolhida e terminam
 * numa pose de ar (o pouso é da locomoção: `land-0`, `land-1`).
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';

/**
 * Pose de ar recolhida, o fim da volta dos três golpes: o corpo ainda voa (o jogo mostra `land-0` ao tocar o chão),
 * então as pernas ficam dobradas acima do chão, perto da queda da locomoção (`fall-0`), com os punhos já em guarda.
 */
function airborne(k: Kit, lean: number, drop = 0) {
  return k.pose({
    hip: k.at(0, 34 - drop),
    spine: lean,
    neck: 184 - lean,
    armNear: { rel: { x: k.arm * 0.66, y: k.arm * 0.12 }, bend: -1 },
    armFar: { rel: { x: k.arm * 0.36, y: -k.arm * 0.12 }, bend: -1 },
    legNear: { ankle: { x: k.cx + 7, y: k.g - 9 + drop }, foot: 60 },
    legFar: { ankle: { x: k.cx - 7, y: k.g - 13 + drop }, foot: 30 },
  });
}

/** Soco aéreo: o punho arma atrás da cabeça com o corpo arqueado e desce em martelo para a frente. */
function socoAereo(k: Kit): HdMoveSpec {
  const hit = (over: number) => {
    const hip = k.at(1 + over, 37 - over);
    return k.pose({
      hip,
      spine: 150 - over * 6,
      neck: 16,
      shoulderNear: -90,
      armNear: { to: k.at(26 + over, 36 - over * 5), bend: -1 },
      armFar: { rel: { x: -k.arm * 0.2, y: k.arm * 0.4 }, bend: -1 },
      legNear: { ankle: { x: hip.x + 1, y: hip.y + 14 }, foot: 50 },
      legFar: { ankle: { x: hip.x - 18 - over, y: hip.y + 5 - over }, foot: 30 },
    });
  };
  const hipW = k.at(-2, 37);
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: hipW,
      spine: 196,
      neck: -14,
      armNear: { rel: { x: -k.arm * 0.35, y: -k.arm * 0.72 }, bend: 1 },
      armFar: { rel: { x: k.arm * 0.7, y: -k.arm * 0.1 }, bend: -1 },
      legNear: { ankle: { x: hipW.x + 5, y: hipW.y + 15 }, foot: 60 },
      legFar: { ankle: { x: hipW.x - 9, y: hipW.y + 13 }, foot: 40 },
    }),
    hit: hit(0),
    over: hit(1),
    recover: airborne(k, 164),
    back: airborne(k, 164),
  };
}

/** Voadora: a perna de perto estende na diagonal da queda com a sola no alvo, a outra recolhe sob o corpo. */
function voadora(k: Kit): HdMoveSpec {
  const hit = (over: number) => {
    const hip = k.at(-2 + over, 40);
    return k.pose({
      hip,
      spine: 228 + over * 3,
      neck: -44,
      armNear: { rel: { x: -k.arm * 0.62 - over, y: k.arm * 0.5 }, bend: 1 },
      armFar: { rel: { x: k.arm * 0.55, y: k.arm * 0.02 }, bend: -1 },
      legNear: { ankle: { x: hip.x + 23.5 + over, y: hip.y + 11.5 }, foot: 130 },
      legFar: { ankle: { x: hip.x + 4, y: hip.y + 8 }, foot: 60 },
    });
  };
  const air = (ahead: number, up: number, spine: number, near: [number, number, number], arms: number) => {
    const hip = k.at(ahead, up);
    return k.pose({
      hip,
      spine,
      neck: 180 - spine + 4,
      armNear: { rel: { x: k.arm * arms, y: k.arm * 0.2 }, bend: -1 },
      armFar: { rel: { x: k.arm * 0.4, y: -k.arm * 0.15 }, bend: -1 },
      legNear: { ankle: { x: hip.x + near[0], y: hip.y + near[1] }, foot: near[2] },
      legFar: { ankle: { x: hip.x - 4, y: hip.y + 12 }, foot: 50 },
    });
  };
  return {
    strike: 'footNear',
    wind: air(-3, 37, 168, [4, 9, 80], 0.5),
    mid: air(-3, 37, 192, [10, 6, 120], 0.1),
    hit: hit(0),
    over: hit(1),
    down: air(-1, 34, 184, [10, 13, 100], 0.4),
    recover: airborne(k, 176),
    back: airborne(k, 176),
  };
}

/** Pisão: os joelhos sobem com os braços erguidos e o corpo desaba sobre a perna que pisa, travada para baixo. */
function pisao(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (over: number) => {
    const hip = k.at(0, 31 - over);
    return k.pose({
      hip,
      spine: 158 - over * 3,
      neck: 22,
      armNear: { rel: { x: -A * 0.4 - over, y: A * 0.55 - over * 2 }, bend: 1 },
      armFar: { rel: { x: A * 0.5, y: A * 0.45 + over }, bend: -1 },
      legNear: { ankle: { x: hip.x + 7, y: hip.y + 27 }, foot: 115 },
      legFar: { ankle: { x: hip.x - 9 - over, y: hip.y + 9 - over }, foot: 30 },
    });
  };
  const hipW = k.at(-1, 39);
  return {
    strike: 'footNear',
    expr: 'shout',
    wind: k.pose({
      hip: hipW,
      spine: 170,
      neck: 12,
      armNear: { rel: { x: -A * 0.35, y: -A * 0.8 }, bend: 1 },
      armFar: { rel: { x: A * 0.5, y: -A * 0.75 }, bend: -1 },
      legNear: { ankle: { x: hipW.x + 7, y: hipW.y + 4 }, foot: 70 },
      legFar: { ankle: { x: hipW.x - 3, y: hipW.y + 10 }, foot: 40 },
    }),
    hit: hit(0),
    over: hit(1),
    recover: airborne(k, 166, 3),
    back: airborne(k, 166, 3),
  };
}

export function aerialFamily(k: Kit): HdFamily {
  return { moves: { socoAereo: socoAereo(k), voadora: voadora(k), pisao: pisao(k) } };
}
