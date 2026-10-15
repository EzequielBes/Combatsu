/*
 * Placa dos ícones HD: o quadrado de cantos redondos que todo ícone de técnica tem embaixo do símbolo. Contorno
 * quase preto, face marinho-escura com o chanfro de 1 texel (luz de cima e da esquerda) e o halo da cor da técnica
 * atrás do símbolo, em faixas pontilhadas. O Domínio ganha uma segunda moldura, roxa, por dentro da primeira: é a
 * ultimate, e a carta precisa ler a diferença antes do desenho. Puro, sem `phaser`.
 */
import { bevelInk, type IconCanvas, type Ink } from './canvas';
import { box, circle, inter, minus } from './sdf';

/** Halo atrás do símbolo: `[raio, chave]` do centro para fora; a última faixa é pontilhada com a face. */
export type Halo = readonly (readonly [number, string])[];

export interface PlateStyle {
  halo: Halo;
  /** Centro do halo (padrão: o meio do ícone). */
  at?: readonly [number, number];
  /** Moldura dupla do Domínio. */
  domain?: boolean;
}

/** Receita de um ícone: a placa e o desenho do símbolo por cima dela. */
export interface IconRecipe {
  plate: PlateStyle;
  draw: (c: IconCanvas) => void;
}

const FACE = 'K';

/** Halo em faixas: a última faixa alterna com a face num xadrez, para o halo apagar sem degrau duro. */
function haloInk(cx: number, cy: number, halo: Halo, px: number): Ink {
  return (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    const last = halo.length - 1;
    for (let k = 0; k < last; k++) if (d <= halo[k][0]) return halo[k][1];
    const odd = (Math.floor(x / px) + Math.floor(y / px)) % 2 === 1;
    return odd ? halo[last][1] : FACE;
  };
}

/** Desenha a placa inteira (contorno, face com chanfro, halo e, no Domínio, a moldura de dentro). */
export function drawPlate(c: IconCanvas, style: PlateStyle): void {
  const p = c.px;
  const round = c.size >= 32 ? 0.16 : 0.18;
  const outer = box(0.5, 0.5, 0.5, 0.5, round);
  const face = box(0.5, 0.5, 0.5 - p, 0.5 - p, round - p);
  c.back(outer, 'k');
  c.back(face, bevelInk(face, p, FACE, 'n', 'e', 1));
  const [cx, cy] = style.at ?? [0.5, 0.5];
  const reach = style.halo[style.halo.length - 1][0];
  const inner = box(0.5, 0.5, 0.5 - 2 * p, 0.5 - 2 * p, round - 2 * p);
  c.back(inter(circle(cx, cy, reach), inner), haloInk(cx, cy, style.halo, p));
  const gap = style.domain ? (c.size >= 32 ? 3 : 1) : 0;
  if (style.domain) {
    const ring = box(0.5, 0.5, 0.5 - gap * p, 0.5 - gap * p, round - gap * p);
    c.back(minus(ring, box(0.5, 0.5, 0.5 - (gap + 1) * p, 0.5 - (gap + 1) * p, round - (gap + 1) * p)), 'u');
  }
  // O símbolo fica a 2 texels da borda, e o contorno dele cai na beira da face; no Domínio, o contorno do símbolo
  // encosta por dentro da moldura roxa, sem cobri-la.
  const edge = style.domain ? gap + 2 : 2;
  c.clip = box(0.5, 0.5, 0.5 - edge * p, 0.5 - edge * p, Math.max(p, round - edge * p));
}
