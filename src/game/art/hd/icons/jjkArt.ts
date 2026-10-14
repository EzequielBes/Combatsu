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
      [0.3, 'a'],
      [0.44, 'z'],
    ],
    at: [0.5, 0.36],
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(star(0.5, 0.42, 4, 0.5, small ? 0.14 : 0.11, -Math.PI / 4), 'A', { line: small ? undefined : 'z' });
    c.fill(star(0.5, 0.42, 4, 0.3, 0.07, -Math.PI / 2), 'w');
    palm(c, 0.54, 0.66, 0.42, ['q', 'P', 'p', 'w']);
  },
};

/** Prego de cabeça chata, da cabeça em (hx, hy) até a ponta em (tx, ty), em aço com chanfro. */
function nail(c: Parameters<IconRecipe['draw']>[0], hx: number, hy: number, tx: number, ty: number): void {
  const ang = Math.atan2(ty - hy, tx - hx);
  const small = c.size < 32;
  const shaft = stroke(hx, hy, tx, ty, small ? 0.07 : 0.06, 0.008);
  c.fill(shaft, bevelInk(shaft, c.px, 'I', 'W', 'S', 1), { line: small ? undefined : 'n' });
  const head = rotate(box(hx, hy, small ? 0.05 : 0.045, small ? 0.16 : 0.15, 0.015), hx, hy, ang);
  c.fill(head, bevelInk(head, c.px, 'S', 'W', 's', 1), { line: small ? undefined : 'n' });
}

/** Martelo inclinado com a cabeça centrada em (cx, cy), a face batendo embaixo à esquerda e o cabo de madeira. */
function hammer(c: Parameters<IconRecipe['draw']>[0], cx: number, cy: number): void {
  const small = c.size < 32;
  const tilt = -0.45;
  const [nx, ny] = [-Math.sin(tilt), Math.cos(tilt)];
  const handle = stroke(cx, cy, cx + nx * 0.58, cy + ny * 0.58, small ? 0.06 : 0.05, small ? 0.06 : 0.045);
  c.fill(handle, bevelInk(handle, c.px, 'M', 'A', 'm', 1), { line: small ? undefined : 'm' });
  const head = rotate(box(cx, cy, 0.22, small ? 0.1 : 0.09, 0.02), cx, cy, tilt);
  c.fill(head, bevelInk(head, c.px, 's', 'S', 'n', small ? 1 : 1.5), { line: small ? undefined : 'k' });
  // A face que bate, mais clara: o lado do martelo que encosta no prego.
  const face = rotate(box(cx - 0.19, cy, 0.03, small ? 0.1 : 0.09, 0.01), cx, cy, tilt);
  c.fill(face, small ? 'S' : 'I', { line: small ? undefined : 'k' });
}

export const RESSONANCIA: IconRecipe = {
  plate: {
    halo: [
      [0.24, 'd'],
      [0.42, 'n'],
    ],
    at: [0.345, 0.43],
  },
  draw: (c) => {
    const small = c.size < 32;
    // A batida entre a face do martelo e a cabeça do prego: é o instante que ecoa no alvo.
    c.fill(star(0.345, 0.43, small ? 4 : 8, small ? 0.18 : 0.16, small ? 0.06 : 0.07, -Math.PI / 4), 'C', {
      line: small ? undefined : 'c',
    });
    hammer(c, 0.53, 0.27);
    nail(c, 0.33, 0.52, 0.24, 0.9);
    if (!small) c.fill(star(0.345, 0.43, 4, 0.09, 0.03), 'W');
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
