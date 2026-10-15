/*
 * Bastão imbuído: o golpe forte varre em arco e acerta na frente e atrás. O rastro é um arco largo de madeira e
 * dourado que sai rente ao chão atrás do player, passa por cima e desce na frente, levantando poeira nas duas pontas;
 * no meio, o vulto da haste e uma lasca do talismã de papel. O impacto é uma pancada sem corte: um lampejo achatado,
 * a meia-lua larga do arco que se abre para a frente, lascas de madeira e poeira. Puro, sem `phaser`.
 */
import { puff, sweep, swingAt, type Swing } from './brush';
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

function trailFrame(i: number): string[] {
  const c = new FxCanvas(TRAIL_W, TRAIL_H);
  const grow = (lo: number, hi: number) => (t: number) => lerp(lo, hi, t);
  if (i === 0) {
    puff(c, BACK_END.x + 2, BACK_END.y - 1, 2.5);
    sweep(c, SWING, 0, 0.36, grow(1.5, 4.5), staffPaint(false));
  } else if (i === 1) {
    puff(c, BACK_END.x + 1, BACK_END.y - 2, 3.5);
    puff(c, BACK_END.x + 5, BACK_END.y, 2);
    sweep(c, SWING, 0.1, 0.72, grow(2, 7), staffPaint(true));
    ghostStaff(c, 0.72);
  } else if (i === 2) {
    puff(c, BACK_END.x, BACK_END.y - 4, 3);
    puff(c, FRONT_END.x - 2, FRONT_END.y - 1, 3);
    sweep(c, SWING, 0.4, 1, grow(2, 7.5), staffPaint(true));
    ghostStaff(c, 0.99);
    talisman(c, swingAt(SWING, 0.5, 9));
  } else {
    puff(c, BACK_END.x - 1, BACK_END.y - 6, 2.5, true);
    puff(c, FRONT_END.x - 3, FRONT_END.y - 3, 4);
    puff(c, FRONT_END.x + 2, FRONT_END.y - 1, 2.5);
    sweep(c, SWING, 0.8, 1, grow(1, 3), staffPaint(false));
    talisman(c, swingAt(SWING, 0.62, 13));
  }
  return c.rows();
}

const IMPACT_W = 40;
const IMPACT_H = 30;
const HIT: Pt = { x: 17, y: 15 };

/** Raios grossos e rombudos do lampejo: [ângulo em graus, comprimento]. */
const SPIKES: readonly [number, number][] = [
  [0, 11],
  [180, 7],
  [-90, 8],
  [90, 6],
  [-40, 9],
  [40, 8],
  [-140, 7],
  [140, 6],
];

function flash(c: FxCanvas): void {
  for (const [a, len] of SPIKES) {
    const tip = polar(HIT.x, HIT.y, len, deg(a));
    c.line(HIT.x, HIT.y, tip.x, tip.y, 'A');
    const side = polar(HIT.x, HIT.y - 1, len - 2, deg(a));
    c.line(HIT.x, HIT.y - 1, side.x, side.y, 'A');
  }
  c.ellipse(HIT.x, HIT.y, 5, 3.5, (d) => (d < 0.55 ? 'w' : 'A'));
  c.rim('m', 'Aw');
}

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
  const ground = HIT.y + 10;
  if (i === 0) {
    flash(c);
  } else if (i === 1) {
    puff(c, HIT.x - 5, ground, 3);
    puff(c, HIT.x + 9, ground, 3);
    crescent(c, 13, 5, ['w', 'A'], false);
    c.disc(HIT.x, HIT.y, 2, 'A');
    chips(c, 1);
  } else if (i === 2) {
    puff(c, HIT.x - 8, ground - 2, 4);
    puff(c, HIT.x + 12, ground - 2, 4.5);
    crescent(c, 17, 3, ['A', 'a'], true);
    chips(c, 1.6);
  } else {
    puff(c, HIT.x - 10, ground - 4, 4, true);
    puff(c, HIT.x + 14, ground - 5, 4.5, true);
    crescent(c, 19, 1.5, ['a', 'a'], true);
  }
  return c.rows();
}

export const STAFF_FX: WeaponFxArt = {
  trail: { frames: seq('trail', [0, 1, 2, 3].map(trailFrame)), anchor: SWING.pivot },
  impact: { frames: seq('impact', [0, 1, 2, 3].map(impactFrame)), anchor: HIT },
};
