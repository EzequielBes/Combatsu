/*
 * Golpes de mão do player HD: jab, direto, gancho, cotovelada e soco baixo. A palma explosiva e os Contras ficam em
 * `punches2.ts`. Todo golpe sai da guarda (`k.guard()`) e volta a ela com os pés nos lugares da guarda.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import { farFoot, nearFoot, punchesFamily2 } from './punches2';

/** Jab: a mão da frente sai do queixo em linha reta, curta e alta; o corpo quase não sai da guarda. */
function jab(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 2.4 + o * 0.6, y: k.hy + 3.4 },
      spine: 163 - o,
      neck: 12,
      shoulderNear: -90,
      armNear: { to: k.at(28 + o * 1.5, 42.5), bend: -1 },
      armFar: { rel: { x: A * 0.34, y: -A * 0.2 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1 + o * 0.5),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 2, y: k.hy + 3.6 },
      spine: 172,
      neck: 8,
      armNear: { rel: { x: A * 0.36, y: A * 0.08 }, bend: -1 },
      armFar: { rel: { x: A * 0.34, y: -A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.pose({
      hip: { x: k.cx - 0.2, y: k.hy + 4.2 },
      spine: 168,
      neck: 9,
      armNear: { rel: { x: A * 0.5, y: A * 0.2 }, bend: -1 },
      armFar: { rel: { x: A * 0.34, y: -A * 0.06 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
  };
}

/** Direto: o cruzado da mão de trás; o quadril e o ombro atravessam e o pé de trás gira na ponta. */
function direto(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 6.5 + o, y: k.hy + 4.6 },
      spine: 150 - o * 2,
      neck: 22,
      shoulderFar: -110,
      armNear: { rel: { x: A * 0.25, y: -A * 0.1 }, bend: -1 },
      armFar: { to: k.at(33 + o * 1.5, 37), bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 3 + o * 0.4, 2.5),
    });
  return {
    strike: 'handFar',
    farFront: { arm: true },
    wind: k.pose({
      hip: { x: k.cx - 1.5, y: k.hy + 3.8 },
      spine: 172,
      neck: 7,
      armNear: { rel: { x: A * 0.6, y: A * 0.2 }, bend: -1 },
      armFar: { rel: { x: A * 0.12, y: A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.pose({
      hip: { x: k.cx + 1, y: k.hy + 4.6 },
      spine: 165,
      neck: 11,
      armNear: { rel: { x: A * 0.45, y: A * 0.2 }, bend: -1 },
      armFar: { rel: { x: A * 0.5, y: A * 0.05 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 0.8),
    }),
  };
}

/** Gancho: arco de lado com o cotovelo alto a 90 graus; o corpo gira em torno do pé da frente. */
function gancho(k: Kit): HdMoveSpec {
  const A = k.arm;
  // O braço dobrado no plano horizontal aparece encurtado de perfil (`armScale`); `o` é o overshoot: o punho cruza.
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 7 + o, y: k.hy + 3 },
      spine: 178 + o * 3,
      neck: 6,
      shoulderNear: -90,
      armScale: 0.78 - o * 0.06,
      armNear: { rel: { x: 13.2 - o * 3, y: -0.6 - o * 1.5 }, bend: 1 },
      armFar: { rel: { x: A * 0.3, y: -A * 0.16 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2.8 + o * 0.4, 2.5),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 0.5, y: k.hy + 4.6 },
      spine: 166,
      neck: 10,
      armNear: { rel: { x: -A * 0.12, y: A * 0.34 }, bend: -1 },
      armFar: { rel: { x: A * 0.36, y: -A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    mid: k.pose({
      hip: { x: k.cx + 2.4, y: k.hy + 3.6 },
      spine: 171,
      neck: 8,
      armScale: 0.7,
      armNear: { rel: { x: 4, y: 2.4 }, bend: -1 },
      armFar: { rel: { x: A * 0.3, y: -A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1.4, 0.8),
    }),
    hit: hit(0),
    over: hit(1),
    // A volta: o braço recolhe dobrado pela frente do peito, sem passar pelo braço reto da interpolação.
    down: k.pose({
      hip: { x: k.cx + 2.5, y: k.hy + 4 },
      spine: 174,
      neck: 7,
      shoulderNear: -40,
      armNear: { rel: { x: A * 0.55, y: A * 0.16 }, bend: -1 },
      armFar: { rel: { x: A * 0.32, y: -A * 0.14 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1.2, 1),
    }),
    recover: k.guard(2),
  };
}

/** Cotovelada: entra na guarda do inimigo e bate com o cotovelo; a mão de trás empurra o punho. */
function cotovelada(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 11 + o, y: k.hy + 6 },
      spine: 160 - o * 2,
      neck: 14,
      shoulderNear: -90,
      armNear: { rel: { x: -0.5, y: -3.2 }, bend: -1 },
      armFar: { rel: { x: 4.5, y: 1.2 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 3, 4 + o),
    });
  return {
    strike: 'elbowNear',
    wind: k.pose({
      hip: { x: k.cx - 1, y: k.hy + 4 },
      spine: 174,
      neck: 6,
      armNear: { rel: { x: A * 0.05, y: A * 0.12 }, bend: -1 },
      armFar: { rel: { x: A * 0.4, y: 0 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    mid: k.pose({
      hip: { x: k.cx + 5, y: k.hy + 5 },
      spine: 168,
      neck: 9,
      shoulderNear: -45,
      armNear: { rel: { x: A * 0.2, y: 0 }, bend: -1 },
      armFar: { rel: { x: A * 0.36, y: -A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1.5, 2),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: { x: k.cx + 7, y: k.hy + 6.4 },
      spine: 163,
      neck: 12,
      shoulderNear: -30,
      armNear: { rel: { x: A * 0.42, y: A * 0.26 }, bend: -1 },
      armFar: { rel: { x: A * 0.38, y: A * 0.02 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2, 3),
    }),
    recover: k.pose({
      hip: { x: k.cx + 3, y: k.hy + 6 },
      spine: 164,
      neck: 12,
      armNear: { rel: { x: A * 0.5, y: A * 0.3 }, bend: -1 },
      armFar: { rel: { x: A * 0.4, y: A * 0.05 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1),
    }),
  };
}

/** Soco baixo: afunda a base e solta o punho da frente no tronco do inimigo. */
function socoBaixo(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 2.5 + o * 0.6, y: k.hy + 8.5 },
      spine: 146 - o * 2,
      neck: 26,
      shoulderNear: -90,
      armNear: { to: k.at(27 + o * 1.5, 22), bend: -1 },
      armFar: { rel: { x: A * 0.3, y: -A * 0.2 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 1.5, y: k.hy + 7 },
      spine: 162,
      neck: 12,
      armNear: { rel: { x: -A * 0.05, y: A * 0.4 }, bend: -1 },
      armFar: { rel: { x: A * 0.36, y: -A * 0.1 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.guard(4),
  };
}

export function punchesFamily(k: Kit): HdFamily {
  const cross = direto(k);
  return {
    moves: {
      jab: jab(k),
      direto: cross,
      cross,
      gancho: gancho(k),
      cotovelada: cotovelada(k),
      socoBaixo: socoBaixo(k),
      ...punchesFamily2(k).moves,
    },
  };
}
