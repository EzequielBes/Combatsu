/*
 * Folhas `onomatopoeia` e `ground-crack`: o ドン de mangá do golpe forte no patamar 3 e a rachadura no chão embaixo
 * do alvo (DON-03). 1 texel = 1 px de mundo, só cores da paleta única. Puro, sem `phaser`.
 *
 * O ドン (32x20) é desenhado em código como pincelada: cada traço é uma linha grossa entre pontos, com a espessura
 * afinando do começo ao fim; o texto inteiro inclina para a frente (itálico de impacto), ganha o contorno `k` de
 * 1 texel em volta e a sombra `r` deslocada para baixo e para a direita, só por fora do desenho fechado (nada de
 * vermelho nos vãos da letra). O miolo é o branco quente `w`.
 * A rachadura (48x6, `crack-0` no instante do golpe e `crack-1` espalhada) é vista de lado: quebra a borda do chão e
 * desce pela face do piso. A cunha em V no ponto do impacto ocupa as 6 linhas (borda `k`, fundo `K` por dentro), os
 * galhos `k` descem em zigue-zague afinando até 1 texel e lascas claras (`y`) soltam na borda, ao lado da cunha.
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

// ド: a haste da ト, o galho para a direita e as duas marcas finas do dakuten (゛, caídas para a direita, com 1 texel
// vazio entre elas); ン: o pingo e a varrida de baixo para cima. Entre o ド e o ン ficam 2 texels vazios.
// prettier-ignore
const DON_STROKES: readonly Stroke[] = [
  { pts: [[2.2, 2.5], [2.2, 15.5]], r0: 1.6, r1: 1.4 },
  { pts: [[3.6, 7.2], [8.5, 10.6]], r0: 1.6, r1: 1.1 },
  { pts: [[7.2, 1.2], [8, 3.5]], r0: 0.75 },
  { pts: [[12.2, 1.2], [13, 3.5]], r0: 0.75 },
  { pts: [[18.9, 3.4], [20.6, 5.3]], r0: 1, r1: 0.8 },
  { pts: [[17.5, 15.5], [21, 14.2], [24.1, 11], [26.1, 7.2], [27, 3.4]], r0: 2.1, r1: 1 },
];
/** Inclinação do itálico: texels para a direita por texel para cima (a ponta da varrida não chega na borda). */
const DON_SLANT = 0.09;

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

/** A máscara `m` (1 = cheio) dilatada (`grow`) ou erodida pelos 8 vizinhos. */
function morph(m: Uint8Array, w: number, h: number, grow: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = [...around(x, y, w, h)];
      const hit = grow ? m[y * w + x] || n.some((i) => m[i]) : m[y * w + x] && n.length === 8 && n.every((i) => m[i]);
      out[y * w + x] = hit ? 1 : 0;
    }
  return out;
}

/** Raio do fechamento: tapa os vãos de até o dobro disso. */
const CLOSE = 5;

/**
 * O desenho fechado: a tinta dilatada `CLOSE` texels e erodida outros tantos, numa margem vazia em volta do quadro
 * (para a borda não contar como tinta). Tapa os vãos de dentro das letras e entre elas.
 */
function closed(ink: Uint8Array, w: number, h: number): Uint8Array {
  const [pw, ph] = [w + 2 * CLOSE, h + 2 * CLOSE];
  let m: Uint8Array = new Uint8Array(pw * ph);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[(y + CLOSE) * pw + x + CLOSE] = ink[y * w + x];
  for (let i = 0; i < 2 * CLOSE; i++) m = morph(m, pw, ph, i < CLOSE);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = m[(y + CLOSE) * pw + x + CLOSE];
  return out;
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
  const fill = Uint8Array.from(out);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (fill[y * w + x] === 0 && [...around(x, y, w, h)].some((i) => fill[i] === W)) out[y * w + x] = K;
  // Sombra: o desenho todo deslocado 1 texel para baixo e para a direita, só no vazio de fora do desenho fechado
  // (nada de pontos vermelhos dentro dos vãos da letra nem entre o ド e o ン).
  const ink = out.map((c) => (c ? 1 : 0));
  const inside = closed(ink, w, h);
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++)
      if (out[y * w + x] === 0 && !inside[y * w + x] && ink[(y - 1) * w + x - 1]) out[y * w + x] = R;
  return out;
}

type CrackName = (typeof CRACK_FRAMES)[number];

/**
 * Galhos da rachadura vista de lado: saem da cunha descendo pela face do piso entre 30° e 45° e seguem em zigue-zague
 * (cada trecho subindo ou descendo de 27° a 45°), com galhos menores nas quinas; o primeiro trecho dos que saem da
 * cunha tem 2 texels e a ponta afina para 1. Todos terminam 2 texels antes da borda do quadro.
 */
// prettier-ignore
const CRACK_BRANCHES: Record<CrackName, readonly (readonly Pt[])[]> = {
  'crack-0': [
    [[26, 1], [29, 3], [30, 4]],
    [[21, 1], [18, 3], [17, 4]],
  ],
  'crack-1': [
    [[27, 1], [30, 3], [32, 4], [35, 2], [38, 4], [40, 5]],
    [[20, 1], [17, 3], [16, 4], [13, 2], [11, 3], [8, 5]],
    [[38, 4], [41, 2], [43, 3]],
    [[11, 3], [8, 1], [5, 3], [4, 4]],
    [[32, 4], [33, 5]],
    [[16, 4], [15, 5]],
  ],
};
/** Os 2 primeiros galhos de cada quadro saem colados na cunha (os outros nascem nas quinas deles). */
const ROOTED = 2;
/** A cunha do impacto, linha a linha: [primeira coluna, última]; borda `k` e o fundo `K` só por dentro. */
// prettier-ignore
const CRACK_WEDGE: Record<CrackName, readonly Pt[]> = {
  'crack-0': [[21, 26], [22, 25], [22, 25], [23, 24], [23, 24], [23, 23]],
  'crack-1': [[20, 27], [21, 26], [21, 26], [22, 25], [22, 25], [23, 24]],
};
/** Lascas claras de pedra soltas na borda do chão, ao lado da cunha. */
const CRACK_CHIPS: Record<CrackName, readonly Pt[]> = {
  'crack-0': [[20, 0]],
  'crack-1': [
    [19, 0],
    [29, 0],
  ],
};
const CHIP = paletteIndex('y');

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

function drawCrack(name: CrackName): Uint8Array {
  const { w, h } = CRACK_FRAME;
  const out = new Uint8Array(w * h);
  const put = (c: number) => (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = c;
  };
  CRACK_BRANCHES[name].forEach((branch, i) => {
    for (let j = 0; j + 1 < branch.length; j++) {
      bresenham(branch[j], branch[j + 1], put(K));
      // Perto da cunha o galho é mais grosso: um segundo texel logo abaixo.
      if (i < ROOTED && j === 0) bresenham(branch[j], branch[j + 1], (x, y) => put(K)(x, y + 1));
    }
  });
  CRACK_WEDGE[name].forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) put(x === a || x === b ? K : DEEP)(x, y);
  });
  for (const [x, y] of CRACK_CHIPS[name]) put(CHIP)(x, y);
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
