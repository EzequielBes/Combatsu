import { type Brush, rng } from './brush';
import { courses, hashSeed, lit, speckle, wire } from './paint';
import type { LayerArea, ThemeScenery } from './types';

/**
 * Rua (CEN-01, CEN-08, CEN-09): na próxima, muro de concreto com portas de enrolar de lojas fechadas, cartazes velhos
 * e pichação; na média, prédios baixos com janelas, letreiros verticais, caixa d'água e fios de poste.
 */

/** Altura do muro acima do chão da camada. */
const WALL_H = 56;

/** Porta de enrolar de `w` px: caixa no alto, lâminas com junta a cada 4 px e o puxador embaixo. */
function shutter(b: Brush, x: number, top: number, w: number, bottom: number): void {
  b.rect(x - 2, top - 2, w + 4, bottom - top + 2, 'K');
  b.rect(x, top, w, bottom - top, 's');
  courses(b, x, top + 8, w, bottom - top - 8, 4, 'N');
  b.rect(x, top, w, 8, 'N');
  b.rect(x, top + 6, w, 2, 'n');
  b.rect(x + w / 2 - 4, bottom - 8, 8, 2, 'K');
}

/** Cartaz colado e meio rasgado: papel apagado, duas ou três linhas de texto e às vezes o canto caído. */
function poster(b: Brush, x: number, y: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  const w = 12 + Math.floor(rand() * 3) * 2;
  const h = 14 + Math.floor(rand() * 4) * 2;
  const paper = (['L', 'I', 'L', 'l'] as const)[Math.floor(rand() * 4)];
  b.rect(x, y, w, h, paper);
  b.rect(x, y + h, w, 2, 'n');
  b.rect(x + 2, y + 3, w - 4, 2, (['r', 'd', 't', 'n'] as const)[Math.floor(rand() * 4)]);
  for (let ly = y + 8; ly < y + h - 3; ly += 4) b.rect(x + 2, ly, 4 + Math.floor(rand() * (w - 6)), 2, 'n');
  if (rand() < 0.5) b.rect(x + w - 4, y + h - 4, 4, 4, 'N');
}

/** Letras da pichação em 4x5 texels (1 = tinta): K, R, Z, S, X, Y. */
const GLYPHS: readonly (readonly string[])[] = [
  ['1001', '1010', '1100', '1010', '1001'],
  ['1110', '1001', '1110', '1010', '1001'],
  ['1111', '0010', '0100', '1000', '1111'],
  ['0111', '1000', '0110', '0001', '1110'],
  ['1001', '1001', '0110', '1001', '1001'],
  ['1001', '1001', '0110', '0100', '0100'],
];

/** Pichação: três a cinco letras de uma cor viva com a sombra escura deslocada, subindo e descendo um pouco. */
function tag(b: Brush, x: number, y: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  const key = (['u', 'T', 'c', 'G', 'U'] as const)[Math.floor(rand() * 5)];
  const count = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const glyph = GLYPHS[Math.floor(rand() * GLYPHS.length)];
    const gx = x + i * 10;
    const gy = y + (rand() < 0.5 ? 0 : 2);
    glyph.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        if (row[tx] !== '1') continue;
        b.dot(gx + tx * 2 + 2, gy + ty * 2 + 2, 'k');
        b.dot(gx + tx * 2, gy + ty * 2, key);
      }
    });
  }
}

function near(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const top = ground - WALL_H;
  // Concreto: base, manchas e respingos, tampa clara no alto e encardido perto do chão.
  b.rect(x0, top, x1 - x0, bottom - top, 'N');
  speckle(b, x0, top + 6, x1 - x0, bottom - top - 6, ['n', 's', 'n'], 0.22, 101);
  b.rect(x0, top - 4, x1 - x0, 4, 'S');
  b.rect(x0, top, x1 - x0, 2, 'n');
  b.dither(x0, ground - 6, x1 - x0, 6, 'n');
  b.rect(x0, ground, x1 - x0, bottom - ground, 'n');
  speckle(b, x0, ground, x1 - x0, bottom - ground, ['K', 'N'], 0.25, 103);
  // Painéis de 48 px com junta e, a cada painel, um elemento: porta de enrolar, cartazes ou pichação.
  const rand = rng(107);
  for (let x = x0; x < x1; x += 48) {
    b.rect(x, top, 2, bottom - top, 'n');
    const r = rand();
    if (r < 0.22) shutter(b, x + 6, top + 10, 36, ground + 24);
    else if (r < 0.5) {
      poster(b, x + 6 + Math.floor(rand() * 4) * 2, top + 10 + Math.floor(rand() * 4) * 2, x);
      if (rand() < 0.5) poster(b, x + 26, top + 14 + Math.floor(rand() * 4) * 2, x + 1);
    } else if (r < 0.75) tag(b, x + 4, ground - 30 + Math.floor(rand() * 3) * 4, x);
  }
}

/** Prédio baixo: corpo escuro, platibanda acesa pela lua e grade de janelas. */
function building(b: Brush, x: number, w: number, top: number, bottom: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  b.rect(x, top, w, bottom - top, 'K');
  b.rect(x - 2, top - 4, w + 4, 4, 'n');
  b.rect(x - 2, top - 4, w + 4, 2, 'N');
  for (let wy = top + 10; wy < bottom - 24; wy += 18) {
    for (let wx = x + 8; wx + 10 <= x + w - 6; wx += 16) lit(b, wx, wy, 10, 10, rand());
  }
  if (rand() < 0.5) {
    // Caixa d'água no telhado.
    b.rect(x + w - 28, top - 22, 18, 14, 'n');
    b.rect(x + w - 28, top - 22, 18, 2, 'N');
    b.rect(x + w - 26, top - 8, 2, 4, 'k');
    b.rect(x + w - 14, top - 8, 2, 4, 'k');
  }
}

/** Letreiro vertical de loja: moldura escura, fundo aceso e quatro blocos de "letra". */
function sign(b: Brush, x: number, y: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  const [bg, ink] = rand() < 0.5 ? (['T', 'w'] as const) : (['c', 'k'] as const);
  b.rect(x - 2, y - 2, 16, 56, 'k');
  b.rect(x, y, 12, 52, bg);
  for (let i = 0; i < 4; i++) b.rect(x + 3, y + 4 + i * 12, 6, 8, ink);
}

function mid(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');
  const rand = rng(211);
  let x = x0;
  while (x < x1) {
    const w = 64 + Math.floor(rand() * 4) * 16;
    const top = ground - 90 - Math.floor(rand() * 5) * 14;
    building(b, x, w, top, ground, x);
    if (rand() < 0.45) sign(b, x + 8, top + 12, x + 3);
    x += w + 6;
  }
  // Postes de concreto com dois fios caindo entre eles.
  for (let px = x0 + 30; px < x1; px += 150) {
    b.rect(px, ground - 150, 4, 150, 'k');
    b.rect(px - 10, ground - 144, 24, 2, 'k');
    b.rect(px - 6, ground - 138, 16, 2, 'k');
    wire(b, px, px + 150, ground - 143, 10, 'k');
    wire(b, px, px + 150, ground - 137, 14, 'k');
  }
}

export const RUA_SCENERY: ThemeScenery = { mid, near };
