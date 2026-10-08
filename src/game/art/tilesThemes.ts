import type Phaser from 'phaser';
import { FLOOR_ROWS, type ModuleTheme } from '../../core/module';
import { parseSheet } from '../../core/pixelGrid';
import { TEX } from '../textures';
import { PALETTE_KEYS } from './palette';
import { registerSheet } from './render';
import { edge } from './tiles';

/*
 * Folhas de terreno por tema (THM-01): o mesmo conjunto de frames da folha `terrain` (as variantes do ENV-01 e as
 * variações `~n`), com a identidade de cada módulo do bairro sob o Véu. Só cores da `PALETTE` (AD-017); 16x16 texels.
 * Cada tema escreve uma tampa de 8 linhas (o topo do chão) e um corpo de 16 linhas; o resto sai de `themeFrames`.
 */

const OUTLINE = 'kkkkkkkkkkkkkkkk';

/** Arte de um tema: tampa (topo) e corpo, cada um com uma variação. */
interface ThemeArt {
  cap: readonly string[];
  capAlt: readonly string[];
  body: readonly string[];
  bodyAlt: readonly string[];
  bodyAlt2: readonly string[];
}

type Point = readonly [number, number];

/** Gerador determinístico: o mesmo tema sai igual a cada carga. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Corpo de 16 linhas: `base` com respingos de `flecks` espalhados com a densidade dada. */
function speckle(base: string, flecks: string, density: number, seed: number): string[] {
  const rand = lcg(seed);
  return Array.from({ length: 16 }, () =>
    [...Array<string>(16)].map(() => (rand() < density ? flecks[Math.floor(rand() * flecks.length)] : base)).join(''),
  );
}

/** Troca os texels `points` ([x, y]) de uma grade por `ch`. */
function put(rows: readonly string[], points: readonly Point[], ch: string): string[] {
  return rows.map((row, y) => {
    let out = row;
    for (const [px, py] of points) if (py === y) out = out.slice(0, px) + ch + out.slice(px + 1);
    return out;
  });
}

/** Linha de 16 texels com o mesmo caractere. */
const line = (ch: string): string => ch.repeat(16);

/** Rua: meio-fio claro no topo sobre asfalto escuro; as variações trazem um remendo e uma trinca. */
const RUA_BODY = speckle('n', 'nNK', 0.14, 3);
const RUA: ThemeArt = {
  cap: [OUTLINE, line('S'), 'SSSSSsSSSSSSSsSS', line('s'), line('K'), line('n'), 'nnNnnnnnnnNnnnnn', line('n')],
  capAlt: [OUTLINE, line('S'), 'SSsSSSSSSSsSSSSS', line('s'), line('K'), line('n'), 'nnnnnKnnnnnnnnnn', line('n')],
  body: RUA_BODY,
  // Remendo de asfalto: placa mais escura com a borda de cima gasta e uma trinca saindo dela (CEN-04).
  bodyAlt: [
    ...RUA_BODY.slice(0, 5),
    'nnnsSssSsssnnnnn',
    'nnnKKKKKKKKnnnnn',
    'nnnKKnKKKKKnnnnn',
    'nnnKKKKKnKKKnnnn',
    'nnnKKKKKKKKnKnnn',
    'nnnnnnnnnnnnnKnn',
    ...RUA_BODY.slice(11),
  ],
  bodyAlt2: put(
    RUA_BODY,
    [
      [5, 4],
      [6, 5],
      [7, 5],
      [8, 6],
    ],
    'K',
  ),
};

/** Beco: concreto sujo e frio, trincado, com lodo verde e poça azulada nas variações. */
const BECO_BODY = speckle('N', 'nsK', 0.16, 11);
const BECO: ThemeArt = {
  cap: [
    OUTLINE,
    line('s'),
    'ssSssssssssSssss',
    line('N'),
    'NNNNNkNNNNNNNNNN',
    'NNNNNNkNNNNNNNNN',
    line('N'),
    line('n'),
  ],
  capAlt: [
    OUTLINE,
    line('s'),
    'sssssgGsssssssss',
    line('N'),
    'NNNNNNNNNNNkNNNN',
    line('N'),
    'NNNNNNNNNNNNkNNN',
    line('n'),
  ],
  body: put(
    BECO_BODY,
    [
      [3, 2],
      [4, 3],
      [4, 4],
      [5, 5],
      [5, 6],
      [6, 7],
    ],
    'k',
  ),
  bodyAlt: put(
    BECO_BODY,
    [
      [2, 9],
      [3, 9],
      [4, 9],
      [3, 10],
      [9, 3],
      [10, 3],
    ],
    'g',
  ),
  bodyAlt2: put(
    BECO_BODY,
    [
      [8, 11],
      [9, 11],
      [10, 11],
      [11, 11],
      [9, 12],
      [10, 12],
    ],
    'c',
  ),
};

/** Parque: grama no topo sobre terra batida, com pedrinhas e raiz nas variações. */
const PARQUE_BODY = speckle('m', 'mMq', 0.15, 5);
const PARQUE: ThemeArt = {
  cap: [OUTLINE, 'GGgGGGGgGGGGGgGG', 'GGGGgGGGGGgGGGGG', line('g'), 'mgmmgmmmmgmmmgmm', ...PARQUE_BODY.slice(0, 3)],
  capAlt: [OUTLINE, 'GGGGGGgGGGGGGGGg', 'GgGGGGGGGgGGGGGG', line('g'), 'mmmmgmmmgmmmmmmm', ...PARQUE_BODY.slice(3, 6)],
  body: PARQUE_BODY,
  bodyAlt: put(
    PARQUE_BODY,
    [
      [3, 4],
      [4, 4],
      [3, 5],
      [4, 5],
      [10, 9],
      [11, 9],
    ],
    'S',
  ),
  bodyAlt2: put(
    PARQUE_BODY,
    [
      [1, 6],
      [2, 7],
      [3, 7],
      [4, 8],
      [5, 8],
      [6, 9],
    ],
    'M',
  ),
};

/** Konbini: lajota clara da loja (o lugar seguro), em quadrados de 8 texels com rejunte. */
const KONBINI_TILE = ['wwwwwwwL', 'wllllllL', 'wllllllL', 'wllllllL', 'wllllllL', 'wllllllL', 'wllllllL', 'LLLLLLLL'];
const KONBINI_BODY = [...KONBINI_TILE, ...KONBINI_TILE].map((row) => row + row);
const KONBINI: ThemeArt = {
  cap: [OUTLINE, line('w'), line('w'), line('l'), line('L'), ...KONBINI_BODY.slice(1, 4)],
  capAlt: [OUTLINE, line('w'), 'wwwwwlwwwwwwwwww', line('l'), line('L'), ...KONBINI_BODY.slice(1, 4)],
  body: KONBINI_BODY,
  bodyAlt: put(
    KONBINI_BODY,
    [
      [3, 3],
      [4, 3],
      [3, 4],
    ],
    'w',
  ),
  bodyAlt2: put(
    KONBINI_BODY,
    [
      [11, 12],
      [12, 12],
      [12, 13],
    ],
    'L',
  ),
};

/** Santuário: lajes de pedra do pátio do templo, com a junta marcada em preto. */
const SLAB_A = ['SSSSSSSSSSSSSSSk', 'SssSSSSSSsSSSSSk', 'sssssssssssssssk', line('k')];
const SLAB_B = ['SSSSSSSkSSSSSSSS', 'SSSSsSSkSSSSSsSS', 'ssssssskssssssss', line('k')];
const SANTUARIO_BODY = [...SLAB_A, ...SLAB_A, ...SLAB_B, ...SLAB_B];
const SANTUARIO: ThemeArt = {
  cap: [OUTLINE, line('S'), 'SSSSSSSSSSSSsSSS', line('s'), ...SANTUARIO_BODY.slice(0, 4)],
  capAlt: [OUTLINE, line('S'), 'SSSSSsSSSSSSSSSS', line('s'), ...SANTUARIO_BODY.slice(4, 8)],
  body: SANTUARIO_BODY,
  bodyAlt: put(
    SANTUARIO_BODY,
    [
      [4, 1],
      [5, 2],
      [6, 2],
      [7, 3],
    ],
    'K',
  ),
  bodyAlt2: put(
    SANTUARIO_BODY,
    [
      [2, 5],
      [3, 5],
      [10, 9],
      [11, 9],
    ],
    'g',
  ),
};

/** Tampa + metade de cima do corpo = o topo do chão; a plataforma fina troca o miolo por uma fiada e o contorno. */
function themeFrames(t: ThemeArt): Record<string, readonly string[]> {
  const top = [...t.cap, ...t.body.slice(0, 8)];
  const thin = [...t.cap, ...t.body.slice(0, 6), line('K'), OUTLINE];
  return {
    top,
    'top~2': [...t.capAlt, ...t.body.slice(0, 8)],
    'top-left': edge(top, 'left', { top: true, bottom: false }),
    'top-right': edge(top, 'right', { top: true, bottom: false }),
    middle: t.body,
    'middle~2': t.bodyAlt,
    'middle~3': t.bodyAlt2,
    left: edge(t.body, 'left', { top: false, bottom: false }),
    right: edge(t.body, 'right', { top: false, bottom: false }),
    thin,
    'thin-left': edge(thin, 'left', { top: true, bottom: true }),
    'thin-right': edge(thin, 'right', { top: true, bottom: true }),
  };
}

/** Frames de cada tema (THM-01). */
export const THEME_FRAMES: Record<ModuleTheme, Record<string, readonly string[]>> = {
  rua: themeFrames(RUA),
  beco: themeFrames(BECO),
  parque: themeFrames(PARQUE),
  konbini: themeFrames(KONBINI),
  santuario: themeFrames(SANTUARIO),
};

/** Talismã do selo (THM-03): papel claro com traço vermelho sobre uma aura roxa; o frame empilha na vertical. */
const SEAL_PAPER = [
  'wwwwwwww',
  'wrrrrrrw',
  'wwwrrwww',
  'wrrwwrrw',
  'wwrrrrww',
  'wrwrrwrw',
  'wwwrrwww',
  'wrrrrrrw',
  'wwrwwrww',
  'wrrwwrrw',
  'wwwrrwww',
  'llrrrrll',
  'llllllll',
  'llllllll',
];
const SEAL_EDGE = 'vvukkkkkkkkkkuvv';
export const SEAL_FRAMES: Record<string, readonly string[]> = {
  seal: [SEAL_EDGE, ...SEAL_PAPER.map((row) => `vvuk${row}kuvv`), SEAL_EDGE],
};

/** Chave de textura da folha de terreno de cada tema (THM-01). */
export const THEME_TEXTURES: Record<ModuleTheme, string> = {
  rua: TEX.terrainRua,
  beco: TEX.terrainBeco,
  parque: TEX.terrainParque,
  konbini: TEX.terrainKonbini,
  santuario: TEX.terrainSantuario,
};

/**
 * Folha de terreno do tile (`tx`, `ty`) da área (THM-02, CEN-03): a do tema do trecho; a coluna 0 acima do chão é o
 * muro de contenção e usa a pedra neutra `terrain` em todo tema (com a folha do vizinho, o parque virava um pilar de
 * terra). Sem trechos (a sala) tudo é `terrain`.
 */
export function terrainSheetFor(
  tx: number,
  ty: number,
  spans: readonly { theme: ModuleTheme; col1: number }[],
): string {
  if (spans.length === 0 || (tx === 0 && ty < FLOOR_ROWS[0])) return TEX.terrain;
  const span = spans.find((sp) => tx <= sp.col1) ?? spans[spans.length - 1];
  return THEME_TEXTURES[span.theme];
}

/** Registra as cinco folhas de terreno por tema e a folha do selo. */
export function registerThemedTiles(scene: Phaser.Scene): void {
  for (const theme of Object.keys(THEME_FRAMES) as ModuleTheme[]) {
    registerSheet(scene, THEME_TEXTURES[theme], parseSheet(`terrain-${theme}`, THEME_FRAMES[theme], PALETTE_KEYS));
  }
  registerSheet(scene, TEX.seal, parseSheet('seal', SEAL_FRAMES, PALETTE_KEYS));
}
