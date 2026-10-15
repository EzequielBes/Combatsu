/*
 * Tela de caracteres dos efeitos das armas imbuídas: cada texel guarda uma chave da paleta única ('.' é transparente)
 * e as formas (linha, disco, faixa em arco, polígono) pintam direto nela. No fim, `rows` devolve a grade de texto que o
 * `parseSheet` lê, igual às folhas escritas à mão. Puro, sem `phaser`.
 */
import { TRANSPARENT } from '../../../../core/pixelGrid';

export interface Pt {
  x: number;
  y: number;
}

/** Cor fixa, ou a cor pela distância relativa ao centro (0 no centro, 1 na borda) e o texel; `null` não pinta. */
export type Paint = string | ((d: number, x: number, y: number) => string | null);

/** Cor de um texel de uma faixa: `t` vai da cauda (0) à frente (1) e `u` da borda de dentro (0) à de fora (1). */
export type BandPaint = (t: number, u: number) => string | null;

/** Faixa em arco em volta de (cx, cy), de `a0` a `a1` (radianos de tela, y para baixo), com raios que variam em `t`. */
export interface Band {
  cx: number;
  cy: number;
  a0: number;
  a1: number;
  inner: (t: number) => number;
  outer: (t: number) => number;
  paint: BandPaint;
}

const TAU = Math.PI * 2;

/** Fração do caminho de `a0` a `a1` em que fica o ângulo `ang`, ou `null` fora do arco. */
export function arcT(ang: number, a0: number, a1: number): number | null {
  const span = a1 - a0;
  let d = (ang - a0) % TAU;
  if (span >= 0 && d < 0) d += TAU;
  if (span < 0 && d > 0) d -= TAU;
  const t = d / span;
  return t >= 0 && t <= 1 ? t : null;
}

/** Gerador pseudoaleatório fixo: a mesma semente desenha sempre as mesmas brasas e poeira. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export class FxCanvas {
  readonly w: number;
  readonly h: number;
  private readonly cells: string[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: w * h }, () => TRANSPARENT);
  }

  get(x: number, y: number): string {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return TRANSPARENT;
    return this.cells[cy * this.w + cx];
  }

  set(x: number, y: number, key: string): void {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return;
    this.cells[cy * this.w + cx] = key;
  }

  /** Pinta só onde ainda está transparente (fumaça e poeira atrás do que já foi desenhado). */
  under(x: number, y: number, key: string): void {
    if (this.get(x, y) === TRANSPARENT) this.set(x, y, key);
  }

  /** Linha de 1 texel (Bresenham) entre dois pontos já arredondados. */
  line(x0: number, y0: number, x1: number, y1: number, key: string): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, key);
      if (x === ex && y === ey) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Disco cheio de raio `r` (centro no texel). `paint` recebe a distância relativa ao raio (0 no centro, 1 na borda). */
  disc(cx: number, cy: number, r: number, paint: Paint): void {
    this.ellipse(cx, cy, r, r, paint);
  }

  /** Elipse cheia de raios `rx` e `ry`; `paint` recebe a distância relativa (0 no centro, 1 na borda). */
  ellipse(cx: number, cy: number, rx: number, ry: number, paint: Paint): void {
    const ax = Math.max(rx, 0.5);
    const ay = Math.max(ry, 0.5);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = Math.hypot((x - cx) / ax, (y - cy) / ay);
        if (d > 1 + 0.25 / Math.min(ax, ay)) continue;
        const key = typeof paint === 'string' ? paint : paint(Math.min(d, 1), x, y);
        if (key) this.set(x, y, key);
      }
    }
  }

  /** Faixa em arco: percorre a caixa do anel externo e pinta o que cai entre os dois raios dentro do arco. */
  band(b: Band): void {
    const rMax = Math.max(b.outer(0), b.outer(0.5), b.outer(1)) + 1;
    for (let y = Math.floor(b.cy - rMax); y <= Math.ceil(b.cy + rMax); y++) {
      for (let x = Math.floor(b.cx - rMax); x <= Math.ceil(b.cx + rMax); x++) {
        const t = arcT(Math.atan2(y - b.cy, x - b.cx), b.a0, b.a1);
        if (t === null) continue;
        const r = Math.hypot(x - b.cx, y - b.cy);
        const r0 = b.inner(t);
        const r1 = b.outer(t);
        if (r1 - r0 <= 0 || r < r0 || r > r1) continue;
        const key = b.paint(t, (r - r0) / (r1 - r0));
        if (key) this.set(x, y, key);
      }
    }
  }

  /** Polígono cheio (regra par-ímpar), pelo centro de cada texel. */
  poly(points: readonly Pt[], key: string): void {
    const ys = points.map((p) => p.y);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length];
        if (a.y <= y === b.y <= y) return;
        xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      });
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) this.set(x, y, key);
      }
    }
  }

  /** Carimba uma grade de texto com o canto em (x, y); `swap` troca chaves na hora (a mesma forma, apagada). */
  stamp(x: number, y: number, grid: readonly string[], swap: Readonly<Record<string, string>> = {}): void {
    grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch !== TRANSPARENT) this.set(x + dx, y + dy, swap[ch] ?? ch);
      }),
    );
  }

  /** Sombra de 1 texel: o transparente encostado (em cruz) num texel de `over` vira `key`. */
  rim(key: string, over: string): void {
    const marks: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== TRANSPARENT) continue;
        const near = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (near.some((c) => over.includes(c))) marks.push(y * this.w + x);
      }
    }
    for (const i of marks) this.cells[i] = key;
  }

  rows(): string[] {
    return Array.from({ length: this.h }, (_, y) => this.cells.slice(y * this.w, (y + 1) * this.w).join(''));
  }
}

/** Ponto a `r` texels de (cx, cy) no ângulo `ang`. */
export const polar = (cx: number, cy: number, r: number, ang: number): Pt => ({
  x: cx + Math.cos(ang) * r,
  y: cy + Math.sin(ang) * r,
});

/** Interpolação linear. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Graus para radianos (os arcos ficam legíveis em graus no código). */
export const deg = (d: number): number => (d * Math.PI) / 180;
