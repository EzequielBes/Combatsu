/*
 * Símbolos das 3 técnicas da leva 1 do JJK: Boogie Woogie (a palma com o lampejo amarelo da troca), Ressonância
 * (o prego batido pelo martelo, com a estrela do impacto) e Fala Amaldiçoada (a boca com o selo da serpente nos
 * cantos e a onda da voz). Puro, sem `phaser`.
 */
import { bevelInk } from './canvas';
import { palm } from './hands';
import type { IconRecipe } from './plate';
import { arc, box, circle, ellipse, minus, rotate, star, stroke } from './sdf';

export const BOOGIE: IconRecipe = {
  plate: {
    halo: [
      [0.22, 'z'],
      [0.44, 'a'],
    ],
    at: [0.5, 0.42],
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(star(0.5, 0.42, 4, 0.5, small ? 0.14 : 0.11, -Math.PI / 4), 'A', { line: small ? undefined : 'a' });
    c.fill(star(0.5, 0.42, 4, 0.3, 0.07, -Math.PI / 2), 'w');
    palm(c, 0.54, 0.66, 0.42, ['q', 'P', 'p', 'w']);
  },
};

/** Prego de cabeça chata, da cabeça em (hx, hy) até a ponta em (tx, ty), em aço com chanfro. */
function nail(c: Parameters<IconRecipe['draw']>[0], hx: number, hy: number, tx: number, ty: number): void {
  const ang = Math.atan2(ty - hy, tx - hx);
  const small = c.size < 32;
  const shaft = stroke(hx, hy, tx, ty, small ? 0.065 : 0.07, 0.01);
  c.fill(shaft, bevelInk(shaft, c.px, 'S', 'W', 's', small ? 1 : 1.5), { line: small ? undefined : 'k' });
  const head = rotate(box(hx, hy, small ? 0.06 : 0.055, small ? 0.19 : 0.17, 0.02), hx, hy, ang);
  const steel = small ? bevelInk(head, c.px, 's', 'S', 'n', 1) : bevelInk(head, c.px, 'I', 'W', 'S');
  c.fill(head, steel, { line: small ? undefined : 'k' });
}

export const RESSONANCIA: IconRecipe = {
  plate: {
    halo: [
      [0.24, 'd'],
      [0.44, 'n'],
    ],
    at: [0.42, 0.3],
  },
  draw: (c) => {
    const small = c.size < 32;
    const [hx, hy] = [0.42, 0.3];
    if (small) c.fill(star(hx, hy, 4, 0.34, 0.09, -Math.PI / 4), 'C');
    else c.fill(star(hx, hy, 8, 0.27, 0.11, -Math.PI / 8), 'C', { line: 'c' });
    c.fill(star(hx, hy, 4, small ? 0.24 : 0.15, small ? 0.07 : 0.05), 'W');
    nail(c, hx, hy + 0.02, 0.6, 0.9);
    if (small) return;
    const handle = stroke(0.95, 0.46, 0.75, 0.2, 0.04);
    c.fill(handle, bevelInk(handle, c.px, 'M', 'A', 'm'), { line: 'm' });
    const head = rotate(box(0.7, 0.16, 0.15, 0.075, 0.015), 0.7, 0.16, Math.PI / 4 - 0.15);
    c.fill(head, bevelInk(head, c.px, 's', 'S', 'n'), { line: 'k' });
  },
};

export const FALA: IconRecipe = {
  plate: {
    halo: [
      [0.28, 'v'],
      [0.44, 'n'],
    ],
    at: [0.38, 0.5],
  },
  draw: (c) => {
    const small = c.size < 32;
    const w = small ? 0.045 : 0.035;
    for (const [k, r] of [0.22, 0.34, 0.46].entries()) {
      if (small && k === 2) continue;
      c.fill(arc(0.4, 0.5, r + 0.1, -0.8, 0.8, w), k === 0 ? 'U' : 'u', { line: small ? undefined : 'v' });
    }
    const lips = ellipse(0.36, 0.52, 0.27, 0.22);
    c.fill(lips, bevelInk(lips, c.px, 't', 'T', 'r'), { line: 'r' });
    const mouth = ellipse(0.36, 0.53, 0.19, small ? 0.13 : 0.14);
    c.fill(mouth, 'b');
    c.fill(minus(mouth, box(0.36, 0.53, 0.3, small ? 0.08 : 0.09)), (_x, y) => (y < 0.53 ? 'w' : 'I'));
    c.fill(minus(ellipse(0.36, 0.63, 0.11, 0.06), box(0.36, 0.53, 0.3, 0.07)), 'R');
    if (small) return;
    for (const x of [0.11, 0.61]) {
      c.fill(circle(x, 0.52, 0.055), 'U', { line: 'v' });
      c.fill(circle(x, 0.52, 0.018), 'b');
    }
  },
};
