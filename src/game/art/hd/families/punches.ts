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
      hip: { x: k.cx + 1.4 + o * 0.6, y: k.hy + 3.4 },
      spine: 164 - o,
      neck: 12,
      shoulderNear: -90,
      armNear: { to: k.at(27 + o * 1.5, 41), bend: -1 },
      armFar: { rel: { x: A * 0.42, y: -A * 0.02 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1 + o * 0.5),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 1.2, y: k.hy + 3.6 },
      spine: 171,
      neck: 8,
      armNear: { rel: { x: A * 0.42, y: A * 0.1 }, bend: -1 },
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
      hip: { x: k.cx + 4.5 + o, y: k.hy + 4.2 },
      spine: 154 - o * 2,
      neck: 20,
      armNear: { rel: { x: A * 0.05, y: A * 0.25 }, bend: -1 },
      armFar: { to: k.at(32 + o * 1.5, 39), bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2.4 + o * 0.4),
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
      hip: { x: k.cx + 4.5 + o * 0.8, y: k.hy + 2.8 },
      spine: 181 + o * 4,
      neck: 4 - o * 2,
      shoulderNear: -90,
      armScale: 0.82 - o * 0.08,
      armNear: { rel: { x: 12.8 - o * 4, y: -1.6 - o * 1.4 }, bend: 1 },
      armFar: { rel: { x: A * 0.3, y: -A * 0.12 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2.6 + o * 0.4, 1.5),
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
    recover: k.guard(2),
  };
}

/** Cotovelada: entra na guarda do inimigo e bate com o cotovelo; a mão de trás empurra o punho. */
function cotovelada(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 9.5 + o * 1.2, y: k.hy + 5.4 },
      spine: 174 - o * 2,
      neck: 4,
      shoulderNear: -90,
      armNear: { rel: { x: 0.4, y: -1.4 }, bend: -1 },
      armFar: { rel: { x: 3.6, y: -0.6 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2.5),
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
    hit: hit(0),
    over: hit(1),
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
      armNear: { rel: { x: A * 0.1, y: A * 0.35 }, bend: -1 },
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
