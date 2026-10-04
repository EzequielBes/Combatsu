/*
 * Golpes de mão do player HD, segunda parte: a palma explosiva e os Contras (o contra-ataque depois de uma defesa
 * certa). Juntados à família em `punches.ts`.
 */
import type { HdFamily, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';

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
      legFar: farFoot(k, 2.5 + o * 0.5),
    });
  return {
    strike: 'handNear',
    hands: { near: 'open', far: 'open' },
    wind: k.pose({
      hip: { x: k.cx - 3, y: k.hy + 6 },
      spine: 176,
      neck: 4,
      armNear: { to: k.at(-4, 26), bend: -1 },
      armFar: { to: k.at(-1, 23), bend: -1 },
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

/** Contra: a mão de trás desvia o golpe para cima e o punho da frente entra curto por dentro da guarda. */
function contra(k: Kit): HdMoveSpec {
  const A = k.arm;
  const hit = (o: number) =>
    k.pose({
      hip: { x: k.cx + 3.5 + o * 0.6, y: k.hy + 6 },
      spine: 160 - o,
      neck: 12,
      shoulderNear: -90,
      armNear: { to: k.at(25.5 + o * 1.5, 40), bend: -1 },
      armFar: { rel: { x: A * 0.5, y: -A * 0.78 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k, 1.6),
    });
  return {
    strike: 'handNear',
    hands: { far: 'open' },
    wind: k.pose({
      hip: { x: k.cx - 0.5, y: k.hy + 6 },
      spine: 158,
      neck: 14,
      armNear: { rel: { x: A * 0.15, y: A * 0.3 }, bend: -1 },
      armFar: { rel: { x: A * 0.62, y: -A * 0.62 }, bend: -1 },
      legNear: nearFoot(k),
      legFar: farFoot(k),
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
      hip: { x: k.cx + 3, y: k.hy + 1.5 - o },
      spine: 186 + o * 2,
      neck: 4 + o * 3,
      shoulderNear: -90,
      armNear: { to: k.at(15 - o, 47 + o * 3), bend: -1 },
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
