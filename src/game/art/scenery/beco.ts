import { type Brush, rng } from './brush';
import { bricks, hashSeed, lit, speckle, wire } from './paint';
import type { LayerArea, ThemeScenery } from './types';

/**
 * Beco (CEN-01, CEN-08, CEN-09): na próxima, parede de tijolo encardida com canos, aparelhos de ar-condicionado e uma
 * porta de serviço com lâmpada; na média, os fundos dos prédios colados, com escada de incêndio e varais.
 */

/** Altura da parede de tijolo acima do chão da camada: o beco é mais fechado que a rua. */
const WALL_H = 72;

/** Cano vertical com abraçadeiras: luz à esquerda, sombra à direita. */
function pipe(b: Brush, x: number, top: number, bottom: number): void {
  b.rect(x, top, 6, bottom - top, 's');
  b.rect(x, top, 2, bottom - top, 'S');
  b.rect(x + 4, top, 2, bottom - top, 'N');
  for (let y = top + 10; y < bottom; y += 24) b.rect(x - 2, y, 10, 2, 'K');
}

/** Aparelho de ar-condicionado: caixa, grade, pés e a mancha de goteira embaixo. */
function airConditioner(b: Brush, x: number, y: number): void {
  b.rect(x, y, 22, 14, 's');
  b.rect(x, y, 22, 2, 'S');
  b.rect(x, y + 12, 22, 2, 'N');
  for (let gx = x + 3; gx < x + 13; gx += 3) b.rect(gx, y + 3, 1, 8, 'K');
  b.disc(x + 17, y + 7, 4, 'N');
  b.dot(x + 17, y + 7, 'K');
  b.rect(x + 2, y + 14, 2, 2, 'K');
  b.rect(x + 18, y + 14, 2, 2, 'K');
  b.dither(x + 8, y + 16, 6, 18, 'n');
}

/** Porta de serviço de metal com a moldura, a maçaneta e a lâmpada acesa em cima. */
function serviceDoor(b: Brush, x: number, ground: number): void {
  const top = ground - 50;
  b.rect(x - 2, top - 2, 28, ground - top + 32, 'K');
  b.rect(x, top, 24, ground - top + 30, 'N');
  b.rect(x + 2, top + 2, 20, 2, 's');
  b.rect(x + 4, top + 8, 16, 14, 'n');
  b.rect(x + 18, top + 28, 4, 2, 'S');
  b.disc(x + 12, top - 10, 8, 'n');
  b.rect(x + 8, top - 8, 8, 4, 'A');
  b.rect(x + 10, top - 6, 4, 2, 'w');
}

function near(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const top = ground - WALL_H;
  b.rect(x0, top, x1 - x0, bottom - top, 'x');
  bricks(b, x0, top, x1 - x0, bottom - top, { bw: 16, ch: 8 }, { joint: 'K', alt: 'q' }, 401);
  speckle(b, x0, top, x1 - x0, bottom - top, ['m', 'q', 'm'], 0.12, 402);
  // Sombra no alto (a luz vem da rua, de baixo) e encardido no pé da parede.
  b.dither(x0, top, x1 - x0, 10, 'K');
  b.rect(x0, top - 4, x1 - x0, 4, 'K');
  b.rect(x0, top - 4, x1 - x0, 2, 'n');
  b.dither(x0, ground - 10, x1 - x0, 10, 'n');
  speckle(b, x0, ground - 4, x1 - x0, bottom - ground + 4, ['K', 'n'], 0.3, 403);
  // Uma peça a cada 56 px, sem repetir a anterior: o sorteio puro empilhava canos lado a lado.
  const rand = rng(hashSeed(x0 + 409));
  const kinds = ['pipe', 'ac', 'ac', 'door', 'none'] as const;
  let prev = -1;
  for (let x = x0 + 12; x < x1; x += 56) {
    let k = Math.floor(rand() * kinds.length);
    if (k === prev) k = (k + 1) % kinds.length;
    prev = k;
    if (kinds[k] === 'pipe') pipe(b, x, top - 4, bottom);
    else if (kinds[k] === 'ac') airConditioner(b, x + 8, top + 12 + Math.floor(rand() * 3) * 6);
    else if (kinds[k] === 'door') serviceDoor(b, x + 10, ground);
  }
}

/** Fundo de prédio: parede, poucas janelas e uma escada de incêndio em zigue-zague numa das colunas. */
function backBuilding(b: Brush, x: number, w: number, top: number, ground: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  b.rect(x, top, w, ground - top, 'n');
  speckle(b, x, top, w, ground - top, ['K', 'N'], 0.12, seed);
  b.rect(x, top, w, 4, 'N');
  for (let wy = top + 14; wy < ground - 30; wy += 30) {
    for (let wx = x + 10; wx + 12 <= x + w - 8; wx += 26) lit(b, wx, wy, 12, 14, rand());
  }
  const fx = x + 6 + Math.floor(rand() * Math.max(1, (w - 50) / 2)) * 2;
  for (let py = top + 30; py < ground - 10; py += 30) {
    // Patamar com grade e o lance de escada até o próximo, em diagonal.
    b.rect(fx, py, 40, 2, 'k');
    b.rect(fx, py - 10, 40, 2, 'K');
    for (let gx = fx; gx <= fx + 38; gx += 6) b.rect(gx, py - 10, 2, 10, 'K');
    for (let s = 0; s < 14; s++) b.rect(fx + 8 + s * 2, py + 2 + s * 2, 4, 2, 'k');
  }
}

function mid(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');
  const rand = rng(hashSeed(x0 + 211));
  let x = x0;
  let prevTop = 0;
  while (x < x1) {
    const w = 80 + Math.floor(rand() * 4) * 16;
    const top = ground - 170 - Math.floor(rand() * 4) * 14;
    backBuilding(b, x, w, top, ground, x);
    // Varal entre este prédio e o anterior, com roupas penduradas.
    if (prevTop !== 0 && rand() < 0.7) {
      const y = Math.max(top, prevTop) + 40;
      wire(b, x - 30, x + 20, y, 4, 'k');
      for (let cx = x - 26; cx < x + 16; cx += 10) {
        const key = (['c', 'r', 'L', 'G', 'U'] as const)[Math.floor(rand() * 5)];
        b.rect(cx, y + 3, 6, 6 + Math.floor(rand() * 3) * 2, key);
      }
    }
    prevTop = top;
    x += w + 12;
  }
}

export const BECO_SCENERY: ThemeScenery = { mid, near };
