import type Phaser from 'phaser';
import type { TileVariant } from '../../core/level';
import { parseSheet } from '../../core/pixelGrid';
import { TEX } from '../textures';
import { PALETTE_KEYS } from './palette';
import { registerSheet } from './render';

/*
 * Tileset do pátio da escola à noite: pedra azul-acinzentada com uma laje de cimento no topo, lavada pela lua.
 * 16x16 texels = 32 px (um TILE). Luz de cima: a laje tem a linha mais clara em cima e sombra embaixo; os tijolos
 * têm o canto de cima à esquerda aceso e a base escura. Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * Os tijolos têm 7 texels de largura com a junta na coluna 7/15 (fiada A) ou 3/11 (fiada B), então encaixam sem
 * emenda com o tile vizinho, e cada fiada tem 4 linhas (3 de tijolo + 1 de argamassa embaixo), encaixando com o
 * tile de cima e de baixo.
 */

// Fiada A: juntas nas colunas 7 e 15.
const A1 = 'sNNNNNNKsNNNNNNK';
const A2 = 'NNNNNNNKNNNNNNNK';
const A3 = 'nnnnnnnKnnnnnnnK';
// Fiada B: juntas nas colunas 3 e 11.
const B1 = 'NNNKsNNNNNNKsNNN';
const B2 = 'NNNKNNNNNNNKNNNN';
const B3 = 'nnnKnnnnnnnKnnnn';
const MORTAR = 'KKKKKKKKKKKKKKKK';
const OUTLINE = 'kkkkkkkkkkkkkkkk';

/** Parede interior: duas fiadas A e duas B, alternadas. */
const WALL = [A1, A2, A3, MORTAR, B1, B2, B3, MORTAR, A1, A2, A3, MORTAR, B1, B2, B3, MORTAR];

/** Laje de cimento do topo (8 linhas): contorno, borda enluarada, face e a sombra que ela joga no tijolo. */
const SLAB = [
  OUTLINE,
  'SSSSSSSSSSSSSSSS',
  'SSsSSSSSSSsSSSSS',
  'ssssssssssssssss',
  'NNNNNNsNNNNNNNNN',
  'NNNNNNNNNNNNNNNN',
  'nnnnnnnnnnnnnnnn',
  OUTLINE,
];

/** Laje com musgo escorrendo da borda. */
const SLAB_MOSS = [
  OUTLINE,
  'SSSSGGSSSSSSSSGS',
  'SSsGggGSSSSsSSgS',
  'ssssgssssssssssg',
  'NNNNgNsNNNNNNNNN',
  'NNNNNNNNNNNNNNNN',
  'nnnnnnnnnnnnnnnn',
  OUTLINE,
];

/** Plataforma fina: laje em cima, uma fiada de tijolo e o contorno de baixo. */
const THIN = [...SLAB, A1, A2, A3, MORTAR, B2, B3, 'KKKKKKKKKKKKKKKK', OUTLINE];

/**
 * Contorno lateral de 1 texel escuro (`k`) na coluna da esquerda ou da direita; com `round`, a primeira e a
 * última linha perdem o texel da quina, arredondando o canto.
 */
function edge(rows: readonly string[], side: 'left' | 'right', round: { top: boolean; bottom: boolean }): string[] {
  const last = rows.length - 1;
  return rows.map((row, y) => {
    const corner = (y === 0 && round.top) || (y === last && round.bottom);
    const ch = corner ? '.' : 'k';
    return side === 'left' ? ch + row.slice(1) : row.slice(0, -1) + ch;
  });
}

/** Variação da parede: um tijolo trincado na fiada B. */
const WALL_CRACK = [A1, A2, A3, MORTAR, 'NNNKsNNkNNNKsNNN', 'NNNKNNkNNNNKNNNN', 'nnnKnnknnnnKnnnn', MORTAR, ...WALL.slice(8)];

/** Variação da parede: musgo na argamassa e um tijolo mais escuro. */
const WALL_MOSS = [
  ...WALL.slice(0, 8),
  'nnnnnnnKsNNNNNNK',
  'nnnnnnnKNNNNNNNK',
  'nnnnnnnKnnnnnnnK',
  'KKgGgKKKKKKKKKKK',
  'NNNgsNNNNNNKsNNN',
  'NNNKNNNNNNNKNNNN',
  'nnnKnnnnnnnKnnnn',
  MORTAR,
];

const TOP = [...SLAB, ...WALL.slice(0, 8)];
const TOP_MOSS = [...SLAB_MOSS, ...WALL.slice(0, 8)];

/**
 * Um frame por variante do ENV-01 (a chave é o nome da variante) e variações `variante~n`,
 * sorteadas por posição em `tileFrameFor`.
 */
export const TILE_FRAMES: Record<string, readonly string[]> = {
  top: TOP,
  'top~2': TOP_MOSS,
  'top-left': edge(TOP, 'left', { top: true, bottom: false }),
  'top-right': edge(TOP, 'right', { top: true, bottom: false }),
  middle: WALL,
  'middle~2': WALL_CRACK,
  'middle~3': WALL_MOSS,
  left: edge(WALL, 'left', { top: false, bottom: false }),
  right: edge(WALL, 'right', { top: false, bottom: false }),
  thin: THIN,
  'thin-left': edge(THIN, 'left', { top: true, bottom: true }),
  'thin-right': edge(THIN, 'right', { top: true, bottom: true }),
};

/** Frames possíveis por variante; repetir a base deixa as variações mais raras. */
const CHOICES: Record<TileVariant, readonly string[]> = {
  top: ['top', 'top', 'top', 'top~2'],
  middle: ['middle', 'middle', 'middle', 'middle~2', 'middle', 'middle~3'],
  left: ['left'],
  right: ['right'],
  'top-left': ['top-left'],
  'top-right': ['top-right'],
  thin: ['thin'],
  'thin-left': ['thin-left'],
  'thin-right': ['thin-right'],
};

/** Frame do tile na posição (tx, ty): variação escolhida por hash determinístico, igual a cada reinício. */
export function tileFrameFor(variant: TileVariant, tx: number, ty: number): string {
  const choices = CHOICES[variant];
  const hash = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;
  return choices[(hash >>> 3) % choices.length];
}

/** Registra a folha do tileset na chave `TEX.terrain`. */
export function registerTiles(scene: Phaser.Scene): void {
  registerSheet(scene, TEX.terrain, parseSheet('tiles', TILE_FRAMES, PALETTE_KEYS));
}
