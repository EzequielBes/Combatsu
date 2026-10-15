/*
 * Símbolos da leva 2 (F41): Convergência (a gota de sangue comprimida que vira o feixe fino), Cães Divinos (a cabeça
 * do cão de sombra com o olho branco), Punho de Trovão (o punho atravessado pelo raio em zigue-zague), Erupção (o
 * pilar de fogo que rompe o chão) e o Domínio Vazio Ilimitado (o disco do vazio com o círculo de estrelas). Puro, sem
 * `phaser`.
 */
import { bandsInk, bevelInk, sphereInk, type IconCanvas } from './canvas';
import { fist } from './hands';
import type { IconRecipe } from './plate';
import { arc, box, circle, poly, rotate, star, stroke, union, type Sdf } from './sdf';

const TAU = Math.PI * 2;

/** Gota de raio `r` em (cx, cy) com a ponta a `2r` do centro, no ângulo `ang`. */
function drop(cx: number, cy: number, r: number, ang: number): Sdf {
  const [ux, uy] = [Math.cos(ang), Math.sin(ang)];
  const [nx, ny] = [-uy, ux];
  const side = (k: number): [number, number] => [
    cx + nx * r * 0.86 * k + ux * r * 0.5,
    cy + ny * r * 0.86 * k + uy * r * 0.5,
  ];
  return union(circle(cx, cy, r), poly([side(1), [cx + ux * r * 2.1, cy + uy * r * 2.1], side(-1)]));
}

export const CONVERGENCIA: IconRecipe = {
  plate: {
    halo: [
      [0.26, 'r'],
      [0.42, 'v'],
    ],
    at: [0.34, 0.64],
  },
  draw: (c) => {
    const small = c.size < 32;
    // Os anéis da compressão em volta da gota, abertos do lado do feixe.
    for (const r of small ? [0.27] : [0.26, 0.33])
      c.fill(arc(0.34, 0.64, r, -0.2, 4.5, small ? 0.03 : 0.022), 't', { line: small ? undefined : 'r' });
    c.fill(stroke(0.42, 0.56, 0.92, 0.08, small ? 0.05 : 0.04, small ? 0.03 : 0.015), 'R', { line: 't' });
    if (!small) c.fill(stroke(0.44, 0.54, 0.88, 0.12, 0.012, 0.004), 'W');
    const blood = drop(0.34, 0.64, 0.17, -Math.PI / 4);
    c.fill(blood, sphereInk(0.32, 0.66, 0.2, ['t', 'R', 'R', 'T', 'W']), { line: small ? undefined : 'r' });
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
    // A sombra que escorre do pescoço, em línguas.
    for (const [x, h] of [
      [0.28, 0.1],
      [0.4, 0.06],
      [0.52, 0.09],
    ])
      c.fill(stroke(x, 0.9, x - 0.03, 0.9 + h, small ? 0.05 : 0.04, 0.005), 'b');
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

/** O raio grande do Trovão, de cima à direita até embaixo à esquerda, passando atrás do punho. */
const BOLT = [
  [0.92, 0.04],
  [0.6, 0.34],
  [0.76, 0.4],
  [0.36, 0.72],
  [0.52, 0.76],
  [0.08, 0.97],
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
    c.fill(bolt(BOLT, small ? 0.075 : 0.065, small ? 0.03 : 0.02), 'C', { line: 'c' });
    if (!small) c.fill(bolt(BOLT, 0.02, 0.006), 'W');
    fist(c, 0.48, 0.56, small ? 0.46 : 0.42, ['q', 'P', 'p', 'w']);
    // As faíscas que saltam do punho carregado.
    if (small) return;
    for (const [x, y, r] of [
      [0.17, 0.27, 0.09],
      [0.86, 0.68, 0.07],
      [0.22, 0.84, 0.05],
    ] as const)
      c.fill(star(x, y, 4, r, r * 0.28), 'W');
  },
};

/** Pilar de fogo de (cx, base) até `top`, com a meia largura `w`, o leque na base e as línguas da ponta. */
function pillar(cx: number, base: number, top: number, w: number): Sdf {
  const tongues = [-0.85, -0.4, 0.05, 0.5, 0.9].map((t, k) =>
    stroke(cx + t * w * 0.7, top + 0.1, cx + t * w, top - (k % 2 === 0 ? 0.08 : 0.02), w * 0.34, 0.004),
  );
  const flare = poly([
    [cx - w * 1.5, base],
    [cx + w * 1.5, base],
    [cx + w, base - 0.14],
    [cx - w, base - 0.14],
  ]);
  return union(box(cx, (base + top) / 2 + 0.05, w, (base - top) / 2 - 0.05, w * 0.3), flare, ...tongues);
}

export const ERUPCAO: IconRecipe = {
  plate: {
    halo: [
      [0.28, 'a'],
      [0.44, 'r'],
    ],
    at: [0.5, 0.4],
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(pillar(0.5, 0.86, 0.16, 0.19), 'a', { line: small ? undefined : 'r' });
    c.fill(pillar(0.5, 0.86, 0.26, 0.1), 'A');
    if (!small) c.fill(box(0.5, 0.6, 0.035, 0.22, 0.03), 'w');
    // O chão que racha: duas lajes erguidas em V de cada lado da boca do fogo, e as lascas que voam.
    for (const k of [-1, 1]) {
      const slab = poly([
        [0.5 + k * 0.48, 0.84],
        [0.5 + k * 0.16, 0.76],
        [0.5 + k * 0.12, 0.86],
        [0.5 + k * 0.48, 0.98],
      ]);
      c.fill(slab, bevelInk(slab, c.px, 's', 'S', 'n', 1), { line: small ? undefined : 'n' });
      const [rx, ry] = [0.5 + k * (small ? 0.34 : 0.33), small ? 0.5 : 0.44 - k * 0.1];
      const chip = rotate(box(rx, ry, small ? 0.07 : 0.06, small ? 0.055 : 0.045, 0.01), rx, ry, k * 0.6);
      c.fill(chip, bevelInk(chip, c.px, 'S', 'I', 's', 1), { line: small ? undefined : 'n' });
    }
  },
};

/** Círculo de `n` estrelas de 4 pontas de raio `r` em volta do meio, a primeira em cima; as ímpares, pontos roxos. */
function starRing(c: IconCanvas, r: number, n: number, size: number): void {
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k * TAU) / n;
    const s = k % 2 === 1 ? size * 0.55 : size;
    c.fill(star(0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a), 4, s, s * 0.3), k % 2 === 1 ? 'U' : 'W');
  }
}

/**
 * O céu do Vazio no ícone pequeno, texel a texel: a estrela do meio em cruz fina de 2 texels com o miolo roxo e 6 estrelas de 1 texel no
 * círculo, presas ao centro do texel (a estrela em campo de distância vira risco ou quadrado nesse tamanho).
 */
function smallSky(c: IconCanvas): void {
  const p = c.px;
  c.fill(union(box(0.5, 0.5, p, 4 * p), box(0.5, 0.5, 4 * p, p)), 'W');
  c.fill(box(0.5, 0.5, p, p), 'U');
  const snap = (v: number): number => (Math.floor(v / p) + 0.5) * p;
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * TAU) / 6;
    c.fill(circle(snap(0.5 + 0.24 * Math.cos(a)), snap(0.5 + 0.24 * Math.sin(a)), p * 0.6), k % 2 ? 'U' : 'W');
  }
}

export const VAZIO: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'v'],
      [0.44, 'n'],
    ],
    domain: true,
  },
  draw: (c) => {
    const small = c.size < 32;
    c.fill(
      circle(0.5, 0.5, 0.35),
      bandsInk(0.5, 0.5, [
        [0.14, 'k'],
        [0.26, 'e'],
        [0.4, 'E'],
      ]),
      { line: 'U' },
    );
    if (!small) for (const a0 of [0.3, 3.44]) c.fill(arc(0.5, 0.5, 0.3, a0, a0 + 1.6, 0.012), 'u');
    if (small) return smallSky(c);
    starRing(c, 0.235, 8, 0.085);
    c.fill(star(0.5, 0.5, 4, 0.16, 0.045), 'W', { line: 'U' });
  },
};
