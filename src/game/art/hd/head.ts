/*
 * Cabeça procedural do player HD (~15 texels do queixo ao alto do crânio, mais os espetos do cabelo). Tudo é definido
 * no sistema local da cabeça: origem na junta do pescoço, `u` para o alto do crânio e `f` para a frente do rosto. A
 * cabeça inclina junto com o pescoço porque o sistema gira; as feições têm posição escolhida à mão.
 * Identidade: cabelo escuro espetado em mechas, franja caindo sobre a testa, olho claro com íris escura.
 */
import type { Vec2 } from '../rig/skeleton';
import { paintFace, type Expression } from './face';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import { boxed, domeShade, inLocal, localEllipse, localTri, type Local, type LocalShape } from './shapes';

export type { Expression } from './face';

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

/**
 * Linha do cabelo: acima dela o crânio é cabelo. Reta na testa, desce pela têmpora até a ponta da costeleta, passa
 * por cima da orelha e cai atrás dela até a nuca.
 */
function hairline(f: number): number {
  if (f >= 1.4) return 12.4 + (f - 1.4) * 0.1;
  if (f >= -0.8) return 7.6 + (f + 0.8) * 2.18;
  if (f >= -3.3) return 8.9;
  return 4.6;
}

/** Cabelo sobre o crânio: a casca de cima, acima da linha do cabelo. */
const scalp: LocalShape = boxed(
  (f, u) => {
    if (u < hairline(f)) return null;
    // A luz de recorte só acende no alto da calota: mais embaixo ela vira texel solto na nuca.
    return localEllipse(-0.8, 9.2, 7.4, 6.9)(f, u) ? { ...HAIR_SHADE(f, u), noRim: u < 11 || f < -3.5 } : null;
  },
  [-8.5, 7.5, 2, 16.5],
);

/** Comprimento da mecha (da base à ponta) que leva o desvio inteiro; as mais curtas levam em proporção. */
const FULL_SWAY_LENGTH = 5.5;

/** Desvio de tela (`sway`, texels) no sistema local da cabeça. */
const leanOf = (l: Local, sway?: Vec2): Pt =>
  sway ? [sway.x * l.fwd.x + sway.y * l.fwd.y, sway.x * l.up.x + sway.y * l.up.y] : [0, 0];

/**
 * Pinta as mechas: cada uma inteira num tom abaixo do volume e, por cima, a metade da frente (do ponto da frente da
 * base até a ponta) no tom do volume. A face clara de cada mecha dá o corte facetado do cabelo. `lean` desloca a
 * ponta (a base fica presa ao crânio): é o cabelo atrasando em relação à cabeça.
 */
function paintHair(c: HdCanvas, l: Local, part: number, spikes: readonly Spike[], bias: number, lean: Pt): void {
  for (const [front, back, rest] of spikes) {
    const mid: Pt = [(front[0] + back[0]) / 2, (front[1] + back[1]) / 2];
    const w = Math.min(1, Math.hypot(rest[0] - mid[0], rest[1] - mid[1]) / FULL_SWAY_LENGTH);
    const tip: Pt = [rest[0] + lean[0] * w, rest[1] + lean[1] * w];
    c.paint(inLocal(l, localTri(front, back, tip, HAIR_SHADE)), MAT.hair, part, { bias: bias - 1 });
    c.paint(inLocal(l, localTri(front, mid, tip, HAIR_SHADE)), MAT.hair, part, { bias });
  }
}

/**
 * Pinta a cabeça inteira na parte `part`, no sistema local `l` (origem na junta do pescoço). `sway` (texels de tela)
 * arrasta as pontas das mechas.
 */
export function paintHead(c: HdCanvas, l: Local, part: number, expr: Expression, sway?: Vec2): void {
  const lean = leanOf(l, sway);
  c.paint(inLocal(l, localEllipse(-1.8, 9, 6.6, 6.2)), MAT.hair, part, { bias: -2 });
  paintHair(c, l, part, BACK_SPIKES, -1, lean);
  paintFace(c, l, part, expr);
  c.paint(inLocal(l, scalp), MAT.hair, part, { rim: true, bias: -1 });
  paintHair(c, l, part, TOP_SPIKES, 1, lean);
  paintHair(c, l, part, FRINGE, -1, lean);
}

/** Mechas da cabeça vista por trás: as de cima abertas em leque e as dos lados, mais curtas, caindo para fora. */
const REAR_SPIKES: readonly Spike[] = [
  [
    [-1.6, 14.4],
    [-5.2, 12.6],
    [-6.8, 18],
  ],
  [
    [1.6, 14.8],
    [-2, 14.8],
    [-0.6, 19.8],
  ],
  [
    [5.2, 12.6],
    [1.6, 14.4],
    [5.6, 18.2],
  ],
  [
    [-5.4, 12.4],
    [-6.6, 8.6],
    [-9.6, 11.6],
  ],
  [
    [5.4, 12.4],
    [6.6, 8.6],
    [9.4, 12],
  ],
  // Nuca: três pontas que descem sobre o pescoço.
  [
    [-1.6, 4.4],
    [-5, 5],
    [-4, 1.8],
  ],
  [
    [1.8, 4],
    [-1.8, 4],
    [0, 1.2],
  ],
  [
    [5, 5],
    [1.6, 4.4],
    [4, 2],
  ],
];

/** Volume da cabeça vista por trás: uma cúpula centrada, sem rosto. */
const REAR_SHADE = domeShade(0, 9, 8, 8.4);

/**
 * Pinta a cabeça vista por trás (o corpo de costas para a câmera no meio de um giro): só a massa do cabelo com as
 * mechas, as duas orelhas saindo dos lados e as pontas da nuca sobre o pescoço.
 */
export function paintHeadBack(c: HdCanvas, l: Local, part: number, sway?: Vec2): void {
  for (const f of [-6.2, 6.2]) c.paint(inLocal(l, localEllipse(f, 7.2, 1.3, 2)), MAT.skin, part, { flat: 1 });
  const mass: LocalShape = boxed(
    (f, u) => (localEllipse(0, 9, 6.5, 6.3)(f, u) ? { ...REAR_SHADE(f, u), noRim: u < 11 } : null),
    [-6.5, 6.5, 2.7, 15.3],
  );
  c.paint(inLocal(l, mass), MAT.hair, part, { rim: true, bias: -1 });
  paintHair(c, l, part, REAR_SPIKES, 0, leanOf(l, sway));
}
