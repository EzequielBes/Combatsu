/*
 * Golpes de mão do player HD, segunda parte: a palma explosiva e os Contras (o contra-ataque depois de uma defesa
 * certa). Juntados à família em `punches.ts`.
 */
import type { PoseSpec } from '../../rig/poses/build';
import { dir, type Vec2 } from '../../rig/skeleton';
import { ANKLE_HEIGHT } from '../body';
import type { HdFamily, HdMoveSpec } from '../frames';
import { BODY_HD, type Kit } from '../kit';

type Leg = PoseSpec['legNear'];
type Arm = PoseSpec['armNear'];

/** Atalhos dos socos: tudo em texels à frente do eixo (`ahead`) e acima do chão (`up`). */
export interface PunchKit {
  /** Quadril a `dx` do eixo e `dy` abaixo da linha do quadril em pé. */
  hip(dx: number, dy: number): Vec2;
  /**
   * Giro de tronco fingido de perfil: quanto cada ombro fica à frente (+) ou atrás (-) do eixo do peito, em texels. A
   * guarda é `turn(-2.6, 2.6)`; o ombro que bate vai a +6 e o outro recolhe, e na antecipação é o contrário.
   */
  turn(
    near: number,
    far: number,
  ): { shoulderNear: number; shoulderFar: number; shoulders: { near: number; far: number } };
  /** Braço com a mão a (`x`, `y`) braços do ombro (x para a frente, y para baixo). */
  arm(x: number, y: number, bend?: 1 | -1): Arm;
  /** Braço com a mão em `k.at(ahead, up)`. */
  armTo(ahead: number, up: number, bend?: 1 | -1): Arm;
  /** Pé no lugar da guarda; `heel` (graus) sobe o calcanhar girando sobre a ponta, que não sai do lugar. */
  near(heel?: number): Leg;
  far(heel?: number): Leg;
}

export function punchKit(k: Kit): PunchKit {
  // O pé gira em torno do ponto da sola sob a ponta do osso: o tornozelo sobe e avança, a ponta fica no chão.
  const pivot = (x: number, heel: number): Leg => {
    const f = dir(90 - heel);
    return {
      ankle: {
        x: x + BODY_HD.foot * (1 - f.x) + ANKLE_HEIGHT * f.y,
        y: k.g + ANKLE_HEIGHT * (1 - f.x) - BODY_HD.foot * f.y,
      },
      foot: 90 - heel,
    };
  };
  return {
    hip: (dx, dy) => ({ x: k.cx + dx, y: k.hy + dy }),
    turn: (near, far) => ({
      shoulderNear: near >= 0 ? -90 : 90,
      shoulderFar: far >= 0 ? -90 : 90,
      shoulders: { near: Math.abs(near), far: Math.abs(far) },
    }),
    arm: (x, y, bend = -1) => ({ rel: { x: k.arm * x, y: k.arm * y }, bend }),
    armTo: (ahead, up, bend = -1) => ({ to: k.at(ahead, up), bend }),
    near: (heel = 0) => pivot(k.cx + k.stance.near, heel),
    far: (heel = 0) => pivot(k.cx + k.stance.far, heel),
  };
}

/** Pé de perto plantado no lugar da guarda. */
export const nearFoot = (k: Kit) => ({ ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 });

/** Pé de trás plantado (`lift` 0) ou na ponta, empurrando o chão (`lift` é a altura do calcanhar em texels). */
export const farFoot = (k: Kit, lift = 0, slide = 0) => ({
  ankle: { x: k.cx + k.stance.far + slide, y: k.g - lift },
  foot: 90 - lift * 14,
});

/** Palma explosiva: as duas mãos carregam no quadril de trás e o corpo inteiro se projeta atrás das palmas. */
function palmaExplosiva(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 6 + o, y: k.hy + 5.5 },
      spine: 152 - o * 2,
      neck: 22,
      shoulderNear: -90,
      armNear: { to: k.at(31 + o * 1.5, 38), bend: -1 },
      armFar: { to: k.at(30 + o * 1.5, 31), bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 3 + o * 0.5, 2 + o),
    });
  return {
    strike: 'handNear',
    hands: { near: 'palm', far: 'palm' },
    expr: 'shout',
    wind: k.pose({
      hip: { x: k.cx - 3.5, y: k.hy + 7 },
      spine: 180,
      neck: 4,
      armNear: { to: k.at(-1, 31), bend: 1 },
      armFar: { to: k.at(3, 28), bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.pose({
      hip: { x: k.cx + 3, y: k.hy + 6.5 },
      spine: 160,
      neck: 14,
      armNear: { rel: { x: A * 0.7, y: A * 0.45 }, bend: -1 },
      armFar: { rel: { x: A * 0.6, y: A * 0.4 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1),
    }),
  };
}

/** Contra: nasce do parry; a mão da frente termina a varredura, aberta, e o punho de trás entra reto pela brecha. */
function contra(k: Kit): HdMoveSpec {
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 5 + o, y: k.hy + 5 },
      spine: 156 - o,
      neck: 16,
      shoulderNear: -90,
      armNear: { to: k.at(17 + o, 27), bend: -1 },
      armFar: { to: k.at(28 + o * 1.5, 40), bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2.6 + o * 0.4, 1.5),
    });
  return {
    strike: 'handFar',
    farFront: { arm: true },
    hands: { near: 'open' },
    // A pose do parry: o antebraço da frente em pé desviando o golpe e o punho de trás armado.
    wind: k.pose({
      hip: { x: k.cx + 1.2, y: k.hy + 3.8 },
      spine: 169,
      neck: 10,
      shoulderNear: -90,
      armNear: { to: k.at(16.5, 45), bend: -1 },
      armFar: { rel: { x: 2.5, y: 5 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.guard(2.4),
  };
}

/** Contra gancho: sobe do agachado com um gancho ascendente curto, o cotovelo ainda dobrado, colado no inimigo. */
function contraGancho(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 4, y: k.hy + 1.5 - o },
      spine: 186 + o * 2,
      neck: 4 + o * 3,
      shoulderNear: -90,
      armNear: { to: k.at(19 - o, 46 + o * 3), bend: -1 },
      armFar: { rel: { x: A * 0.35, y: -A * 0.05 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 2 + o * 0.5),
    });
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx, y: k.hy + 9 },
      spine: 160,
      neck: 12,
      armNear: { rel: { x: A * 0.3, y: A * 0.5 }, bend: -1 },
      armFar: { rel: { x: A * 0.4, y: -A * 0.3 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
    }),
    hit: hit(0),
    over: hit(1),
    recover: k.guard(3),
  };
}

export function punchesFamily2(k: Kit): HdFamily {
  return { moves: { palmaExplosiva: palmaExplosiva(k), contra: contra(k), contraGancho: contraGancho(k) } };
}
