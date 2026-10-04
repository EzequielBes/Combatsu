/*
 * Família base do player HD: o idle (a guarda respirando) e o gancho ascendente, o primeiro golpe aprovado. Serve de
 * modelo para as outras famílias: poses montadas pelo `Kit`, com os alvos relativos ao eixo do corpo e ao chão.
 */
import type { HdFamily } from '../frames';
import { K, type Kit } from '../kit';

/** Respiração do idle por quadro: desce, segura embaixo e volta. */
const BREATH = [0, 0.6, 1, 0.5];

/** Pico do gancho; `over` (0 ou 1) é o overshoot: tudo sobe mais um pouco. */
function uppercutHit(k: Kit, over: number) {
  const hip = k.cx + 2 * K + 1;
  return k.pose({
    hip: { x: hip, y: k.hy - 1.1 * K - over },
    spine: 190,
    neck: 6 + over * 5,
    shoulderNear: -90,
    armNear: { to: { x: k.cx + 9.8 * K + over * 2, y: k.g - 26.6 * K - over * 3 }, bend: -1 },
    armFar: { rel: { x: k.arm * 0.5, y: -k.arm * 0.22 }, bend: -1 },
    legNear: { ankle: { x: hip + 3.6 * K, y: k.g - 1.2 * K - over * 0.6 }, foot: 60 },
    legFar: { ankle: { x: hip - 5.6 * K, y: k.g - 1.2 * K - over * 0.6 }, foot: over ? 40 : 50 },
  });
}

export function coreFamily(k: Kit): HdFamily {
  const feet = {
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  };
  return {
    frames: Object.fromEntries(BREATH.map((b, i) => [`idle-${i}`, { pose: k.guard(b) }])),
    moves: {
      // Gancho ascendente: agacha fundo com o punho no quadril, sobe com o corpo inteiro e bate na ponta dos pés.
      ganchoAscendente: {
        strike: 'handNear',
        wind: k.pose({
          hip: { x: k.cx - 0.6 * K, y: k.hy + 0.23 * k.legs },
          spine: 166,
          neck: 10,
          armNear: { rel: { x: k.arm * 0.42, y: k.arm * 0.44 }, bend: -1 },
          armFar: { rel: { x: k.arm * 0.4, y: -k.arm * 0.08 }, bend: -1 },
          ...feet,
        }),
        mid: k.pose({
          hip: { x: k.cx + 0.6 * K, y: k.hy + 0.06 * k.legs },
          spine: 178,
          neck: 6,
          armNear: { rel: { x: k.arm * 0.76, y: k.arm * 0.06 }, bend: -1 },
          armFar: { rel: { x: k.arm * 0.4, y: -k.arm * 0.14 }, bend: -1 },
          legNear: feet.legNear,
          legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 0.4 * K }, foot: 75 },
        }),
        hit: uppercutHit(k, 0),
        over: uppercutHit(k, 1),
        down: k.pose({
          hip: { x: k.cx + 1.2 * K, y: k.hy + 1 },
          spine: 180,
          neck: 6,
          armNear: { rel: { x: k.arm * 0.68, y: k.arm * 0.02 }, bend: -1 },
          armFar: { rel: { x: k.arm * 0.46, y: -k.arm * 0.1 }, bend: -1 },
          ...feet,
        }),
        recover: k.guard(2.4),
      },
    },
  };
}
