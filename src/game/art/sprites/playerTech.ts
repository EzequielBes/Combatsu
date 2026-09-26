/**
 * Frames de conjuração do player (CAST-18/22): selo, carga, soltura e retorno de cada técnica, 32x24 texels,
 * compostos com as partes do boneco de papel de `sprites/player.ts` (AD-002) — o personagem continua o mesmo;
 * só o braço, a mão e a pose mudam por quadro. `kokusen-hit` é o quadro do soco do Punho Divergente quando vira
 * Kokusen (corpo mais inclinado que o `cross`).
 *
 * Direção de arte (spec.md, "Direção de arte" de cada técnica):
 * - Punho Divergente: punho puxado para trás (sign), envolto em energia azul `c`/`C` tremulando (charge), soco
 *   esticado (release, mesma silhueta do `cross`) e retorno (recover).
 * - Desmantelar: gesto rápido de dois dedos (indicador e médio) cortando o ar, com um fio de energia branca
 *   `w`/`W` na ponta dos dedos em vez do punho fechado.
 */
import {
  ARM_COCK,
  ARM_GUARD,
  HEAD_FOCUS,
  LEGS_WIDE,
  Y_LEGS,
  armStraight,
  far,
  pose,
  type Grid,
} from './player';

/** Punho do Divergente envolto em energia azul (carga): mistura tremulante de `c`/`C` no lugar da pele do punho. */
const ARM_DIVERGENT_CHARGE: Grid = ['kkkNNk', 'kCcNnk', 'kcCnk.', '.kkk..'];

/**
 * Braço esticado com dois dedos (indicador e médio) unidos na ponta, tingidos por `hi`/`fill` em vez do punho
 * fechado de `armStraight` — usado pelo Desmantelar (branco) e pela Vermelho (vermelho).
 */
function armPointed(len: number, hi: string, fill: string): string[] {
  const sleeve = len - 6;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(sleeve) + `k${hi}${hi}${fill}k`,
    'k' + 'N'.repeat(sleeve) + `k${hi}${hi}${fill}k`,
    'k' + 'n'.repeat(sleeve) + 'kPPqk',
    'k'.repeat(len - 1) + '.',
  ];
}

export const PLAYER_TECH_FRAMES: Record<string, readonly string[]> = {
  // Punho Divergente (DIV-*): mesma mecânica do cross (braço de trás), com energia azul na carga.
  'divergente-sign': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(ARM_COCK), 1, 12],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'divergente-charge': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(ARM_DIVERGENT_CHARGE), 1, 12],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'divergente-release': pose({
    lean: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 9, 12],
    far: [far(armStraight(16)), 10, 11],
    legs: [[LEGS_WIDE, 2, Y_LEGS]],
  }),
  'divergente-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(armStraight(10)), 9, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Desmantelar (CUT-*): gesto de dois dedos cortando o ar, aura branca curta na ponta dos dedos.
  'corte-sign': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [armPointed(10, 'W', 'w'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'corte-charge': pose({
    lean: 0,
    head: HEAD_FOCUS,
    near: [armPointed(13, 'W', 'w'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'corte-release': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armPointed(17, 'W', 'w'), 9, 11],
    far: [far(ARM_GUARD), 9, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'corte-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armPointed(10, 'W', 'w'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Kokusen (KOK-*): mesmo soco do cross, corpo mais inclinado (o congelamento do Black Flash).
  'kokusen-hit': pose({
    lean: 5,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 10, 13],
    far: [far(armStraight(16)), 11, 11],
    legs: [[LEGS_WIDE, 3, Y_LEGS]],
  }),
};
