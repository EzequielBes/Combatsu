/*
 * Osso de Dragão imbuído: carrega com o parry e com o dano recebido (1 a 3 cargas) e o golpe forte solta tudo. O
 * rastro é um arco de cima para a frente, em fogo por fora e com a crista de osso serrilhada por dentro, soltando
 * brasas; o impacto é um estouro de brasas que sobe em línguas de fogo; o marcador de cargas são 3 lascas de osso que
 * acendem uma a uma, com a chama tremendo em 2 quadros. Puro, sem `phaser`.
 */
import { ember, sweep, swingAt, type Swing } from './brush';
import { FxCanvas, deg, lerp, polar, seeded, type Pt } from './canvas';
import { seq, type WeaponFxArt } from './types';

const TRAIL_W = 44;
const TRAIL_H = 42;
const SWING: Swing = { pivot: { x: 11, y: 28 }, radius: 25, a0: deg(-112), a1: deg(30) };

/** Fogo por fora (o branco quente só na frente), a crista de osso serrilhada por dentro e a cauda em carmim. */
function bonePaint(t: number, u: number): string | null {
  if (u < 0.2) return Math.floor(t * 30) % 3 === 0 ? 'L' : 'l';
  if (t < 0.25) return Math.floor(t * 36) % 2 === 1 ? null : u > 0.6 ? 'r' : 't';
  if (u > 0.78) return t > 0.82 ? 'w' : 'A';
  return u > 0.45 ? 'a' : 'R';
}

/** Brasas que se soltam atrás do arco e sobem: `rise` texels acima de onde se soltaram. */
function embers(c: FxCanvas, from: number, to: number, count: number, rise: number, seed: number): void {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const p = swingAt(SWING, lerp(from, to, rnd()), lerp(-3, 9, rnd()));
    const hot = rnd() > 0.5;
    ember(c, { x: p.x + lerp(-1, 1, rnd()), y: p.y - rise }, deg(-90), rise > 0 ? 1 : 0, hot ? 'A' : 'a', 'r');
  }
}

function trailFrame(i: number): string[] {
  const c = new FxCanvas(TRAIL_W, TRAIL_H);
  const grow = (lo: number, hi: number) => (t: number) => lerp(lo, hi, t);
  if (i === 0) {
    sweep(c, SWING, 0, 0.45, grow(1.5, 4), bonePaint);
  } else if (i === 1) {
    embers(c, 0.05, 0.4, 5, 0, 11);
    sweep(c, SWING, 0.1, 0.85, grow(2, 6), bonePaint);
  } else if (i === 2) {
    embers(c, 0.2, 0.7, 7, 2, 23);
    sweep(c, SWING, 0.45, 1, grow(2, 6.5), bonePaint);
  } else {
    embers(c, 0.4, 1, 8, 5, 37);
    sweep(c, SWING, 0.8, 1, grow(1, 2.5), bonePaint);
  }
  return c.rows();
}

const IMPACT = 36;
const HIT: Pt = { x: 17, y: 20 };

/** Línguas de fogo do estouro: [ângulo em graus, comprimento]. Mais compridas para cima, onde o fogo sobe. */
const TONGUES: readonly [number, number][] = [
  [-90, 13],
  [-55, 11],
  [-125, 10],
  [-15, 10],
  [-165, 8],
  [30, 8],
  [150, 7],
  [90, 6],
];

/** Língua de fogo de `from` a `from + len` texels do contato, que entorta para cima (o fogo sobe), com o miolo claro. */
function tongue(c: FxCanvas, ang: number, from: number, len: number, keys: readonly [string, string]): void {
  const half = Math.max(1, len / 5);
  const side = { x: -Math.sin(ang) * half, y: Math.cos(ang) * half };
  const base = polar(HIT.x, HIT.y, from, ang);
  const mid = polar(HIT.x, HIT.y - len * 0.08, from + len * 0.5, ang);
  const tip = polar(HIT.x, HIT.y - len * 0.3, from + len, ang);
  c.poly(
    [
      { x: base.x + side.x, y: base.y + side.y },
      { x: mid.x + side.x * 0.6, y: mid.y + side.y * 0.6 },
      tip,
      { x: mid.x - side.x * 0.6, y: mid.y - side.y * 0.6 },
      { x: base.x - side.x, y: base.y - side.y },
    ],
    keys[1],
  );
  c.line(base.x, base.y, mid.x, mid.y, keys[0]);
}

/** Brasas que voam do estouro: na distância `r`, em ângulos fixos, um pouco puxadas para cima. */
function burstEmbers(c: FxCanvas, r: number, lift: number, core: string): void {
  const rnd = seeded(71);
  for (let i = 0; i < 11; i++) {
    const ang = deg(i * 33 + lerp(-8, 8, rnd()));
    const p = polar(HIT.x, HIT.y - lift, r * lerp(0.85, 1.15, rnd()), ang);
    ember(c, p, ang, r > 14 ? 1 : 2, core, 'a');
  }
}

function impactFrame(i: number): string[] {
  const c = new FxCanvas(IMPACT, IMPACT);
  if (i === 0) {
    for (const [a, len] of TONGUES) tongue(c, deg(a), 3, len, ['A', 'a']);
    c.disc(HIT.x, HIT.y, 5, (d) => (d < 0.4 ? 'w' : d < 0.75 ? 'A' : 'a'));
    c.rim('r', 'aA');
  } else if (i === 1) {
    burstEmbers(c, 12, 1, 'A');
    for (const [a, len] of TONGUES) tongue(c, deg(a), 5, len * 0.8, ['A', 'R']);
    c.disc(HIT.x, HIT.y, 4.5, (d) => (d < 0.5 ? 'A' : 'a'));
  } else if (i === 2) {
    burstEmbers(c, 15, 4, 'A');
    for (const [a, len] of TONGUES.slice(0, 3)) tongue(c, deg(a), 4, len * 0.7, ['a', 'R']);
    c.disc(HIT.x, HIT.y, 3, (d) => (d < 0.5 ? 'a' : 'r'));
  } else {
    burstEmbers(c, 16.5, 8, 'a');
    tongue(c, deg(-90), 2, 6, ['R', 't']);
  }
  return c.rows();
}

const CHARGE_W = 27;
const CHARGE_H = 14;
const PIPS = [4, 13, 22];
const PIP_Y = 9;

/** Lasca de osso em losango: apagada, só o contorno de osso; acesa, o fogo por dentro e a chama em cima. */
function pip(c: FxCanvas, x: number, lit: boolean, flick: number): void {
  const shape = (dx: number, dy: number): Pt[] => [
    { x: x + 0.01, y: PIP_Y - 4 + dy },
    { x: x + 3.5 - dx, y: PIP_Y },
    { x: x + 0.01, y: PIP_Y + 4.5 - dy },
    { x: x - 3.5 + dx, y: PIP_Y },
  ];
  c.poly(shape(0, 0), lit ? 'l' : 'L');
  c.poly(shape(1, 1), lit ? 'a' : 'K');
  if (!lit) return;
  c.poly(shape(2, 2), 'A');
  c.set(x, PIP_Y, 'w');
  const sway = flick === 0 ? 0 : x % 2 === 0 ? 1 : -1;
  c.line(x, PIP_Y - 5, x + sway, PIP_Y - 7 - flick, 'a');
  c.set(x + sway, PIP_Y - 8 - flick, 'A');
  c.set(x - 1, PIP_Y - 5, 'R');
  c.set(x + 1, PIP_Y - 5, 'R');
}

function chargeFrame(lit: number, flick: number): string[] {
  const c = new FxCanvas(CHARGE_W, CHARGE_H);
  PIPS.forEach((x, i) => pip(c, x, i < lit, flick));
  return c.rows();
}

const CHARGE_FRAMES = Object.fromEntries(
  [1, 2, 3].flatMap((n) => [
    [`charge-${n}a`, chargeFrame(n, 0)],
    [`charge-${n}b`, chargeFrame(n, 1)],
  ]),
);

export const BONE_FX: WeaponFxArt = {
  trail: { frames: seq('trail', [0, 1, 2, 3].map(trailFrame)), anchor: SWING.pivot },
  impact: { frames: seq('impact', [0, 1, 2, 3].map(impactFrame)), anchor: HIT },
  charge: { frames: CHARGE_FRAMES, anchor: { x: 13, y: PIP_Y } },
};
