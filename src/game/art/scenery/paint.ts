import { type Brush, type Key, rng } from './brush';

/**
 * Primitivas de pintura compartilhadas pelos temas do cenário (CEN-01, CEN-09): textura salpicada, juntas, janelas e
 * fios. Tudo em px da camada, alinhado à grade de texel pelo `Brush`.
 */

/**
 * Mistura um número (a posição de uma peça, por exemplo) numa semente: sementes vizinhas do `rng` dão primeiros
 * sorteios parecidos, e as peças lado a lado sairiam iguais.
 */
export function hashSeed(n: number): number {
  let h = Math.imul(Math.round(n * 16) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Salpica `keys` sobre o retângulo, um texel a cada `step` px, com a chance `density`; mesma `seed`, mesmo desenho. */
export function speckle(
  b: Brush,
  x: number,
  y: number,
  w: number,
  h: number,
  keys: readonly Key[],
  density: number,
  seed: number,
  step = 4,
): void {
  const rand = rng(seed);
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      if (rand() < density) b.dot(xx + Math.floor(rand() * (step / 2)) * 2, yy, keys[Math.floor(rand() * keys.length)]);
    }
  }
}

/** Fiadas horizontais de `h` px (tijolo, pedra, lâmina de porta): linha de junta `joint` a cada fiada. */
export function courses(b: Brush, x: number, y: number, w: number, h: number, every: number, joint: Key): void {
  for (let yy = y + every - 2; yy < y + h; yy += every) b.rect(x, yy, w, 2, joint);
}

/**
 * Tijolos em amarração: fiadas de `ch` px e tijolos de `bw` px, juntas verticais deslocadas meia peça a cada fiada,
 * e alguns tijolos com o tom `alt` (variação de cor da peça).
 */
export function bricks(
  b: Brush,
  x: number,
  y: number,
  w: number,
  h: number,
  size: { bw: number; ch: number },
  keys: { joint: Key; alt: Key },
  seed: number,
): void {
  const rand = rng(seed);
  let row = 0;
  for (let yy = y; yy < y + h; yy += size.ch, row++) {
    b.rect(x, yy + size.ch - 2, w, 2, keys.joint);
    const offset = row % 2 === 0 ? 0 : size.bw / 2;
    for (let xx = x - offset; xx < x + w; xx += size.bw) {
      if (rand() < 0.18) b.rect(xx + 2, yy, size.bw - 4, size.ch - 2, keys.alt);
      b.rect(xx, yy, 2, size.ch - 2, keys.joint);
    }
  }
}

/** Janela de prédio: acesa (`A`/`a`, com o caixilho), apagada (`k`) ou com a cortina (`n`), pelo sorteio `r`. */
export function lit(b: Brush, x: number, y: number, w: number, h: number, r: number): void {
  if (r < 0.12) {
    b.rect(x, y, w, h, 'A');
    b.rect(x, y + h - 2, w, 2, 'a');
    b.rect(x + Math.floor(w / 2 / 2) * 2, y, 2, h, 'a');
  } else if (r < 0.26) {
    b.rect(x, y, w, h, 'a');
    b.rect(x, y, w, 2, 'z');
  } else if (r < 0.34) {
    b.rect(x, y, w, h, 'n');
  } else {
    b.rect(x, y, w, h, 'k');
  }
}

/** Fio que cai em catenária de (`x0`, `y`) a (`x1`, `y`), com a barriga `sag` px no meio. */
export function wire(b: Brush, x0: number, x1: number, y: number, sag: number, key: Key): void {
  const span = x1 - x0;
  for (let x = x0; x < x1; x += 2) {
    const t = (x - x0) / span;
    b.dot(x, y + Math.round(4 * sag * t * (1 - t)), key);
  }
}
