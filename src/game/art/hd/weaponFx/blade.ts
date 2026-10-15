/*
 * Lâmina imbuída: todo golpe leve corta. O rastro é um risco fino branco em meia-lua, de cima para a frente e para
 * baixo; o impacto é um corte limpo (um traço reto que se abre em duas lascas) e a gota do sangramento amaldiçoado,
 * vermelha com o brilho roxo, que cai. Puro, sem `phaser`.
 */
import { FxCanvas, deg, lerp, type Pt } from './canvas';
import { seq, type WeaponFxArt } from './types';

const TRAIL_W = 28;
const TRAIL_H = 38;
const PIVOT: Pt = { x: 4, y: 19 };
const RADIUS = 19;
const A0 = deg(-72);
const A1 = deg(56);

interface Crescent {
  /** Trecho do arco inteiro que aparece neste quadro (0 = cauda, 1 = ponta). */
  from: number;
  to: number;
  /** Espessura máxima, perto da ponta. */
  peak: number;
  /** Fio (borda de fora), corpo e cauda. */
  keys: readonly [string, string, string];
  /** Falhas no traço, a cada tantos graus (0 = contínuo). */
  dash?: number;
}

/** Espessura da meia-lua em `t` do trecho: fina na cauda, cheia a 3/4 e afiada na ponta. */
const thickness = (t: number, peak: number): number =>
  t < 0.75 ? lerp(0.6, peak, t / 0.75) : lerp(peak, 0.2, (t - 0.75) / 0.25);

function crescent(c: FxCanvas, s: Crescent): void {
  const [edge, body, tail] = s.keys;
  const a0 = lerp(A0, A1, s.from);
  const a1 = lerp(A0, A1, s.to);
  c.band({
    cx: PIVOT.x,
    cy: PIVOT.y,
    a0,
    a1,
    inner: (t) => RADIUS - thickness(t, s.peak),
    outer: () => RADIUS + 0.4,
    paint: (t, u) => {
      if (s.dash && Math.floor(((a1 - a0) * t * 180) / Math.PI / s.dash) % 2 === 1) return null;
      if (u > 0.62) return edge;
      return t < 0.35 ? tail : body;
    },
  });
}

/** Brilho em cruz na ponta do risco, de braços curtos. */
function gleam(c: FxCanvas, p: Pt, arm: number, core: string, ray: string): void {
  for (let i = 1; i <= arm; i++) {
    const key = i === 1 ? core : ray;
    c.set(p.x + i, p.y, key);
    c.set(p.x - i, p.y, key);
    c.set(p.x, p.y + i, key);
    c.set(p.x, p.y - i, key);
  }
  c.set(p.x, p.y, core);
}

const tipAt = (t: number): Pt => {
  const a = lerp(A0, A1, t);
  return { x: PIVOT.x + Math.cos(a) * (RADIUS - 1), y: PIVOT.y + Math.sin(a) * (RADIUS - 1) };
};

function trailFrame(i: number): string[] {
  const c = new FxCanvas(TRAIL_W, TRAIL_H);
  if (i === 0) {
    crescent(c, { from: 0, to: 0.5, peak: 1.6, keys: ['W', 'W', 'I'] });
  } else if (i === 1) {
    crescent(c, { from: 0, to: 1, peak: 3.2, keys: ['W', 'w', 'I'] });
    gleam(c, tipAt(0.97), 2, 'W', 'w');
  } else if (i === 2) {
    crescent(c, { from: 0.4, to: 1, peak: 2.2, keys: ['w', 'I', 'I'] });
  } else {
    crescent(c, { from: 0.62, to: 1, peak: 1, keys: ['I', 'S', 'S'], dash: 6 });
  }
  return c.rows();
}

const IMPACT_SIZE = 32;
const HIT: Pt = { x: 16, y: 15 };
/** Direção do corte (o gume desce para a frente) e a normal dele. */
const CUT = { x: Math.cos(deg(62)), y: Math.sin(deg(62)) };
const NORMAL = { x: -CUT.y, y: CUT.x };

/** Lasca do corte: o trecho de `from` a `to` texels ao longo do gume, afastado `off` texels pela normal. */
function sliver(c: FxCanvas, from: number, to: number, off: number, key: string): void {
  const x = HIT.x + NORMAL.x * off;
  const y = HIT.y + NORMAL.y * off;
  c.line(x + CUT.x * from, y + CUT.y * from, x + CUT.x * to, y + CUT.y * to, key);
}

/** Gota do sangramento amaldiçoado: vermelha, com o brilho roxo e um fio de energia em cima. */
function drop(c: FxCanvas, x: number, y: number, wisp: number): void {
  c.set(x, y - 2, 't');
  c.set(x - 1, y - 1, 'r');
  c.set(x, y - 1, 't');
  c.set(x + 1, y - 1, 'r');
  c.set(x - 1, y, 'r');
  c.set(x, y, 'U');
  c.set(x + 1, y, 'r');
  c.set(x, y + 1, 'r');
  for (let i = 0; i < wisp; i++) c.set(x + (i % 2), y - 4 - i, i === 0 ? 'u' : 'v');
}

function impactFrame(i: number): string[] {
  const c = new FxCanvas(IMPACT_SIZE, IMPACT_SIZE);
  if (i === 0) {
    sliver(c, -14, 14, 0, 'W');
    sliver(c, -6, 6, 1, 'w');
    gleam(c, HIT, 4, 'W', 'w');
    c.rim('K', 'Ww');
  } else if (i === 1) {
    sliver(c, -13, 9, -1.6, 'W');
    sliver(c, -9, 13, 1.6, 'w');
    sliver(c, -4, 4, 2.6, 'I');
    c.set(HIT.x, HIT.y, 't');
    c.set(HIT.x + 1, HIT.y + 1, 'r');
    c.set(HIT.x + NORMAL.x * 6, HIT.y + NORMAL.y * 6, 'r');
    c.set(HIT.x + NORMAL.x * 8 + 1, HIT.y + NORMAL.y * 8 - 1, 't');
    c.rim('K', 'W');
  } else if (i === 2) {
    sliver(c, -12, -4, -3.2, 'I');
    sliver(c, 5, 12, 3.2, 'I');
    sliver(c, -2, 2, -3.2, 'S');
    drop(c, HIT.x + 1, HIT.y + 5, 2);
    c.set(HIT.x + NORMAL.x * 10, HIT.y + NORMAL.y * 10 + 1, 'r');
  } else {
    c.set(HIT.x - CUT.x * 11 - NORMAL.x * 4, HIT.y - CUT.y * 11 - NORMAL.y * 4, 'S');
    c.set(HIT.x + CUT.x * 11 + NORMAL.x * 4, HIT.y + CUT.y * 11 + NORMAL.y * 4, 'S');
    drop(c, HIT.x + 1, HIT.y + 11, 3);
  }
  return c.rows();
}

export const BLADE_FX: WeaponFxArt = {
  trail: { frames: seq('trail', [0, 1, 2, 3].map(trailFrame)), anchor: PIVOT },
  impact: { frames: seq('impact', [0, 1, 2, 3].map(impactFrame)), anchor: HIT },
};
