/*
 * Símbolos das 5 técnicas que o jogo já tem: Vermelho (esfera que expulsa), Azul (esfera que suga), Vazio Roxo
 * (esfera roxa entre o arco vermelho e o azul), Punho Divergente (punho fechado com a chama azul atrasada) e
 * Desmantelar (três cortes brancos). Cada receita desenha no espaço 0 a 1 e decide os detalhes pelo tamanho:
 * abaixo de 32 texels sai o que viraria ruído. Puro, sem `phaser`.
 */
import { bevelInk, sphereInk } from './canvas';
import { fist } from './hands';
import type { IconRecipe } from './plate';
import { box, circle, poly, slash, spiral, stroke, union, type Sdf } from './sdf';

const TAU = Math.PI * 2;

/** Raio de `n` pontas em volta de (cx, cy), do raio `r0` ao `r1`, com meia largura `w` na base. */
function rays(cx: number, cy: number, n: number, r0: number, r1: number, w: number, a0 = 0): Sdf {
  const parts: Sdf[] = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n;
    const long = k % 2 === 0 ? 1 : 0.72;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const tip = r0 + (r1 - r0) * long;
    parts.push(
      poly([
        [cx + ux * r0 - uy * w, cy + uy * r0 + ux * w],
        [cx + ux * tip, cy + uy * tip],
        [cx + ux * r0 + uy * w, cy + uy * r0 - ux * w],
      ]),
    );
  }
  return union(...parts);
}

export const VERMELHO: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'r'],
      [0.4, 'v'],
    ],
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(rays(0.5, 0.5, 8, 0.2, small ? 0.47 : 0.45, small ? 0.07 : 0.06, -Math.PI / 8), 'R', { line: 't' });
    c.fill(circle(0.5, 0.5, 0.215), sphereInk(0.5, 0.5, 0.215, ['t', 'R', 'R', 'T', 'W']));
  },
};

export const AZUL: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'd'],
      [0.42, 'n'],
    ],
  },
  draw: (c) => {
    const small = c.size < 32;
    const w = small ? 0.045 : 0.032;
    for (let k = 0; k < 3; k++) {
      const a = (k * TAU) / 3 - 0.4;
      c.fill(spiral(0.5, 0.5, 0.44, 0.2, a, a + 2.2, 0.006, w), 'c', { line: small ? undefined : 'd' });
    }
    c.fill(circle(0.5, 0.5, 0.2), sphereInk(0.5, 0.5, 0.2, ['d', 'c', 'c', 'C', 'W']));
  },
};

export const ROXO: IconRecipe = {
  plate: {
    halo: [
      [0.32, 'v'],
      [0.44, 'n'],
    ],
  },
  draw: (c) => {
    const small = c.size < 32;
    const w = small ? 0.055 : 0.05;
    c.fill(spiral(0.5, 0.5, 0.36, 0.33, 2.3, 4.5, 0.008, w, 16), 'R', { line: small ? undefined : 't' });
    c.fill(spiral(0.5, 0.5, 0.36, 0.33, -0.85, 1.35, 0.008, w, 16), 'C', { line: small ? undefined : 'c' });
    c.fill(circle(0.5, 0.5, 0.25), sphereInk(0.5, 0.5, 0.25, ['v', 'u', 'u', 'U', 'W']));
  },
};

/** Língua de chama subindo de (x, y) até `h` acima, com meia largura `w` na base. */
const tongue = (x: number, y: number, h: number, w: number, lean = 0): Sdf =>
  union(circle(x, y, w), stroke(x, y, x + lean, y - h, w, 0.004));

export const DIVERGENTE: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'd'],
      [0.44, 'n'],
    ],
    at: [0.5, 0.46],
  },
  draw: (c) => {
    const flame = union(
      tongue(0.2, 0.6, 0.4, 0.1, -0.05),
      tongue(0.38, 0.4, 0.34, 0.12, -0.02),
      tongue(0.62, 0.4, 0.36, 0.12, 0.02),
      tongue(0.8, 0.6, 0.36, 0.1, 0.05),
      box(0.5, 0.66, 0.33, 0.2, 0.12),
    );
    c.fill(flame, 'c');
    c.fill(
      union(tongue(0.38, 0.42, 0.22, 0.07), tongue(0.62, 0.42, 0.24, 0.07, 0.02), box(0.5, 0.62, 0.26, 0.16)),
      'C',
    );
    const cuff = box(0.53, 0.95, 0.17, 0.12);
    c.fill(cuff, bevelInk(cuff, c.px, 'N', 's', 'n'), { line: 'n' });
    fist(c, 0.53, 0.6, 0.5, ['q', 'P', 'p', 'w']);
  },
};

export const CORTE: IconRecipe = {
  plate: {
    halo: [
      [0.22, 'v'],
      [0.4, 'r'],
    ],
  },
  draw: (c) => {
    const small = c.size < 32;
    const w = small ? 0.06 : 0.045;
    const cuts = [-0.18, 0, 0.18].map((o) => slash(0.84 + o, 0.12 + o, 0.16 + o, 0.88 + o, w, 0.05));
    c.fill(union(...cuts), 'W', { line: small ? undefined : 'R' });
  },
};
