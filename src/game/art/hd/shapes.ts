/*
 * Formas do rasterizador HD: membro com perfil (o raio muda ao longo do osso e de um lado para o outro, para dar
 * bíceps, panturrilha e coxa), elipse, triângulo e formas num sistema local (frente, cima). Puro, sem `phaser`.
 */
import type { Vec2 } from '../rig/skeleton';
import type { Bounds, Normal, Shape } from './raster';

/** Perfil de um membro: pontos `[t, raio do lado +, raio do lado -]` com `t` de 0 (raiz) a 1 (ponta). */
export type Profile = readonly (readonly [number, number, number])[];

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Raios dos dois lados em `t`, interpolados com suavização entre os pontos do perfil. */
export function radiusAt(prof: Profile, t: number): [number, number] {
  if (t <= prof[0][0]) return [prof[0][1], prof[0][2]];
  for (let i = 1; i < prof.length; i++) {
    const a = prof[i - 1];
    const b = prof[i];
    if (t > b[0]) continue;
    const k = smooth((t - a[0]) / (b[0] - a[0]));
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  const last = prof[prof.length - 1];
  return [last[1], last[2]];
}

const dome = (ox: number, oy: number): Normal | null => {
  const q = ox * ox + oy * oy;
  return q > 1 ? null : { x: ox, y: oy, z: Math.sqrt(1 - q) };
};

/**
 * Membro de `a` a `b` com o perfil dado. O lado + é o da normal à esquerda do sentido do osso: num membro pendurado
 * (para baixo) é o lado de trás, e continua sendo o mesmo lado anatômico quando o membro gira.
 */
export function limb(a: Vec2, b: Vec2, prof: Profile): Shape {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
  const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const p = { x: -d.y, y: d.x };
  const cap = (x: number, y: number, end: Vec2, t: number): Normal | null => {
    const [rp, rm] = radiusAt(prof, t);
    const r = (rp + rm) / 2;
    const shift = (rp - rm) / 2;
    return dome((x - end.x - p.x * shift) / r, (y - end.y - p.y * shift) / r);
  };
  const shape: Shape = (x, y) => {
    const rx = x - a.x;
    const ry = y - a.y;
    const t = (rx * d.x + ry * d.y) / len;
    if (t < 0) return at(cap(x, y, a, 0), 0);
    if (t > 1) return at(cap(x, y, b, 1), 1);
    const s = rx * p.x + ry * p.y;
    const [rp, rm] = radiusAt(prof, t);
    const o = s / (s >= 0 ? rp : rm);
    return Math.abs(o) > 1 ? null : { x: p.x * o, y: p.y * o, z: Math.sqrt(1 - o * o), t, s: o };
  };
  const r = Math.max(...prof.map((q) => Math.max(q[1], q[2]))) + 1;
  shape.bounds = {
    x0: Math.min(a.x, b.x) - r,
    y0: Math.min(a.y, b.y) - r,
    x1: Math.max(a.x, b.x) + r,
    y1: Math.max(a.y, b.y) + r,
  };
  return shape;
}

const at = (n: Normal | null, t: number): Normal | null => (n ? { ...n, t } : null);

/** Ajusta a luz ao longo de um membro: `fn(t, s)` (posição no osso e lado) devolve o que somar à normal naquele ponto (tom, sem recorte). */
export function along(shape: Shape, fn: (t: number, s: number) => { dt?: number; noRim?: boolean }): Shape {
  const out: Shape = (x, y) => {
    const n = shape(x, y);
    return n ? { ...n, ...fn(n.t ?? 0, n.s ?? 0) } : null;
  };
  out.bounds = shape.bounds;
  return out;
}

/** Elipse de centro `c` e raios `rx`, `ry`. */
export function ellipse(c: Vec2, rx: number, ry: number): Shape {
  const shape: Shape = (x, y) => dome((x - c.x) / rx, (y - c.y) / ry);
  shape.bounds = { x0: c.x - rx, y0: c.y - ry, x1: c.x + rx, y1: c.y + ry };
  return shape;
}

/** Sistema local: origem, vetor "cima" e vetor "frente" (unitários, em coordenadas de tela). */
export interface Local {
  o: Vec2;
  up: Vec2;
  fwd: Vec2;
}

/** Sistema local com a frente à direita do "cima" (o player olha para a direita). */
export function localOf(o: Vec2, up: Vec2): Local {
  return { o, up, fwd: { x: -up.y, y: up.x } };
}

/** Ponto local (frente, cima) em coordenadas de tela. */
export const toScreen = (l: Local, f: number, u: number): Vec2 => ({
  x: l.o.x + l.fwd.x * f + l.up.x * u,
  y: l.o.y + l.fwd.y * f + l.up.y * u,
});

/** Caixa local `[f0, f1, u0, u1]` que contém a forma. */
export type LocalBox = readonly [number, number, number, number];

/** Forma no sistema local: normal local (x = frente, y = cima, z = para a câmera) ou `null`. */
export type LocalShape = ((f: number, u: number) => Normal | null) & { box?: LocalBox };

/** Marca a caixa local de uma forma escrita à mão, para a pintura não percorrer o frame inteiro. */
export function boxed(fn: (f: number, u: number) => Normal | null, box: LocalBox): LocalShape {
  const out: LocalShape = fn;
  out.box = box;
  return out;
}

function screenBounds(l: Local, [f0, f1, u0, u1]: LocalBox): Bounds {
  const pts = [toScreen(l, f0, u0), toScreen(l, f0, u1), toScreen(l, f1, u0), toScreen(l, f1, u1)];
  return {
    x0: Math.min(...pts.map((p) => p.x)),
    y0: Math.min(...pts.map((p) => p.y)),
    x1: Math.max(...pts.map((p) => p.x)),
    y1: Math.max(...pts.map((p) => p.y)),
  };
}

/** Leva uma forma local para a tela; a normal gira junto com o sistema. */
export function inLocal(l: Local, fn: LocalShape): Shape {
  const shape: Shape = (x, y) => {
    const rx = x - l.o.x;
    const ry = y - l.o.y;
    const n = fn(rx * l.fwd.x + ry * l.fwd.y, rx * l.up.x + ry * l.up.y);
    if (!n) return null;
    return { ...n, x: l.fwd.x * n.x + l.up.x * n.y, y: l.fwd.y * n.x + l.up.y * n.y };
  };
  if (fn.box) shape.bounds = screenBounds(l, fn.box);
  return shape;
}

/** Elipse no sistema local, com centro (cf, cu). */
export const localEllipse = (cf: number, cu: number, rf: number, ru: number): LocalShape =>
  boxed((f, u) => dome((f - cf) / rf, (u - cu) / ru), [cf - rf, cf + rf, cu - ru, cu + ru]);

type Pt = readonly [number, number];

const edge = (p: Pt, q: Pt, f: number, u: number): number => (q[0] - p[0]) * (u - p[1]) - (q[1] - p[1]) * (f - p[0]);

/** Triângulo no sistema local; a normal vem de `shade` (em geral a cúpula do volume a que ele pertence). */
export function localTri(a: Pt, b: Pt, c: Pt, shade: (f: number, u: number) => Normal): LocalShape {
  const fs = [a[0], b[0], c[0]];
  const us = [a[1], b[1], c[1]];
  return boxed(
    (f, u) => {
      const e1 = edge(a, b, f, u);
      const e2 = edge(b, c, f, u);
      const e3 = edge(c, a, f, u);
      const inside = (e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0);
      return inside ? shade(f, u) : null;
    },
    [Math.min(...fs), Math.max(...fs), Math.min(...us), Math.max(...us)],
  );
}

/** Retângulo no sistema local, de face para a câmera. */
export const localRect = (f0: number, f1: number, u0: number, u1: number): LocalShape =>
  boxed((f, u) => (f >= f0 && f <= f1 && u >= u0 && u <= u1 ? { x: 0, y: 0, z: 1 } : null), [f0, f1, u0, u1]);

/** Normal de uma cúpula larga centrada em (cf, cu), limitada à borda: sombreia formas que saem do volume. */
export const domeShade =
  (cf: number, cu: number, rf: number, ru: number) =>
  (f: number, u: number): Normal => {
    let x = (f - cf) / rf;
    let y = (u - cu) / ru;
    const q = Math.hypot(x, y);
    if (q > 0.95) {
      x *= 0.95 / q;
      y *= 0.95 / q;
    }
    return { x, y, z: Math.sqrt(1 - x * x - y * y) };
  };
