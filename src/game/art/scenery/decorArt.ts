import type { ModuleTheme } from '../../../core/module';
import { type Brush, rng } from './brush';
import { hashSeed } from './paint';

/**
 * Peças de decoração sem colisão (CEN-13), pintadas no mundo a partir do pé no chão (`floor`, px de mundo) e
 * centradas em `cx`. Ficam atrás dos atores e na frente do muro; nenhuma tem corpo do Matter (CEN-14).
 */
type DecorPainter = (b: Brush, cx: number, floor: number) => void;

/** Máquina de bebidas: corpo claro, vitrine acesa com três fileiras de latas, botões e a boca de saída. */
function vendingMachine(b: Brush, cx: number, floor: number): void {
  const x = cx - 15;
  const top = floor - 60;
  b.rect(x - 2, top - 2, 34, 62, 'k');
  b.rect(x, top, 30, 60, 'S');
  b.rect(x, top, 30, 2, 'w');
  b.rect(x + 28, top, 2, 60, 's');
  b.rect(x + 3, top + 4, 24, 30, 'c');
  b.rect(x + 3, top + 4, 24, 2, 'C');
  const rand = rng(hashSeed(cx));
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const key = (['r', 'a', 'G', 'w', 'd', 'T'] as const)[Math.floor(rand() * 6)];
      b.rect(x + 5 + i * 4, top + 9 + row * 9, 2, 6, key);
    }
    b.rect(x + 3, top + 15 + row * 9, 24, 1, 'S');
  }
  for (let i = 0; i < 5; i++) b.dot(x + 6 + i * 4, top + 37, i % 2 === 0 ? 'A' : 'r');
  b.rect(x + 4, top + 44, 22, 8, 'K');
  b.rect(x + 6, top + 46, 18, 2, 'n');
}

/** Duas lixeiras com tampa e um saco de lixo amarrado encostado nelas. */
function trash(b: Brush, cx: number, floor: number): void {
  for (const [dx, h] of [
    [-16, 26],
    [2, 22],
  ] as const) {
    b.rect(cx + dx, floor - h, 16, h, 'N');
    b.rect(cx + dx, floor - h, 2, h, 's');
    b.rect(cx + dx + 14, floor - h, 2, h, 'K');
    b.rect(cx + dx - 2, floor - h - 4, 20, 4, 'n');
    b.rect(cx + dx - 2, floor - h - 4, 20, 2, 's');
    for (let y = floor - h + 6; y < floor - 2; y += 6) b.rect(cx + dx + 2, y, 12, 1, 'n');
  }
  b.disc(cx + 26, floor - 10, 8, 'K');
  b.disc(cx + 24, floor - 12, 4, 'n');
  b.rect(cx + 24, floor - 20, 4, 4, 'K');
}

/** Poste do parque: luminária acesa em cima, haste de ferro e a base. */
function parkLamp(b: Brush, cx: number, floor: number): void {
  const top = floor - 104;
  b.dither(cx - 16, top - 8, 34, 24, 'f');
  b.rect(cx - 2, top + 10, 4, floor - top - 10, 'k');
  b.rect(cx - 2, top + 10, 2, floor - top - 10, 'n');
  b.rect(cx - 6, floor - 8, 12, 8, 'k');
  b.rect(cx - 8, top, 16, 4, 'k');
  b.rect(cx - 6, top + 4, 12, 6, 'A');
  b.rect(cx - 4, top + 4, 8, 2, 'w');
  b.rect(cx - 6, top + 10, 12, 2, 'k');
}

/** Pilha de cestinhas de compras vermelhas e o cartaz de promoção num cavalete. */
function baskets(b: Brush, cx: number, floor: number): void {
  for (let i = 0; i < 4; i++) {
    const y = floor - 8 - i * 4;
    b.rect(cx - 12, y, 20, 8, 'r');
    b.rect(cx - 12, y, 20, 2, 'T');
    for (let x = cx - 10; x < cx + 6; x += 4) b.rect(x, y + 3, 2, 3, 't');
  }
  b.rect(cx + 14, floor - 30, 18, 22, 'w');
  b.rect(cx + 14, floor - 30, 18, 4, 'a');
  b.rect(cx + 16, floor - 22, 14, 2, 'r');
  b.rect(cx + 16, floor - 17, 10, 2, 'n');
  b.rect(cx + 16, floor - 8, 2, 8, 'k');
  b.rect(cx + 28, floor - 8, 2, 8, 'k');
}

/** Peça de cada tema; o santuário fica sem peça até a F23. */
export const DECOR_ART: Partial<Record<ModuleTheme, readonly DecorPainter[]>> = {
  rua: [vendingMachine],
  beco: [trash],
  parque: [parkLamp],
  konbini: [baskets],
};

/**
 * Pinta a peça do tema em `cx` (a `index`-ésima do trecho escolhe entre as peças do tema) e devolve `true`; sem peça
 * para o tema, não pinta nada e devolve `false`.
 */
export function paintDecor(b: Brush, theme: ModuleTheme, cx: number, floor: number, index = 0): boolean {
  const pieces = DECOR_ART[theme];
  if (!pieces || pieces.length === 0) return false;
  pieces[index % pieces.length](b, cx, floor);
  return true;
}
