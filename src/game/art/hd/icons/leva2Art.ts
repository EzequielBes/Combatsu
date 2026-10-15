/*
 * Símbolos da leva 2 (F41): Convergência (o núcleo de sangue comprimido que dispara o feixe fino), Cães Divinos (a
 * cabeça do cão de sombra com o olho branco), Punho de Trovão (o raio em zigue-zague cortando na frente do punho
 * girado), Erupção (a chama que afina e rompe o chão rachado) e o Domínio Vazio Ilimitado (o disco do céu infinito,
 * azul, com a faixa de galáxia e as estrelas soltas). Puro, sem `phaser`.
 */
import { bevelInk, sphereInk, type IconCanvas } from './canvas';
import { fist } from './hands';
import type { IconRecipe } from './plate';
import { box, circle, poly, rotate, star, stroke, union, type Sdf } from './sdf';

/** Direção do feixe da Convergência: para cima e para a direita. */
const BEAM = -Math.PI / 4;

export const CONVERGENCIA: IconRecipe = {
  plate: {
    halo: [
      [0.24, 'r'],
      [0.4, 'v'],
    ],
    at: [0.3, 0.7],
  },
  draw: (c) => {
    const small = c.size < 32;
    const [cx, cy] = [0.3, 0.7];
    const r = small ? 0.14 : 0.12;
    // O feixe sai do lampejo com um vão visível até o núcleo e atravessa a placa até a borda.
    const [ux, uy] = [Math.cos(BEAM), Math.sin(BEAM)];
    const from = r + (small ? 0.11 : 0.1);
    const beam = stroke(cx + ux * from, cy + uy * from, 1.02, -0.02, small ? 0.06 : 0.035, small ? 0.045 : 0.022);
    c.fill(beam, 'R', { line: 't' });
    if (!small) c.fill(stroke(cx + ux * (from + 0.02), cy + uy * (from + 0.02), 1, 0, 0.01, 0.006), 'W');
    // O lampejo em estrela atrás do núcleo, chapado e um pouco torto (em cruz reta, com a bola, lia como mira), sem
    // ponta na direção do feixe, para o vão aparecer.
    c.fill(star(cx, cy, 4, r * 1.9, r * 0.6, 0.22), 'T');
    c.fill(circle(cx, cy, r), sphereInk(cx - 0.01, cy - 0.01, r, ['t', 'R', 'T', 'W', 'W']), { line: 't' });
  },
};

/** Cabeça de cão de perfil, focinho para a direita, orelhas em pé. */
const DOG_HEAD = poly([
  [0.3, 0.1],
  [0.44, 0.3],
  [0.5, 0.12],
  [0.6, 0.34],
  [0.74, 0.42],
  [0.9, 0.52],
  [0.9, 0.6],
  [0.78, 0.64],
  [0.86, 0.7],
  [0.62, 0.72],
  [0.6, 0.92],
  [0.2, 0.92],
  [0.24, 0.6],
  [0.2, 0.4],
]);

export const CAES: IconRecipe = {
  plate: {
    halo: [
      [0.36, 's'],
      [0.46, 'N'],
    ],
    at: [0.5, 0.5],
  },
  draw: (c) => {
    const small = c.size < 32;
    // Preto chapado com a luz fria da lua na borda de cima: a silhueta lê sobre a placa escura.
    c.fill(DOG_HEAD, bevelInk(DOG_HEAD, c.px, 'b', 'y', 'b', 1));
    // A boca entreaberta, com os dentes brancos, e o olho em fenda branca puxada para trás.
    c.fill(stroke(0.64, 0.66, 0.84, 0.62, small ? 0.02 : 0.014), 'r');
    if (!small)
      for (const x of [0.72, 0.8])
        c.fill(
          poly([
            [x - 0.02, 0.63],
            [x + 0.02, 0.625],
            [x, 0.67],
          ]),
          'W',
        );
    c.fill(stroke(0.52, 0.4, 0.64, 0.44, small ? 0.035 : 0.025, small ? 0.03 : 0.012), 'W');
  },
};

/** Raio em zigue-zague pelos pontos dados, afinando do primeiro ao último. */
function bolt(pts: readonly (readonly [number, number])[], w0: number, w1: number): Sdf {
  const parts: Sdf[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const t0 = k / (pts.length - 1);
    const t1 = (k + 1) / (pts.length - 1);
    parts.push(stroke(...pts[k], ...pts[k + 1], w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1));
  }
  return union(...parts);
}

/** O raio grande do Trovão, de cima à direita até embaixo à esquerda, cortando na frente do punho. */
const BOLT = [
  [0.94, 0.04],
  [0.58, 0.4],
  [0.74, 0.46],
  [0.3, 0.8],
  [0.44, 0.83],
  [0.06, 0.98],
] as const;

export const TROVAO: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'd'],
      [0.44, 'n'],
    ],
    at: [0.5, 0.52],
  },
  draw: (c) => {
    const small = c.size < 32;
    // O punho menor, girado socando para cima e à direita (a direção do raio), e o raio por cima cortando a forma
    // dele: a silhueta é o zigue-zague, não o punho de frente do Divergente.
    fist(c, 0.4, 0.5, small ? 0.42 : 0.36, ['q', 'P', 'p', 'w'], small ? 0.3 : 0.62);
    c.fill(bolt(BOLT, small ? 0.08 : 0.07, small ? 0.035 : 0.02), 'C', { line: 'c' });
    if (!small) c.fill(bolt(BOLT, 0.022, 0.006), 'W');
    // As faíscas que saltam do punho carregado.
    if (small) return;
    for (const [x, y, r] of [
      [0.84, 0.66, 0.08],
      [0.16, 0.2, 0.06],
    ] as const)
      c.fill(star(x, y, 4, r, r * 0.28), 'W');
  },
};

/**
 * Chama de (cx, base) até `top`: afina para cima, com as línguas na borda dos dois lados (dentes virados para cima e
 * para fora, desencontrados entre os lados) e a ponta torta. Os vãos entre as línguas ficam abertos para fora: língua
 * solta por cima do corpo deixava fenda estreita, que o contorno escurecia no meio da chama.
 */
function flame(cx: number, base: number, top: number, w: number): Sdf {
  const n = 7;
  const side = (dir: number, lick: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
      const t = i / n;
      const hw = w * (1 - 0.74 * t);
      const tooth = i > 0 && i % 2 === lick;
      return [cx + dir * (tooth ? hw + w * 0.3 : hw * 0.82), base - (base - top) * t - (tooth ? 0.05 : 0)];
    });
  return poly([...side(1, 1), [cx + w * 0.18, top], ...side(-1, 0).reverse()]);
}

/** A rachadura escura de uma laje do chão (`k` = -1 à esquerda, 1 à direita). */
function crack(k: number, px: number, small: boolean): Sdf {
  if (small) return stroke(0.5 + k * 0.2, 0.79, 0.5 + k * 0.36, 0.86, px * 0.5);
  return union(
    stroke(0.5 + k * 0.17, 0.78, 0.5 + k * 0.26, 0.83, px * 0.6),
    stroke(0.5 + k * 0.26, 0.83, 0.5 + k * 0.32, 0.81, px * 0.6),
    stroke(0.5 + k * 0.32, 0.81, 0.5 + k * 0.42, 0.9, px * 0.6),
  );
}

export const ERUPCAO: IconRecipe = {
  plate: {
    halo: [
      [0.28, 'a'],
      [0.44, 'r'],
    ],
    at: [0.5, 0.42],
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(flame(0.5, 0.86, 0.08, 0.22), 'a', { line: small ? undefined : 'r' });
    c.fill(flame(0.5, 0.86, 0.32, 0.11), 'A');
    // O núcleo mais claro na base, onde o fogo sai do chão.
    c.fill(union(circle(0.5, 0.8, small ? 0.09 : 0.08), stroke(0.5, 0.8, 0.5, 0.6, 0.035, 0.008)), 'w');
    // O chão que racha: duas lajes erguidas em V de cada lado da boca do fogo, com a rachadura escura.
    for (const k of [-1, 1]) {
      const slab = poly([
        [0.5 + k * 0.5, 0.8],
        [0.5 + k * 0.14, 0.7],
        [0.5 + k * 0.1, 0.86],
        [0.5 + k * 0.5, 0.98],
      ]);
      c.fill(slab, bevelInk(slab, c.px, 's', 'S', 'n', 1), { line: small ? undefined : 'n' });
      c.fill(crack(k, c.px, small), 'k');
      // As lascas que voam, só no grande: pequenas e soltas, no alto.
      if (small) continue;
      const [rx, ry] = [0.5 + k * 0.3, k < 0 ? 0.2 : 0.3];
      const chip = rotate(box(rx, ry, 0.035, 0.026, 0.006), rx, ry, k * 0.6);
      c.fill(chip, bevelInk(chip, c.px, 'S', 'I', 's', 1), { line: 'n' });
    }
  },
};

/** Tom do céu do Vazio: a faixa de galáxia em diagonal (ciano pontilhado no eixo, azul em volta) sobre o fundo. */
function skyInk(px: number, small: boolean): (x: number, y: number) => string {
  const [sn, cs] = [Math.sin(-0.62), Math.cos(-0.62)];
  const k = small ? 1.6 : 1;
  return (x, y) => {
    const t = Math.abs(-(x - 0.5) * sn + (y - 0.52) * cs);
    const odd = (Math.floor(x / px) + Math.floor(y / px)) % 2 === 1;
    if (t < 0.03 * k) return odd ? 'c' : 'd';
    if (t < 0.075 * k) return 'd';
    if (t < 0.11 * k) return odd ? 'd' : 'E';
    return Math.hypot(x - 0.5, y - 0.5) < 0.27 ? 'E' : 'e';
  };
}

/** Estrelas soltas do Vazio no ícone grande, fora de qualquer anel e de tamanhos diferentes: `[x, y, raio, cor]`. */
const SKY_STARS = [
  [0.64, 0.64, 0.07, 'C'],
  [0.66, 0.3, 0.045, 'C'],
  [0.28, 0.62, 0.035, 'W'],
] as const;

/** Pontos de 1 texel do céu no ícone grande: `[x, y, cor]`. */
const SKY_DOTS = [
  [0.48, 0.74, 'W'],
  [0.76, 0.48, 'W'],
  [0.54, 0.46, 'C'],
  [0.4, 0.24, 'W'],
  [0.3, 0.46, 'C'],
  [0.7, 0.76, 'W'],
] as const;

/** Pontos do céu no ícone pequeno. */
const SMALL_DOTS = [
  [0.66, 0.64, 'C'],
  [0.64, 0.3, 'W'],
  [0.3, 0.64, 'C'],
  [0.5, 0.74, 'W'],
  [0.74, 0.46, 'W'],
] as const;

/** Pontos de 1 texel, presos ao centro do texel (a estrela em campo de distância vira risco nesse tamanho). */
function dots(c: IconCanvas, pts: readonly (readonly [number, number, string])[]): void {
  const p = c.px;
  const snap = (v: number): number => (Math.floor(v / p) + 0.5) * p;
  for (const [x, y, key] of pts) c.fill(box(snap(x), snap(y), p * 0.4, p * 0.4), key);
}

export const VAZIO: IconRecipe = {
  plate: {
    halo: [
      [0.38, 'd'],
      [0.46, 'n'],
    ],
    domain: true,
  },
  draw: (c) => {
    const small = c.size < 32;
    const p = c.px;
    c.fill(circle(0.5, 0.5, 0.36), skyInk(p, small), { line: 'd' });
    if (small) {
      // No pequeno, texel a texel: a estrela grande em cruz fora do centro e os pontos soltos.
      const s = (Math.floor(0.36 / p) + 0.5) * p;
      c.fill(union(box(s, s, p * 0.4, p * 1.4), box(s, s, p * 1.4, p * 0.4)), 'W');
      return dots(c, SMALL_DOTS);
    }
    for (const [x, y, r, key] of SKY_STARS) c.fill(star(x, y, 4, r, r * 0.3), key);
    dots(c, SKY_DOTS);
    c.fill(star(0.37, 0.37, 4, 0.13, 0.032), 'W', { line: 'C' });
  },
};
