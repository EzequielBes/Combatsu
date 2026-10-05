/*
 * Golpes de mão do player HD: jab, direto, gancho, cotovelada e soco baixo. A palma explosiva e os Contras ficam em
 * `punches2.ts`. Todo golpe sai da guarda (`k.guard()`) e volta a ela com os pés nos lugares da guarda.
 *
 * O rig é de perfil: o giro do tronco se finge com os ombros (`t.turn`: o que bate projetado, o outro recolhido), o
 * quadril passando para a perna da frente e o pé de trás girando na ponta (`t.far(graus)`). A antecipação é o avesso
 * do pico: ombro que bate recolhido e peso atrás.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import { punchKit, punchesFamily2, type PunchKit } from './punches2';

/** Jab: a mão da frente sai do queixo em linha reta; o ombro da frente entra e o de trás recolhe com a guarda. */
function jab(k: Kit, t: PunchKit): HdMoveSpec {
  const hit = (o: number) =>
    k.pose({
      hip: t.hip(2.6 + o * 0.6, 3.6),
      spine: 172 - o,
      neck: 7,
      ...t.turn(6 + o * 0.5, -1.5 - o * 0.5),
      armNear: t.armTo(27.3 + o * 1.2, 41.8),
      armFar: t.armTo(13.5 + o * 0.5, 39.3),
      legNear: t.near(),
      legFar: t.far(18 + o * 6),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: t.hip(-2, 3.8),
      spine: 174,
      neck: 7,
      ...t.turn(-4, 4),
      armNear: t.armTo(4.5, 37.5),
      armFar: t.armTo(9.5, 40),
      legNear: t.near(),
      legFar: t.far(),
    }),
    mid: k.pose({
      hip: t.hip(0.6, 3.6),
      spine: 170,
      neck: 8,
      ...t.turn(2, 1.5),
      armNear: t.armTo(17, 40),
      armFar: t.armTo(11, 40.5),
      legNear: t.near(),
      legFar: t.far(8),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(1.4, 3.9),
      spine: 169,
      neck: 9,
      ...t.turn(3, 0.5),
      armNear: t.armTo(19, 39.5),
      armFar: t.armTo(11.5, 40),
      legNear: t.near(),
      legFar: t.far(8),
    }),
    recover: k.pose({
      hip: t.hip(-0.2, 4.2),
      spine: 168,
      neck: 9,
      armNear: t.arm(0.5, 0.2),
      armFar: t.arm(0.34, -0.06),
      legNear: t.near(),
      legFar: t.far(),
    }),
  };
}

/**
 * Direto: o cruzado da mão de trás. Arma com o ombro de trás recolhido e o peso atrás; no pico o quadril passa para a
 * perna da frente, o ombro de trás atravessa à frente do peito e o pé de trás gira na ponta: uma linha só do pé ao
 * punho. A mão da frente volta para o queixo.
 */
function direto(k: Kit, t: PunchKit): HdMoveSpec {
  const hit = (o: number) =>
    k.pose({
      hip: t.hip(6.7 + o, 4.8),
      spine: 158 - o * 2,
      neck: 16,
      ...t.turn(-5, 5.5 + o * 0.5),
      armNear: t.armTo(15 + o, 39),
      armFar: t.armTo(33.5 + o * 1.5, 36.8),
      legNear: t.near(),
      legFar: t.far(52 + o * 6),
    });
  return {
    strike: 'handFar',
    farFront: { arm: true },
    wind: k.pose({
      hip: t.hip(-2.5, 4.2),
      spine: 176,
      neck: 5,
      ...t.turn(4.5, -4.5),
      armNear: t.armTo(12, 36),
      armFar: t.armTo(-1, 35),
      legNear: t.near(),
      legFar: t.far(),
    }),
    mid: k.pose({
      hip: t.hip(3, 4.5),
      spine: 165,
      neck: 12,
      ...t.turn(-1, 2),
      armNear: t.armTo(12, 38),
      armFar: t.armTo(20, 36),
      legNear: t.near(),
      legFar: t.far(26),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(4.5, 4.8),
      spine: 163,
      neck: 13,
      ...t.turn(-2, 3.5),
      armNear: t.armTo(12.5, 37.5),
      armFar: t.armTo(24, 35.5),
      legNear: t.near(),
      legFar: t.far(30),
    }),
    recover: k.pose({
      hip: t.hip(1, 4.6),
      spine: 165,
      neck: 11,
      armNear: t.arm(0.45, 0.2),
      armFar: t.arm(0.5, 0.05),
      legNear: t.near(),
      legFar: t.far(10),
    }),
  };
}

/**
 * Gancho: arco de lado com o cotovelo alto. O braço arma baixo e atrás, o cotovelo sobe à altura do ombro e o tronco
 * gira em torno do pé da frente (os dois calcanhares sobem); o punho cruza na frente do rosto do alvo e passa.
 */
function gancho(k: Kit, t: PunchKit): HdMoveSpec {
  // O braço dobrado no plano horizontal aparece encurtado de perfil (`armScale`); `o` é o overshoot: o punho cruza.
  const hit = (o: number) =>
    k.pose({
      hip: t.hip(6.5 + o, 3.2),
      spine: 180 + o * 4,
      neck: 4 - o * 2,
      ...t.turn(6.5 + o * 0.5, -4 - o),
      armScale: 0.82 - o * 0.1,
      armNear: t.armTo(23 - o * 5, 41.3 - o * 2.5, 1),
      armFar: t.armTo(12.5, 40.5),
      legNear: t.near(12 + o * 4),
      legFar: t.far(24 + o * 4),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: t.hip(-1, 5),
      spine: 170,
      neck: 8,
      ...t.turn(-5, 4.5),
      armNear: t.armTo(1, 30),
      armFar: t.armTo(10.5, 39.5),
      legNear: t.near(),
      legFar: t.far(),
    }),
    mid: k.pose({
      hip: t.hip(2.5, 4),
      spine: 174,
      neck: 7,
      ...t.turn(0.5, 2.5),
      armScale: 0.8,
      armNear: t.armTo(9, 34.5, 1),
      armFar: t.armTo(11.5, 40),
      legNear: t.near(5),
      legFar: t.far(10),
    }),
    hit: hit(0),
    over: hit(1),
    // A volta: o braço recolhe dobrado pela frente do peito, sem passar pelo braço reto da interpolação.
    down: k.pose({
      hip: t.hip(2.5, 4),
      spine: 176,
      neck: 7,
      ...t.turn(2.5, 0),
      armNear: t.arm(0.5, 0.16),
      armFar: t.arm(0.32, -0.14),
      legNear: t.near(),
      legFar: t.far(10),
    }),
    recover: k.guard(2),
  };
}

/**
 * Cotovelada: o corpo entra atrás do cotovelo. O punho recolhe junto ao rosto e a ponta do cotovelo sai à frente do
 * corpo, na altura do queixo do alvo; a mão de trás fecha a guarda.
 */
function cotovelada(k: Kit, t: PunchKit): HdMoveSpec {
  const hit = (o: number) =>
    k.pose({
      hip: t.hip(10 + o, 6),
      spine: 162 - o * 2,
      neck: 18,
      ...t.turn(5.5, -3),
      armNear: t.armTo(18.3 + o * 0.6, 42.5 - o * 0.4),
      armFar: t.armTo(17 + o, 37),
      legNear: t.near(),
      legFar: t.far(48 + o * 6),
    });
  return {
    strike: 'elbowNear',
    headOverNearArm: true,
    wind: k.pose({
      hip: t.hip(-1.5, 4.5),
      spine: 176,
      neck: 6,
      ...t.turn(-5, 4),
      armNear: t.armTo(0, 40),
      armFar: t.armTo(11, 38),
      legNear: t.near(),
      legFar: t.far(),
    }),
    mid: k.pose({
      hip: t.hip(5, 5),
      spine: 168,
      neck: 9,
      ...t.turn(1, 1),
      armNear: t.armTo(9.5, 41.5),
      armFar: t.armTo(14, 38),
      legNear: t.near(),
      legFar: t.far(24),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(7, 6.4),
      spine: 163,
      neck: 12,
      ...t.turn(2, 1),
      armNear: t.arm(0.42, 0.26),
      armFar: t.arm(0.38, 0.02),
      legNear: t.near(),
      legFar: t.far(30),
    }),
    recover: k.pose({
      hip: t.hip(3, 6),
      spine: 164,
      neck: 12,
      armNear: t.arm(0.5, 0.3),
      armFar: t.arm(0.4, 0.05),
      legNear: t.near(),
      legFar: t.far(12),
    }),
  };
}

/**
 * Soco baixo: queda de nível de verdade. Os joelhos dobram, o tronco inclina e o punho da frente entra reto no corpo
 * do inimigo, com o ombro atrás dele; a mão de trás fica colada no queixo.
 */
function socoBaixo(k: Kit, t: PunchKit): HdMoveSpec {
  const hit = (o: number) =>
    k.pose({
      hip: t.hip(0.5 + o * 0.6, 10),
      spine: 140 - o * 2,
      neck: 30,
      ...t.turn(5.5, -2),
      armNear: t.armTo(28.3 + o * 1.2, 21.6),
      armFar: t.armTo(15.5 + o, 33),
      legNear: t.near(),
      legFar: t.far(34 + o * 5),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: t.hip(-2, 6.5),
      spine: 168,
      neck: 10,
      ...t.turn(-5, 4),
      armNear: t.armTo(0, 27),
      armFar: t.armTo(9.5, 37),
      legNear: t.near(),
      legFar: t.far(),
    }),
    mid: k.pose({
      hip: t.hip(-0.5, 9.5),
      spine: 154,
      neck: 20,
      ...t.turn(1, 1),
      armNear: t.armTo(14, 22.5),
      armFar: t.armTo(13, 35),
      legNear: t.near(),
      legFar: t.far(16),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(0, 9.5),
      spine: 153,
      neck: 20,
      ...t.turn(2, 1),
      armNear: t.armTo(20, 24.5),
      armFar: t.armTo(13.5, 35),
      legNear: t.near(),
      legFar: t.far(16),
    }),
    recover: k.guard(4),
  };
}

export function punchesFamily(k: Kit): HdFamily {
  const t = punchKit(k);
  const cross = direto(k, t);
  return {
    moves: {
      jab: jab(k, t),
      direto: cross,
      cross,
      gancho: gancho(k, t),
      cotovelada: cotovelada(k, t),
      socoBaixo: socoBaixo(k, t),
      ...punchesFamily2(k).moves,
    },
  };
}
