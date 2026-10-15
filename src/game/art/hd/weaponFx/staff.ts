/*
 * Bastão imbuído: o golpe forte varre em arco e acerta na frente e atrás. O rastro é um arco largo de madeira e
 * dourado que sai rente ao chão atrás do player, passa por cima e desce na frente, levantando pó nas duas pontas;
 * no meio, o vulto da haste e uma lasca do talismã de papel. O impacto é uma pancada sem corte: um lampejo achatado,
 * a meia-lua larga do arco que se abre para a frente, lascas de madeira e pó solto. Puro, sem `phaser`.
 */
import { dust, sweep, swingAt, type Swing } from './brush';
import { FxCanvas, deg, lerp, polar, type Pt } from './canvas';
import { seq, type WeaponFxArt } from './types';

const TRAIL_W = 72;
const TRAIL_H = 44;
const SWING: Swing = { pivot: { x: 36, y: 34 }, radius: 32, a0: deg(-196), a1: deg(16) };

/** Cor do arco: borda de fora clara na frente, o dourado no meio e a madeira por dentro e na cauda. */
function staffPaint(bright: boolean) {
  return (t: number, u: number): string | null => {
    if (t < 0.22 && Math.floor(t * 40) % 2 === 1) return null;
    if (u > 0.8) return bright && t > 0.6 ? 'w' : 'A';
    if (u > 0.45) return t < 0.3 ? 'a' : 'A';
    return t < 0.4 ? 'm' : u > 0.22 ? 'a' : 'M';
  };
}

/** Vulto da haste na frente do arco: uma linha do centro do giro até a borda, com a ponteira dourada. */
function ghostStaff(c: FxCanvas, t: number): void {
  const ang = lerp(SWING.a0, SWING.a1, t);
  const tip = polar(SWING.pivot.x, SWING.pivot.y, SWING.radius - 1, ang);
  const root = polar(SWING.pivot.x, SWING.pivot.y, 12, ang);
  // Corpo da haste com 2 texels de largura e a sombra atrás (do lado de onde o golpe vem): lê como um bastão, não
  // como um fio solto; a linha clara por cima é a luz.
  const px = Math.sin(ang) * 1.2;
  const py = -Math.cos(ang) * 1.2;
  c.poly(
    [
      { x: root.x + px, y: root.y + py },
      { x: tip.x + px, y: tip.y + py },
      { x: tip.x - px * 0.3, y: tip.y - py * 0.3 },
      { x: root.x - px * 0.3, y: root.y - py * 0.3 },
    ],
    'm',
  );
  c.line(root.x, root.y, tip.x, tip.y, 'M');
  c.set(tip.x, tip.y, 'A');
  const back = polar(SWING.pivot.x, SWING.pivot.y, SWING.radius - 2, ang);
  c.set(back.x, back.y, 'z');
}

/** Lasca do talismã: o papel `w` com o traço vermelho do selo. */
function talisman(c: FxCanvas, p: Pt): void {
  c.set(p.x, p.y, 'w');
  c.set(p.x + 1, p.y, 'r');
  c.set(p.x + 2, p.y + 1, 'w');
}

const BACK_END = swingAt(SWING, 0, 3);
const FRONT_END = swingAt(SWING, 1, 3);

/** Chão do rastro: a linha onde as duas pontas do arco raspam. */
const GROUND = TRAIL_H - 1;

function trailFrame(i: number): string[] {
  const c = new FxCanvas(TRAIL_W, TRAIL_H);
  const grow = (lo: number, hi: number) => (t: number) => lerp(lo, hi, t);
  const back = (len: number, height: number, seed: number, fading = false) =>
    dust(c, { x: BACK_END.x + 3, y: GROUND, dir: -1, len, height, seed, fading });
  const front = (len: number, height: number, seed: number) =>
    dust(c, { x: FRONT_END.x - 3, y: GROUND, dir: 1, len, height, seed });
  if (i === 0) {
    back(5, 3, 1);
    sweep(c, SWING, 0, 0.36, grow(1.5, 4.5), staffPaint(false));
  } else if (i === 1) {
    back(9, 4, 2);
    sweep(c, SWING, 0.1, 0.72, grow(2, 7), staffPaint(true));
    ghostStaff(c, 0.72);
  } else if (i === 2) {
    back(10, 3, 3, true);
    front(6, 4, 4);
    sweep(c, SWING, 0.4, 1, grow(2, 7.5), staffPaint(true));
    ghostStaff(c, 0.99);
    talisman(c, swingAt(SWING, 0.5, 9));
  } else {
    back(10, 3, 5, true);
    front(10, 5, 6);
    dust(c, { x: FRONT_END.x - 4, y: GROUND, dir: -1, len: 5, height: 3, seed: 7 });
    sweep(c, SWING, 0.8, 1, grow(1, 3), staffPaint(false));
    talisman(c, swingAt(SWING, 0.62, 13));
  }
  return c.rows();
}

const IMPACT_W = 40;
const IMPACT_H = 30;
const HIT: Pt = { x: 17, y: 15 };

/** Meia-lua da pancada, aberta para a frente: centro atrás do contato, de cima a baixo. */
function crescent(c: FxCanvas, r: number, th: number, keys: readonly [string, string], gap: boolean): void {
  c.band({
    cx: HIT.x - 7,
    cy: HIT.y,
    a0: deg(-70),
    a1: deg(70),
    inner: (t) => r - th * Math.sin(Math.PI * t),
    outer: () => r,
    paint: (t, u) => {
      if (gap && Math.floor(t * 9) % 3 === 2) return null;
      return u > 0.5 ? keys[0] : keys[1];
    },
  });
}

/**
 * Pancada achatada: o arco desce de cima, então o lampejo do contato sai espremido como uma panqueca, espirrando para
 * os dois lados, com os traços de compressão em cima e embaixo. Sem raios em volta: a estrela e os riscos radiais são
 * do impacto amaldiçoado, que vem por baixo.
 */
function flash(c: FxCanvas): void {
  for (const side of [-1, 1]) {
    c.line(HIT.x + side * 9, HIT.y, HIT.x + side * 14, HIT.y, 'A');
    c.line(HIT.x + side * 8, HIT.y - 2, HIT.x + side * 11, HIT.y - 3, 'a');
    c.line(HIT.x + side * 8, HIT.y + 2, HIT.x + side * 11, HIT.y + 3, 'a');
    c.line(HIT.x - 5, HIT.y + side * 5, HIT.x + 5, HIT.y + side * 5, 'a');
    c.line(HIT.x - 2, HIT.y + side * 7, HIT.x + 2, HIT.y + side * 7, 'm');
  }
  c.ellipse(HIT.x, HIT.y, 7.5, 2.4, (d) => (d < 0.5 ? 'w' : 'A'));
  c.rim('m', 'Aw');
}

/** Lascas de madeira voando: [ângulo, distância no quadro 1]. */
const CHIPS: readonly [number, number][] = [
  [-60, 9],
  [-20, 12],
  [25, 11],
  [-120, 8],
];

function chips(c: FxCanvas, spread: number): void {
  for (const [a, r] of CHIPS) {
    const p = polar(HIT.x, HIT.y, r * spread, deg(a));
    c.set(p.x, p.y, 'M');
    c.set(p.x + 1, p.y, 'm');
  }
}

function impactFrame(i: number): string[] {
  const c = new FxCanvas(IMPACT_W, IMPACT_H);
  const ground = IMPACT_H - 3;
  const kick = (dx: number, dir: 1 | -1, len: number, height: number, seed: number, fading = false) =>
    dust(c, { x: HIT.x + dx, y: ground, dir, len, height, seed, fading });
  if (i === 0) {
    flash(c);
  } else if (i === 1) {
    kick(-3, -1, 7, 4, 11);
    kick(6, 1, 8, 4, 12);
    crescent(c, 13, 5, ['w', 'A'], false);
    c.disc(HIT.x, HIT.y, 2, 'A');
    chips(c, 1);
  } else if (i === 2) {
    kick(-4, -1, 11, 5, 13);
    kick(7, 1, 12, 5, 14);
    crescent(c, 17, 3, ['A', 'a'], true);
    chips(c, 1.6);
  } else {
    kick(-6, -1, 11, 4, 15, true);
    kick(9, 1, 12, 4, 16, true);
    crescent(c, 19, 1.5, ['a', 'a'], true);
  }
  return c.rows();
}

export const STAFF_FX: WeaponFxArt = {
  trail: { frames: seq('trail', [0, 1, 2, 3].map(trailFrame)), anchor: SWING.pivot },
  impact: { frames: seq('impact', [0, 1, 2, 3].map(impactFrame)), anchor: HIT },
};
