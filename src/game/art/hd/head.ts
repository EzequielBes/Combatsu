/*
 * Cabeça procedural do player HD (~15 texels do queixo ao alto do crânio, mais os espetos do cabelo). Tudo é definido
 * no sistema local da cabeça: origem na junta do pescoço, `u` para o alto do crânio e `f` para a frente do rosto. A
 * cabeça inclina junto com o pescoço porque o sistema gira; as feições têm posição escolhida à mão.
 * Identidade: cabelo escuro espetado em mechas, franja caindo sobre a testa, olho claro com íris escura.
 */
import { MAT } from './palette';
import type { HdCanvas, Normal } from './raster';
import { boxed, domeShade, inLocal, localEllipse, localRect, localTri, type Local, type LocalShape } from './shapes';

/**
 * Expressão: `focus` (idle, concentrado), `effort` (golpe: sobrancelha baixa e boca aberta) ou `pain` (levando golpe:
 * olho fechado numa linha, sobrancelha caída para fora e os dentes cerrados).
 */
export type Expression = 'focus' | 'effort' | 'pain';

type Pt = readonly [number, number];

/** Volume do cabelo: a cúpula que sombreia a massa e os espetos. */
const HAIR_SHADE = domeShade(-0.6, 9.4, 8.5, 9);

/** Mecha: os dois pontos da base (o da frente primeiro) e a ponta, no sistema local da cabeça. */
type Spike = readonly [front: Pt, back: Pt, tip: Pt];

/** Mechas de trás e da nuca, varridas para trás (pintadas antes do rosto). */
const BACK_SPIKES: readonly Spike[] = [
  [
    [-5, 12.6],
    [-6.6, 9.6],
    [-10.4, 12.6],
  ],
  [
    [-4.2, 13.6],
    [-6.6, 10.2],
    [-9.2, 15.2],
  ],
  [
    [-6.2, 10.8],
    [-6.8, 6.8],
    [-9.8, 9.2],
  ],
  [
    [-6.4, 7.2],
    [-5.2, 3.6],
    [-8.2, 4.6],
  ],
];

/** Mechas de cima, longas e afiadas, da testa à coroa (pintadas depois do rosto). */
const TOP_SPIKES: readonly Spike[] = [
  [
    [-1.4, 14.8],
    [-5, 13.2],
    [-7, 18.6],
  ],
  [
    [1.8, 14.6],
    [-2.2, 14.6],
    [-1.8, 20],
  ],
  [
    [4.8, 13.4],
    [1, 14.4],
    [4.4, 18.4],
  ],
  // Topete: a mecha da frente sai da testa para a frente e para cima.
  [
    [6.5, 11.8],
    [3.6, 13.6],
    [8.4, 14.6],
  ],
];

/** Franja: duas mechas curtas que descem sobre a testa. */
const FRINGE: readonly Spike[] = [
  [
    [6.6, 12.2],
    [4.2, 13.2],
    [6.9, 10.4],
  ],
  [
    [4.2, 13.2],
    [1.4, 13.2],
    [3.8, 11.2],
  ],
];

/** Linha do cabelo: acima dela o crânio é cabelo. Sobe na testa e desce atrás da orelha até a nuca. */
function hairline(f: number): number {
  if (f >= 0.4) return 12.4 + (f - 0.4) * 0.1;
  if (f >= -2.6) return 12.4 + (f - 0.4) * 2;
  return 4.6;
}

/** Luz do rosto: um plano quase de frente para a luz, que escurece de leve para trás e para o queixo. */
const faceShade = (f: number, u: number): Normal => {
  const x = 0.25 + ((f - 0.7) / 5.9) * 0.5;
  const y = ((u - 8.4) / 6.3) * 0.45;
  return { x, y, z: Math.sqrt(Math.max(0.05, 1 - x * x - y * y)) };
};

/** Rosto: o crânio (elipse) e a mandíbula, que afina até o queixo. */
const face: LocalShape = boxed(
  (f, u) => {
    if (localEllipse(0.7, 8.4, 5.9, 6.3)(f, u)) return faceShade(f, u);
    if (u < 1 || u > 7.2 || f < -3.2) return null;
    // Linha da frente da mandíbula: do malar ao queixo.
    const front = 3.6 + ((u - 1) * 2.6) / 6.2;
    const back = -3.2 + (7.2 - u) * 0.35;
    return f > front || f < back ? null : faceShade(f, u);
  },
  [-4, 7, 0.5, 15],
);

/** Nariz: uma cunha que sai da linha do rosto. */
const nose: LocalShape = boxed(
  (f, u) => {
    const k = 1 - Math.abs(u - 6.7) / 1.5;
    if (k <= 0 || f < 5 || f > 6.1 + 1.5 * k) return null;
    return { x: 0.5, y: u > 6.7 ? 0.35 : -0.4, z: 0.75 };
  },
  [4.5, 8, 5, 8.5],
);

/** Cabelo sobre o crânio: a casca de cima, acima da linha do cabelo. */
const scalp: LocalShape = boxed(
  (f, u) => {
    if (u < hairline(f)) return null;
    // A luz de recorte só acende no alto da calota: mais embaixo ela vira texel solto na nuca.
    return localEllipse(-0.8, 9.2, 7.4, 6.9)(f, u) ? { ...HAIR_SHADE(f, u), noRim: u < 11 || f < -3.5 } : null;
  },
  [-8.5, 7.5, 2, 16.5],
);

/**
 * Pinta as mechas: cada uma inteira num tom abaixo do volume e, por cima, a metade da frente (do ponto da frente da
 * base até a ponta) no tom do volume. A face clara de cada mecha dá o corte facetado do cabelo.
 */
function paintHair(c: HdCanvas, l: Local, part: number, spikes: readonly Spike[], bias: number): void {
  for (const [front, back, tip] of spikes) {
    const mid: Pt = [(front[0] + back[0]) / 2, (front[1] + back[1]) / 2];
    c.paint(inLocal(l, localTri(front, back, tip, HAIR_SHADE)), MAT.hair, part, { bias: bias - 1 });
    c.paint(inLocal(l, localTri(front, mid, tip, HAIR_SHADE)), MAT.hair, part, { bias });
  }
}

/** O que muda no rosto em cada expressão: a abertura do olho, a sobrancelha e a boca. */
interface Face {
  /** Linha de baixo e de cima do olho. */
  low: number;
  top: number;
  /** Olho fechado: só a linha da pálpebra, sem branco. */
  closed?: boolean;
  /** Brilho na íris (só com o olho bem aberto). */
  shine?: boolean;
  /** Texels de pele entre o olho e a sobrancelha, inclinação dela (positiva desce para o nariz) e o tom. */
  browGap: number;
  browSlope: number;
  browTone: number;
}

const FACES: Record<Expression, Face> = {
  focus: { low: 7.4, top: 9.4, shine: true, browGap: 1, browSlope: 0.12, browTone: 1 },
  effort: { low: 7.6, top: 8.6, browGap: 0, browSlope: 0.4, browTone: 0 },
  pain: { low: 7.6, top: 8.6, closed: true, browGap: 0.6, browSlope: -0.3, browTone: 0 },
};

/** Olho: branco atrás e íris escura na frente (o olhar vai para o alvo); fechado, só a linha da pálpebra. */
function paintEye(c: HdCanvas, l: Local, part: number, face: Face): void {
  const on = { onlyOn: part };
  if (face.closed) {
    c.paint(inLocal(l, localRect(2.5, 5.5, face.low, face.top)), MAT.hair, part, { ...on, flat: 0 });
    return;
  }
  c.paint(inLocal(l, localRect(2.5, 5.5, face.low, face.top)), MAT.white, part, { ...on, flat: 3 });
  c.paint(inLocal(l, localRect(4, 5.5, face.low, face.top)), MAT.hair, part, { ...on, flat: 0 });
  if (face.shine) c.paint(inLocal(l, localRect(4.75, 5.5, 8.4, face.top)), MAT.white, part, { ...on, flat: 4 });
}

/** Boca: linha fechada no foco; aberta com os dentes em cima no esforço; dentes cerrados na dor. */
function paintMouth(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  const on = { onlyOn: part };
  if (expr === 'focus') {
    c.paint(inLocal(l, localRect(2.6, 4.6, 3.4, 4.4)), MAT.skin, part, { ...on, flat: 1 });
    return;
  }
  c.paint(inLocal(l, localRect(2.2, 3.9, 2.8, 4.8)), MAT.skin, part, { ...on, flat: 0 });
  const teeth = expr === 'pain' ? localRect(2.2, 3.9, 2.8, 3.8) : localRect(2.6, 3.9, 3.8, 4.8);
  c.paint(inLocal(l, teeth), MAT.white, part, { ...on, flat: 3 });
}

function paintFeatures(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  const face = FACES[expr];
  const on = { onlyOn: part };
  // Orelha: atrás do rosto, com a sombra de dentro.
  c.paint(inLocal(l, localEllipse(-2, 7.3, 1.5, 2.1)), MAT.skin, part, { ...on, flat: 3 });
  c.paint(inLocal(l, localEllipse(-1.9, 7.3, 0.7, 1.2)), MAT.skin, part, { ...on, flat: 1 });
  paintEye(c, l, part, face);
  // Sobrancelha: no foco deixa uma linha de pele acima do olho; no esforço desce sobre ele, pesada; na dor levanta
  // do lado do nariz.
  const brow = face.top + face.browGap;
  const line = boxed(
    (f, u) => {
      const base = brow + (5.8 - f) * face.browSlope;
      return f >= 2 && f <= 6 && u >= base && u <= base + 1 ? { x: 0, y: 0, z: 1 } : null;
    },
    [1.5, 6.5, 7, 13.5],
  );
  c.paint(inLocal(l, line), MAT.hair, part, { ...on, flat: face.browTone });
  paintMouth(c, l, part, expr);
}

/** Pinta a cabeça inteira na parte `part`, no sistema local `l` (origem na junta do pescoço). */
export function paintHead(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  c.paint(inLocal(l, localEllipse(-1.8, 9, 6.6, 6.2)), MAT.hair, part, { bias: -2 });
  paintHair(c, l, part, BACK_SPIKES, -1);
  c.paint(inLocal(l, face), MAT.skin, part);
  c.paint(inLocal(l, nose), MAT.skin, part);
  paintFeatures(c, l, part, expr);
  c.paint(inLocal(l, scalp), MAT.hair, part, { rim: true, bias: -1 });
  paintHair(c, l, part, TOP_SPIKES, 1);
  paintHair(c, l, part, FRINGE, -1);
}
