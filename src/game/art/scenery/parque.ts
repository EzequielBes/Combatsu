import { type Brush, rng } from './brush';
import { hashSeed, speckle } from './paint';
import type { LayerArea, ThemeScenery } from './types';

/**
 * Parque (CEN-01, CEN-08, CEN-09): na próxima, sebe podada com o topo ondulado e uma grade de ferro de lanças na
 * frente, sobre um meio-fio de pedra (no lugar do muro verde chapado da F18); na média, copas de árvore, postes
 * acesos com halo e o espelho de um lago.
 */

/** Altura do topo da sebe acima do chão da camada. */
const HEDGE_H = 52;

/** Sebe: corpo de folhas com sombra embaixo, topo em tufos arredondados com a luz da lua por cima. */
function hedge(b: Brush, x0: number, x1: number, ground: number, bottom: number): void {
  const top = ground - HEDGE_H;
  b.rect(x0, top, x1 - x0, bottom - top, 'g');
  const rand = rng(hashSeed(x0 + 601));
  for (let x = x0 - 8; x < x1 + 8; x += 14) {
    const r = 8 + Math.floor(rand() * 3) * 2;
    b.disc(x, top + 2, r, 'g');
    b.rect(x - r + 4, top + 2 - r, r, 2, 'G');
  }
  speckle(b, x0, top - 6, x1 - x0, bottom - top + 6, ['G', 'G', 'K', 'n'], 0.35, 603);
  speckle(b, x0, top + 14, x1 - x0, bottom - top - 14, ['n', 'K'], 0.35, 605);
  b.dither(x0, ground - 12, x1 - x0, 12, 'K');
}

/** Grade de ferro: dois trilhos e barras com ponta de lança, um mourão de pedra a cada 96 px. */
function fence(b: Brush, x0: number, x1: number, ground: number): void {
  const top = ground - 40;
  b.rect(x0, top + 6, x1 - x0, 2, 'k');
  b.rect(x0, ground - 12, x1 - x0, 2, 'k');
  for (let x = x0; x < x1; x += 10) {
    b.rect(x, top + 2, 2, ground - top - 2, 'k');
    b.rect(x - 2, top + 2, 6, 2, 'k');
    b.dot(x, top, 'S');
  }
  for (let x = x0 + 40; x < x1; x += 96) {
    b.rect(x, top - 8, 10, ground - top + 8, 's');
    b.rect(x, top - 8, 2, ground - top + 8, 'S');
    b.rect(x + 8, top - 8, 2, ground - top + 8, 'N');
    b.rect(x - 2, top - 10, 14, 4, 'S');
  }
}

function near(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  hedge(b, x0, x1, ground, bottom);
  fence(b, x0, x1, ground);
  // Meio-fio de pedra baixo no pé da sebe, com juntas: só a faixa de cima aparece acima do piso.
  const curb = ground + 18;
  b.rect(x0, curb, x1 - x0, bottom - curb, 's');
  b.rect(x0, curb, x1 - x0, 2, 'S');
  for (let x = x0; x < x1; x += 24) b.rect(x, curb + 2, 2, bottom - curb - 2, 'N');
  speckle(b, x0, curb + 4, x1 - x0, bottom - curb - 4, ['N', 'n'], 0.3, 607);
}

/** Árvore: tronco e copa em discos sobrepostos, com sombra embaixo e a borda de cima acesa pela lua. */
function tree(b: Brush, cx: number, ground: number, size: number): void {
  b.rect(cx - 3, ground - size, 6, size, 'K');
  b.rect(cx - 3, ground - size, 2, size, 'n');
  const top = ground - size - 30;
  b.disc(cx - size / 3, top + 26, size / 2.4, 'K');
  b.disc(cx + size / 3, top + 28, size / 2.6, 'K');
  b.disc(cx, top + 14, size / 2.2, 'K');
  // Copa quase toda na sombra: o verde só no lado da lua (em cima, à esquerda) e um brilho pequeno.
  b.disc(cx - 4, top + 12, size / 3, 'g');
  b.disc(cx - size / 4, top + 22, size / 4, 'g');
  b.disc(cx - 8, top + 6, size / 6, 'G');
  speckle(b, cx - size / 2 - 8, top - 4, size + 16, ground - top - 4, ['K', 'g', 'n'], 0.35, cx);
}

/** Poste de ferro com luminária e um halo em dither. */
function lamp(b: Brush, x: number, ground: number): void {
  const top = ground - 100;
  b.dither(x - 14, top - 10, 30, 26, 'f');
  b.rect(x, top, 4, ground - top, 'k');
  b.rect(x, top, 2, ground - top, 'n');
  b.rect(x - 4, top - 2, 12, 4, 'k');
  b.rect(x - 2, top + 2, 8, 4, 'A');
  b.rect(x, top + 2, 4, 2, 'w');
}

function mid(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');
  // Gramado escuro e o espelho do lago, que reflete a lua em listras.
  b.rect(x0, ground - 26, x1 - x0, 6, 'n');
  speckle(b, x0, ground - 26, x1 - x0, 6, ['g', 'K'], 0.4, 611);
  const rand = rng(hashSeed(x0 + 613));
  let x = x0;
  while (x < x1) {
    const r = rand();
    if (r < 0.62) {
      const size = 40 + Math.floor(rand() * 4) * 8;
      tree(b, x + size / 2, ground - 20, size);
      x += size + 4;
    } else if (r < 0.82) {
      lamp(b, x + 20, ground - 20);
      x += 48;
    } else {
      const w = 96;
      b.rect(x, ground - 24, w, 8, 'd');
      for (let ly = ground - 22; ly < ground - 16; ly += 4) b.rect(x + 10 + (ly % 3) * 6, ly, w - 30, 2, 'c');
      x += w + 8;
    }
  }
}

export const PARQUE_SCENERY: ThemeScenery = { mid, near };
