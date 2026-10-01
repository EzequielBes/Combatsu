/*
 * Espíritos amaldiçoados (CHR-03/04, EVR-01): três aparências orgânicas, montadas como "boneco de papel" a partir de
 * um kit de partes (`EnemyKit`). Cada aparência tem silhueta, cor e assinatura próprias (design §2):
 *   corcunda   - corcunda atrás, um olho grande âmbar, boca de dentes tortos, veias; cinza-arroxeado `i`/`I`.
 *   rastejante - magro e alto, três olhos vermelhos, costelas aparentes, braços até o chão; verde `g`/`G`.
 *   bruto      - largo e baixo, ombros enormes, chifres, boca acesa, punhos; roxo `v`/`u`.
 * Rampa de 3 tons com luz de cima e sel-out: o `k` interno vira o tom escuro do material (regra de cada kit).
 * Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * Mesmo padrão de frame largo do player (ver SPEC_DEVIATION em player.ts): o spec fala em 18x24 texels, mas todos os
 * frames têm 32x24 texels (64x48 px) para caber a garra esticada do golpe, que chega à borda da hitbox do
 * ENEMY_ATTACK (offsetX 20 + largura/2 12 = 32 px à frente do centro). A origem fica no pé, no centro do corpo: a
 * linha de centro passa no meio da coluna 12 (12,5 texels = 25 px da borda esquerda, um número inteiro de px).
 *
 * `buildEnemyFrames(kit)` devolve os frames de uma aparência; novas poses (T8/T9) só acrescentam chamadas a `pose()`
 * com as partes do kit. '.' é transparente.
 */
import { selOut, type SelOutConfig } from '../selOut';

/** Tamanho final de todo frame da folha, em texels. */
export const ENEMY_FRAME_W = 32;
export const ENEMY_FRAME_H = 24;
/** Coluna (em texels, fracionária) da linha de centro do corpo. */
const CENTER_COL = 12.5;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico. */
export const ENEMY_ORIGIN = { x: CENTER_COL / ENEMY_FRAME_W, y: 1 } as const;

export type EnemyVariantId = 'corcunda' | 'rastejante' | 'bruto';

type Grid = readonly string[];
type Placed = readonly [Grid, number, number];

/** Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x24 e passa o sel-out da aparência. */
function compose(sel: SelOutConfig, ...parts: Placed[]): string[] {
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
  selOut(canvas, sel);
  return canvas.map((row) => row.join(''));
}

function recolor(grid: Grid, map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

function mirror(grid: Grid): string[] {
  const w = Math.max(...grid.map((r) => r.length));
  return grid.map((row) => [...row.padEnd(w, '.')].reverse().join(''));
}

/** Passa o sel-out numa parte solta (partes do ragdoll), com a mesma regra dos frames. */
function finishPart(grid: Grid, sel: SelOutConfig): string[] {
  const canvas = grid.map((row) => [...row]);
  selOut(canvas, sel);
  return canvas.map((row) => row.join(''));
}

/** Tudo de uma aparência: as partes, onde elas ficam e a regra de sel-out. */
export interface EnemyKit {
  sel: SelOutConfig;
  /** Troca de cor das partes de trás (um tom mais escuro). */
  farMap: Record<string, string>;
  /** Massa atrás do tronco (a corcunda) e posição relativa ao tronco. */
  back?: { grid: Grid; dx: number; dy: number };
  body: Grid;
  bodyX: number;
  bodyY: number;
  /** Cabeça/chifres sobre o tronco (o bruto) e posição relativa ao tronco. */
  front?: { grid: Grid; dx: number; dy: number };
  eye: Grid;
  eyeGlow: Grid;
  eyeSquint: Grid;
  /** Posição relativa ao tronco. */
  eyeAt: readonly [number, number];
  mouth: Grid;
  mouthOpen: Grid;
  mouthAt: readonly [number, number];
  armHang: Grid;
  armFwd: Grid;
  armWindup: Grid;
  armReach: Grid;
  leg: Grid;
  legUp: Grid;
  /** Linha do ombro e colunas dos braços caídos da frente e de trás. */
  yArm: number;
  xNear: number;
  xFar: number;
  /** Colunas das pernas em pé (de trás e da frente). */
  legFar: number;
  legNear: number;
  /** Onde fica o braço do preparo (canto da parte). */
  windupAt: readonly [number, number];
  /** Coluna da parte do braço do golpe (a ponta fica na coluna 28). */
  reachX: number;
}

interface Pose {
  eye?: Grid;
  mouth?: Grid;
  /** Deslocamento horizontal do tronco, cabeça, olho e boca (inclinação). */
  lean?: number;
  /** Deslocamento vertical do tronco, cabeça, olho e boca (respiração, agachar). */
  drop?: number;
  near?: Placed;
  far?: Placed;
  legs?: Placed[];
}

/** Monta todos os frames de uma aparência a partir do seu kit. */
export function buildEnemyFrames(kit: EnemyKit): Record<string, readonly string[]> {
  const far = (g: Grid): string[] => recolor(g, kit.farMap);
  const armBack = mirror(kit.armFwd);
  const legY = ENEMY_FRAME_H - kit.leg.length;
  const legUpY = ENEMY_FRAME_H - kit.legUp.length;

  const pose = (p: Pose): string[] => {
    const lean = p.lean ?? 0;
    const drop = p.drop ?? 0;
    const bx = kit.bodyX + lean;
    const by = kit.bodyY + drop;
    const stand: Placed[] = [
      [far(kit.leg), kit.legFar, legY],
      [kit.leg, kit.legNear, legY],
    ];
    const parts: Placed[] = [];
    if (p.far) parts.push(p.far);
    parts.push(...(p.legs ?? stand));
    if (kit.back) parts.push([kit.back.grid, bx + kit.back.dx, by + kit.back.dy]);
    parts.push([kit.body, bx, by]);
    if (kit.front) parts.push([kit.front.grid, bx + kit.front.dx, by + kit.front.dy]);
    parts.push([p.eye ?? kit.eye, bx + kit.eyeAt[0], by + kit.eyeAt[1]]);
    parts.push([p.mouth ?? kit.mouth, bx + kit.mouthAt[0], by + kit.mouthAt[1]]);
    if (p.near) parts.push(p.near);
    return compose(kit.sel, ...parts);
  };

  const { yArm, xNear, xFar, legFar, legNear } = kit;
  const hang = (dx: number, dy: number): { near: Placed; far: Placed } => ({
    near: [kit.armHang, xNear + dx, yArm + dy],
    far: [far(kit.armHang), xFar + dx, yArm + dy],
  });
  /** Pernas do passo: uma recua e a outra avança; `up` ergue a perna indicada (1 texel). */
  const step = (farX: number, nearX: number, up?: 'far' | 'near'): Placed[] => [
    [far(up === 'far' ? kit.legUp : kit.leg), farX, up === 'far' ? legUpY - 1 : legY],
    [up === 'near' ? kit.legUp : kit.leg, nearX, up === 'near' ? legUpY - 1 : legY],
  ];
  const crouchLegs: Placed[] = [
    [far(kit.legUp), legFar, legUpY],
    [kit.legUp, legNear, legUpY],
  ];

  return {
    'idle-0': pose({ ...hang(0, 0) }),
    'idle-1': pose({ drop: 1, ...hang(0, 1) }),

    'walk-0': pose({
      lean: 1,
      near: [kit.armFwd, xNear, yArm],
      far: [far(armBack), 0, yArm],
      legs: step(legFar - 2, legNear + 2),
    }),
    'walk-1': pose({ lean: 1, drop: 1, ...hang(1, 1), legs: step(legFar + 1, legNear - 1, 'far') }),
    'walk-2': pose({
      lean: 1,
      near: [kit.armHang, xNear, yArm],
      far: [far(kit.armFwd), 11, yArm],
      legs: step(legNear + 2, legFar - 2),
    }),
    'walk-3': pose({ lean: 1, drop: 1, ...hang(1, 1), legs: step(legFar + 1, legNear - 1, 'near') }),

    // Preparo (bem legível): corpo para trás, braço erguido pelas costas com as garras em cor de alerta acima da
    // cabeça, olho aceso e boca aberta.
    windup: pose({
      lean: -1,
      eye: kit.eyeGlow,
      mouth: kit.mouthOpen,
      near: [kit.armWindup, kit.windupAt[0], kit.windupAt[1]],
      far: [far(kit.armHang), xFar - 1, yArm],
    }),
    // Golpe: corpo para a frente e a garra do meio chega à coluna 28 = 16 texels (32 px) à frente do centro,
    // na altura do ombro (dentro da faixa vertical da hitbox).
    attack: pose({
      lean: 2,
      eye: kit.eyeGlow,
      mouth: kit.mouthOpen,
      near: [kit.armReach, kit.reachX, yArm],
      far: [far(armBack), 1, yArm],
      legs: step(legFar - 1, legNear + 2),
    }),

    hurt: pose({
      lean: -2,
      eye: kit.eyeSquint,
      mouth: kit.mouthOpen,
      near: [kit.armHang, xNear - 2, yArm - 1],
      far: [far(kit.armFwd), xFar - 2, yArm - 2],
    }),

    // Levantar: agachado com as garras no chão, depois meio de pé.
    'getup-0': pose({ drop: 4, eye: kit.eyeSquint, ...hang(1, 3), legs: crouchLegs }),
    'getup-1': pose({ drop: 2, ...hang(0, 2) }),
  };
}

// ================================================================ corcunda (cinza-arroxeado, um olho âmbar)
// Tronco 11x16: cabeça à frente (direita), olho grande; a corcunda é uma massa separada atrás, com veias.
const C_BODY: Grid = [
  '...kkkk....',
  '..kIIIIkk..',
  '.kIIIIIIIk.',
  'kIIiIIIIIIk',
  'kIivIiiIIIk',
  'kiivIIkkkkk',
  'kiiviKKKKKk',
  'kiiiiKKKKKk',
  'kHiiiKKKKKk',
  'kHiviiKKKik',
  'kHiiiiiiiik',
  'kHiiiiiiiik',
  'kHiiviiiiik',
  'kHHiiiiiiHk',
  '.kHHHHHHHk.',
  '..kkkkkkk..',
];
/** A corcunda: massa atrás do tronco, subindo acima da cabeça, com veias. 8x10. */
const C_HUMP: Grid = [
  '..w..w..',
  '.kkk.kk.',
  '.kIIiiIk',
  'kIIivviI',
  'kIivvIii',
  'kIiivvii',
  'kiiiivii',
  'kiiivivi',
  'kHiiiiii',
  'kHHiiiHi',
];
const C_EYE: Grid = ['.kkk.', 'kwAbk', 'kAAbk', 'kaAbk', '.kkk.'];
const C_EYE_GLOW: Grid = ['.kkk.', 'kwwrk', 'kwArk', 'kAArk', '.kkk.'];
const C_EYE_SQUINT: Grid = ['.....', '.....', 'kkkkk', 'kaAak', '.kkk.'];
const C_MOUTH: Grid = ['.kkkkkkkkkk', 'kwkwwkwkkwk', 'kiIIIIIIIIk', '.kHHHHHHkk.'];
const C_MOUTH_OPEN: Grid = ['.kkkkkkkkkk', 'kwrrrrrrrwk', 'krrrrrrrrrk', 'kwkwwkwwkIk', '.kHHHHHHkk.'];
const C_ARM_HANG: Grid = [
  '.kIIk',
  '.kiIk',
  '.kivk',
  '.kiIk',
  '.kiik',
  'kiiiIk',
  'kiHik.',
  'kiiiik',
  'kwkwkw',
  'w.ww.w',
];
const C_ARM_FWD: Grid = [
  'kIIk....',
  'kiIIk...',
  '.kivIk..',
  '..kiIIk.',
  '...kiIk.',
  '...kvik.',
  '...kiIk.',
  '...kHik.',
  '..kiiiik',
  '..kwkwkw',
  '..w.ww.w',
];
const C_ARM_WINDUP: Grid = [
  'A.A.A.....',
  'kakak.....',
  'kaaak.....',
  '.kiIk.....',
  '.kivIk....',
  '..kiIIk...',
  '...kivIk..',
  '....kiIIk.',
  '.....kiIIk',
  '......kIIk',
  '.......kk.',
];
const C_ARM_REACH: Grid = [
  'kkkkkkkkkk.....',
  'kIIIIIIIIkkww..',
  'kiiviiiiiiikwww',
  'kHHHHHHHHkkww..',
  'kkkkkkkkkk.....',
];
const C_LEG: Grid = ['kiik', 'kHik', 'kHik', 'kkkk'];
const C_LEG_UP: Grid = ['kiik', 'kHHk', 'kkkk'];

const CORCUNDA_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['I', 'i', 'H', 'v']), line: 'H' },
      { keys: new Set(['A', 'a', 'r', 'w', 'R']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { I: 'i', i: 'H', H: 'K', w: 'S' },
  back: { grid: C_HUMP, dx: -3, dy: 0 },
  body: C_BODY,
  bodyX: 7,
  bodyY: 4,
  eye: C_EYE,
  eyeGlow: C_EYE_GLOW,
  eyeSquint: C_EYE_SQUINT,
  eyeAt: [5, 5],
  mouth: C_MOUTH,
  mouthOpen: C_MOUTH_OPEN,
  mouthAt: [2, 10],
  armHang: C_ARM_HANG,
  armFwd: C_ARM_FWD,
  armWindup: C_ARM_WINDUP,
  armReach: C_ARM_REACH,
  leg: C_LEG,
  legUp: C_LEG_UP,
  yArm: 11,
  xNear: 15,
  xFar: 4,
  legFar: 8,
  legNear: 13,
  windupAt: [0, 0],
  reachX: 14,
};

// ================================================================ rastejante (verde, magro e alto, 3 olhos)
// Tronco 9x16: cabeça pequena no alto, pescoço fino, costelas em `G`, pélvis; braços até o chão.
const R_BODY: Grid = [
  '..kkkkk..',
  '.kGGGGGk.',
  'kGGgggggk',
  'kGggggggk',
  'kgggggggk',
  'kgggggggk',
  'kggnnnggk',
  '.kgggggnk',
  '..kGggnk.',
  '.kGggggnk',
  '.kGGGGgnk',
  '.kgnnggnk',
  '.kGGGGgnk',
  '..kgnggnk',
  '..kGggnk.',
  '..kkkkk..',
];
const R_EYE: Grid = ['.......', 'kRkRkRk', 'krkrkrk', '.......'];
const R_EYE_GLOW: Grid = ['.......', 'kwkwkwk', 'kRkRkRk', '.......'];
const R_EYE_SQUINT: Grid = ['.......', '.......', 'krkrkrk', '.......'];
const R_MOUTH: Grid = ['kwkkwkw', '.kkkkk.'];
const R_MOUTH_OPEN: Grid = ['kwkwkwk', 'krrrrrk', '.kwkwk.'];
const R_ARM_HANG: Grid = [
  '.kGk.',
  '.kgk.',
  '.kgk.',
  '..kgk',
  '..kgk',
  '.kgnk',
  '.kgk.',
  '.kgk.',
  '.kgnk',
  '.kgk.',
  '.kgk.',
  '.kgk.',
  'kgggk',
  'kwkwk',
  'w.w.w',
];
const R_ARM_FWD: Grid = [
  'kGk.....',
  'kgGk....',
  '.kgGk...',
  '..kgGk..',
  '...kgk..',
  '...kgnk.',
  '...kgk..',
  '...kgk..',
  '...kgnk.',
  '...kgk..',
  '...kgk..',
  '..kgggk.',
  '..kwkwk.',
  '..w.w.w.',
];
const R_ARM_WINDUP: Grid = [
  'w.w.w.....',
  'kwkwk.....',
  'kgggk.....',
  '.kgnk.....',
  '.kgGk.....',
  '..kgGk....',
  '...kgGk...',
  '....kgGk..',
  '.....kgGk.',
  '......kgk.',
  '.......kk.',
];
const R_ARM_REACH: Grid = [
  'kkkkkkkkkkk.kw.',
  'kGgggggggggkkww',
  'kkkkkkkkkkk.kw.',
];
const R_LEG: Grid = ['.kgk.', 'kGgnk', '.kgnk', 'kgnk.', 'kgk..', 'kggk.', 'kkkkk'];
const R_LEG_UP: Grid = ['.kgk.', 'kGgnk', 'kgnk.', 'kggk.', 'kkkkk', 'kkkkk'].slice(0, 6);

const RASTEJANTE_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['G', 'g', 'n']), line: 'n' },
      { keys: new Set(['R', 'r', 'w']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { G: 'g', n: 'g', w: 'S' },
  body: R_BODY,
  bodyX: 8,
  bodyY: 1,
  eye: R_EYE,
  eyeGlow: R_EYE_GLOW,
  eyeSquint: R_EYE_SQUINT,
  eyeAt: [1, 2],
  mouth: R_MOUTH,
  mouthAt: [1, 6],
  mouthOpen: R_MOUTH_OPEN,
  armHang: R_ARM_HANG,
  armFwd: R_ARM_FWD,
  armWindup: R_ARM_WINDUP,
  armReach: R_ARM_REACH,
  leg: R_LEG,
  legUp: R_LEG_UP,
  yArm: 9,
  xNear: 15,
  xFar: 3,
  legFar: 8,
  legNear: 13,
  windupAt: [0, 0],
  reachX: 14,
};

// ================================================================ bruto (roxo, largo e baixo, chifres, boca acesa)
// Tronco 15x13 com ombros enormes; a cabeça com chifres (13x10) senta entre os ombros.
const B_BODY: Grid = [
  'wk.kkk...kkk.kw',
  'kUUUUUkkkUUUUUk',
  'kUUuuuuuuuuuUUk',
  'kUuuuvuuuvuuuuk',
  'kuuuuuvuuuvuuuk',
  'kuuuuuuuuuuuuuk',
  'kuuuvuuuuuuuubk',
  'kuuuuuuuuuuuubk',
  'kvuuuuuuuuuuvbk',
  'kvvuuuuuuuuvvbk',
  '.kvvuuuuuuvvbk.',
  '..kvvvvvvvvbk..',
  '...kkkkkkkkk...',
];
const B_HEAD: Grid = [
  '..kwk.....kwk..',
  '.kSSk.....kSSk.',
  '.kSk.......kSk.',
  'kSSk.......kSSk',
  'kSSkkkkkkkkkSSk',
  '...kuUuuuUuk...',
  '...kuuuuuuuk...',
  '...kuuuuuuuk...',
  '...kvuuuuuvk...',
  '....kkkkkkk....',
];
const B_EYE: Grid = ['aA...Aa'];
const B_EYE_GLOW: Grid = ['AwA.AwA'];
const B_EYE_SQUINT: Grid = ['kk...kk'];
const B_MOUTH: Grid = ['kkkkkkk', 'kAwAwAk', 'kaAAAak', '.kkkkk.'];
const B_MOUTH_OPEN: Grid = ['kkkkkkk', 'kAwAwAk', 'kaAAAak', 'kaaAaak', '.kkkkk.'];
const B_ARM_HANG: Grid = [
  '.kUUk.',
  'kUUuuk',
  'kUuuuk',
  'kuuuvk',
  'kuuuuk',
  'kvuuuk',
  'kuuuuk',
  'kvuuvk',
  'kUUUuk',
  'kUuuuk',
  'kuuvvk',
  'kkkkkk',
];
const B_ARM_FWD: Grid = [
  'kUUk....',
  'kUuuk...',
  '.kuuuk..',
  '..kuuvk.',
  '...kuuk.',
  '...kvuk.',
  '..kUUUuk',
  '..kUuuuk',
  '..kuuvvk',
  '..kkkkkk',
];
const B_ARM_WINDUP: Grid = [
  'AAAAk.....',
  'AwwAk.....',
  'kAAkk.....',
  '.kuuk.....',
  '.kuuuk....',
  '..kuuuk...',
  '...kuuuk..',
  '....kuuuk.',
  '.....kuuuk',
  '......kuuk',
  '.......kk.',
];
const B_ARM_REACH: Grid = [
  'kkkkkkkkkkkkkkk',
  'kUUUUUUUUUUkkkk',
  'kuuuuuuuuuuUUUk',
  'kvvvvvvvvvvuuuk',
  'kkkkkkkkkkkkkkk',
];
const B_LEG: Grid = ['kuuuk', 'kvuuk', 'kkkkk'];
const B_LEG_UP: Grid = ['kuuuk', 'kkkkk'];

const BRUTO_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['U', 'u', 'v', 'S']), line: 'b' },
      { keys: new Set(['A', 'a', 'w']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { U: 'u', u: 'v', v: 'b', w: 'S', S: 's' },
  body: B_BODY,
  bodyX: 5,
  bodyY: 8,
  front: { grid: B_HEAD, dx: 0, dy: -5 },
  eye: B_EYE,
  eyeGlow: B_EYE_GLOW,
  eyeSquint: B_EYE_SQUINT,
  eyeAt: [4, 0],
  mouth: B_MOUTH,
  mouthAt: [4, 1],
  mouthOpen: B_MOUTH_OPEN,
  armHang: B_ARM_HANG,
  armFwd: B_ARM_FWD,
  armWindup: B_ARM_WINDUP,
  armReach: B_ARM_REACH,
  leg: B_LEG,
  legUp: B_LEG_UP,
  yArm: 10,
  xNear: 18,
  xFar: 1,
  legFar: 7,
  legNear: 13,
  windupAt: [1, 1],
  reachX: 14,
};

// ================================================================ exportações
export const ENEMY_VARIANT_FRAMES: Record<EnemyVariantId, Record<string, readonly string[]>> = {
  corcunda: buildEnemyFrames(CORCUNDA_KIT),
  rastejante: buildEnemyFrames(RASTEJANTE_KIT),
  bruto: buildEnemyFrames(BRUTO_KIT),
};

/** Compatibilidade: a folha da `corcunda` (linha de base de bbox, FxLab). */
export const ENEMY_FRAMES: Record<string, readonly string[]> = ENEMY_VARIANT_FRAMES.corcunda;

export interface EnemyAnimDef {
  frames: readonly string[];
  frameRate: number;
  /** -1 = repete sempre; 0 = toca uma vez. */
  repeat: number;
}

/** Animações do inimigo (CHR-03), com os nomes do pickEnemyAnim; os mesmos nomes de frame valem nas 3 aparências. */
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
 * Recortes do mesmo corpo de cada aparência, com as mesmas cores dos frames: cabeça (8x7 texels), tronco (8x10) e
 * membro com garra (3x8), usado para braços e pernas. Os tamanhos são iguais nas 3 aparências (corpos do Matter).
 */
export type EnemyRagParts = { head: Grid; torso: Grid; limb: Grid };

const sel = (k: EnemyKit) => k.sel;

export const ENEMY_RAG_VARIANTS: Record<EnemyVariantId, EnemyRagParts> = {
  corcunda: {
    head: finishPart(['..kkk.k.', '.kIIIkIk', 'kIIkkkkk', 'kIkwAkAk', 'kikAAkAk', 'kikaAkak', '.kkkkkk.'], sel(CORCUNDA_KIT)),
    torso: finishPart(
      ['.kkkkkk.', 'kIIIIvIk', 'kiivIiik', 'kiiiiivk', 'kkkkkkkk', 'kwkwwkkk', 'kiiiivik', 'kHiiiiHk', 'kHHHHHHk', '.kkkkkk.'],
      sel(CORCUNDA_KIT),
    ),
    limb: finishPart(['kIk', 'kik', 'kvk', 'kik', 'kik', 'kHk', 'kik', 'wkw'], sel(CORCUNDA_KIT)),
  },
  rastejante: {
    head: finishPart(['.kkkkk..', 'kGGgggk.', 'kgggggk.', 'kRkRkRk.', 'krkrkrk.', 'kwkkwkk.', '.kkkkk..'], sel(RASTEJANTE_KIT)),
    torso: finishPart(
      ['.kkkkkk.', 'kGGggggk', 'kgnnnnnk', 'kGGGGGgk', 'kgnnnnnk', 'kGGGGGgk', 'kgnnnnnk', 'kgggggnk', 'kGgggnnk', '.kkkkkk.'],
      sel(RASTEJANTE_KIT),
    ),
    limb: finishPart(['kGk', 'kgk', 'kgk', 'kgk', 'kgk', 'kgk', 'kgk', 'wkw'], sel(RASTEJANTE_KIT)),
  },
  bruto: {
    head: finishPart(['wk...kw.', 'kSkkkSk.', 'kuUuUuk.', 'kuuuuuk.', 'kAwAwAk.', 'kaAAAak.', '.kkkkk..'], sel(BRUTO_KIT)),
    torso: finishPart(
      ['kkkkkkkk', 'kUUUUUUk', 'kuuvuuuk', 'kuuuuvbk', 'kuvuuubk', 'kuuuuubk', 'kuuvuubk', 'kvuuuvbk', 'kvvvvvbk', 'kkkkkkkk'],
      sel(BRUTO_KIT),
    ),
    limb: finishPart(['kUk', 'kuk', 'kuk', 'kvk', 'kuk', 'kuk', 'kUk', 'kUk'].slice(0, 8), sel(BRUTO_KIT)),
  },
};

/** Compatibilidade: partes da `corcunda`. */
export const ENEMY_RAG_PARTS = ENEMY_RAG_VARIANTS.corcunda;
