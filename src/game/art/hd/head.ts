/*
 * Cabeça procedural do player HD (~15 texels do queixo ao alto do crânio, mais os espetos do cabelo). Tudo é definido
 * no sistema local da cabeça: origem na junta do pescoço, `u` para o alto do crânio e `f` para a frente do rosto. A
 * cabeça inclina junto com o pescoço porque o sistema gira; as feições têm posição escolhida à mão.
 * Identidade: cabelo escuro espetado em mechas, franja caindo sobre a testa, olho claro com íris escura.
 */
import { MAT } from './palette';
import type { HdCanvas, Normal } from './raster';
import { domeShade, inLocal, localEllipse, localRect, localTri, type Local, type LocalShape } from './shapes';

/** Expressão: `focus` (idle, concentrado) ou `effort` (golpe: sobrancelha baixa e boca aberta). */
export type Expression = 'focus' | 'effort';

/** Volume do cabelo: a cúpula que sombreia a massa e os espetos. */
const HAIR_SHADE = domeShade(-0.6, 9.4, 8.5, 9);

type Pt = readonly [number, number];

/** Espetos de trás e da nuca (pintados antes do rosto). */
const BACK_SPIKES: readonly (readonly [Pt, Pt, Pt])[] = [
  [
    [-5.2, 12.6],
    [-2.2, 14.2],
    [-8.6, 16.2],
  ],
  [
    [-6.4, 8.4],
    [-5.2, 12.2],
    [-10.2, 11.6],
  ],
  [
    [-5.6, 4.6],
    [-6.6, 8.6],
    [-9.4, 6.2],
  ],
];

/** Espetos de cima e a franja (pintados depois do rosto). */
const TOP_SPIKES: readonly (readonly [Pt, Pt, Pt])[] = [
  [
    [-3.4, 14],
    [0.4, 14.8],
    [-3.2, 19.4],
  ],
  [
    [-0.6, 14.6],
    [3.4, 14],
    [1.6, 19.8],
  ],
  [
    [2.2, 14.2],
    [5.4, 12.4],
    [6.4, 17.6],
  ],
  // Franja: duas mechas que descem sobre a testa.
  [
    [3.2, 13.4],
    [6.3, 12.2],
    [6.7, 10.6],
  ],
  [
    [0.6, 13.2],
    [3.8, 13],
    [3.6, 11.2],
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
const face: LocalShape = (f, u) => {
  if (localEllipse(0.7, 8.4, 5.9, 6.3)(f, u)) return faceShade(f, u);
  if (u < 1 || u > 7.2 || f < -3.2) return null;
  // Linha da frente da mandíbula: do malar ao queixo.
  const front = 3.6 + ((u - 1) * 2.6) / 6.2;
  const back = -3.2 + (7.2 - u) * 0.35;
  return f > front || f < back ? null : faceShade(f, u);
};

/** Nariz: uma cunha que sai da linha do rosto. */
const nose: LocalShape = (f, u) => {
  const k = 1 - Math.abs(u - 6.7) / 1.5;
  if (k <= 0 || f < 5 || f > 6.1 + 1.5 * k) return null;
  return { x: 0.5, y: u > 6.7 ? 0.35 : -0.4, z: 0.75 };
};

/** Cabelo sobre o crânio: a casca de cima, acima da linha do cabelo. */
const scalp: LocalShape = (f, u) => {
  if (u < hairline(f)) return null;
  // A luz de recorte só acende no alto da calota: mais embaixo ela vira texel solto na nuca.
  return localEllipse(-0.2, 9.2, 7, 6.9)(f, u) ? { ...HAIR_SHADE(f, u), noRim: u < 11 } : null;
};

function paintHair(c: HdCanvas, l: Local, part: number, spikes: typeof TOP_SPIKES, bias = 0): void {
  for (const [a, b, d] of spikes) c.paint(inLocal(l, localTri(a, b, d, HAIR_SHADE)), MAT.hair, part, { bias });
}

function paintFeatures(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  const effort = expr === 'effort';
  const on = { onlyOn: part };
  // Orelha: atrás do rosto, com a sombra de dentro.
  c.paint(inLocal(l, localEllipse(-2, 7.3, 1.5, 2.1)), MAT.skin, part, { ...on, flat: 2 });
  c.paint(inLocal(l, localEllipse(-1.9, 7.3, 0.7, 1.2)), MAT.skin, part, { ...on, flat: 1 });
  // Olho: branco atrás e íris escura na frente (o olhar vai para o alvo). No foco a íris tem 2x2 com um brilho; no
  // esforço o olho estreita para uma linha, a íris fica num texel e a sobrancelha pesa por cima.
  const top = effort ? 8.6 : 9.4;
  const low = effort ? 7.6 : 7.4;
  c.paint(inLocal(l, localRect(2.5, 5.5, low, top)), MAT.white, part, { ...on, flat: 3 });
  c.paint(inLocal(l, localRect(4, 5.5, low, top)), MAT.hair, part, { ...on, flat: 0 });
  if (!effort) c.paint(inLocal(l, localRect(4.75, 5.5, 8.4, top)), MAT.white, part, { ...on, flat: 4 });
  const brow = top + (effort ? 0 : 1);
  c.paint(
    inLocal(l, (f, u) => {
      const base = brow + (5.8 - f) * (effort ? 0.4 : 0.12);
      return f >= 2 && f <= 6 && u >= base && u <= base + 1 ? { x: 0, y: 0, z: 1 } : null;
    }),
    MAT.hair,
    part,
    { ...on, flat: effort ? 0 : 1 },
  );
  // Boca: linha fechada no foco; aberta, com a fileira de dentes em cima, no esforço.
  if (effort) {
    c.paint(inLocal(l, localRect(2.2, 3.9, 2.8, 4.8)), MAT.skin, part, { ...on, flat: 0 });
    c.paint(inLocal(l, localRect(2.6, 3.9, 3.8, 4.8)), MAT.white, part, { ...on, flat: 3 });
  } else {
    c.paint(inLocal(l, localRect(2.6, 4.6, 3.4, 4.4)), MAT.skin, part, { ...on, flat: 1 });
  }
}

/** Pinta a cabeça inteira na parte `part`, no sistema local `l` (origem na junta do pescoço). */
export function paintHead(c: HdCanvas, l: Local, part: number, expr: Expression): void {
  c.paint(inLocal(l, localEllipse(-1.6, 9, 6.6, 6.6)), MAT.hair, part, { bias: -1 });
  paintHair(c, l, part, BACK_SPIKES, -1);
  c.paint(inLocal(l, face), MAT.skin, part);
  c.paint(inLocal(l, nose), MAT.skin, part);
  paintFeatures(c, l, part, expr);
  c.paint(inLocal(l, scalp), MAT.hair, part, { rim: true });
  paintHair(c, l, part, TOP_SPIKES);
}
