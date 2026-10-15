/*
 * Pincéis comuns aos efeitos das armas imbuídas: a varredura em arco (o rastro de um golpe que gira), o pó solto
 * no chão, a lasca que voa e a brasa. Puro, sem `phaser`.
 */
import { lerp, polar, seeded, type BandPaint, type FxCanvas, type Pt } from './canvas';

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

/** Pó levantado no chão: de onde o golpe raspa, para que lado ele espirra, até onde vai e quão alto sobe. */
export interface Dust {
  x: number;
  y: number;
  dir: 1 | -1;
  len: number;
  height: number;
  /** Semente dos grãos: muda de quadro para quadro, para o pó não parecer carimbado. */
  seed: number;
  /** Desfazendo: o pó rente vira xadrez e só sobram grãos soltos, sem a luz de cima. */
  fading?: boolean;
}

/** Uma coluna do pó rente, de `h` texels a partir do chão: sombra embaixo, luz no topo e o alto vazando em xadrez. */
function dustColumn(c: FxCanvas, x: number, y: number, h: number, fading: boolean): void {
  for (let j = 0; j < h; j++) {
    const top = j === h - 1;
    const loose = j >= h / 2 && (x + y - j) % 2 === 0;
    if (fading ? (x + j) % 2 === 0 || top : loose) continue;
    c.under(x, y - j, j === 0 ? 's' : top && !fading ? 'I' : 'i');
  }
}

/**
 * Pó solto (não nuvem): colunas de alturas quebradas rente ao chão, mais altas perto de onde o golpe raspou e
 * baixando para o lado do espirro, com a sombra `s` embaixo, o corpo `i` e a luz `I` só no topo; os texels de cima
 * vazam em xadrez, e grãos soltos voam acima, inclinados para o lado do espirro. Vem antes do golpe no quadro.
 */
export function dust(c: FxCanvas, d: Dust): void {
  const rnd = seeded(d.seed);
  for (let k = 0; k <= d.len; k++) {
    const t = k / Math.max(d.len, 1);
    const h = Math.round(d.height * (1 - t * 0.75) * lerp(0.55, 1.15, rnd()));
    dustColumn(c, d.x + d.dir * k, d.y, h, d.fading === true);
  }
  const grains = d.fading ? 3 : 5;
  for (let g = 0; g < grains; g++) {
    const t = lerp(0.15, 1, rnd());
    const x = d.x + d.dir * t * d.len * 1.1;
    const y = d.y - d.height * (1 - t * 0.5) - lerp(1, 3.5, rnd());
    c.under(x, y, g % 2 === 0 && !d.fading ? 'I' : 'i');
    if (g < 2 && !d.fading) c.under(x - d.dir, y + 1, 'i');
  }
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
