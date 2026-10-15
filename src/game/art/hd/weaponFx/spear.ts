/*
 * Lança Invertida do Céu imbuída: o Contra atravessa a guarda e anula o projétil que tocar. O rastro é uma estocada
 * reta, branca por fora e com o miolo preto (a cor invertida), que termina numa ponta preta de contorno branco; o
 * impacto é a anulação: um disco vazio que engole o brilho, o anel que se parte e o projétil desfeito em estilhaços.
 * Puro, sem `phaser`.
 */
import { shard } from './brush';
import { FxCanvas, deg, type Pt } from './canvas';
import { seq, type WeaponFxArt } from './types';

const TRAIL_W = 60;
const TRAIL_H = 15;
const ROOT: Pt = { x: 1, y: 7 };

/** Ponta da lança, voltada para a frente: folha preta de contorno branco, com as farpas para trás. */
const HEAD = [
  '...WW.........',
  '...WbWWW......',
  'WWWWbbbbWWW...',
  'bbbbbbbbbbbbWW',
  'SSSWbbbbWWW...',
  '...WbWWW......',
  '...WW.........',
];
/** A ponta pequena, do começo da estocada. */
const HEAD_SMALL = ['.WW......', 'WWbbWW...', 'bbbbbbbWW', 'SSbbWW...', '.WW......'];
/** A ponta se apagando: o contorno em cinza e o miolo na sombra. */
const FADED = { W: 'S', b: 'K' };

interface Thrust {
  /** Começo e fim da haste de luz (x); a ponta começa no fim. */
  from: number;
  to: number;
  head: readonly string[];
  /** O fim da estocada: a haste em falhas e a ponta apagada. */
  fading?: boolean;
}

/** A haste: o fio de cima branco, o miolo preto da metade para a frente e a sombra embaixo. */
function thrust(c: FxCanvas, s: Thrust): void {
  const span = s.to - s.from;
  for (let x = s.from; x < s.to; x++) {
    if (s.fading && Math.floor(x / 3) % 2 === 1) continue;
    const t = (x - s.from) / span;
    c.set(x, ROOT.y, t > 0.45 && !s.fading ? 'b' : 'W');
    if (t > 0.3) c.set(x, ROOT.y - 1, s.fading ? 'S' : 'W');
    if (t > 0.45) c.set(x, ROOT.y + 1, 'S');
  }
  c.stamp(s.to, ROOT.y - (s.head.length - 1) / 2, s.head, s.fading ? FADED : {});
}

/** Linhas de velocidade em cima e embaixo da estocada: [y em relação à haste, começo, fim]. */
function speedLines(c: FxCanvas, lines: readonly [number, number, number][], key: string): void {
  for (const [dy, x0, x1] of lines) c.line(x0, ROOT.y + dy, x1, ROOT.y + dy, key);
}

const TIP_X = 45;

function trailFrame(i: number): string[] {
  const c = new FxCanvas(TRAIL_W, TRAIL_H);
  if (i === 0) {
    thrust(c, { from: 22, to: 36, head: HEAD_SMALL });
  } else if (i === 1) {
    speedLines(
      c,
      [
        [-5, 16, 27],
        [5, 10, 19],
      ],
      'S',
    );
    thrust(c, { from: ROOT.x, to: TIP_X, head: HEAD });
  } else if (i === 2) {
    speedLines(
      c,
      [
        [-5, 26, 33],
        [5, 20, 26],
      ],
      's',
    );
    thrust(c, { from: 18, to: TIP_X, head: HEAD });
    c.set(TIP_X + 13, ROOT.y - 2, 'W');
    c.set(TIP_X + 13, ROOT.y + 2, 'W');
  } else {
    thrust(c, { from: 32, to: TIP_X, head: HEAD, fading: true });
  }
  return c.rows();
}

const IMPACT = 32;
const HIT: Pt = { x: 14, y: 16 };

/** Disco da anulação: preto puro com a borda `K`, dentro de um anel branco. */
function voidDisc(c: FxCanvas, r: number, ring: number): void {
  if (ring > 0) c.disc(HIT.x, HIT.y, r + ring, 'W');
  c.disc(HIT.x, HIT.y, r, (d) => (d > 0.75 ? 'K' : 'b'));
}

/** Anel partido em arcos curtos. */
function brokenRing(c: FxCanvas, r: number, key: string, step: number): void {
  c.band({
    cx: HIT.x,
    cy: HIT.y,
    a0: 0,
    a1: Math.PI * 2 - 0.01,
    inner: () => r - 1,
    outer: () => r,
    paint: (t) => (Math.floor(t * step) % 2 === 0 ? key : null),
  });
}

/** Estilhaços do projétil: [ângulo em graus, giro da lasca, tamanho]. */
const SHARDS: readonly [number, number, number][] = [
  [-80, 15, 4],
  [-30, -10, 3],
  [20, 20, 4],
  [75, -25, 3],
  [140, 10, 4],
  [-140, -15, 3],
  [190, 25, 2.5],
];

function shards(c: FxCanvas, r: number, scale: number, body: string, tip: string): void {
  for (const [a, spin, size] of SHARDS) shard(c, HIT.x, HIT.y, r, deg(a + spin), size * scale, body, tip);
}

function impactFrame(i: number): string[] {
  const c = new FxCanvas(IMPACT, IMPACT);
  if (i === 0) {
    c.line(0, HIT.y, HIT.x + 14, HIT.y, 'W');
    voidDisc(c, 4, 1.6);
    c.rim('K', 'W');
  } else if (i === 1) {
    shards(c, 7, 1, 'U', 'W');
    brokenRing(c, 9, 'W', 12);
    voidDisc(c, 3, 0);
  } else if (i === 2) {
    shards(c, 10.5, 0.9, 'I', 'W');
    brokenRing(c, 12, 'I', 16);
    c.set(HIT.x, HIT.y, 'b');
    c.set(HIT.x + 1, HIT.y, 'W');
  } else {
    shards(c, 13.5, 0.6, 'i', 'I');
  }
  return c.rows();
}

export const SPEAR_FX: WeaponFxArt = {
  trail: { frames: seq('trail', [0, 1, 2, 3].map(trailFrame)), anchor: ROOT },
  impact: { frames: seq('impact', [0, 1, 2, 3].map(impactFrame)), anchor: HIT },
};
