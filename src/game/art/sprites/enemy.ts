/*
 * Espírito amaldiçoado (CHR-03/04): massa curvada cinza-arroxeada com chifres curtos, um olho grande âmbar, boca
 * larga cheia de dentes e braços longos com garras, olhando para a direita. Tons médios/claros (`i`, `I`) com
 * contorno `k`, para a silhueta se destacar do fundo noturno escuro. Dados puros (sem `phaser` como valor).
 *
 * Mesmo padrão de frame largo do player (ver SPEC_DEVIATION em player.ts): o spec fala em 18x24 texels, mas
 * todos os frames têm 32x24 texels (64x48 px) para caber a garra esticada do golpe, que chega à borda da hitbox
 * do ENEMY_ATTACK (offsetX 20 + largura/2 12 = 32 px à frente do centro). O tronco ocupa as colunas 7..17
 * (11 texels = os 22 px centrais do corpo físico) e a origem fica no pé, no centro do corpo: a linha de centro
 * passa no meio da coluna 12 (12,5 texels = 25 px da borda esquerda, um número inteiro de px).
 *
 * Frames montados como "boneco de papel", como no player: partes em texto sobrepostas; '.' é transparente.
 */

/** Tamanho final de todo frame da folha, em texels. */
export const ENEMY_FRAME_W = 32;
export const ENEMY_FRAME_H = 24;
/** Coluna (em texels, fracionária) da linha de centro do corpo. */
const CENTER_COL = 12.5;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico. */
export const ENEMY_ORIGIN = { x: CENTER_COL / ENEMY_FRAME_W, y: 1 } as const;

type Grid = readonly string[];
type Placed = readonly [Grid, number, number];

/** Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x24; '.' não pinta. */
function compose(...parts: Placed[]): string[] {
  const canvas = Array.from({ length: ENEMY_FRAME_H }, () => Array<string>(ENEMY_FRAME_W).fill('.'));
  for (const [grid, x0, y0] of parts) {
    grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        const x = x0 + dx;
        const y = y0 + dy;
        if (ch === '.' || y < 0 || y >= ENEMY_FRAME_H || x < 0 || x >= ENEMY_FRAME_W) return;
        canvas[y][x] = ch;
      }),
    );
  }
  return canvas.map((row) => row.join(''));
}

function recolor(grid: Grid, map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

function mirror(grid: Grid): string[] {
  const w = Math.max(...grid.map((r) => r.length));
  return grid.map((row) => [...row.padEnd(w, '.')].reverse().join(''));
}

/** Braço/perna de trás: um tom mais escuro. */
const FAR = { I: 'i', i: 'H', H: 'K', w: 'S' };
const far = (g: Grid): string[] => recolor(g, FAR);

// ---------------------------------------------------------------- tronco (11x16): corcunda atrás, cabeça à frente
const BODY: Grid = [
  '..kkkk.k...',
  '.kIIIIkIk..',
  'kIIIIIIIIk.',
  'kIIiiiIIIIk',
  'kIiiiiiiIIk',
  'kIiiiiiiiik',
  'kiiiiiiiiik',
  'kiiiiiiiiik',
  'kiiiiiiiiik',
  'kiiiiiiiiik',
  'kiiiiiiiiik',
  'kHiiiiiiiik',
  'kHiiiiiiiik',
  'kHHiiiiiiHk',
  '.kHHHHHHHk.',
  '..kkkkkkk..',
];

// ---------------------------------------------------------------- olho (7x6), na frente da cabeça, pupila em fenda
const EYE: Grid = ['.kkkkk.', 'kwAAkAk', 'kAAAkAk', 'kAAAkAk', 'kaAAkak', '.kkkkk.'];
/** Preparo: o olho acende em branco, fenda em brasa. */
const EYE_GLOW: Grid = ['.kkkkk.', 'kwwwrwk', 'kwwwrAk', 'kwwArAk', 'kAwArAk', '.kkkkk.'];
/** Levando golpe: olho apertado. */
const EYE_SQUINT: Grid = ['.......', '.......', 'kkkkkkk', 'kaAAAak', '.kkkkk.', '.......'];

// ---------------------------------------------------------------- boca larga (9 de largura)
const MOUTH: Grid = ['kkkkkkkkk', 'kwkwkwkwk', '.kkkkkkk.'];
/** Aberta (preparo, dor): goela vermelha. */
const MOUTH_OPEN: Grid = ['kkkkkkkkk', 'kwrrrrrwk', 'krrrrrrrk', '.kwkwkwk.'];

// ---------------------------------------------------------------- braços (o da frente; o de trás via far())
/** Caído até perto do chão, garras abertas. Ombro no topo, colunas 1..2. */
const ARM_HANG: Grid = [
  '.kIIk',
  '.kiIk',
  '.kiIk',
  '.kiIk',
  '.kiIk',
  '.kiIk',
  '.kiIk',
  '.kiIk',
  '.kHik',
  'kiiiik',
  'kwkwkw',
  'w.w.w.',
];
/** Balançando para a frente (andar). */
const ARM_FWD: Grid = [
  'kIIk....',
  'kiIIk...',
  '.kiIIk..',
  '..kiIIk.',
  '...kiIk.',
  '...kiIk.',
  '...kiIk.',
  '...kHik.',
  '..kiiiik',
  '..kwkwkw',
  '..w.w.w.',
];
/** Balançando para trás (andar). */
const ARM_BACK: Grid = mirror(ARM_FWD);
/** Preparo: braço puxado para trás e para cima, garras em cor de alerta. Ombro no canto de baixo à direita. */
const ARM_WINDUP: Grid = [
  'A.A.A.....',
  'kakak.....',
  'kaaak.....',
  '.kiIk.....',
  '.kiIIk....',
  '..kiIIk...',
  '...kiIIk..',
  '....kiIIk.',
  '.....kiIIk',
  '......kIIk',
  '.......kk.',
];

/** Golpe: braço esticado na horizontal, três garras à frente; a do meio é a ponta (coluna 14 da parte). */
const ARM_REACH: Grid = [
  'kkkkkkkkkk.....',
  'kIIIIIIIIkkww..',
  'kiiiiiiiiiikwww',
  'kHHHHHHHHkkww..',
  'kkkkkkkkkk.....',
];

// ---------------------------------------------------------------- pernas curtas (4x4)
const LEG: Grid = ['kiik', 'kHik', 'kHik', 'kkkk'];
/** Perna recolhida (passo, agachado). */
const LEG_UP: Grid = ['kiik', 'kHHk', 'kkkk'];

// ---------------------------------------------------------------- montagem
const X_BODY = 7;
const Y_BODY = 4;
const Y_LEGS = 20;

interface Pose {
  eye?: Grid;
  mouth?: Grid;
  /** Deslocamento horizontal do tronco, olho e boca (inclinação). */
  lean?: number;
  /** Deslocamento vertical do tronco, olho, boca e braços (respiração, agachar). */
  drop?: number;
  near?: Placed;
  far?: Placed;
  legs?: Placed[];
}

const STAND_LEGS: Placed[] = [
  [far(LEG), 8, Y_LEGS],
  [LEG, 13, Y_LEGS],
];

function pose(p: Pose): string[] {
  const lean = p.lean ?? 0;
  const drop = p.drop ?? 0;
  const parts: Placed[] = [];
  if (p.far) parts.push(p.far);
  parts.push(...(p.legs ?? STAND_LEGS));
  parts.push([BODY, X_BODY + lean, Y_BODY + drop]);
  parts.push([p.eye ?? EYE, X_BODY + 3 + lean, Y_BODY + 3 + drop]);
  parts.push([p.mouth ?? MOUTH, X_BODY + 2 + lean, Y_BODY + 10 + drop]);
  if (p.near) parts.push(p.near);
  return compose(...parts);
}

/** Linha do ombro: logo abaixo do olho. O braço da frente pende diante do corpo, sem cobrir o rosto. */
const Y_ARM = Y_BODY + 7;
/** Coluna do braço da frente caído e do de trás (atrás do corpo). */
const X_NEAR = 15;
const X_FAR = 4;

export const ENEMY_FRAMES: Record<string, readonly string[]> = {
  'idle-0': pose({ near: [ARM_HANG, X_NEAR, Y_ARM], far: [far(ARM_HANG), X_FAR, Y_ARM] }),
  'idle-1': pose({ drop: 1, near: [ARM_HANG, X_NEAR, Y_ARM + 1], far: [far(ARM_HANG), X_FAR, Y_ARM + 1] }),

  'walk-0': pose({
    lean: 1,
    near: [ARM_FWD, X_NEAR, Y_ARM],
    far: [far(ARM_BACK), 0, Y_ARM],
    legs: [
      [far(LEG), 6, Y_LEGS],
      [LEG, 15, Y_LEGS],
    ],
  }),
  'walk-1': pose({
    lean: 1,
    drop: 1,
    near: [ARM_HANG, X_NEAR + 1, Y_ARM + 1],
    far: [far(ARM_HANG), X_FAR + 1, Y_ARM + 1],
    legs: [
      [far(LEG_UP), 9, Y_LEGS],
      [LEG, 12, Y_LEGS],
    ],
  }),
  'walk-2': pose({
    lean: 1,
    near: [ARM_HANG, X_NEAR, Y_ARM],
    far: [far(ARM_FWD), 11, Y_ARM],
    legs: [
      [far(LEG), 15, Y_LEGS],
      [LEG, 6, Y_LEGS],
    ],
  }),
  'walk-3': pose({
    lean: 1,
    drop: 1,
    near: [ARM_HANG, X_NEAR + 1, Y_ARM + 1],
    far: [far(ARM_HANG), X_FAR + 1, Y_ARM + 1],
    legs: [
      [far(LEG), 9, Y_LEGS],
      [LEG_UP, 12, Y_LEGS],
    ],
  }),

  // Preparo (bem legível): corpo para trás, braço erguido pelas costas com as garras em cor de alerta acima da
  // cabeça, olho aceso e boca aberta.
  windup: pose({
    lean: -1,
    eye: EYE_GLOW,
    mouth: MOUTH_OPEN,
    near: [ARM_WINDUP, 0, 0],
    far: [far(ARM_HANG), X_FAR - 1, Y_ARM],
  }),
  // Golpe: corpo para a frente e a garra do meio chega à coluna 28 = 16 texels (32 px) à frente do centro,
  // na altura do ombro (dentro da faixa vertical da hitbox).
  attack: pose({
    lean: 2,
    eye: EYE_GLOW,
    mouth: MOUTH_OPEN,
    near: [ARM_REACH, 14, Y_ARM],
    far: [far(ARM_BACK), 1, Y_ARM],
    legs: [
      [far(LEG), 7, Y_LEGS],
      [LEG, 15, Y_LEGS],
    ],
  }),

  hurt: pose({
    lean: -2,
    eye: EYE_SQUINT,
    mouth: MOUTH_OPEN,
    near: [ARM_HANG, X_NEAR - 2, Y_ARM - 1],
    far: [far(ARM_FWD), X_FAR - 2, Y_ARM - 2],
  }),

  // Levantar: agachado com as garras no chão, depois meio de pé.
  'getup-0': pose({
    drop: 4,
    eye: EYE_SQUINT,
    near: [ARM_HANG, X_NEAR + 1, Y_ARM + 3],
    far: [far(ARM_HANG), X_FAR - 1, Y_ARM + 3],
    legs: [
      [far(LEG_UP), 8, Y_LEGS + 1],
      [LEG_UP, 13, Y_LEGS + 1],
    ],
  }),
  'getup-1': pose({
    drop: 2,
    near: [ARM_HANG, X_NEAR, Y_ARM + 2],
    far: [far(ARM_HANG), X_FAR, Y_ARM + 2],
  }),
};

export interface EnemyAnimDef {
  frames: readonly string[];
  frameRate: number;
  /** -1 = repete sempre; 0 = toca uma vez. */
  repeat: number;
}

/** Animações do inimigo (CHR-03), com os nomes do pickEnemyAnim. */
export const ENEMY_ANIMS: Record<string, EnemyAnimDef> = {
  idle: { frames: ['idle-0', 'idle-1'], frameRate: 2, repeat: -1 },
  walk: { frames: ['walk-0', 'walk-1', 'walk-2', 'walk-3'], frameRate: 6, repeat: -1 },
  windup: { frames: ['windup'], frameRate: 1, repeat: 0 },
  attack: { frames: ['attack'], frameRate: 1, repeat: 0 },
  hurt: { frames: ['hurt'], frameRate: 1, repeat: 0 },
  getup: { frames: ['getup-0', 'getup-1'], frameRate: 6, repeat: 0 },
};

// ---------------------------------------------------------------- partes do ragdoll (CHR-04)
/**
 * Recortes do mesmo corpo, com as mesmas cores dos frames: cabeça com o olho em fenda (8x7 texels), tronco com a boca
 * (8x10) e membro com garra (3x8), usado para braços e pernas.
 */
export const ENEMY_RAG_PARTS = {
  head: ['..kkk.k.', '.kIIIkIk', 'kIIkkkkk', 'kIkwAkAk', 'kikAAkAk', 'kikaAkak', '.kkkkkk.'],
  torso: [
    '.kkkkkk.',
    'kIIIIIIk',
    'kiiiiiik',
    'kiiiiiik',
    'kkkkkkkk',
    'kwkwkwkk',
    'kiiiiiik',
    'kHiiiiHk',
    'kHHHHHHk',
    '.kkkkkk.',
  ],
  limb: ['kIk', 'kik', 'kik', 'kik', 'kik', 'kHk', 'kik', 'wkw'],
} as const satisfies Record<string, Grid>;
