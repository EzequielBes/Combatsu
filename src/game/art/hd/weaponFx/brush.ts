/*
 * Pincéis comuns aos efeitos das armas imbuídas: a varredura em arco (o rastro de um golpe que gira), o tufo de
 * poeira, a lasca que voa e a brasa. Puro, sem `phaser`.
 */
import { lerp, polar, type BandPaint, type FxCanvas, type Pt } from './canvas';

/** Arco inteiro de um golpe: o centro do giro, o raio de fora e os ângulos de saída e de chegada. */
export interface Swing {
  pivot: Pt;
  radius: number;
  a0: number;
  a1: number;
}

/**
 * Varredura: o trecho `from..to` do arco do golpe, como uma faixa colada ao raio de fora que engrossa da cauda para a
 * frente do trecho. `thick` e `paint` recebem o `t` do trecho (0 na cauda, 1 na frente).
 */
export function sweep(
  c: FxCanvas,
  swing: Swing,
  from: number,
  to: number,
  thick: (t: number) => number,
  paint: BandPaint,
): void {
  c.band({
    cx: swing.pivot.x,
    cy: swing.pivot.y,
    a0: lerp(swing.a0, swing.a1, from),
    a1: lerp(swing.a0, swing.a1, to),
    inner: (t) => swing.radius - thick(t),
    outer: () => swing.radius + 0.4,
    paint,
  });
}

/** Ponto do arco do golpe a `t` do caminho inteiro, `inset` texels para dentro do raio de fora. */
export const swingAt = (swing: Swing, t: number, inset = 0): Pt =>
  polar(swing.pivot.x, swing.pivot.y, swing.radius - inset, lerp(swing.a0, swing.a1, t));

/** Bolhas de um tufo de poeira, em frações do raio: [dx, dy, raio x, raio y]. Mais largo que alto, rente ao chão. */
const PUFF_BLOBS: readonly [number, number, number, number][] = [
  [0, 0, 1.1, 0.8],
  [-0.9, 0.3, 0.65, 0.5],
  [0.95, 0.25, 0.6, 0.45],
  [0.15, -0.55, 0.6, 0.55],
];

/**
 * Tufo de poeira: bolhas juntas, com a sombra `s` embaixo, o corpo `i` e a luz `I` em cima à esquerda, e dois grãos
 * soltos na borda. Vem antes do golpe no quadro, para ficar atrás dele. `fading` desfaz o tufo em xadrez, sem a luz.
 */
export function puff(c: FxCanvas, x: number, y: number, r: number, fading = false): void {
  const layers: [number, number, number, string][] = [
    [0, 0, 1, 's'],
    [-0.12, -0.28, 0.72, 'i'],
    [-0.3, -0.5, 0.36, 'I'],
  ];
  for (const [ox, oy, k, key] of layers) {
    for (const [dx, dy, rx, ry] of PUFF_BLOBS) {
      c.ellipse(x + (dx + ox) * r, y + (dy + oy) * r, rx * r * k, ry * r * k, (d, px, py) => {
        if (fading && (key === 'I' || (px + py) % 2 === 1)) return null;
        return k === 1 || d < 0.9 ? key : null;
      });
    }
  }
  c.set(x - r * 1.9, y - r * 0.2, 'i');
  c.set(x + r * 1.7, y - r * 0.6, 's');
}

/** Lasca que voa para fora de (cx, cy): triângulo com a ponta a `r + len` e a base a `r`, ponta clara. */
export function shard(
  c: FxCanvas,
  cx: number,
  cy: number,
  r: number,
  ang: number,
  len: number,
  body: string,
  tip: string,
): void {
  const base = polar(cx, cy, r, ang);
  const side = { x: -Math.sin(ang) * len * 0.45, y: Math.cos(ang) * len * 0.45 };
  const point = polar(cx, cy, r + len, ang);
  c.poly([{ x: base.x + side.x, y: base.y + side.y }, point, { x: base.x - side.x, y: base.y - side.y }], body);
  c.set(point.x, point.y, tip);
}

/** Brasa: miolo claro e um rabo de 1 ou 2 texels no sentido de onde ela veio. */
export function ember(c: FxCanvas, p: Pt, ang: number, tail: number, core: string, glow: string): void {
  for (let i = tail; i >= 1; i--) c.set(p.x - Math.cos(ang) * i, p.y - Math.sin(ang) * i, glow);
  c.set(p.x, p.y, core);
}
