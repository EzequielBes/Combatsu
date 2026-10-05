/*
 * Rosto do player HD, de perfil, no sistema local da cabeça (origem na junta do pescoço, `u` para o alto do crânio e
 * `f` para a frente). O contorno da frente é uma linha desenhada à mão (testa reta, nariz curto e alto, lábios e
 * queixo); os tons também são escolhidos à mão e giram com a cabeça, como num sprite desenhado.
 * Identidade: sobrancelha escura e inclinada sempre presente, olho estreito com a linha da pálpebra, íris escura.
 */
import { MAT } from './palette';
import type { HdCanvas, Normal } from './raster';
import { boxed, inLocal, localEllipse, localRect, type Local, type LocalShape } from './shapes';

/**
 * Expressão: `focus` (idle, concentrado), `effort` (golpe: sobrancelha baixa e dentes cerrados), `pain` (levando
 * golpe: olho fechado, sobrancelha levantada do lado do nariz e a boca torta) ou `shout` (o grito dos golpes mais
 * fortes: sobrancelha pesada e o queixo caído com a boca escancarada).
 */
export type Expression = 'focus' | 'effort' | 'pain' | 'shout';

type Pt = readonly [number, number];

const FLAT: Normal = { x: 0, y: 0, z: 1 };

/** Contorno da frente do rosto, de cima para baixo: pontos `[u, f]`. Abaixo de `JAW_FROM` os pontos descem no grito. */
const PROFILE: readonly Pt[] = [
  [12.8, 5.9],
  [10.4, 6.4],
  [9.3, 6.6],
  [8.1, 6.1],
  [6.5, 7.9],
  [6.05, 7.8],
  [5.7, 6.4],
  [4.6, 6.4],
  [3.9, 6],
  [3.2, 6.2],
  [2.6, 5.7],
  [1.9, 5.9],
  [1.1, 4.9],
];
const JAW_FROM = 3.9;

/** Ângulo da mandíbula (sob a orelha) e quanto a linha de baixo sobe do queixo até ele, por texel. */
const JAW_ANGLE: Pt = [-1.8, 3.5];
const JAW_RISE = 0.36;

/** Frente do rosto na altura `u`, com o queixo `drop` texels mais baixo. */
function frontAt(u: number, drop: number): number {
  let prev = PROFILE[0];
  for (const p of PROFILE) {
    const pu = p[0] < JAW_FROM ? p[0] - drop : p[0];
    const qu = prev[0] < JAW_FROM ? prev[0] - drop : prev[0];
    if (u >= pu) return p === prev ? p[1] : prev[1] + ((p[1] - prev[1]) * (qu - u)) / (qu - pu);
    prev = p;
  }
  return -99;
}

/** Linha de baixo da mandíbula em `f`: sobe do queixo até o ângulo, sob a orelha. */
const jawLine = (f: number, drop: number): number => 1.1 - drop + (4.9 - f) * (JAW_RISE + drop * 0.14);

/** O ponto está no rosto? O crânio (elipse) em cima e a mandíbula embaixo, cortados pela linha da frente. */
function inFace(f: number, u: number, drop: number): boolean {
  if (f > frontAt(u, drop)) return false;
  // Na frente quem manda é a linha do perfil; a elipse só fecha o crânio atrás e em cima.
  if (u >= 5.6) return f > 0.7 ? u <= 12.8 : localEllipse(0.7, 8.4, 5.9, 6.3)(f, u) !== null;
  // Ramo da mandíbula: do ângulo até o lóbulo da orelha.
  return u >= jawLine(f, drop) && f >= JAW_ANGLE[0] - (u - JAW_ANGLE[1]) * 0.3;
}

/** Tom da pele em cada ponto do rosto: base clara, luz na testa e no malar, sombra sob a mandíbula e para trás. */
function skinTone(f: number, u: number, drop: number): number {
  const front = frontAt(u, drop);
  if (u < jawLine(f, drop) + 1 && f < 4.4) return f < 0.6 ? 1 : 2;
  if (f < -0.4 + (6 - u) * 0.5 && u < 7) return 2;
  // Sob o lábio de baixo.
  if (u < 3.1 - drop && u >= 2.3 - drop && f > 3.6 && f < front - 0.8) return 2;
  return lit(f, u, front) ? 4 : 3;
}

/** Luz na testa e no dorso do nariz. */
const lit = (f: number, u: number, front: number): boolean =>
  (u > 9.6 && u < 12.6 && f > front - 1.8) || (u > 5.9 && u < 7.2 && f > front - 1.7);

/** O que muda no rosto em cada expressão. */
interface Look {
  /** Queixo caído (texels): a boca escancarada do grito. */
  drop: number;
  /** Olho: aberto com brilho, estreito ou fechado. */
  eye: 'open' | 'narrow' | 'wide' | 'shut';
  /** Texels de pele entre a pálpebra e a sobrancelha e a inclinação dela (positiva desce para o nariz). */
  browGap: number;
  browSlope: number;
}

const LOOKS: Record<Expression, Look> = {
  focus: { drop: 0, eye: 'open', browGap: 1, browSlope: 0.18 },
  effort: { drop: 0, eye: 'narrow', browGap: -1, browSlope: 0.34 },
  pain: { drop: 0, eye: 'shut', browGap: 0.8, browSlope: -0.3 },
  shout: { drop: 1, eye: 'wide', browGap: 0, browSlope: 0.46 },
};

/** Linha de cima do olho (a pálpebra fica logo acima). */
const EYE_TOP = 8;

/** Faixa inclinada de 1 texel de altura, de `f0` a `f1`: `base` é a altura de baixo em `f1`. */
const slanted = (f0: number, f1: number, base: number, slope: number): LocalShape =>
  boxed(
    (f, u) => {
      const b = base + (f1 - f) * slope;
      return f >= f0 && f <= f1 && u >= b && u <= b + 1 ? FLAT : null;
    },
    [f0, f1, base - 3, base + 4],
  );

/** Olho: a linha escura da pálpebra em cima; embaixo, um texel de branco atrás e a íris escura na frente. */
function paintEye(c: HdCanvas, l: Local, part: number, look: Look): void {
  const on = { onlyOn: part };
  if (look.eye === 'shut') {
    // Apertado de dor: uma linha só, caindo para trás.
    c.paint(inLocal(l, slanted(2.6, 5.6, EYE_TOP - 0.9, 0.3)), MAT.hair, part, { ...on, flat: 0 });
    return;
  }
  const row = (f0: number, f1: number, mat: number, tone: number): void =>
    c.paint(inLocal(l, localRect(f0, f1, EYE_TOP - 1, EYE_TOP)), mat, part, { ...on, flat: tone });
  // No esforço a sobrancelha desce e faz as vezes da pálpebra.
  if (look.eye !== 'narrow')
    c.paint(inLocal(l, localRect(2.7, 5.8, EYE_TOP, EYE_TOP + 1)), MAT.hair, part, { ...on, flat: 0 });
  if (look.eye === 'wide') {
    // Olho arregalado do grito: mais branco e a íris pequena.
    row(2.9, 4.8, MAT.white, 4);
    return row(4.8, 5.7, MAT.hair, 0);
  }
  row(2.9, 3.9, MAT.white, look.eye === 'open' ? 4 : 3);
  row(3.9, 5.7, MAT.hair, 1);
}

/** Boca: um traço curto no foco; dentes cerrados no esforço e na dor; escancarada, com os dentes em cima, no grito. */
function paintMouth(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  const on = { onlyOn: part };
  const dark = (s: LocalShape, tone = 0): void => c.paint(inLocal(l, s), MAT.skin, part, { ...on, flat: tone });
  const teeth = (s: LocalShape): void => c.paint(inLocal(l, s), MAT.white, part, { ...on, flat: 4 });
  if (expr === 'focus') {
    dark(localRect(4.3, 5.3, 3.4, 4.4), 1);
    return dark(localRect(5.3, 6.9, 3.4, 4.4));
  }
  // Na dor a boca é um traço torto, caindo para trás.
  if (expr === 'pain') return dark(slanted(3.2, 6.9, 3.8, -0.3));
  if (expr === 'shout') {
    c.paint(inLocal(l, localRect(2.8, 6.9, 2.4, 4.5)), MAT.hair, part, { ...on, flat: 1 });
    dark(localRect(3.6, 5.6, 2.4, 3.2));
    return teeth(localRect(3.7, 5.5, 3.5, 4.5));
  }
  // Dentes cerrados: o canto da boca puxado para trás, os dentes à mostra e o lábio fechando na frente.
  dark(localRect(2.7, 6.9, 3.4, 4.4));
  teeth(localRect(3.7, 5.5, 3.4, 4.4));
}

/** Orelha pequena sob o cabelo, com a sombra de dentro. */
function paintEar(c: HdCanvas, l: Local, part: number): void {
  const on = { onlyOn: part };
  c.paint(inLocal(l, localEllipse(-2, 7.1, 1.3, 1.8)), MAT.skin, part, { ...on, flat: 3 });
  c.paint(inLocal(l, localEllipse(-1.8, 7.2, 0.6, 0.9)), MAT.skin, part, { ...on, flat: 1 });
}

/**
 * Pinta o rosto (pele, orelha, olho, sobrancelha e boca) na parte `part`. O cabelo de trás já está pintado e o de
 * cima vem depois, por cima da testa e da orelha.
 */
export function paintFace(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  const look = LOOKS[expr];
  for (let tone = 1; tone <= 4; tone++) {
    const shape = boxed(
      (f, u) => (inFace(f, u, look.drop) && skinTone(f, u, look.drop) === tone ? FLAT : null),
      [-5.5, 8, -0.5, 15],
    );
    c.paint(inLocal(l, shape), MAT.skin, part, { flat: tone });
  }
  paintEar(c, l, part);
  paintEye(c, l, part, look);
  const brow = slanted(2.3, 6.3, EYE_TOP + 1 + look.browGap, look.browSlope);
  c.paint(inLocal(l, brow), MAT.hair, part, { onlyOn: part, flat: 0 });
  paintMouth(c, l, part, expr);
}
