/**
 * Frames `<golpe>-wind|hit|recover` do combate estilo luta (MOV-14): compostos com as mesmas partes de
 * `sprites/player.ts` (AD-002) — o personagem continua o mesmo boneco de papel; só o braço, a perna e a pose
 * mudam por golpe/fase, no mesmo espírito de `playerTech.ts` (F5).
 *
 * `jab` já existe em `PLAYER_FRAMES` (feature anterior) com o mesmo golpe leve do grafo novo (MOV-04): este
 * módulo não o redefine, só os outros 12 golpes do chão (T8) e os aéreos/defesa/status (T9).
 *
 * Direção de arte (spec.md, "Direção de arte e feel" de cada história):
 * - `direto`: braço de trás reto, igual ao `cross` anterior (mesma leitura de golpe reto).
 * - `gancho`: o mesmo punho reto, mas alvo na altura da cabeça em vez do tronco (arco lateral que sobe).
 * - `cotovelada`: alcance curto, a ponta é o cotovelo (tons escuros da manga), nunca o punho de pele.
 * - `chuteFrontal`/`chuteAlto`: igual ao `kick` anterior; o alto tem a perna bem mais alta (altura da cabeça).
 * - `joelhada`: joelho dobrado subindo e avançando (LEG_KNEE_UP), não uma perna esticada.
 * - `chuteGiratorio`: chute normal, mas o frame de impacto é espelhado (o golpe chega de costas).
 * - `socoBaixo`: corpo agachado (`drop` grande), punho na altura do tronco/pernas do oponente.
 * - `rasteira`: corpo quase no chão (`drop` máximo), perna varrendo bem baixo.
 * - `ganchoAscendente`: punho acima da cabeça (`ARM_UP`), corpo subindo (`drop` negativo).
 * - `chuteEmpurrao`: perna esticada ao máximo, corpo inclinado para trás (empurra, não avança).
 * - `chuteCarregado`: corpo torcido para trás no wind (`lean` bem negativo), extensão máxima no hit.
 *
 * Aéreos e especiais (T9): `socoAereo` (soco no ar, pernas dobradas), `voadora` (perna esticada na diagonal
 * para baixo, corpo inclinado à frente), `pisao` (joelho alto, depois perna esticada para baixo), `guard`
 * (braços cruzados à frente do rosto, base firme), `parry` (braço desviando para fora), `dodge-0/1` (corpo
 * abaixado e inclinado no sentido do dash) e `stunned-0/1` (cambaleando, peso alternado).
 */
import {
  ARM_COCK,
  ARM_GUARD,
  ARM_UP,
  HEAD_FOCUS,
  LEGS_WIDE,
  LEG_SUPPORT,
  Y_LEGS,
  armStraight,
  far,
  legStraight,
  mirror,
  pose,
  type Grid,
} from './player';

// ---------------------------------------------------------------- partes novas (mesmo estilo de player.ts)

/** Cotovelo à frente (cotovelada): sem punho de pele na ponta, só a manga/cotovelo escuro. `len` = colunas do
 * ombro até a ponta do cotovelo, inclusive. */
function armElbow(len: number): string[] {
  const sleeve = len - 3;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(sleeve) + 'kNk',
    'k' + 'N'.repeat(sleeve) + 'kNk',
    'k' + 'n'.repeat(sleeve) + 'knk',
    'k'.repeat(len - 1) + '.',
  ];
}


/** Joelho dobrado subindo e avançando (joelhada, chambers de chute e preparo do pisão). Réplica local do
 * `LEG_CHAMBER` de `player.ts` (não exportado ali) para não alterar o módulo base. */
const LEG_KNEE_UP: Grid = ['kkkkkk.', 'kNNNNNk', 'knnnnNk', '.kkkkNk', '....kKKk', '....kkkk'];

// ---------------------------------------------------------------- golpes do chão (T8)

export const PLAYER_MOVE_FRAMES: Record<string, readonly string[]> = {
  // Direto (braço de trás), igual ao `cross` anterior: mesmo golpe reto do grafo novo.
  'direto-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(ARM_COCK), 1, 12],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'direto-hit': pose({
    lean: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 9, 12],
    far: [far(armStraight(16)), 10, 11],
    legs: [[LEGS_WIDE, 2, Y_LEGS]],
  }),
  'direto-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(armStraight(10)), 9, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Gancho (braço da frente, mesma leitura do jab): alvo na altura da cabeça em vez do tronco, arco que sobe.
  'gancho-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 3, 8],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'gancho-hit': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armStraight(15), 9, 5],
    far: [far(ARM_GUARD), 9, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'gancho-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armStraight(9), 9, 8],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Cotovelada (braço da frente): alcance curto, ponta é o cotovelo, não o punho.
  'cotovelada-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 4, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'cotovelada-hit': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armElbow(12), 9, 11],
    far: [far(ARM_GUARD), 9, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'cotovelada-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armElbow(8), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Chute frontal (perna da frente), igual ao `kick` anterior: mesmo chute do grafo novo.
  'chuteFrontal-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 15],
    ],
  }),
  'chuteFrontal-hit': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 5, 11],
    far: [far(ARM_GUARD), 0, 11],
    legs: [
      [LEG_SUPPORT, 3, 17],
      [legStraight(20), 9, 14],
    ],
  }),
  'chuteFrontal-recover': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 16],
    ],
  }),

  // Chute alto (perna da frente): a mesma mecânica do chute frontal, mas a perna sobe até a cabeça.
  'chuteAlto-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 10],
    far: [far(ARM_GUARD), 3, 10],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 9],
    ],
  }),
  'chuteAlto-hit': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 5, 10],
    far: [far(ARM_GUARD), 0, 10],
    legs: [
      [LEG_SUPPORT, 3, 17],
      [legStraight(21), 9, 2],
    ],
  }),
  'chuteAlto-recover': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 10],
    far: [far(ARM_GUARD), 3, 10],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 11],
    ],
  }),

  // Joelhada (perna da frente): joelho dobrado subindo e avançando, não uma perna esticada.
  'joelhada-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 12],
    far: [far(ARM_GUARD), 3, 12],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 8, 16],
    ],
  }),
  'joelhada-hit': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 12, 11],
    far: [far(ARM_GUARD), 6, 11],
    legs: [
      [LEG_SUPPORT, 3, 17],
      [LEG_KNEE_UP, 13, 10],
    ],
  }),
  'joelhada-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 12],
    far: [far(ARM_GUARD), 3, 12],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 8, 14],
    ],
  }),

  // Chute giratório (perna de trás): chute normal, mas o impacto chega de costas (frame espelhado).
  'chuteGiratorio-wind': pose({
    lean: -3,
    head: HEAD_FOCUS,
    near: [far(ARM_GUARD), 2, 11],
    far: [ARM_COCK, 8, 12],
    legs: [
      [LEG_SUPPORT, 20, 17],
      [LEG_KNEE_UP, 17, 15],
    ],
  }),
  'chuteGiratorio-hit': mirror(
    pose({
      lean: -2,
      head: HEAD_FOCUS,
      near: [ARM_GUARD, 5, 11],
      far: [far(ARM_GUARD), 0, 11],
      legs: [
        [LEG_SUPPORT, 3, 17],
        [legStraight(22), 9, 13],
      ],
    }),
  ),
  'chuteGiratorio-recover': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Soco baixo (braço da frente): corpo agachado, punho na altura do tronco/pernas do oponente.
  'socoBaixo-wind': pose({
    lean: -1,
    drop: 2,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 3, 15],
    far: [far(ARM_GUARD), 8, 14],
    legs: [[LEGS_WIDE, 0, Y_LEGS + 1]],
  }),
  'socoBaixo-hit': pose({
    lean: 2,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armStraight(16), 9, 16],
    far: [far(ARM_GUARD), 9, 14],
    legs: [[LEGS_WIDE, 1, Y_LEGS + 1]],
  }),
  'socoBaixo-recover': pose({
    lean: 1,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armStraight(10), 9, 16],
    far: [far(ARM_GUARD), 8, 14],
    legs: [[LEGS_WIDE, 0, Y_LEGS + 1]],
  }),

  // Rasteira (perna da frente): corpo quase no chão, perna varrendo bem baixo.
  'rasteira-wind': pose({
    lean: -1,
    drop: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 13],
    far: [far(ARM_GUARD), 3, 13],
    legs: [
      [LEG_SUPPORT, 5, 18],
      [LEG_KNEE_UP, 8, 17],
    ],
  }),
  'rasteira-hit': pose({
    lean: 1,
    drop: 5,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 6, 15],
    far: [far(ARM_GUARD), 2, 15],
    legs: [
      [LEG_SUPPORT, 3, 19],
      [legStraight(22), 9, 17],
    ],
  }),
  'rasteira-recover': pose({
    lean: -1,
    drop: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 13],
    far: [far(ARM_GUARD), 3, 13],
    legs: [
      [LEG_SUPPORT, 5, 18],
      [LEG_KNEE_UP, 8, 18],
    ],
  }),

  // Gancho ascendente (braço da frente): punho acima da cabeça, corpo subindo.
  'ganchoAscendente-wind': pose({
    lean: -1,
    drop: 1,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 4, 13],
    far: [far(ARM_GUARD), 8, 12],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'ganchoAscendente-hit': pose({
    lean: 1,
    drop: -2,
    head: HEAD_FOCUS,
    near: [ARM_UP, 9, 1],
    far: [far(ARM_GUARD), 8, 9],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'ganchoAscendente-recover': pose({
    lean: 0,
    drop: -1,
    head: HEAD_FOCUS,
    near: [ARM_UP, 8, 5],
    far: [far(ARM_GUARD), 8, 10],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Chute empurrão (perna da frente): perna esticada ao máximo, corpo inclinado para trás (empurra).
  'chuteEmpurrao-wind': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 15],
    ],
  }),
  'chuteEmpurrao-hit': pose({
    lean: -3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 4, 11],
    far: [far(ARM_GUARD), -1, 11],
    legs: [
      [LEG_SUPPORT, 2, 17],
      [legStraight(23), 8, 15],
    ],
  }),
  'chuteEmpurrao-recover': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 16],
    ],
  }),

  // Chute carregado (perna de trás): corpo torcido para trás no wind, extensão máxima no hit.
  'chuteCarregado-wind': pose({
    lean: -5,
    drop: 1,
    head: HEAD_FOCUS,
    near: [far(ARM_GUARD), 1, 12],
    far: [ARM_COCK, 9, 13],
    legs: [
      [LEG_SUPPORT, 21, 17],
      [LEG_KNEE_UP, 18, 15],
    ],
  }),
  'chuteCarregado-hit': pose({
    lean: 6,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 6, 11],
    far: [far(ARM_GUARD), 1, 11],
    legs: [
      [LEG_SUPPORT, 2, 17],
      [legStraight(26), 8, 13],
    ],
  }),
  'chuteCarregado-recover': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),

};
