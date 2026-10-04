/*
 * Golpes aéreos do player HD: soco aéreo, voadora e pisão. No ar a origem do sprite continua sendo a sola do corpo
 * físico (linha 79), então o corpo fica acima dela: as poses ligam entre si por uma pose de ar recolhida e terminam
 * num pouso agachado, de onde o motor interpola para a guarda.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';

/** Pouso agachado: os pés na base da guarda, o quadril fundo, o tronco fechado e as mãos baixas. */
function landing(k: Kit, sink: number, lean = 158) {
  return k.pose({
    hip: { x: k.cx - 1, y: k.hy + sink },
    spine: lean,
    neck: 16,
    armNear: { rel: { x: k.arm * 0.5, y: k.arm * 0.5 }, bend: -1 },
    armFar: { rel: { x: k.arm * 0.3, y: k.arm * 0.2 }, bend: -1 },
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 1.5 }, foot: 62 },
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
      armNear: { to: k.at(25 + over, 33 - over * 5), bend: -1 },
      armFar: { rel: { x: -k.arm * 0.2, y: k.arm * 0.4 }, bend: -1 },
      legNear: { ankle: { x: hip.x + 1, y: hip.y + 14 }, foot: 50 },
      legFar: { ankle: { x: hip.x - 18 - over, y: hip.y + 5 - over }, foot: 10 },
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
    recover: landing(k, 9),
  };
}

/** Voadora: a perna de perto estende na diagonal da queda com a sola no alvo, a outra recolhe sob o corpo. */
function voadora(k: Kit): HdMoveSpec {
  const hit = (over: number) => {
    const hip = k.at(-2 + over, 37);
    return k.pose({
      hip,
      spine: 216 + over * 4,
      neck: -28,
      armNear: { rel: { x: -k.arm * 0.62 - over, y: k.arm * 0.5 }, bend: 1 },
      armFar: { rel: { x: k.arm * 0.55, y: k.arm * 0.02 }, bend: -1 },
      legNear: { ankle: { x: hip.x + 25.5 + over, y: hip.y + 6 }, foot: 138 },
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
    recover: landing(k, 10, 164),
  };
}

/** Pisão: os joelhos sobem, o corpo estica para baixo com um pé à frente do outro e trava no impacto. */
function pisao(k: Kit): HdMoveSpec {
  // `ext` (0..1) estica as pernas para baixo e abre os braços para cima; `lock` trava também a perna de trás.
  const fall = (up: number, ext: number, lock: number) => {
    const hip = k.at(1, up);
    return k.pose({
      hip,
      spine: 166 + ext * 8,
      neck: 10 - ext * 20,
      armNear: { rel: { x: k.arm * (0.3 - ext * 0.85), y: k.arm * (0.5 - ext * 1.05) }, bend: ext > 0.5 ? 1 : -1 },
      armFar: { rel: { x: k.arm * (0.45 + ext * 0.2), y: k.arm * (0.15 - ext * 0.1) }, bend: -1 },
      legNear: { ankle: { x: hip.x + 6, y: hip.y + 6 + ext * 22 }, foot: 80 + ext * 30 },
      legFar: { ankle: { x: hip.x - 4 + lock, y: hip.y + 12 + ext * 2 + lock * 10 }, foot: 50 + lock * 30 },
    });
  };
  return {
    strike: 'footNear',
    wind: fall(40, 0, 0),
    mid: fall(36, 0.55, 0),
    hit: fall(31, 1, 0),
    over: fall(30, 1, 1),
    recover: landing(k, 13, 152),
  };
}

export function aerialFamily(k: Kit): HdFamily {
  return { moves: { socoAereo: socoAereo(k), voadora: voadora(k), pisao: pisao(k) } };
}
