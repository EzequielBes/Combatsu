/*
 * Símbolos dos 3 Domínios da leva 1, todos na placa de moldura dupla: Santuário Malevolente (o telhado do
 * santuário sobre os pilares, cortado pelos traços do Desmantelar), Jackpot (os três tambores com o 7 numa moldura
 * dourada) e Amplificação de Domínio (a mão aberta ciano dentro do contorno branco que anula técnicas). Puro, sem
 * `phaser`.
 */
import { bevelInk, type IconCanvas } from './canvas';
import { palm, palmShape } from './hands';
import type { IconRecipe } from './plate';
import { box, poly, slash, star, stroke, union, type Sdf } from './sdf';

/** Telhado de beiral curvo para cima, de largura `w` (meia) e altura `h`, com a cumeeira em (cx, top). */
function roof(cx: number, top: number, w: number, h: number): Sdf {
  return poly([
    [cx - w, top + h * 0.7],
    [cx - w * 0.78, top + h * 0.82],
    [cx - w * 0.55, top + h],
    [cx + w * 0.55, top + h],
    [cx + w * 0.78, top + h * 0.82],
    [cx + w, top + h * 0.7],
    [cx + w * 0.5, top + h * 0.45],
    [cx + w * 0.22, top],
    [cx - w * 0.22, top],
    [cx - w * 0.5, top + h * 0.45],
  ]);
}

export const SANTUARIO: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'r'],
      [0.44, 'v'],
    ],
    at: [0.5, 0.5],
    domain: true,
  },
  draw: (c) => {
    const small = c.size < 32;
    const p = c.px;
    for (const x of [0.33, 0.67]) {
      const pillar = box(x, 0.66, small ? 0.05 : 0.04, 0.18);
      c.fill(pillar, bevelInk(pillar, p, 'h', 'H', 'h'), { line: small ? undefined : 'k' });
    }
    const base = box(0.5, 0.84, 0.3, small ? 0.05 : 0.04, 0.01);
    c.fill(base, bevelInk(base, p, 's', 'S', 'n'), { line: 'n' });
    const beam = box(0.5, 0.5, 0.26, small ? 0.045 : 0.035);
    c.fill(beam, 't', { line: small ? undefined : 'r' });
    const top = roof(0.5, 0.16, 0.4, 0.26);
    c.fill(top, bevelInk(top, p, 't', 'R', 'r'), { line: small ? undefined : 'r' });
    if (small) return;
    c.fill(box(0.5, 0.25, 0.06, 0.04), 'A', { line: 'z' });
    for (const o of [-0.1, 0.1]) c.fill(slash(0.82 + o, 0.5 + o, 0.42 + o, 0.94 + o, 0.022, 0.04), 'W');
  },
};

/** Algarismo 7 no tambor de centro (cx, cy), com meia altura `h`. */
function seven(cx: number, cy: number, h: number, w: number): Sdf {
  return union(
    stroke(cx - h * 0.55, cy - h, cx + h * 0.55, cy - h, w),
    stroke(cx + h * 0.55, cy - h, cx - h * 0.2, cy + h, w),
  );
}

export const JACKPOT: IconRecipe = {
  plate: {
    halo: [
      [0.22, 'g'],
      [0.46, 'g'],
    ],
    domain: true,
  },
  draw: (c) => {
    const small = c.size < 32;
    const p = c.px;
    const frame = box(0.5, 0.56, 0.4, 0.24, 0.06);
    // No pequeno, sem traço interno: a linha de 1 texel comeria a moldura e os tambores.
    const line = small ? undefined : 'z';
    c.fill(frame, bevelInk(frame, p, 'a', 'A', 'z', small ? 1 : 1.5), { line });
    for (const k of [-1, 0, 1]) {
      const cx = 0.5 + k * 0.25;
      const drum = box(cx, 0.56, small ? 0.085 : 0.09, small ? 0.15 : 0.17, 0.02);
      c.fill(drum, (_x, y) => (Math.abs(y - 0.56) > 0.12 ? 'I' : 'w'), { line });
      c.fill(seven(cx, 0.56, small ? 0.085 : 0.07, small ? p * 0.5 : p * 0.9), 'R');
    }
    c.fill(star(0.76, 0.24, 4, small ? 0.13 : 0.14, 0.04), 'w', { line: small ? undefined : 'A' });
    if (!small) c.fill(star(0.2, 0.2, 4, 0.08, 0.025), 'A');
  },
};

/** O contorno da mão afastado `gap` texels da silhueta, com `w` texels de espessura. */
function aura(c: IconCanvas, hand: Sdf, gap: number, w: number): Sdf {
  const p = c.px;
  return (x, y) => Math.abs(hand(x, y) - gap * p) - w * p * 0.5;
}

export const AMPLIFICACAO: IconRecipe = {
  plate: {
    halo: [
      [0.3, 'N'],
      [0.44, 'n'],
    ],
    at: [0.5, 0.55],
    domain: true,
  },
  draw: (c) => {
    const small = c.size < 32;
    const [cx, cy, s] = small ? [0.53, 0.64, 0.34] : [0.51, 0.63, 0.31];
    const { palm: body, fingers, thumb } = palmShape(cx, cy, s);
    const hand = union(body, thumb, ...fingers);
    c.fill(aura(c, hand, small ? 1.6 : 4, small ? 1 : 2), 'W');
    if (!small) c.fill(aura(c, hand, 8, 1.2), 'C');
    // Mão clara (a escura some no ícone pequeno), igual nos dois tamanhos para a carta e o slot se reconhecerem.
    palm(c, cx, cy, s, ['d', 'c', 'C', 'W']);
  },
};
