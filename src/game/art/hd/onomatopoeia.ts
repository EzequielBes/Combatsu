/*
 * Folhas `onomatopoeia` e `ground-crack`: o ドン de mangá do golpe forte no patamar 3 e a rachadura no chão embaixo
 * do alvo (DON-03). 1 texel = 1 px de mundo, só cores da paleta única. Puro, sem `phaser`.
 *
 * O ドン (32x20) é desenhado em código como pincelada: cada traço é uma linha grossa entre pontos, com a espessura
 * afinando do começo ao fim; o texto inteiro inclina para a frente (itálico de impacto), ganha o contorno `k` de
 * 1 texel em volta e a sombra `r` deslocada para baixo e para a direita. O miolo é o branco quente `w`.
 * A rachadura (48x6, `crack-0` no instante do golpe e `crack-1` espalhada) é a fenda em cunha no ponto do impacto e
 * os galhos tortos para os lados, em `k`, com a borda funda `K` logo abaixo de cada texel da fenda.
 */
import type { HdSheet } from './sheet';
import { PALETTE_COLORS, paletteIndex } from './paletteGrid';

/** Quadro do ドン: 32x20 texels. */
export const DON_FRAME = { w: 32, h: 20 } as const;
/** Quadro da rachadura: 48x6 texels, a linha de cima no nível do chão e o impacto na coluna do meio. */
export const CRACK_FRAME = { w: 48, h: 6 } as const;
export const CRACK_FRAMES = ['crack-0', 'crack-1'] as const;

type Pt = readonly [number, number];

/** Traço de pincel: linha pelos pontos, raio `r0` no começo afinando até `r1` no fim. */
interface Stroke {
  pts: readonly Pt[];
  r0: number;
  r1?: number;
}

// ド: a haste da ト, o galho para a direita e as duas marcas do dakuten; ン: o pingo e a varrida de baixo para cima.
// prettier-ignore
const DON_STROKES: readonly Stroke[] = [
  { pts: [[3.5, 2.5], [3.5, 15.5]], r0: 2, r1: 1.6 },
  { pts: [[5, 6.5], [11, 10.5]], r0: 1.8, r1: 1.2 },
  { pts: [[9.5, 2.3], [10.5, 5]], r0: 1.1 },
  { pts: [[13, 2.3], [14, 5]], r0: 1.1 },
  { pts: [[16.5, 3.5], [20, 6.5]], r0: 1.8, r1: 1.3 },
  { pts: [[16.5, 15.5], [20.5, 14], [24, 10.8], [26.3, 7], [27.5, 3]], r0: 2.2, r1: 1.1 },
];
/** Inclinação do itálico: texels para a direita por texel para cima. */
const DON_SLANT = 0.12;

const W = paletteIndex('w');
const K = paletteIndex('k');
const R = paletteIndex('r');
const DEEP = paletteIndex('K');

/** Distância do ponto (x, y) ao segmento a-b e a fração do caminho (0 em a, 1 em b). */
function segDist(x: number, y: number, [ax, ay]: Pt, [bx, by]: Pt): { d: number; t: number } {
  const [dx, dy] = [bx - ax, by - ay];
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  return { d: Math.hypot(x - ax - t * dx, y - ay - t * dy), t };
}

/** O ponto (x, y) está dentro do traço? A espessura afina ao longo do comprimento total. */
function inStroke(s: Stroke, x: number, y: number): boolean {
  const lens = s.pts.slice(1).map((p, i) => Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let walked = 0;
  for (let i = 0; i < lens.length; i++) {
    const { d, t } = segDist(x, y, s.pts[i], s.pts[i + 1]);
    const f = (walked + t * lens[i]) / total;
    if (d <= s.r0 + ((s.r1 ?? s.r0) - s.r0) * f) return true;
    walked += lens[i];
  }
  return false;
}

/** Os 8 vizinhos de (x, y) que estão no quadro. */
function* around(x: number, y: number, w: number, h: number): Generator<number> {
  for (let j = y - 1; j <= y + 1; j++)
    for (let i = x - 1; i <= x + 1; i++)
      if ((i !== x || j !== y) && i >= 0 && j >= 0 && i < w && j < h) yield j * w + i;
}

function drawDon(): Uint8Array {
  const { w, h } = DON_FRAME;
  const out = new Uint8Array(w * h);
  // Miolo: o centro do texel, desfeito o itálico, cai em algum traço.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ux = x + 0.5 - (h - 1 - y) * DON_SLANT;
      if (DON_STROKES.some((s) => inStroke(s, ux, y + 0.5))) out[y * w + x] = W;
    }
  // Contorno de 1 texel em volta do miolo (8 vizinhos, para o traço ficar grosso nas diagonais).
  const outline = (): void => {
    const fill = Uint8Array.from(out);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (fill[y * w + x] === 0 && [...around(x, y, w, h)].some((i) => fill[i] === W)) out[y * w + x] = K;
  };
  outline();
  // Sombra: o desenho todo deslocado 1 texel para baixo e para a direita, só onde está vazio.
  const ink = Uint8Array.from(out);
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++) if (out[y * w + x] === 0 && ink[(y - 1) * w + x - 1]) out[y * w + x] = R;
  return out;
}

// Galhos da rachadura a partir da cunha do meio (coluna 23/24): o direito e o esquerdo, com um galho menor cada.
// prettier-ignore
const CRACK_BRANCHES: Record<(typeof CRACK_FRAMES)[number], readonly (readonly Pt[])[]> = {
  'crack-0': [
    [[25, 1], [28, 2], [31, 1]],
    [[22, 1], [19, 2], [16, 1]],
  ],
  'crack-1': [
    [[25, 1], [28, 2], [31, 1], [35, 2], [39, 2], [43, 3], [47, 3]],
    [[31, 1], [33, 3], [34, 4]],
    [[22, 1], [19, 2], [16, 1], [12, 2], [8, 2], [4, 3], [0, 4]],
    [[16, 1], [14, 3], [13, 4]],
  ],
};
/** A cunha do impacto, linha a linha: [primeira coluna, última]. */
// prettier-ignore
const CRACK_WEDGE: Record<(typeof CRACK_FRAMES)[number], readonly Pt[]> = {
  'crack-0': [[23, 24], [23, 24], [23, 23]],
  'crack-1': [[22, 25], [22, 25], [23, 24], [23, 24], [24, 24]],
};

function bresenham([x0, y0]: Pt, [x1, y1]: Pt, put: (x: number, y: number) => void): void {
  const [dx, dy] = [Math.abs(x1 - x0), -Math.abs(y1 - y0)];
  const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
  let [x, y, err] = [x0, y0, dx + dy];
  for (;;) {
    put(x, y);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) [err, x] = [err + dy, x + sx];
    if (e2 <= dx) [err, y] = [err + dx, y + sy];
  }
}

function drawCrack(name: (typeof CRACK_FRAMES)[number]): Uint8Array {
  const { w, h } = CRACK_FRAME;
  const out = new Uint8Array(w * h);
  const put = (x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = K;
  };
  CRACK_WEDGE[name].forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) put(x, y);
  });
  for (const branch of CRACK_BRANCHES[name])
    for (let i = 0; i + 1 < branch.length; i++) bresenham(branch[i], branch[i + 1], put);
  // A borda funda embaixo de cada texel da fenda: a rachadura ganha profundidade no chão.
  for (let y = h - 2; y >= 0; y--)
    for (let x = 0; x < w; x++) if (out[y * w + x] === K && out[(y + 1) * w + x] === 0) out[(y + 1) * w + x] = DEEP;
  return out;
}

let donCached: HdSheet | undefined;
let crackCached: HdSheet | undefined;

/** A folha `onomatopoeia`, com o quadro `don` (calculada uma vez). */
export function onomatopoeiaSheet(): HdSheet {
  donCached ??= { frameW: DON_FRAME.w, frameH: DON_FRAME.h, colors: PALETTE_COLORS, frames: { don: drawDon() } };
  return donCached;
}

/** A folha `ground-crack`, com `crack-0` e `crack-1` (calculada uma vez). */
export function groundCrackSheet(): HdSheet {
  if (crackCached) return crackCached;
  const frames: Record<string, Uint8Array> = {};
  for (const name of CRACK_FRAMES) frames[name] = drawCrack(name);
  crackCached = { frameW: CRACK_FRAME.w, frameH: CRACK_FRAME.h, colors: PALETTE_COLORS, frames };
  return crackCached;
}
