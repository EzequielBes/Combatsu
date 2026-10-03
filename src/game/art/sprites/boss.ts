/*
 * Oni do Portão / Tecelã de Maldições (BTIER-04/06, BAT-05, BSP-01..13): ogro largo de chifres, juba escura, tanga
 * de pano e grilhões de ferro, de três quartos olhando para a direita. A Tecelã reaproveita a mesma grade com outro
 * mapa de cores (TECELA_COLOR_MAP), sem tint multiplicativo (AD-002): o adaptador registra duas texturas (uma por
 * arquétipo), nunca aplica `setTint` sobre a mesma folha. Dados puros (sem `phaser` como valor).
 *
 * Cada frame é uma pose por articulação (`Pose`): os volumes (tronco, cabeça, braços, pernas) são ovais e membros
 * afilados pintados por código com luz de cima, cada um com o seu contorno `k`; rosto, chifres e pés são grades
 * desenhadas à mão por cima. No fim, o `selOut` troca o `k` interno pela linha do material. Assim uma pose nova
 * custa só as posições das juntas, e a sombra fica coerente entre os frames.
 */
import { BOSS } from '../../../data/tuning';
import { selOut, type SelOutConfig } from '../selOut';
import type { AnimDef } from './player';

/** Tamanho final de todo frame do chefe, em texels: maior que o do inimigo (32x24) nas duas dimensões. */
export const BOSS_FRAME_W = 40;
export const BOSS_FRAME_H = 32;
/** Coluna do centro do corpo (metade da largura do frame). */
const CENTER_COL = 20;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico (BOSS.ts usa corpo de 40 px de largura). */
export const BOSS_ORIGIN = { x: CENTER_COL / BOSS_FRAME_W, y: 1 } as const;

type Canvas = string[][];
type Grid = readonly string[];
type Vec = readonly [number, number];
/** Rampa de um material: luz, base, sombra e sombra profunda. */
type Ramp = readonly [string, string, string, string];
/** Forma: `null` fora dela; dentro, o quanto o ponto olha para a luz (-1 a 1). */
type Shade = (x: number, y: number) => number | null;

const SKIN: Ramp = ['A', 'a', 'z', 'm'];
/** O braço e a perna de trás ficam um tom mais escuros. */
const SKIN_FAR: Ramp = ['a', 'z', 'z', 'm'];
const HAIR: Ramp = ['H', 'j', 'h', 'h'];
const IRON: Ramp = ['S', 's', 'N', 'n'];
const ENERGY: Ramp = ['w', 'U', 'u', 'v'];

/** Luz de cima, um pouco pelas costas (esquerda). */
const LIGHT: Vec = [-0.35, -0.94];

const BOSS_SEL_OUT: SelOutConfig = {
  rules: [
    { keys: new Set(['A', 'a', 'z', 'm']), line: 'm' },
    { keys: new Set(['H', 'j', 'h']), line: 'h' },
    { keys: new Set(['U', 'u', 'v']), line: 'v' },
    { keys: new Set(['w', 'l', 'L']), line: 'L' },
  ],
  fallback: 'K',
};

function makeCanvas(w: number, h: number): Canvas {
  return Array.from({ length: h }, () => Array<string>(w).fill('.'));
}

function toRows(canvas: Canvas): string[] {
  return canvas.map((row) => row.join(''));
}

/** Pinta uma forma com a rampa do material e um contorno `k` em volta (por cima do que já estava no canvas). */
function paint(canvas: Canvas, shade: Shade, ramp: Ramp): void {
  const lit = canvas.map((row, y) => row.map((_, x) => shade(x + 0.5, y + 0.5)));
  const inside = (x: number, y: number): boolean => (lit[y]?.[x] ?? null) !== null;
  lit.forEach((row, y) =>
    row.forEach((d, x) => {
      if (d === null) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) canvas[y][x] = 'k';
        return;
      }
      canvas[y][x] = d > 0.55 ? ramp[0] : d > -0.5 ? ramp[1] : d > -0.88 ? ramp[2] : ramp[3];
    }),
  );
}

/** Oval de centro (cx, cy) e raios rx, ry. */
const oval = (cx: number, cy: number, rx: number, ry: number): Shade => (x, y) => {
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  return nx * nx + ny * ny <= 1 ? nx * LIGHT[0] + ny * LIGHT[1] : null;
};

/** Membro afilado de `a` até `b`, com raio `ra` em `a` e `rb` em `b`. */
const limb = (a: Vec, b: Vec, ra: number, rb: number): Shade => (x, y) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  const r = ra + (rb - ra) * t;
  const ox = x - (a[0] + dx * t);
  const oy = y - (a[1] + dy * t);
  return ox * ox + oy * oy <= r * r ? (ox * LIGHT[0] + oy * LIGHT[1]) / r : null;
};

/** Sobrepõe uma grade desenhada à mão; '.' não pinta. */
function stamp(canvas: Canvas, grid: Grid, x0: number, y0: number): void {
  grid.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      const x = Math.floor(x0) + dx;
      const y = Math.floor(y0) + dy;
      if (ch === '.' || y < 0 || y >= canvas.length || x < 0 || x >= canvas[0].length) return;
      canvas[y][x] = ch;
    }),
  );
}

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const mix = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------- partes desenhadas à mão
/** Chifre da frente e o de trás (mais escuro), com a ponta para cima. */
const HORN_NEAR: Grid = ['.k...', 'kwk..', 'klk..', 'kllk.', '.klLk', '.kLLk'];
const HORN_FAR: Grid = ['...k.', '..klk', '..kLk', '.kLLk', 'kLLk.'];
/** Mechas espetadas no alto da juba, entre os chifres. */
const TUFTS: Grid = ['.k..k..k.', 'kHk.kjkkjk', 'kjHkjHjjHk'];

type Face = 'calm' | 'glow' | 'roar' | 'dizzy';

/** Rosto de três quartos (9x8): sobrancelha em V, olhos, nariz, boca e as presas subindo dos cantos. */
const FACES: Record<Face, Grid> = {
  calm: ['bb.....b.', '.bbb.bbb.', '.wb...wb.', '....A....', '...zAz...', 'w.......w', 'wbbbbbbbl', '.z.....z.'],
  glow: ['bb.....b.', '.bbb.bbb.', '.wR...wR.', '....A....', '...zAz...', 'w.......w', 'wbbbbbbbl', '.z.....z.'],
  roar: ['bb.....b.', '.bbb.bbb.', '.wR...wR.', '....A....', 'wbbbbbbbw', 'wrrrrrrrl', '.brwrwrb.', '..bbbbb..'],
  dizzy: ['.b.....b.', '..b...b..', '.b.....b.', '....A....', '...zAz...', 'w.......w', 'wbbrrbbbl', '.z.rr..z.'],
};

/** Pé com as unhas para a direita (8x3); o de trás usa a rampa escura. */
const FOOT: Grid = ['.aaaaa..', 'kzaaaAlk', 'kkkkkkkk'];
const FOOT_FAR: Grid = ['.zzzzz..', 'kmzzzaLk', 'kkkkkkkk'];

/** Tanga (16x7): corda de osso na cintura e pano listrado caindo na frente. */
const CLOTH: Grid = [
  '.LlLlLlLlLlLlLl.',
  'kUuuvuuuvuuuvuuk',
  'kUuvuuuvuuuvuuvk',
  '.kkUuuvuuuvuvkk.',
  '...kUuvuuuvvk...',
  '....kkUuuvkk....',
  '......kkkk......',
];

// ---------------------------------------------------------------- pose
interface Arm {
  /** Cotovelo e mão, relativos ao ombro. */
  elbow: Vec;
  hand: Vec;
  /** Raio da esfera de energia sobre a mão (rajada). */
  orb?: number;
}

type Legs = 'stand' | 'wide' | 'crouch' | 'stride-a' | 'stride-b' | 'tuck';

interface Pose {
  /** Deslocamento do tronco e da cabeça (inclinação e agachar). */
  lean?: number;
  drop?: number;
  /** Peito cheio (rugido): raio vertical a mais no tronco. */
  chest?: number;
  /** Ombros erguidos (texels). */
  shrug?: number;
  /** Deslocamento da cabeça em relação ao tronco. */
  head?: Vec;
  face?: Face;
  near?: Arm;
  far?: Arm;
  legs?: Legs;
}

const ARM_NEAR: Arm = { elbow: [-2.5, 5.5], hand: [-1, 11.5] };
const ARM_FAR: Arm = { elbow: [2.5, 5], hand: [1.5, 10.5] };

/** Tornozelos (perto, longe) de cada base: x no frame e quantos texels o pé sai do chão. */
const STANCES: Record<Legs, { near: Vec; far: Vec }> = {
  stand: { near: [14, 0], far: [24, 0] },
  wide: { near: [12, 0], far: [26, 0] },
  crouch: { near: [11, 0], far: [27, 0] },
  'stride-a': { near: [11, 0], far: [28, 2] },
  'stride-b': { near: [18, 2], far: [23, 0] },
  tuck: { near: [12, 3], far: [27, 4] },
};

function arm(canvas: Canvas, shoulder: Vec, a: Arm, ramp: Ramp): void {
  const elbow = add(shoulder, a.elbow);
  const hand = add(shoulder, a.hand);
  paint(canvas, oval(shoulder[0], shoulder[1], 3.8, 3.6), ramp);
  paint(canvas, limb(shoulder, elbow, 3.3, 2.9), ramp);
  paint(canvas, limb(elbow, hand, 2.9, 3.1), ramp);
  // Grilhão de ferro no pulso e o punho por cima.
  paint(canvas, limb(mix(elbow, hand, 0.5), mix(elbow, hand, 0.66), 3.2, 3.2), IRON);
  paint(canvas, oval(hand[0], hand[1], 3.3, 3.1), ramp);
  if (a.orb) paint(canvas, oval(hand[0] + 0.5, hand[1] - 2.2 - a.orb, a.orb, a.orb), ENERGY);
}

function leg(canvas: Canvas, hip: Vec, ankle: Vec, ramp: Ramp, foot: Grid): void {
  const groundY = BOSS_FRAME_H - 3 - ankle[1];
  paint(canvas, limb(hip, [ankle[0], groundY], 3.2, 2.5), ramp);
  stamp(canvas, foot, ankle[0] - 3, groundY);
}

/** Monta uma pose de pé (ou no ar): braço e perna de trás, quadril, tronco, tanga, juba, cabeça e braço da frente. */
function figure(p: Pose): string[] {
  const canvas = makeCanvas(BOSS_FRAME_W, BOSS_FRAME_H);
  const lean = p.lean ?? 0;
  const drop = p.drop ?? 0;
  const breath = p.chest ?? 0;
  const shrug = p.shrug ?? 0;
  const chest: Vec = [19 + lean, 15 + drop];
  const pelvis: Vec = [19 + Math.round(lean / 2), Math.min(22 + drop, 27)];
  const [hx, hy] = p.head ?? [0, 0];
  const head: Vec = [chest[0] + 3.8 + hx, chest[1] - 5.8 + hy];
  const stance = STANCES[p.legs ?? 'stand'];

  arm(canvas, add(chest, [7.5, -2.5 - shrug]), p.far ?? ARM_FAR, SKIN_FAR);
  leg(canvas, add(pelvis, [4, 1]), stance.far, SKIN_FAR, FOOT_FAR);
  leg(canvas, add(pelvis, [-3.5, 1.5]), stance.near, SKIN, FOOT);
  paint(canvas, oval(pelvis[0], pelvis[1] - 0.5, 6.6, 3.6), SKIN);
  paint(canvas, oval(chest[0] + 0.3, chest[1] + 4, 6.4, 4.2), SKIN);
  paint(canvas, oval(chest[0], chest[1] - 1 - breath / 2, 8.4, 5.6 + breath / 2), SKIN);
  stamp(canvas, CLOTH.slice(0, BOSS_FRAME_H - 2 - pelvis[1]), pelvis[0] - 8, pelvis[1] - 1);
  // Juba no alto e atrás da cabeça; a cabeça e a mandíbula saliente vêm por cima.
  paint(canvas, oval(head[0] - 3.4, head[1] - 0.6, 6, 5.6), HAIR);
  paint(canvas, oval(head[0] + 1, head[1] + 2.8, 4.6, 2.9), SKIN);
  paint(canvas, oval(head[0], head[1], 5.6, 5), SKIN);
  stamp(canvas, TUFTS, head[0] - 6.5, head[1] - 7.5);
  stamp(canvas, HORN_FAR, head[0] + 1.5, head[1] - 8);
  stamp(canvas, HORN_NEAR, head[0] - 5.5, head[1] - 9);
  stamp(canvas, FACES[p.face ?? 'calm'], head[0] - 2.5, head[1] - 2.5);
  arm(canvas, add(chest, [-7.5, -3 - shrug]), p.near ?? ARM_NEAR, SKIN);

  selOut(canvas, BOSS_SEL_OUT);
  return toRows(canvas);
}

/** Derrotado: caído de bruços, cabeça à direita, baixo e largo (bem diferente de qualquer pose de pé). */
function deadFigure(): string[] {
  const canvas = makeCanvas(BOSS_FRAME_W, BOSS_FRAME_H);
  paint(canvas, limb([11, 27.5], [5, 28], 3, 2.4), SKIN_FAR);
  paint(canvas, limb([12, 28.5], [6, 29], 3.1, 2.5), SKIN);
  paint(canvas, oval(3.6, 28, 2.2, 3), SKIN);
  paint(canvas, oval(18, 25.6, 8.6, 5.2), SKIN);
  stamp(canvas, ['.LlLl.', 'kUuvuk', 'kuvuuk', 'kUuuvk', 'kuuvuk', '.kkkk.'], 9, 23);
  // Só a juba e os chifres: o rosto está no chão.
  paint(canvas, oval(31.5, 28.4, 2.8, 2.4), SKIN);
  paint(canvas, oval(28.6, 26.6, 4.8, 4.2), HAIR);
  stamp(canvas, ['...kk', '.kklk', 'kLllk', '.kkk.'], 31, 22);
  stamp(canvas, ['....k', '..kkl', 'kklLk', '.kkk.'], 33, 24);
  const shoulder: Vec = [23, 27.4];
  const hand: Vec = [35.4, 28.8];
  paint(canvas, limb(shoulder, hand, 3.2, 2.6), SKIN);
  paint(canvas, limb(mix(shoulder, hand, 0.62), mix(shoulder, hand, 0.74), 2.8, 2.8), IRON);
  paint(canvas, oval(hand[0], hand[1], 2.6, 2.4), SKIN);
  selOut(canvas, BOSS_SEL_OUT);
  return toRows(canvas);
}

const WINDUP_CHARGE: Pose = {
  lean: -2,
  drop: 2,
  head: [1, 2],
  face: 'glow',
  near: { elbow: [-4, 3], hand: [-5.5, 0] },
  far: { elbow: [3, 4], hand: [6, 3] },
  legs: 'wide',
};
const CHARGE: Pose = {
  lean: 4,
  drop: 2,
  head: [1.5, 3],
  face: 'glow',
  near: { elbow: [-3, 4], hand: [-6, 7] },
  far: { elbow: [3, 3], hand: [5, 5] },
};
const WINDUP_LEAP: Pose = {
  lean: -1,
  drop: 5,
  face: 'glow',
  near: { elbow: [-3, 3.5], hand: [-2.5, 7.5] },
  far: { elbow: [3, 3.5], hand: [2.5, 7.5] },
  legs: 'crouch',
};
const WINDUP_VOLLEY: Pose = {
  lean: -1,
  face: 'glow',
  near: { elbow: [-3.5, -1], hand: [-2.5, -4.5], orb: 1.8 },
  legs: 'wide',
};
const VOLLEY: Pose = {
  lean: 1,
  face: 'glow',
  near: { elbow: [-3, 4], hand: [-4, 9] },
  far: { elbow: [4, 0.5], hand: [8, 0] },
  legs: 'wide',
};
const ROAR: Pose = {
  lean: -1,
  drop: 1,
  chest: 2,
  head: [-1, -1],
  face: 'roar',
  near: { elbow: [-4.5, 3], hand: [-6, 8] },
  far: { elbow: [4.5, 3], hand: [6, 8] },
  legs: 'wide',
};
const STAGGER: Pose = {
  lean: 1,
  drop: 3,
  head: [1, 3.5],
  face: 'dizzy',
  near: { elbow: [-1, 5.5], hand: [1, 10.5] },
  far: { elbow: [1, 5.5], hand: [-1, 10.5] },
  legs: 'wide',
};

/**
 * Frames do chefe (design: idle, preparo/ataque de cada padrão, rugido, atordoado, morto). Preparo e ataque
 * sempre mudam braço/olho/boca em relação ao idle (BAT-05: telegrafado e visualmente distinto).
 */
export const BOSS_FRAMES: Record<string, readonly string[]> = {
  idle: figure({}),
  'idle-1': figure({ drop: 1 }),
  'idle-2': figure({ drop: 1, shrug: 1 }),
  'idle-3': figure({ shrug: 1 }),
  'windup-charge': figure(WINDUP_CHARGE),
  'windup-charge-1': figure({ ...WINDUP_CHARGE, lean: -1 }),
  charge: figure({ ...CHARGE, legs: 'stride-a' }),
  'charge-1': figure({ ...CHARGE, legs: 'stride-b' }),
  'windup-leap': figure(WINDUP_LEAP),
  'windup-leap-1': figure({ ...WINDUP_LEAP, drop: 6 }),
  leap: figure({
    face: 'roar',
    near: { elbow: [-4, -3], hand: [-1, -7.5] },
    far: { elbow: [3, -3.5], hand: [3, -8] },
    legs: 'tuck',
  }),
  'windup-volley': figure(WINDUP_VOLLEY),
  'windup-volley-1': figure({ ...WINDUP_VOLLEY, near: { elbow: [-3.5, -1], hand: [-2.5, -4.5], orb: 2.8 } }),
  volley: figure(VOLLEY),
  'volley-1': figure({ ...VOLLEY, lean: 0, far: { elbow: [3, 2], hand: [6, -1.5] } }),
  roar: figure(ROAR),
  'roar-1': figure({ ...ROAR, lean: 0 }),
  stagger: figure(STAGGER),
  'stagger-1': figure({ ...STAGGER, lean: -1, head: [0, 3.5] }),
  dead: deadFigure(),
};

/** Mapa de cores da Tecelã (BTIER-06): pele e chifres do Oni (laranja/cinza) viram tons roxos da mesma paleta. */
export const TECELA_COLOR_MAP: Record<string, string> = {
  A: 'U',
  a: 'u',
  z: 'v',
  m: 'K',
  H: 'w',
  j: 'I',
  h: 'i',
  U: 'l',
  u: 'L',
  v: 'q',
  R: 'C',
};

function recolor(grid: readonly string[], map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/** Mesma grade do Oni, com `TECELA_COLOR_MAP` aplicado (BTIER-06): nenhuma cor fora da paleta, sem tint. */
export const TECELA_FRAMES: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(BOSS_FRAMES).map(([key, grid]) => [key, recolor(grid, TECELA_COLOR_MAP)]),
);

/** Dois frames em laço (`<nome>` e `<nome>-1`), com a mesma duração por frame. */
const loop = (name: string, ms: number): AnimDef => ({
  frames: [name, `${name}-1`],
  frameRate: Math.round(1000 / ms),
  repeat: -1,
  durations: [ms, ms],
});
const still = (name: string): AnimDef => ({ frames: [name], frameRate: 1, repeat: 0 });

/**
 * Animações do chefe (BAN-01..05), uma por estado: o adaptador toca `bossAnimKey(arquétipo, estado)` a cada frame
 * com `play(key, true)`. Tudo que tem mais de um frame é laço, porque uma animação de uma volta recomeçaria ao
 * terminar. A rajada dá um ciclo do braço por disparo.
 */
export const BOSS_ANIMS: Record<string, AnimDef> = {
  idle: { frames: ['idle', 'idle-1', 'idle-2', 'idle-3'], frameRate: 3, repeat: -1, durations: [480, 160, 480, 160] },
  'windup-charge': loop('windup-charge', 90),
  charge: loop('charge', 80),
  'windup-leap': loop('windup-leap', 90),
  leap: still('leap'),
  'windup-volley': loop('windup-volley', 90),
  volley: loop('volley', BOSS.volley.intervalMs / 2),
  roar: loop('roar', 80),
  stagger: loop('stagger', 220),
  dead: still('dead'),
};

/** Chave da animação do chefe no AnimationManager: uma por arquétipo, para não compartilhar frames entre eles. */
export const bossAnimKey = (archetype: 'oni' | 'tecela', name: string): string => `boss-${archetype}-${name}`;

/** Projétil da rajada (BAT-04): orbe roxo pequeno, 8x8 texels (16x16 px). */
export const PROJECTILE_FRAME: readonly string[] = [
  '.kkkkkk.',
  'kuuuuuuk',
  'kuukkuuk',
  'kukUUkuk',
  'kukUUkuk',
  'kuukkuuk',
  'kuuuuuuk',
  '.kkkkkk.',
];

/**
 * Onda de choque do pouso (BAT-03): 16x10 texels, 20 px de altura de mundo com ART_SCALE 2 (BAT-07 exige menos
 * que o ápice do pulo do player, 49 px).
 */
export const SHOCKWAVE_FRAME: readonly string[] = [
  '................',
  '.kkkkkkkkkkkkkk.',
  'kaaaaaaaaaaaaaak',
  'kaakkkkkkkkkkaak',
  'kakAAAAAAAAAAkak',
  'kakAAAAAAAAAAkak',
  'kaakkkkkkkkkkaak',
  'kaaaaaaaaaaaaaak',
  '.kkkkkkkkkkkkkk.',
  '................',
];
