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
 * - `chuteGiratorio`: chute normal, mas os braços do impacto são espelhados (o golpe chega de costas); o tronco fica na origem.
 * - `socoBaixo`: corpo agachado (`drop` grande), punho na altura do tronco/pernas do oponente.
 * - `rasteira`: corpo quase no chão (`drop` máximo), perna varrendo bem baixo.
 * - `ganchoAscendente`: punho subindo pela frente do rosto (`armRaised`), sem `drop` negativo (cabeça fica na grade).
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
  cropPart,
  far,
  legStraight,
  mirror,
  pose,
  type Grid,
  LEG_CHAMBER,
} from './player';

// ---------------------------------------------------------------- partes novas (mesmo estilo de player.ts)

/** Cotovelo à frente (cotovelada): sem punho de pele na ponta, só a manga terminando em ponta no cotovelo (`o`).
 * Ocupa `len + 1` colunas: a ponta do cotovelo fica uma coluna além de `len`, numa linha só. */
function armElbow(len: number): string[] {
  const sleeve = len - 3;
  return [
    'k'.repeat(len - 1) + '..',
    'k' + 's'.repeat(sleeve) + 'Nk.',
    'k' + 'N'.repeat(sleeve + 1) + 'ok',
    'k' + 'n'.repeat(sleeve + 1) + 'k.',
    'k'.repeat(len - 1) + '..',
  ];
}

/** Palma aberta à frente (palmaExplosiva): o `armStraight` com o brilho quente de golpe forte (`A`) no centro da
 * mão, em vez do punho fechado. */
function armPalm(len: number): string[] {
  return armStraight(len).map((row, y) => (y === 1 || y === 2 ? row.slice(0, len - 3) + 'A' + row.slice(len - 2) : row));
}

/**
 * Perna esticada subindo na diagonal (chute alto): sai do quadril, embaixo à esquerda, e termina no pé, `rise`
 * linhas acima, com a mesma coxa grossa, canela fina e sapato do `legStraight`. `len` = colunas do quadril até o
 * contorno da ponta do pé, inclusive; a ponta fica nas 5 primeiras linhas da parte.
 */
function legRaised(len: number, rise: number): string[] {
  const leg = len - 6;
  const thigh = Math.ceil(leg / 2);
  const cells = Array.from({ length: rise + 5 }, () => Array<string>(len).fill('.'));
  for (let x = 1; x <= leg; x++) {
    const top = 1 + Math.round(rise * (1 - (x - 1) / (leg - 1)));
    if (x <= thigh) {
      cells[top][x] = 's';
      cells[top + 1][x] = x === thigh ? 'o' : 'N';
      cells[top + 2][x] = 'n';
    } else {
      cells[top][x] = 'N';
      cells[top + 1][x] = 'n';
    }
  }
  for (let y = 1; y <= 3; y++) cells[y].splice(leg + 2, 3, 'K', 'K', 's');
  const filled = cells.map((row) => row.map((c) => c !== '.'));
  const near = (x: number, y: number): boolean => filled[y]?.[x] === true;
  return cells.map((row, y) =>
    row.map((c, x) => (c === '.' && (near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1)) ? 'k' : c)).join(''),
  );
}

/* Joelho dobrado subindo e avançando (joelhada, chambers de chute e preparo do pisão): `LEG_CHAMBER` de `player.ts`. */
const LEG_KNEE_UP: Grid = LEG_CHAMBER;

/** Perna esticada para baixo (pisão, impacto): coluna vertical com a sola na ponta inferior. `len` = linhas do
 * quadril até a sola, inclusive. */
function legDown(len: number): string[] {
  const shin = len - 3;
  const rows: string[] = ['ksNk'];
  for (let i = 0; i < shin; i++) rows.push(i === Math.floor(shin / 2) ? 'koNk' : 'kNnk');
  rows.push('kKKKk', 'ksssk');
  return rows;
}

/** Braço erguido na vertical (gancho ascendente): o `ARM_UP` esticado até `len` linhas, com a manga no meio. */
function armRaised(len: number): string[] {
  return [...ARM_UP.slice(0, 3), ...Array<string>(len - 6).fill('kNnk'), ...ARM_UP.slice(3)];
}

/** Pernas dobradas no ar (golpes aéreos): réplica local do `LEGS_TUCK` de `player.ts` (não exportado ali),
 * para manter o mesmo desenho enquanto o personagem está no ar. */
const LEGS_AIR: Grid = ['....knNNNNNk', '...kKnkknNNk', '...kKKk.ksNNk', '....kkk.kKsKk'];

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
      [legRaised(21, 12), 9, 2],
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

  // Chute giratório (perna de trás): o impacto chega "de costas" — só os braços são espelhados (sem mirror() no
  // frame inteiro, que jogava o boneco ~11 texels para trás); tronco e pernas ficam na coluna da origem.
  'chuteGiratorio-wind': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [far(ARM_GUARD), 3, 11],
    far: [ARM_COCK, 9, 12],
    legs: [
      [LEG_SUPPORT, 3, 17],
      [LEG_KNEE_UP, 6, 15],
    ],
  }),
  'chuteGiratorio-hit': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [mirror(ARM_GUARD), 2, 11],
    far: [far(mirror(ARM_GUARD)), 0, 11],
    legs: [
      [LEG_SUPPORT, 3, 17],
      [legStraight(19), 9, 13],
    ],
  }),
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
    legs: [cropPart([LEGS_WIDE, 0, Y_LEGS + 1], { bottom: 1 })],
  }),
  'socoBaixo-hit': pose({
    lean: 2,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armStraight(16), 9, 16],
    far: [far(ARM_GUARD), 9, 14],
    legs: [cropPart([LEGS_WIDE, 1, Y_LEGS + 1], { bottom: 1 })],
  }),
  'socoBaixo-recover': pose({
    lean: 1,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armStraight(10), 9, 16],
    far: [far(ARM_GUARD), 8, 14],
    legs: [cropPart([LEGS_WIDE, 0, Y_LEGS + 1], { bottom: 1 })],
  }),

  // Rasteira (perna da frente): corpo quase no chão, perna varrendo bem baixo.
  'rasteira-wind': pose({
    lean: -1,
    drop: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 13],
    far: [far(ARM_GUARD), 3, 13],
    legs: [
      cropPart([LEG_SUPPORT, 5, 18], { bottom: 1 }),
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
      cropPart([LEG_SUPPORT, 3, 19], { bottom: 2 }),
      [legStraight(21), 9, 17],
    ],
  }),
  'rasteira-recover': pose({
    lean: -1,
    drop: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 13],
    far: [far(ARM_GUARD), 3, 13],
    legs: [
      cropPart([LEG_SUPPORT, 5, 18], { bottom: 1 }),
      [LEG_KNEE_UP, 8, 18],
    ],
  }),

  // Gancho ascendente (braço da frente): punho subindo pela frente do rosto. O tronco não sobe (`drop` >= 0):
  // com `drop` negativo a cabeça saía da grade e as pernas ficavam soltas.
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
    head: HEAD_FOCUS,
    near: [armRaised(11), 13, 1],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'ganchoAscendente-recover': pose({
    lean: 0,
    head: HEAD_FOCUS,
    near: [armRaised(8), 12, 4],
    far: [far(ARM_GUARD), 8, 11],
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
    far: [far(ARM_GUARD), 0, 11],
    legs: [
      [LEG_SUPPORT, 2, 17],
      [legStraight(22), 8, 15],
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

  // Chute carregado (perna de trás): corpo torcido para trás no wind, extensão máxima no hit (a perna vai até a
  // última coluna da grade, sem corte).
  'chuteCarregado-wind': pose({
    lean: -2,
    drop: 1,
    head: HEAD_FOCUS,
    near: [far(ARM_GUARD), 4, 12],
    far: [ARM_COCK, 12, 13],
    legs: [
      [LEG_SUPPORT, 4, 17],
      [LEG_KNEE_UP, 7, 15],
    ],
  }),
  'chuteCarregado-hit': pose({
    lean: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 3, 11],
    far: [far(ARM_GUARD), 0, 11],
    legs: [
      [LEG_SUPPORT, 0, 17],
      [legStraight(22), 8, 13],
    ],
  }),
  'chuteCarregado-recover': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 11],
    far: [far(ARM_GUARD), 3, 11],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),

  // ---------------------------------------------------------------- aéreos (T9)

  // Soco aéreo (braço da frente): mesmo golpe reto do jab, pernas dobradas por estar no ar.
  'socoAereo-wind': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 3, 10],
    far: [far(ARM_GUARD), 8, 9],
    legs: [[LEGS_AIR, 0, Y_LEGS - 2]],
  }),
  'socoAereo-hit': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armStraight(16), 9, 9],
    far: [far(ARM_GUARD), 9, 9],
    legs: [[LEGS_AIR, 1, Y_LEGS - 2]],
  }),
  'socoAereo-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armStraight(9), 9, 9],
    far: [far(ARM_GUARD), 8, 9],
    legs: [[LEGS_AIR, 0, Y_LEGS - 2]],
  }),

  // Voadora (perna da frente): perna esticada na diagonal para baixo, corpo inclinado à frente.
  'voadora-wind': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 9],
    far: [far(ARM_GUARD), 3, 9],
    legs: [[LEGS_AIR, 0, Y_LEGS - 2]],
  }),
  'voadora-hit': pose({
    lean: 5,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 5, 9],
    far: [far(ARM_GUARD), 0, 9],
    legs: [
      [LEG_KNEE_UP, 3, 8],
      [legStraight(20), 9, 15],
    ],
  }),
  'voadora-recover': pose({
    lean: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 7, 10],
    far: [far(ARM_GUARD), 3, 10],
    legs: [[LEGS_AIR, 0, Y_LEGS - 1]],
  }),

  // Pisão (perna da frente): joelho alto, depois perna esticada para baixo.
  'pisao-wind': pose({
    lean: 0,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 9],
    far: [far(ARM_GUARD), 3, 9],
    legs: [[LEG_KNEE_UP, 8, 2]],
  }),
  'pisao-hit': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 9],
    far: [far(ARM_GUARD), 3, 9],
    legs: [[legDown(11), 9, 12]],
  }),
  'pisao-recover': pose({
    lean: 0,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 9],
    far: [far(ARM_GUARD), 3, 9],
    legs: [[LEG_KNEE_UP, 8, 8]],
  }),

  // Palma explosiva (meia-lua, braço da frente): palma aberta à frente com o brilho de golpe forte.
  'palmaExplosiva-wind': pose({
    lean: -2,
    drop: 1,
    head: HEAD_FOCUS,
    near: [ARM_COCK, 3, 13],
    far: [far(ARM_COCK), 8, 13],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'palmaExplosiva-hit': pose({
    lean: 4,
    head: HEAD_FOCUS,
    near: [armPalm(17), 9, 11],
    far: [far(ARM_GUARD), 9, 11],
    legs: [[LEGS_WIDE, 2, Y_LEGS]],
  }),
  'palmaExplosiva-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armPalm(10), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // ---------------------------------------------------------------- defesa e status (T9)

  // Guarda (CTL-09): braços cruzados à frente do rosto, base firme.
  guard: pose({
    head: HEAD_FOCUS,
    near: [mirror(ARM_GUARD), 11, 4],
    far: [far(ARM_GUARD), 6, 5],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Parry: braço desviando para fora (mesma altura da guarda, mas só um braço, estendido para o lado).
  parry: pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [mirror(ARM_COCK), 15, 9],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Esquiva: corpo abaixado e inclinado no sentido do dash (dois estágios do dash).
  'dodge-0': pose({
    lean: 3,
    drop: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 9, 13],
    far: [far(ARM_GUARD), 4, 13],
    legs: [[LEGS_WIDE, 1, Y_LEGS]],
  }),
  'dodge-1': pose({
    lean: 5,
    drop: 3,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 11, 14],
    far: [far(ARM_GUARD), 6, 14],
    legs: [[LEGS_WIDE, 3, Y_LEGS]],
  }),

  // Atordoado (guarda quebrada): cambaleando, peso alternado de um frame para o outro.
  'stunned-0': pose({
    lean: 4,
    drop: 1,
    near: [ARM_GUARD, 9, 13],
    far: [far(ARM_GUARD), 5, 12],
    legs: [[LEGS_WIDE, 2, Y_LEGS]],
  }),
  'stunned-1': pose({
    lean: -3,
    drop: 2,
    near: [ARM_GUARD, 6, 14],
    far: [far(ARM_GUARD), 2, 13],
    legs: [cropPart([LEGS_WIDE, -2, Y_LEGS], { left: 2 })],
  }),
};
