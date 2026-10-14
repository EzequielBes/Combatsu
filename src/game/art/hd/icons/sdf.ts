/*
 * Formas dos ícones HD como campos de distância com sinal, no espaço do ícone (0 a 1 nos dois eixos, y para baixo):
 * negativo dentro, positivo fora, em unidades do ícone. Distância de verdade (não só dentro/fora) deixa o traço
 * interno e o chanfro com a mesma espessura em qualquer tamanho do ícone. Puro, sem `phaser`.
 */

/** Distância com sinal até a forma no ponto (x, y). */
export type Sdf = (x: number, y: number) => number;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const circle =
  (cx: number, cy: number, r: number): Sdf =>
  (x, y) =>
    Math.hypot(x - cx, y - cy) - r;

/** Elipse (distância aproximada, boa perto da borda). */
export const ellipse =
  (cx: number, cy: number, rx: number, ry: number): Sdf =>
  (x, y) =>
    (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);

/** Retângulo de meia largura `hw` e meia altura `hh`, com cantos de raio `round`. */
export const box =
  (cx: number, cy: number, hw: number, hh: number, round = 0): Sdf =>
  (x, y) => {
    const dx = Math.abs(x - cx) - hw + round;
    const dy = Math.abs(y - cy) - hh + round;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - round;
  };

/** Traço de `a` a `b` com raio `ra` na ponta `a` e `rb` na ponta `b` (afinado quando diferentes). */
export const stroke =
  (ax: number, ay: number, bx: number, by: number, ra: number, rb = ra): Sdf =>
  (x, y) => {
    const vx = bx - ax;
    const vy = by - ay;
    const t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1));
    return Math.hypot(x - ax - vx * t, y - ay - vy * t) - (ra + (rb - ra) * t);
  };

/** Polígono fechado (distância exata), pontos em qualquer sentido. */
export const poly =
  (pts: readonly (readonly [number, number])[]): Sdf =>
  (x, y) => {
    let d = Infinity;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j];
      const [bx, by] = pts[i];
      const vx = bx - ax;
      const vy = by - ay;
      const t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1));
      d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t));
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside ? -d : d;
  };

/**
 * Arco de raio `r` e meia espessura `w`, do ângulo `a0` ao `a1` (radianos, sentido horário na tela, 0 = direita),
 * com as pontas arredondadas.
 */
export const arc =
  (cx: number, cy: number, r: number, a0: number, a1: number, w: number): Sdf =>
  (x, y) => {
    const span = a1 - a0;
    let a = Math.atan2(y - cy, x - cx) - a0;
    a -= Math.floor(a / (2 * Math.PI)) * 2 * Math.PI;
    if (a <= span) return Math.abs(Math.hypot(x - cx, y - cy) - r) - w;
    const end = (ang: number): number => Math.hypot(x - cx - r * Math.cos(ang), y - cy - r * Math.sin(ang));
    return Math.min(end(a0), end(a1)) - w;
  };

export const union =
  (...s: Sdf[]): Sdf =>
  (x, y) => {
    let d = Infinity;
    for (const f of s) d = Math.min(d, f(x, y));
    return d;
  };

/** `a` sem `b`. */
export const minus =
  (a: Sdf, b: Sdf): Sdf =>
  (x, y) =>
    Math.max(a(x, y), -b(x, y));

export const inter =
  (a: Sdf, b: Sdf): Sdf =>
  (x, y) =>
    Math.max(a(x, y), b(x, y));

/** A forma girada de `ang` radianos em volta de (cx, cy). */
export const rotate = (s: Sdf, cx: number, cy: number, ang: number): Sdf => {
  const c = Math.cos(-ang);
  const n = Math.sin(-ang);
  return (x, y) => s(cx + (x - cx) * c - (y - cy) * n, cy + (x - cx) * n + (y - cy) * c);
};

/** Estrela de `n` pontas: raio `ro` nas pontas e `ri` nos vales, a primeira ponta no ângulo `a0`. */
export const star = (cx: number, cy: number, n: number, ro: number, ri: number, a0 = -Math.PI / 2): Sdf => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = a0 + (i * Math.PI) / n;
    const r = i % 2 === 0 ? ro : ri;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(pts);
};

/**
 * Espiral de (cx, cy): o raio vai de `r0` a `r1` enquanto o ângulo anda de `a0` a `a1`, e a espessura (meia) vai de
 * `w0` a `w1`. Feita de `n` traços curtos.
 */
export const spiral = (
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  w0: number,
  w1: number,
  n = 24,
): Sdf => {
  const at = (k: number): [number, number, number] => {
    const t = k / n;
    const a = a0 + (a1 - a0) * t;
    const r = r0 + (r1 - r0) * t;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), w0 + (w1 - w0) * t];
  };
  const parts: Sdf[] = [];
  for (let k = 0; k < n; k++) {
    const [ax, ay, wa] = at(k);
    const [bx, by, wb] = at(k + 1);
    parts.push(stroke(ax, ay, bx, by, wa, wb));
  }
  return union(...parts);
};

/** Corte em lâmina: fino nas pontas e com meia espessura `w` no meio, de `a` a `b`, curvado de `bend` para o lado. */
export const slash = (ax: number, ay: number, bx: number, by: number, w: number, bend = 0, tip = 0.004): Sdf => {
  const mx = (ax + bx) / 2 - (by - ay) * bend;
  const my = (ay + by) / 2 + (bx - ax) * bend;
  return union(stroke(ax, ay, mx, my, tip, w), stroke(mx, my, bx, by, w, tip));
};
