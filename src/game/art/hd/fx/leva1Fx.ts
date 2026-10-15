/*
 * Folha `tech-fx-leva1`: as vistas novas das 3 técnicas da leva 1 do JJK (F34), em quadros de 16x16 texels, 1 texel =
 * 1 px de mundo. Boogie Woogie: o lampejo âmbar da palma na troca (`palm-0` a palma, `palm-1` o estouro que se
 * desfaz). Ressonância: o prego em voo (`nail`, 8x3 no meio do quadro, ponta para a direita) e a cabeça do prego
 * cravado que marca o alvo (`nailHead`, de pé, ponta para baixo). Fala Amaldiçoada: o olho de serpente do selo dos Inumaki (`seal`) e o
 * marcador de atordoado (`stun-0`, `stun-1`, estrelas girando numa órbita). Grades de texto, 1 caractere = 1 chave
 * da paleta única, '.' transparente; as estrelas do atordoado são carimbadas na órbita por código. Puro, sem `phaser`.
 */
import { PALETTE } from '../../palette';
import type { HdSheet } from '../sheet';

/** Lado do quadro em texels. */
export const LEVA1_FX_SIZE = 16;

/** Quadros da folha, na ordem em que entram na textura. */
export const LEVA1_FX_FRAMES = ['palm-0', 'palm-1', 'nail', 'nailHead', 'seal', 'stun-0', 'stun-1'] as const;
export type Leva1FxFrame = (typeof LEVA1_FX_FRAMES)[number];

const KEYS: readonly string[] = Object.keys(PALETTE);
const COLORS: readonly number[] = [0, ...KEYS.map((k) => PALETTE[k])];

const indexOf = (key: string): number => {
  const i = KEYS.indexOf(key);
  if (i < 0) throw new Error(`Cor '${key}' fora da paleta única`);
  return i + 1;
};

/** Grade de 16 linhas de 16 caracteres em índices de `COLORS`. */
function fromGrid(name: string, rows: readonly string[]): Uint8Array {
  const n = LEVA1_FX_SIZE;
  if (rows.length !== n || rows.some((r) => r.length !== n)) throw new Error(`Quadro '${name}' não é ${n}x${n}`);
  const px = new Uint8Array(n * n);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && (px[y * n + x] = indexOf(ch))));
  return px;
}

// Palma aberta, dedos para cima e polegar à esquerda, branca com a borda âmbar, e duas cintilas: o instante da troca.
const PALM_0 = [
  '................',
  '.......A.....A..',
  '.....AAwAA..AwA.',
  '....AwAwAwA..A..',
  '....AwAwAwAA....',
  '....AwAwAwAwA...',
  '....AwAwAwAwA...',
  '..A.AwwwwwwwA...',
  '.AwAAwwwwwwwA...',
  '..AwwwwwwwwwA...',
  '...AwwwwwwwwA...',
  '....AwwwwwwA..A.',
  '..A..AAAAAA.....',
  '.AwA............',
  '..A.............',
  '................',
];

// O estouro que sobra da palma: anel oco e 8 raios com a ponta branca correndo para fora.
const PALM_1 = [
  '.......w........',
  '.......A........',
  '.......A........',
  '..w.........w...',
  '...A.......A....',
  '......AAA.......',
  '.....A...A......',
  'wAA..A.w.A..AAw.',
  '.....A...A......',
  '......AAA.......',
  '...A.......A....',
  '..w.........w...',
  '.......A........',
  '.......A........',
  '.......w........',
  '................',
];

// Prego em voo, 8x3 nas colunas 4 a 11 e linhas 7 a 9: cabeça chata à esquerda, haste com o brilho e a ponta.
const NAIL = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....WS..........',
  '....SSWWWWWS....',
  '....Sn..........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// Prego cravado no alvo, de pé com a ponta para baixo: a cabeça chata clara em cima e a haste entrando no corpo,
// contornado em k para ler sobre o inimigo; 7x8 no meio do quadro, para 3 caberem lado a lado.
const NAIL_HEAD = [
  '................',
  '................',
  '................',
  '................',
  '....kkkkkkk.....',
  '....kWWWSSk.....',
  '....kSSSnnk.....',
  '....kkkWnkk.....',
  '......kSnk......',
  '......kSnk......',
  '......kSnk......',
  '.......kk.......',
  '................',
  '................',
  '................',
  '................',
];

// O olho de serpente: íris roxa com a pupila em fenda, brilho de cima e da esquerda, e os 4 traços do selo.
const SEAL = [
  '.......UU.......',
  '.....vvvvvv.....',
  '...vvuuUUuuvv...',
  '..vuUWuubbuuuv..',
  '..vuUuuubbuuuv..',
  '.vuUuuubbbbuuuv.',
  'UvuUuuubbbbuuuvU',
  'UvuuuuubbbbuuuvU',
  '.vuuuuubbbbuuuv.',
  '.vuuuuubbbbuuuv.',
  '..vuuuuubbuuuv..',
  '..vuuuuubbuuuv..',
  '...vvuuuuuuvv...',
  '.....vvvvvv.....',
  '.......UU.......',
  '................',
];

/** Estrela de 3x3 da frente da órbita (branca com as pontas âmbar) e a de trás, menor e só âmbar. */
const STAR_FRONT = ['.A.', 'AwA', '.A.'];
const STAR_BACK = ['A'];

/**
 * Marcador de atordoado: a órbita achatada, pontilhada em roxo, com 3 estrelas a 120 graus, giradas de `turn`
 * radianos. As de baixo (frente) ficam por cima da órbita e maiores; as de cima (trás), um ponto.
 */
function stunFrame(turn: number): Uint8Array {
  const n = LEVA1_FX_SIZE;
  const px = new Uint8Array(n * n);
  const [cx, cy, rx, ry] = [7.5, 8, 6, 2.5];
  const put = (x: number, y: number, key: string): void => {
    if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = indexOf(key);
  };
  for (let k = 0; k < 24; k++) {
    if (k % 2 === 1) continue;
    const a = (k / 24) * 2 * Math.PI;
    put(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)), 'u');
  }
  for (let s = 0; s < 3; s++) {
    const a = turn + (s * 2 * Math.PI) / 3;
    const x = Math.round(cx + rx * Math.cos(a));
    const y = Math.round(cy + ry * Math.sin(a));
    const stamp = Math.sin(a) >= 0 ? STAR_FRONT : STAR_BACK;
    const h = (stamp.length - 1) / 2;
    stamp.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && put(x + i - h, y + j - h, ch)));
  }
  return px;
}

let cached: HdSheet | undefined;

/** A folha `tech-fx-leva1` (calculada uma vez, na primeira chamada). */
export function leva1FxSheet(): HdSheet {
  if (cached) return cached;
  const frames: Record<Leva1FxFrame, Uint8Array> = {
    'palm-0': fromGrid('palm-0', PALM_0),
    'palm-1': fromGrid('palm-1', PALM_1),
    nail: fromGrid('nail', NAIL),
    nailHead: fromGrid('nailHead', NAIL_HEAD),
    seal: fromGrid('seal', SEAL),
    'stun-0': stunFrame(Math.PI / 2),
    'stun-1': stunFrame(Math.PI / 2 + Math.PI / 3),
  };
  cached = { frameW: LEVA1_FX_SIZE, frameH: LEVA1_FX_SIZE, colors: COLORS, frames };
  return cached;
}
