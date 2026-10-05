/*
 * Player HD com objeto: parado e correndo com o objeto na mão, o golpe com o objeto e o arremesso.
 *
 * O objeto não faz parte do sprite: com `?hd=1` o jogo o desenha preso à mão de perto do quadro (`hdAnchors`) e
 * girado com o antebraço. Há duas pegadas, porque um sprite só não serve para os dois pesos:
 * - leve (garrafa, faca): o objeto é uma arma na mão da frente, erguida na guarda; a outra mão fica no queixo. Os
 *   quadros têm os nomes da folha antiga (`carry-idle-0`, `swing-hit`).
 * - pesada (cadeira, clava): o objeto vai apoiado no ombro, com a mão de perto segurando junto ao pescoço, e a outra
 *   mão aberta à frente para equilibrar. Os quadros levam o prefixo `heavy-`.
 */
import type { HdFamily, HdFrameSpec, HdMoveSpec } from '../frames';
import type { Kit } from '../kit';
import type { Pose } from '../../rig/skeleton';

/** Prefixo dos quadros da pegada pesada. */
export const HEAVY = 'heavy-';

const feet = (k: Kit) => ({
  legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
  legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
});

/** Pegada leve: a guarda de luta com a arma na mão da frente, o antebraço erguido para a arma apontar para cima. */
function holdLight(k: Kit, sink: number): Pose {
  return k.pose({
    hip: { x: k.cx - 0.6, y: k.hy + 3.4 + sink },
    spine: 168,
    neck: 9,
    armNear: { to: k.at(13, 38 - sink * 0.6), bend: -1 },
    armFar: { rel: { x: k.arm * 0.34, y: -k.arm * 0.06 + sink * 0.4 }, bend: -1 },
    ...feet(k),
  });
}

/** Pegada pesada: o peso no ombro dobra o tronco à frente; a mão de perto segura junto ao pescoço. */
function holdHeavy(k: Kit, sink: number): Pose {
  return k.pose({
    hip: { x: k.cx - 1.2, y: k.hy + 4.6 + sink },
    spine: 163,
    neck: 13,
    armNear: { to: k.at(-7, 47 - sink * 0.7), bend: 1 },
    armFar: { to: k.at(13, 33 - sink * 0.5), bend: -1 },
    ...feet(k),
  });
}

interface Leg {
  ahead: number;
  up: number;
  foot: number;
}

/** Os dois instantes do passo da corrida comum que a corrida com objeto usa: contato e impulso. */
const STRIDE = [
  { lead: { ahead: 17, up: 1.2, foot: 108 }, trail: { ahead: -17, up: 5.5, foot: 14 }, hipX: 3, sink: 4.6, bob: 0 },
  { lead: { ahead: -9, up: 1.6, foot: 58 }, trail: { ahead: 12, up: 14, foot: 84 }, hipX: 4.2, sink: 3.4, bob: 1.2 },
] as const;

/**
 * Corrida com o objeto: o contato e o impulso de cada perna da corrida comum. A mão que segura fica quase parada (a
 * arma à frente, ou o peso no ombro) e o braço livre bombeia em oposição às pernas.
 */
function carryRun(k: Kit, heavy: boolean): Record<string, HdFrameSpec> {
  const frame = (i: number): HdFrameSpec => {
    const s = STRIDE[i % 2]!;
    const nearLeads = i < 2;
    const leg = (l: Leg) => ({ ankle: { x: k.cx + s.hipX + l.ahead, y: k.g - l.up }, foot: l.foot });
    // O braço livre é o de longe: vai à frente quando a perna de perto lidera.
    const swing = (nearLeads ? 1 : -1) * (i % 2 === 0 ? 1 : 0.4);
    const free = { rel: { x: k.arm * (0.1 + 0.5 * swing), y: k.arm * (0.3 - 0.14 * swing) }, bend: -1 as const };
    const grip = heavy ? k.at(-4, 46 + s.bob) : k.at(17, 37 + s.bob);
    return {
      pose: k.pose({
        hip: { x: k.cx + s.hipX, y: k.hy + s.sink },
        spine: heavy ? 152 : 148,
        neck: heavy ? 20 : 24,
        armNear: { to: grip, bend: heavy ? 1 : -1 },
        armFar: free,
        legNear: leg(nearLeads ? s.lead : s.trail),
        legFar: leg(nearLeads ? s.trail : s.lead),
      }),
      hands: heavy ? { far: 'open' } : undefined,
    };
  };
  return Object.fromEntries([0, 1, 2, 3].map((i) => [`${heavy ? HEAVY : ''}carry-run-${i}`, frame(i)]));
}

/** Pico do golpe leve: o corpo entra sobre a perna da frente e o braço desce em diagonal. `over` atravessa. */
function lightHit(k: Kit, over: number): Pose {
  return k.pose({
    hip: { x: k.cx + 5 + over * 1.5, y: k.hy + 6 + over },
    spine: 154 - over * 4,
    neck: 20 + over * 3,
    shoulderNear: -90,
    armNear: { to: k.at(31 + over, 36 - over * 9), bend: -1 },
    armFar: { rel: { x: k.arm * 0.2, y: k.arm * 0.12 }, bend: -1 },
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 1.4 - over }, foot: 62 - over * 12 },
  });
}

/** Golpe com objeto leve: arma atrás da cabeça e desce num corte em diagonal, seco, com o ombro entrando. */
function swingLight(k: Kit): HdMoveSpec {
  return {
    strike: 'handNear',
    wind: k.pose({
      hip: { x: k.cx - 3, y: k.hy + 4.5 },
      spine: 184,
      neck: -2,
      armNear: { to: k.at(-9, 52), bend: 1 },
      armFar: { rel: { x: k.arm * 0.6, y: k.arm * 0.02 }, bend: -1 },
      ...feet(k),
    }),
    mid: k.pose({
      hip: { x: k.cx + 1.5, y: k.hy + 4 },
      spine: 170,
      neck: 8,
      shoulderNear: -60,
      armNear: { to: k.at(16, 56), bend: 1 },
      armFar: { rel: { x: k.arm * 0.4, y: k.arm * 0.06 }, bend: -1 },
      ...feet(k),
    }),
    hit: lightHit(k, 0),
    over: lightHit(k, 1),
    down: k.pose({
      hip: { x: k.cx + 4.5, y: k.hy + 7 },
      spine: 156,
      neck: 18,
      shoulderNear: -60,
      armNear: { to: k.at(24, 24), bend: -1 },
      armFar: { rel: { x: k.arm * 0.3, y: k.arm * 0.04 }, bend: -1 },
      ...feet(k),
    }),
    recover: holdLight(k, 2),
    // A volta caminha para a pose de carregar, não para a guarda sem objeto.
    back: holdLight(k, 0),
  };
}

/** Pico da pancada pesada: o corpo dobra sobre a perna da frente e os dois braços descem esticados. */
function heavyHit(k: Kit, over: number): Pose {
  const grip = k.at(29 + over, 27 - over * 13);
  return k.pose({
    hip: { x: k.cx + 6 + over * 1.5, y: k.hy + 8 + over * 2 },
    spine: 142 - over * 8,
    neck: 30 + over * 4,
    shoulderNear: -90,
    armNear: { to: grip, bend: -1 },
    armFar: { to: { x: grip.x - 4, y: grip.y + 2 }, bend: -1 },
    legNear: { ankle: { x: k.cx + k.stance.near + 1, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far - 1, y: k.g - 1.6 - over * 1.2 }, foot: 60 - over * 14 },
  });
}

/**
 * A pancada de cadeira: tira o peso do ombro para trás e para o alto com as duas mãos, passa por cima da cabeça e
 * desce com o corpo inteiro até o chão. É lenta e pesada: a volta demora a levantar o objeto de novo.
 */
function swingHeavy(k: Kit): HdMoveSpec {
  return {
    strike: 'handNear',
    expr: 'shout',
    wind: k.pose({
      hip: { x: k.cx - 4, y: k.hy + 6 },
      spine: 194,
      neck: -8,
      armNear: { to: k.at(-15, 58), bend: 1 },
      armFar: { to: k.at(-11, 55), bend: 1 },
      legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 0.8 }, foot: 76 },
      legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
    }),
    mid: k.pose({
      hip: { x: k.cx + 1, y: k.hy + 3 },
      spine: 176,
      neck: 4,
      shoulderNear: -90,
      armNear: { to: k.at(10, 64), bend: 1 },
      armFar: { to: k.at(7, 62), bend: 1 },
      ...feet(k),
    }),
    hit: heavyHit(k, 0),
    over: heavyHit(k, 1),
    down: k.pose({
      hip: { x: k.cx + 5, y: k.hy + 10 },
      spine: 140,
      neck: 30,
      shoulderNear: -90,
      armNear: { to: k.at(24, 16), bend: -1 },
      armFar: { to: k.at(20, 18), bend: -1 },
      ...feet(k),
    }),
    recover: holdHeavy(k, 3),
    back: holdHeavy(k, 0),
  };
}

/** Arremesso: o braço arma atrás com o peso na perna de trás e solta com o corpo inteiro indo junto. */
function throwFrames(k: Kit): Record<string, HdFrameSpec> {
  return {
    'throw-0': {
      pose: k.pose({
        hip: { x: k.cx - 4.5, y: k.hy + 5.5 },
        spine: 193,
        neck: -8,
        armNear: { to: k.at(-19, 52), bend: -1 },
        armFar: { rel: { x: k.arm * 0.82, y: -k.arm * 0.1 }, bend: -1 },
        legNear: { ankle: { x: k.cx + 11, y: k.g - 0.8 }, foot: 76 },
        legFar: { ankle: { x: k.cx - 9, y: k.g }, foot: 90 },
      }),
      expr: 'effort',
      hands: { far: 'open' },
    },
    'throw-1': {
      pose: k.pose({
        hip: { x: k.cx + 8, y: k.hy + 6 },
        spine: 146,
        neck: 22,
        shoulderNear: -90,
        armNear: { to: k.at(32, 38), bend: -1 },
        armFar: { to: k.at(-9, 30), bend: 1 },
        legNear: { ankle: { x: k.cx + 15, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx - 13, y: k.g - 6 }, foot: 28 },
      }),
      expr: 'effort',
      hands: { near: 'open' },
    },
  };
}

export function carryFamily(k: Kit): HdFamily {
  const open = { far: 'open' } as const;
  return {
    frames: {
      'carry-idle-0': { pose: holdLight(k, 0) },
      'carry-idle-1': { pose: holdLight(k, 1) },
      [`${HEAVY}carry-idle-0`]: { pose: holdHeavy(k, 0), hands: open },
      [`${HEAVY}carry-idle-1`]: { pose: holdHeavy(k, 1), hands: open },
      ...carryRun(k, false),
      ...carryRun(k, true),
      ...throwFrames(k),
    },
    moves: { swing: swingLight(k), [`${HEAVY}swing`]: swingHeavy(k) },
  };
}
