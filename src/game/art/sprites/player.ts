/*
 * Estudante de jujutsu (CHR-01): uniforme azul-marinho de gola alta com botões dourados, cabelo escuro espetado,
 * olhando para a direita. Luz de cima: 1 tom mais claro no topo das formas, 1 mais escuro embaixo; contorno `k`.
 * Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * SPEC_DEVIATION: o spec fixa o player em 16x24 texels; aqui todos os frames têm 32x24 texels (64x48 px).
 * Reason: o golpe esticado precisa alcançar a borda da hitbox (soco ~35 px e chute 42 px à frente do centro);
 * 16 texels só dão 16 px para cada lado. O personagem continua ocupando ~16 texels de largura nos frames sem
 * golpe, e a origem (PLAYER_ORIGIN) fica no pé, no centro do corpo, não no centro do frame.
 *
 * Os frames são montados como "boneco de papel": partes em texto (cabeça, tronco, braços, pernas) sobrepostas em
 * posições fixas; '.' é transparente. O centro do corpo fica na coluna 8 da área de desenho (entre as colunas 7
 * e 8), que vira a coluna 10 do frame final (FRAME_PAD à esquerda).
 */

/** Tamanho final de todo frame da folha, em texels. */
export const PLAYER_FRAME_W = 32;
export const PLAYER_FRAME_H = 24;
/** Colunas vazias à esquerda da área de desenho. */
const FRAME_PAD = 2;
/** Coluna (no frame final) da linha de centro do corpo. */
const CENTER_COL = 8 + FRAME_PAD;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico. */
export const PLAYER_ORIGIN = { x: CENTER_COL / PLAYER_FRAME_W, y: 1 } as const;

type Grid = readonly string[];
type Placed = readonly [Grid, number, number];

/** Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x24; '.' não pinta. */
function compose(...parts: Placed[]): string[] {
  const w = PLAYER_FRAME_W - FRAME_PAD;
  const canvas = Array.from({ length: PLAYER_FRAME_H }, () => Array<string>(w).fill('.'));
  for (const [grid, x0, y0] of parts) {
    grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        const x = x0 + dx;
        const y = y0 + dy;
        if (ch === '.' || y < 0 || y >= PLAYER_FRAME_H || x < 0 || x >= w) return;
        canvas[y][x] = ch;
      }),
    );
  }
  return canvas.map((row) => '.'.repeat(FRAME_PAD) + row.join(''));
}

/** Troca cores de uma parte (ex.: braço de trás mais escuro). */
function recolor(grid: Grid, map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/** Espelha uma parte na horizontal. */
function mirror(grid: Grid): string[] {
  return grid.map((row) => [...row].reverse().join(''));
}

/** O braço/perna de trás fica um tom mais escuro. */
const FAR = { s: 'N', N: 'n', n: 'K', p: 'P', P: 'q' };

// ---------------------------------------------------------------- cabeça (13x11)
const HEAD: Grid = [
  '...k...k.....',
  '..khk.khk.k..',
  '.khHhkhHhkhk.',
  'khhHhhhHhhhk.',
  'khhhhhhhhhhhk',
  'khhhhhhhhhhk.',
  'khhhhhphpppk.',
  'khhhhPppkppk.',
  'khhhhPppppppk',
  '.khhhPpppqpk.',
  '.knnnkPppkk..',
];
/** Olhos apertados e boca aberta (dor). */
const HEAD_HURT: Grid = [
  '...k...k.....',
  '..khk.khk.k..',
  '.khHhkhHhkhk.',
  'khhHhhhHhhhk.',
  'khhhhhhhhhhhk',
  'khhhhhhhhhhk.',
  'khhhhhphpppk.',
  'khhhhPppkkpk.',
  'khhhhPppppppk',
  '.khhhPppprpk.',
  '.knnnkPppkk..',
];
/** Cabeça concentrada no golpe: sobrancelha baixa. */
const HEAD_FOCUS: Grid = [
  '...k...k.....',
  '..khk.khk.k..',
  '.khHhkhHhkhk.',
  'khhHhhhHhhhk.',
  'khhhhhhhhhhhk',
  'khhhhhhhhhhk.',
  'khhhhhphhhpk.',
  'khhhhPppkppk.',
  'khhhhPppppppk',
  '.khhhPppqqpk.',
  '.knnnkPppkk..',
];

// ---------------------------------------------------------------- tronco (8x7), gola alta e botões
const BODY: Grid = [
  'knNNNNnk',
  'kNsssNNk',
  'kNNNNANk',
  'kNNNNNNk',
  'kNNNNANk',
  'knnnnnnk',
  'kKKKKKKk',
];

// ---------------------------------------------------------------- braços (o da frente; o de trás via recolor)
/** Caído ao lado do corpo. */
const ARM_DOWN: Grid = ['ksNk', 'kNnk', 'kNnk', 'kNnk', 'kPpk', 'kppk', '.kk.'];
/** Balançando para trás (corrida). */
const ARM_BACK: Grid = ['...ksNk', '..kNNk.', '.kNnk..', 'kNnk...', 'kppk...', '.kk....'];
/** Balançando para a frente (corrida). */
const ARM_FWD: Grid = ['ksNk...', '.kNNk..', '..kNNk.', '...kNpk', '...kppk', '....kk.'];
/** Guarda: cotovelo embaixo, punho na altura do queixo. */
const ARM_GUARD: Grid = ['...kkk', '..kppk', 'ksNppk', 'kNNNk.', 'knNk..', '.kk...'];
/** Punho puxado para trás do ombro (preparo do soco). */
const ARM_COCK: Grid = ['kkkNNk', 'kppNnk', 'kppnk.', '.kkk..'];
/** Para cima segurando (carregar / preparo do arremesso). */
const ARM_UP: Grid = ['.kk.', 'kppk', 'kppk', 'kNnk', 'kNnk', 'ksNk'];

/**
 * Braço esticado na horizontal: manga com luz em cima, punho 3x3 na ponta. `len` = colunas do ombro até o
 * contorno da ponta do punho, inclusive.
 */
function armStraight(len: number): string[] {
  const sleeve = len - 6;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(sleeve) + 'kpppk',
    'k' + 'N'.repeat(sleeve) + 'kppPk',
    'k' + 'n'.repeat(sleeve) + 'kPPqk',
    'k'.repeat(len - 1) + '.',
  ];
}

// ---------------------------------------------------------------- pernas (16x6, na base do frame)
const LEGS_STAND: Grid = [
  '....knNNNNNk',
  '....kKnkknNk',
  '....kKnk.knNk',
  '....kKnk.knNk',
  '...kKKKk.kKKKk',
  '...kkkkk.kkkkkk',
];
/** Base firme, pés afastados (golpes). */
const LEGS_WIDE: Grid = [
  '....knNNNNNk',
  '...kKnkkknNk',
  '..kKnk...knNk',
  '.kKnk....knNk',
  'kKKKk....kKKKk',
  'kkkkk....kkkkkk',
];
// Ciclo de corrida (6 poses): perna da frente em N, a de trás em n/K.
const RUN_LEGS: Grid[] = [
  // 0: contato, perna da frente esticada à frente
  ['....knNNNNk', '...kKnkknNNk', '..kKnk...knNk', '.kKnk.....knNk', 'kKKk......kKKKk', 'kkk.......kkkkk'],
  // 1: apoio, perna da frente dobrada
  ['....knNNNNk', '...kKnkknNk', '...kKnkknNk', '..kKnk.knNk', '.kKKk..kKKKk', '.kkk...kkkkk'],
  // 2: passagem, perna de trás subindo atrás
  ['....knNNNNk', '..kKKknNNk', '.kKKk.knNk', '.kkk..knNk', '......kKKKk', '......kkkkk'],
  // 3: contato, perna de trás esticada à frente
  ['....knNNNNk', '...knNkkKnNk', '..knNk...kKnk', '.knNk.....kKnk', 'kKKk......kKKKk', 'kkk.......kkkkk'],
  // 4: apoio, perna de trás dobrada
  ['....knNNNNk', '...knNkkKnk', '...knNkkKnk', '..knNk.kKnk', '.kKKk..kKKKk', '.kkk...kkkkk'],
  // 5: passagem, perna da frente subindo atrás
  ['....knNNNNk', '..kNNkkKnk', '.kKKk.kKnk', '.kkk..kKnk', '......kKKKk', '......kkkkk'],
];
/** Pulo: joelhos recolhidos. */
const LEGS_TUCK: Grid = ['....knNNNNNk', '...kKnkknNNk', '...kKKk.kNNNk', '....kkk.kKKKk', '.........kkkk', ''];
/** Queda: pernas soltas, uma à frente. */
const LEGS_DANGLE: Grid = ['....knNNNNNk', '....kKnk.knNk', '...kKnk..knNk', '...kKKk...knNk', '...kkk....kKKKk', '...........kkkk'];
/**
 * Chute: perna da frente esticada na horizontal, com o sapato na ponta. `len` = colunas do quadril até o
 * contorno da ponta do pé, inclusive.
 */
function legStraight(len: number): string[] {
  const leg = len - 6;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 'N'.repeat(leg) + 'kKKKk',
    'k' + 'N'.repeat(leg) + 'kKKKk',
    'k' + 'n'.repeat(leg) + 'kKKKk',
    'k'.repeat(len),
  ];
}
/** Joelho da frente dobrado para cima (preparo e volta do chute). */
const LEG_CHAMBER: Grid = ['kkkkkk.', 'kNNNNNk', 'knnnnNk', '.kkkkNk', '....kKKk', '....kkkk'];
/** Só a perna de trás, de apoio. */
const LEG_SUPPORT: Grid = ['knNk', 'kKnk', 'kKnk', 'kKnk', 'kKnk', 'kKKKk', 'kkkkk'];

// ---------------------------------------------------------------- montagem
const Y_HEAD = 0;
const Y_BODY = 11;
const Y_LEGS = 18;

interface Pose {
  head?: Grid;
  /** Deslocamento horizontal de cabeça + tronco (inclinação). */
  lean?: number;
  /** Deslocamento vertical de cabeça + tronco (respiração, agachar). */
  drop?: number;
  near?: Placed;
  far?: Placed;
  legs?: Placed[];
}

function pose(p: Pose): string[] {
  const lean = p.lean ?? 0;
  const drop = p.drop ?? 0;
  const parts: Placed[] = [];
  if (p.far) parts.push(p.far);
  parts.push(...(p.legs ?? [[LEGS_STAND, 0, Y_LEGS] as const]));
  parts.push([BODY, 4 + lean, Y_BODY + drop]);
  parts.push([p.head ?? HEAD, 3 + lean, Y_HEAD + drop]);
  if (p.near) parts.push(p.near);
  return compose(...parts);
}

const far = (g: Grid): string[] => recolor(g, FAR);

export const PLAYER_FRAMES: Record<string, readonly string[]> = {
  'idle-0': pose({ near: [ARM_DOWN, 5, 12] }),
  'idle-1': pose({ drop: 1, near: [ARM_DOWN, 5, 13] }),

  'run-0': pose({ lean: 1, near: [ARM_BACK, 2, 12], far: [far(ARM_FWD), 8, 12], legs: [[RUN_LEGS[0], 0, Y_LEGS]] }),
  'run-1': pose({ lean: 1, drop: 1, near: [ARM_DOWN, 6, 13], far: [far(ARM_DOWN), 8, 13], legs: [[RUN_LEGS[1], 0, Y_LEGS]] }),
  'run-2': pose({ lean: 1, near: [ARM_FWD, 6, 12], far: [far(ARM_BACK), 2, 12], legs: [[RUN_LEGS[2], 0, Y_LEGS]] }),
  'run-3': pose({ lean: 1, near: [ARM_FWD, 6, 12], far: [far(ARM_BACK), 2, 12], legs: [[RUN_LEGS[3], 0, Y_LEGS]] }),
  'run-4': pose({ lean: 1, drop: 1, near: [ARM_DOWN, 6, 13], far: [far(ARM_DOWN), 8, 13], legs: [[RUN_LEGS[4], 0, Y_LEGS]] }),
  'run-5': pose({ lean: 1, near: [ARM_BACK, 2, 12], far: [far(ARM_FWD), 8, 12], legs: [[RUN_LEGS[5], 0, Y_LEGS]] }),

  'jump-0': pose({ near: [ARM_FWD, 7, 11], far: [far(ARM_BACK), 1, 11], legs: [[LEGS_TUCK, 0, Y_LEGS - 1]] }),
  'fall-0': pose({ near: [mirror(ARM_BACK), 8, 10], far: [far(ARM_BACK), 1, 10], legs: [[LEGS_DANGLE, 0, Y_LEGS]] }),

  // Jab (braço da frente). No hit, o punho chega à coluna 25 = 18 texels (36 px) à frente do centro,
  // a borda da hitbox do jab (offsetX 22 + largura/2 13 = 35 px).
  'jab-wind': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_COCK, 3, 12], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'jab-hit': pose({ lean: 2, head: HEAD_FOCUS, near: [armStraight(17), 9, 11], far: [far(ARM_GUARD), 9, 11], legs: [[LEGS_WIDE, 1, Y_LEGS]] }),
  'jab-recover': pose({ lean: 1, head: HEAD_FOCUS, near: [armStraight(10), 9, 11], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Direto (braço de trás, mais escuro), com o tronco girado para a frente.
  'cross-wind': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_GUARD, 8, 11], far: [far(ARM_COCK), 1, 12], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'cross-hit': pose({ lean: 3, head: HEAD_FOCUS, near: [ARM_GUARD, 9, 12], far: [far(armStraight(16)), 10, 11], legs: [[LEGS_WIDE, 2, Y_LEGS]] }),
  'cross-recover': pose({ lean: 1, head: HEAD_FOCUS, near: [ARM_GUARD, 8, 11], far: [far(armStraight(10)), 9, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Chute: no hit, a ponta do pé chega à coluna 28 = 21 texels (42 px) à frente do centro,
  // a borda da hitbox do chute (offsetX 26 + largura/2 16 = 42 px).
  'kick-wind': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_GUARD, 7, 11], far: [far(ARM_GUARD), 3, 11], legs: [[LEG_SUPPORT, 4, 17], [LEG_CHAMBER, 7, 15]] }),
  'kick-hit': pose({ lean: -2, head: HEAD_FOCUS, near: [ARM_GUARD, 5, 11], far: [far(ARM_BACK), 0, 11], legs: [[LEG_SUPPORT, 3, 17], [legStraight(20), 9, 14]] }),
  'kick-recover': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_GUARD, 7, 11], far: [far(ARM_GUARD), 3, 11], legs: [[LEG_SUPPORT, 4, 17], [LEG_CHAMBER, 7, 16]] }),

  // Carregando objeto: braços para cima segurando.
  'carry-idle-0': pose({ near: [ARM_GUARD, 8, 10], far: [far(ARM_UP), 1, 3] }),
  'carry-idle-1': pose({ drop: 1, near: [ARM_GUARD, 8, 11], far: [far(ARM_UP), 1, 4] }),
  'carry-run-0': pose({ lean: 1, near: [ARM_GUARD, 9, 10], far: [far(ARM_UP), 2, 3], legs: [[RUN_LEGS[0], 0, Y_LEGS]] }),
  'carry-run-1': pose({ lean: 1, drop: 1, near: [ARM_GUARD, 9, 11], far: [far(ARM_UP), 2, 4], legs: [[RUN_LEGS[1], 0, Y_LEGS]] }),
  'carry-run-2': pose({ lean: 1, near: [ARM_GUARD, 9, 10], far: [far(ARM_UP), 2, 3], legs: [[RUN_LEGS[3], 0, Y_LEGS]] }),
  'carry-run-3': pose({ lean: 1, drop: 1, near: [ARM_GUARD, 9, 11], far: [far(ARM_UP), 2, 4], legs: [[RUN_LEGS[4], 0, Y_LEGS]] }),

  // Golpe com objeto: ergue, desce à frente, volta.
  'swing-wind': pose({ lean: -1, near: [ARM_COCK, 3, 12], far: [far(ARM_UP), 1, 3], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'swing-hit': pose({ lean: 2, near: [armStraight(12), 9, 12], far: [far(armStraight(11)), 9, 10], legs: [[LEGS_WIDE, 1, Y_LEGS]] }),
  'swing-recover': pose({ lean: 1, near: [armStraight(9), 9, 12], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Arremesso: braço para trás e para cima, depois solta à frente.
  'throw-0': pose({ lean: -1, near: [ARM_UP, 0, 3], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'throw-1': pose({ lean: 2, near: [armStraight(13), 9, 11], far: [far(ARM_BACK), 1, 12], legs: [[LEGS_WIDE, 1, Y_LEGS]] }),

  // Levando golpe: tronco para trás, braços soltos.
  hurt: pose({ lean: -2, head: HEAD_HURT, near: [mirror(ARM_FWD), 0, 12], far: [far(ARM_BACK), 5, 12], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
};

export interface AnimDef {
  frames: readonly string[];
  frameRate: number;
  /** -1 = repete sempre; 0 = toca uma vez. */
  repeat: number;
}

/**
 * Animações do player (CHR-01). Os golpes (jab, cross, kick, swing) têm os frames wind/hit/recover, trocados
 * pela fase do combo com setFrame; a animação registrada serve de sequência de referência.
 */
export const PLAYER_ANIMS: Record<string, AnimDef> = {
  idle: { frames: ['idle-0', 'idle-1'], frameRate: 2, repeat: -1 },
  run: { frames: ['run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5'], frameRate: 12, repeat: -1 },
  jump: { frames: ['jump-0'], frameRate: 1, repeat: 0 },
  fall: { frames: ['fall-0'], frameRate: 1, repeat: 0 },
  jab: { frames: ['jab-wind', 'jab-hit', 'jab-recover'], frameRate: 12, repeat: 0 },
  cross: { frames: ['cross-wind', 'cross-hit', 'cross-recover'], frameRate: 12, repeat: 0 },
  kick: { frames: ['kick-wind', 'kick-hit', 'kick-recover'], frameRate: 10, repeat: 0 },
  'carry-idle': { frames: ['carry-idle-0', 'carry-idle-1'], frameRate: 2, repeat: -1 },
  'carry-run': { frames: ['carry-run-0', 'carry-run-1', 'carry-run-2', 'carry-run-3'], frameRate: 10, repeat: -1 },
  swing: { frames: ['swing-wind', 'swing-hit', 'swing-recover'], frameRate: 10, repeat: 0 },
  throw: { frames: ['throw-0', 'throw-1'], frameRate: 10, repeat: 0 },
  hurt: { frames: ['hurt'], frameRate: 1, repeat: 0 },
};
