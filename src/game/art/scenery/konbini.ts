import { type Brush, type Key, rng } from './brush';
import { hashSeed, speckle } from './paint';
import type { LayerArea, ThemeScenery } from './types';

/**
 * Konbini (CEN-01, CEN-08, CEN-09): é um interior, então a média cobre o céu de cima a baixo com a parede do fundo,
 * o teto com as calhas de luz, as geladeiras de porta de vidro e a faixa de cor da loja; na próxima ficam as gôndolas
 * baixas cheias de produto, com as etiquetas de preço.
 */

/** Altura da gôndola acima do chão da camada. */
const SHELF_H = 62;
/** Topo da camada a pintar na média: acima do que a câmera alcança, para o céu não aparecer dentro da loja. */
const CEILING_Y = -256;

const GOODS: readonly Key[] = ['r', 'a', 'A', 'c', 'G', 'U', 'T', 'l', 'C', 'u'];

/** Pacote de salgadinho: largo e baixo, com a borda de cima vincada e uma faixa clara no meio. */
function snack(b: Brush, x: number, base: number, key: Key): number {
  b.rect(x, base - 8, 10, 8, key);
  b.rect(x, base - 9, 10, 1, 'w');
  b.rect(x + 2, base - 5, 6, 2, 'l');
  b.rect(x + 8, base - 8, 2, 8, 'K');
  return 12;
}

/** Copo de lámen: base mais estreita que a tampa, tampa clara. */
function cup(b: Brush, x: number, base: number, key: Key): number {
  b.rect(x, base - 8, 8, 2, 'w');
  b.rect(x + 1, base - 6, 6, 6, key);
  b.rect(x + 2, base - 4, 4, 2, 'w');
  return 9;
}

/** Garrafa: corpo, gargalo e tampa. */
function bottle(b: Brush, x: number, base: number, key: Key): number {
  b.rect(x, base - 8, 4, 8, key);
  b.rect(x, base - 8, 2, 8, 'C');
  b.rect(x + 1, base - 11, 2, 3, key);
  b.rect(x + 1, base - 12, 2, 1, 'w');
  return 6;
}

/** Uma prateleira de produtos sorteados entre pacote, copo e garrafa, em grupos da mesma cor como numa loja. */
function goods(b: Brush, x0: number, x1: number, base: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  let key = GOODS[0];
  let kind = 0;
  for (let x = x0, n = 0; x < x1 - 10; n++) {
    if (n % 3 === 0) {
      key = GOODS[Math.floor(rand() * GOODS.length)];
      kind = Math.floor(rand() * 3);
    }
    x += kind === 0 ? snack(b, x, base, key) : kind === 1 ? cup(b, x, base, key) : bottle(b, x, base, key);
  }
}

function near(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const top = ground - SHELF_H;
  // Rodapé e o piso de vinil visto atrás das gôndolas.
  b.rect(x0, top - 10, x1 - x0, bottom - top + 10, 's');
  speckle(b, x0, top - 10, x1 - x0, bottom - top + 10, ['S', 'N'], 0.12, 801);
  // Gôndolas de 88 px com um vão de 16 px entre elas.
  for (let x = x0; x < x1; x += 104) {
    b.rect(x, top, 88, bottom - top, 'N');
    b.rect(x, top, 88, 2, 'S');
    b.rect(x, top, 2, bottom - top, 'S');
    b.rect(x + 86, top, 2, bottom - top, 'K');
    // Placa de promoção no alto da gôndola, com o "texto" e o preço.
    b.rect(x + 12, top - 14, 64, 14, 'a');
    b.rect(x + 12, top - 14, 64, 2, 'A');
    b.rect(x + 16, top - 9, 30, 4, 'w');
    b.rect(x + 54, top - 10, 18, 6, 'r');
    b.rect(x + 42, top - 2, 4, 2, 'K');
    for (let shelf = top + 16; shelf < ground + 30; shelf += 16) {
      goods(b, x + 4, x + 84, shelf - 2, x + shelf);
      b.rect(x + 2, shelf - 2, 84, 2, 'S');
      b.rect(x + 2, shelf, 84, 2, 'K');
      for (let tx = x + 10; tx < x + 80; tx += 26) b.rect(tx, shelf, 6, 4, 'w');
    }
  }
}

/** Geladeira de porta de vidro: moldura clara, vidro azulado aceso, prateleiras e garrafas. */
function fridge(b: Brush, x: number, top: number, ground: number, seed: number): void {
  const rand = rng(hashSeed(seed));
  b.rect(x, top, 44, ground - top, 'S');
  b.rect(x + 2, top + 2, 40, ground - top - 4, 'd');
  b.rect(x + 2, top + 2, 40, 4, 'C');
  b.rect(x + 2, top + 2, 2, ground - top - 4, 'C');
  b.rect(x + 21, top + 2, 2, ground - top - 4, 'S');
  for (let y = top + 18; y < ground - 6; y += 16) {
    b.rect(x + 2, y, 40, 2, 'S');
    for (let bx = x + 4; bx < x + 38; bx += 6) {
      if (bx >= x + 18 && bx <= x + 22) continue;
      bottle(b, bx, y, GOODS[Math.floor(rand() * GOODS.length)]);
    }
  }
  b.rect(x + 18, top + 30, 2, 10, 'K');
  b.rect(x + 24, top + 30, 2, 10, 'K');
}

function mid(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  // Teto com calhas de luz fluorescente, faixa da loja e parede clara do fundo.
  b.rect(x0, CEILING_Y, x1 - x0, ground - CEILING_Y + (bottom - ground), 's');
  b.rect(x0, CEILING_Y, x1 - x0, ground - 190 - CEILING_Y, 'N');
  for (let x = x0 + 12; x < x1; x += 80) {
    b.rect(x, ground - 200, 52, 4, 'w');
    b.rect(x - 2, ground - 196, 56, 2, 'S');
  }
  b.rect(x0, ground - 190, x1 - x0, 6, 'c');
  b.rect(x0, ground - 184, x1 - x0, 4, 'a');
  b.rect(x0, ground - 180, x1 - x0, 2, 'r');
  speckle(b, x0, ground - 178, x1 - x0, 178, ['S', 'N'], 0.06, 811);
  // Geladeiras lado a lado, com um cartaz de promoção entre os grupos.
  for (let x = x0 + 8; x < x1; x += 148) {
    for (let i = 0; i < 3 && x + i * 46 + 44 < x1 + 44; i++) fridge(b, x + i * 46, ground - 150, ground - 20, x + i);
  }
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'N');
  b.rect(x0, ground - 20, x1 - x0, 2, 'S');
}

export const KONBINI_SCENERY: ThemeScenery = { mid, near };
