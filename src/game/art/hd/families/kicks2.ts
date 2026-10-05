/*
 * Chutes do player HD, segunda parte: os atalhos de pose usados pelos chutes e os três golpes de corpo inteiro (o
 * giratório, a rasteira e o chute carregado). A primeira parte fica em `kicks.ts`.
 */
import type { PoseSpec } from '../../rig/poses/build';
import { dir, type Vec2 } from '../../rig/skeleton';
import type { HdMoveSpec } from '../frames';
import { BODY_HD, type Kit } from '../kit';

type Leg = PoseSpec['legNear'];
type Arm = PoseSpec['armNear'];

/** Atalhos dos chutes: tudo em texels à frente do eixo (`ahead`) e acima do chão (`up`). */
export interface KickKit {
  /** Quadril a `dx` do eixo e `dy` abaixo da linha do quadril em pé. */
  hip(dx: number, dy: number): Vec2;
  /** Perna com o tornozelo em `k.at(ahead, up)`. */
  leg(ahead: number, up: number, foot: number, bend?: 1 | -1): Leg;
  /** Pé de apoio no chão a `dx` do lugar da guarda; `lift` sobe o calcanhar (ponta do pé). */
  plantNear(dx?: number, lift?: number): Leg;
  plantFar(dx?: number, lift?: number): Leg;
  /** Braço com a mão a (`x`, `y`) braços do ombro (x para a frente, y para baixo). */
  arm(x: number, y: number, bend?: 1 | -1): Arm;
  /** Braço com a mão em `k.at(ahead, up)`. */
  armTo(ahead: number, up: number, bend?: 1 | -1): Arm;
  /**
   * Quadril (como em `hip`) e a perna que chuta dada pelos ângulos de mundo da coxa e da canela (0 para baixo, 90 para
   * a frente, acima de 90 sobe). Com a canela sempre em ângulo menor ou igual ao da coxa, o joelho só dobra para o lado
   * certo, e a câmara e o estalo giram em torno de um joelho que fica parado. `flex` é o tornozelo em relação à canela:
   * 90 neutro, perto de 20 o pé em ponta, acima de 90 os dedos puxados para a canela.
   */
  nearKick(dx: number, dy: number, thigh: number, shin: number, flex?: number): { hip: Vec2; legNear: Leg };
  farKick(dx: number, dy: number, thigh: number, shin: number, flex?: number): { hip: Vec2; legFar: Leg };
}

export function kickKit(k: Kit): KickKit {
  const plant = (x: number, lift: number): Leg => ({ ankle: { x, y: k.g - lift }, foot: 90 - lift * 14 });
  const swing = (hip: Vec2, side: number, thigh: number, shin: number, flex: number): Leg => {
    const a = dir(thigh);
    const b = dir(shin);
    return {
      ankle: {
        x: hip.x + side + a.x * BODY_HD.thigh + b.x * BODY_HD.shin,
        y: hip.y + a.y * BODY_HD.thigh + b.y * BODY_HD.shin,
      },
      foot: shin + flex,
      bend: thigh >= shin ? 1 : -1,
    };
  };
  const hipAt = (dx: number, dy: number): Vec2 => ({ x: k.cx + dx, y: k.hy + dy });
  return {
    nearKick: (dx, dy, thigh, shin, flex = 90) => {
      const hip = hipAt(dx, dy);
      return { hip, legNear: swing(hip, BODY_HD.pelvisNear, thigh, shin, flex) };
    },
    farKick: (dx, dy, thigh, shin, flex = 90) => {
      const hip = hipAt(dx, dy);
      return { hip, legFar: swing(hip, -BODY_HD.pelvisFar, thigh, shin, flex) };
    },
    hip: (dx, dy) => ({ x: k.cx + dx, y: k.hy + dy }),
    leg: (ahead, up, foot, bend = 1) => ({ ankle: k.at(ahead, up), foot, bend }),
    plantNear: (dx = 0, lift = 0) => plant(k.cx + k.stance.near + dx, lift),
    plantFar: (dx = 0, lift = 0) => plant(k.cx + k.stance.far + dx, lift),
    arm: (x, y, bend = -1) => ({ rel: { x: k.arm * x, y: k.arm * y }, bend }),
    armTo: (ahead, up, bend = -1) => ({ to: k.at(ahead, up), bend }),
  };
}

/**
 * Chute giratório (perna de trás, coice de costas): o corpo gira sobre a ponta do pé da frente. Na antecipação o tronco
 * fecha sobre o pé de apoio; no meio da subida o corpo está de costas, com a perna de trás recolhida e o calcanhar
 * apontado para o alvo; no pico a perna estala para trás com a sola de frente para o alvo, o tronco inclina para longe
 * e a cabeça olha por cima do ombro. Na volta o pé desce junto do apoio antes de recuar para a guarda.
 */
export function spinKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      ...t.farKick(7.4 + over, 0.3, 85 + over * 3, 98 - over * 2, 75),
      spine: 208 + over * 3,
      neck: -24,
      armNear: t.arm(-0.75, 0.25, 1),
      armFar: t.arm(0.3, 0.3),
      legNear: t.plantNear(0.3, 1.2),
    });
  return {
    strike: 'footFar',
    farFront: { leg: true },
    turned: { mid: 'away', hit: 'shoulder' },
    expr: 'shout',
    wind: k.pose({
      hip: t.hip(2, 6),
      spine: 172,
      neck: 6,
      armNear: t.arm(-0.2, 0.6, 1),
      armFar: t.arm(0.45, 0.2),
      legNear: t.plantNear(),
      legFar: t.plantFar(5, 2),
    }),
    mid: k.pose({
      ...t.farKick(6, 0.5, -25, 85, 90),
      spine: 192,
      neck: -6,
      armNear: t.arm(-0.3, 0.5, 1),
      armFar: t.arm(0.35, 0.35),
      legNear: t.plantNear(0.2, 1.5),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      ...t.farKick(4, 2, 80, 15, 70),
      spine: 190,
      neck: -6,
      armNear: t.arm(0.3, 0.6),
      armFar: t.arm(0.5, 0.15),
      legNear: t.plantNear(0, 0.5),
    }),
    recover: k.pose({
      hip: t.hip(0.5, 5.5),
      spine: 172,
      neck: 6,
      armNear: t.arm(0.6, 0.4),
      armFar: t.arm(0.4, 0.05),
      legNear: t.plantNear(),
      legFar: { ...t.plantFar(10.5, 2.5), bend: 1 },
    }),
  };
}

/** Rasteira: o corpo cai sobre a perna de trás dobrada, apoia a mão no chão e a perna da frente varre rente ao chão. */
export function sweep(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(-2 + over, 18.5),
      spine: 230 + over * 4,
      neck: -55,
      armNear: t.armTo(-17, 2.5, 1),
      armFar: t.arm(0.45, 0.1),
      legNear: t.leg(26.2 + over * 0.8, 4.6, 100),
      legFar: t.plantFar(7, 0.5),
    });
  return {
    strike: 'footNear',
    wind: k.pose({
      hip: t.hip(-3, 12),
      spine: 162,
      neck: 16,
      armNear: t.arm(0.3, 0.75),
      armFar: t.arm(0.4, 0.2),
      legNear: t.plantNear(-3),
      legFar: t.plantFar(3),
    }),
    mid: k.pose({
      hip: t.hip(-4, 17),
      spine: 198,
      neck: -14,
      armNear: t.arm(-0.4, 0.8, 1),
      armFar: t.arm(0.45, 0.1),
      legNear: t.leg(15, 5.5, 80),
      legFar: t.plantFar(6, 0.5),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(-3, 15),
      spine: 190,
      neck: -6,
      armNear: t.arm(-0.2, 0.85, 1),
      armFar: t.arm(0.45, 0.1),
      legNear: t.leg(13, 4.5, 85),
      legFar: t.plantFar(5),
    }),
    recover: k.guard(6),
  };
}

/**
 * Chute carregado: carga longa e funda sobre a perna de trás, joelho no peito, e o corpo inteiro se lança numa linha
 * só da ponta do pé de trás ao calcanhar que bate.
 */
export function chargedKick(k: Kit, t: KickKit): HdMoveSpec {
  const hit = (over: number) =>
    k.pose({
      hip: t.hip(9 + over * 1.5, 0.5 + over * 0.5),
      spine: 220 + over * 4,
      neck: -36,
      armNear: t.arm(-0.8, 0.35, 1),
      armFar: t.arm(0.3, 0.3),
      legNear: t.leg(37 + over * 1.5, 30, 168),
      legFar: t.plantFar(3 + over * 0.5, 3),
    });
  return {
    strike: 'footNear',
    expr: 'shout',
    wind: k.pose({
      hip: t.hip(-7, 10),
      spine: 150,
      neck: 24,
      armNear: t.arm(-0.3, 0.5, 1),
      armFar: t.arm(0.5, 0.1),
      legNear: t.leg(4, 22, 70),
      legFar: t.plantFar(),
    }),
    mid: k.pose({
      hip: t.hip(-1, 3),
      spine: 186,
      neck: 0,
      armNear: t.arm(0.2, 0.7),
      armFar: t.arm(0.4, 0.05),
      legNear: t.leg(13, 27, 110),
      legFar: t.plantFar(1, 1),
    }),
    hit: hit(0),
    over: hit(1),
    down: k.pose({
      hip: t.hip(4, 4),
      spine: 188,
      neck: 0,
      armNear: t.arm(0.1, 0.8),
      armFar: t.arm(0.4, 0.05),
      legNear: t.leg(15, 14, 70),
      legFar: t.plantFar(2, 0.5),
    }),
    recover: k.guard(4.5),
  };
}
