/*
 * Folha `dogs`: os Cães Divinos de Megumi (JJK), shikigami de sombra. Silhueta preta (`b`) com o olho branco (`W`),
 * a borda de cima e as patas do lado de lá no roxo escuro (`v`) da energia amaldiçoada: separam as patas do corpo e
 * não deixam o cão sumir no céu noturno. Quadros de 24x16 texels, 1 texel = 1 px, virado para a direita
 * (o jogo espelha), patas na última linha. O lobo da Totalidade é a mesma folha em escala 1,5. Puro, sem `phaser`.
 *
 * Desenho em código: tronco, cabeça e cauda são grades; as patas são linhas entre juntas (ombro ou quadril, cotovelo
 * ou joelho, pata), uma pose por quadro. Galope em 4 tempos: esticado no ar, mãos pousando, recolhido, impulso.
 */
import type { HdSheet } from '../sheet';
import { PALETTE_COLORS, paletteIndex } from '../paletteGrid';

/** Quadro dos cães: 24x16 texels, pata no chão na última linha. */
export const DOGS_FRAME = { w: 24, h: 16 } as const;

/** Quadros da folha, na ordem: os 4 da corrida, a mordida e o sumir na sombra. */
export const DOG_FRAMES = ['run-0', 'run-1', 'run-2', 'run-3', 'bite', 'vanish'] as const;
export type DogFrame = (typeof DOG_FRAMES)[number];

type Pt = readonly [number, number];
/** Pata: juntas do ombro (ou quadril) até a pata, em texels do quadro. */
type Leg = readonly Pt[];

interface Pose {
  /** Deslocamento vertical do corpo (cabeça, tronco, cauda). */
  dy: number;
  /** Deslocamento extra da cabeça. */
  head?: number;
  /** Grade da cabeça, se não for a de boca fechada. */
  headGrid?: readonly string[];
  /** Grade da cauda. */
  tail: readonly string[];
  /** Patas: dianteira de cá, dianteira de lá, traseira de cá, traseira de lá. */
  legs: readonly [Leg, Leg, Leg, Leg];
}

const B = paletteIndex('b');
/** Roxo das patas de lá e da borda de cima. */
const FAR = paletteIndex('v');
const RIM = FAR;

// Tronco: cernelha alta e peito fundo na frente (direita), barriga recolhida atrás.
// prettier-ignore
const TORSO = [
  '.....bbbbbbb.',
  '.bbbbbbbbbbbb',
  'bbbbbbbbbbbbb',
  'bbbbbbbbbbbbb',
  '.bbbbbbbbbbbb',
  '......bbbbbb.',
];
const TORSO_AT: Pt = [5, 4];

// Cabeça com o pescoço grosso de lobo: orelha em pé, olho rasgado, focinho longo.
// prettier-ignore
const HEAD = [
  '...b.....',
  '...bb....',
  '..bbbb...',
  '.bbbbbb..',
  'bbbbbWWb.',
  'bbbbbbbbb',
  'bbbbbbbb.',
  'bbbbb....',
];
// prettier-ignore
const HEAD_OPEN = [
  '...b.....',
  '...bb....',
  '..bbbb...',
  '.bbbbbbb.',
  'bbbbbWWbb',
  'bbbbbbbbb',
  'bbbbbbww.',
  'bbbbr....',
  'bbbbbw.w.',
  'bbbbbbbb.',
];
const HEAD_AT: Pt = [15, 0];

// Cauda espessa, solta para trás; a ponta sobe e desce com o galope.
const TAIL_UP = ['bb....', 'bbb...', '.bbbb.', '..bbbb'];
const TAIL_MID = ['......', 'bbbb..', '.bbbbb', '..bbbb'];
const TAIL_LOW = ['......', '......', '..bbbb', '.bbbbb', 'bbb...', 'bb....'];
const TAIL_AT: Pt = [0, 2];

/** Ombro e quadril (onde a pata sai do tronco) com o corpo em `dy` 0; as patas de lá saem 1 texel para dentro. */
const S: Pt = [16, 8];
const H: Pt = [8, 8];
const SF: Pt = [15, 8];
const HF: Pt = [9, 8];

const POSES: Record<string, Pose> = {
  // Esticado no ar: mãos lá na frente, pés lá atrás.
  'run-0': {
    dy: -1,
    tail: TAIL_UP,
    legs: [
      [S, [18, 10], [21, 12]],
      [SF, [17, 10], [19, 13]],
      [H, [6, 10], [3, 12], [1, 13]],
      [HF, [7, 10], [5, 12], [3, 14]],
    ],
  },
  // A mão de cá pousa embaixo do peito; a de lá ainda alcança; os pés vêm dobrados para a frente.
  'run-1': {
    dy: 0,
    head: 1,
    tail: TAIL_MID,
    legs: [
      [S, [17, 11], [17, 15]],
      [SF, [17, 10], [19, 13]],
      [H, [9, 11], [8, 13], [9, 14]],
      [HF, [8, 11], [7, 13], [7, 14]],
    ],
  },
  // Recolhido: as 4 patas embaixo do corpo, a mão de cá saindo para trás, os pés pousando na frente.
  'run-2': {
    dy: 1,
    tail: TAIL_LOW,
    legs: [
      [S, [15, 12], [12, 14]],
      [SF, [15, 12], [14, 15]],
      [H, [10, 11], [12, 13], [13, 15]],
      [HF, [10, 11], [11, 13], [11, 15]],
    ],
  },
  // Impulso: os pés empurram o chão para trás, as mãos se dobram subindo.
  'run-3': {
    dy: 0,
    tail: TAIL_MID,
    legs: [
      [S, [18, 10], [17, 13]],
      [SF, [15, 11], [13, 13]],
      [H, [7, 11], [5, 13], [4, 15]],
      [HF, [8, 11], [6, 13], [3, 14]],
    ],
  },
  // Mordida: bote para a frente, boca aberta com os dentes.
  bite: {
    dy: 0,
    head: 1,
    headGrid: HEAD_OPEN,
    tail: TAIL_UP,
    legs: [
      [S, [18, 11], [20, 13]],
      [SF, [17, 11], [19, 14]],
      [H, [7, 11], [5, 13], [3, 15]],
      [HF, [8, 11], [7, 13], [5, 15]],
    ],
  },
};

class DogCanvas {
  readonly px = new Uint8Array(DOGS_FRAME.w * DOGS_FRAME.h);

  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= DOGS_FRAME.w || y >= DOGS_FRAME.h) return;
    this.px[y * DOGS_FRAME.w + x] = c;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= DOGS_FRAME.w || y >= DOGS_FRAME.h) return 0;
    return this.px[y * DOGS_FRAME.w + x];
  }

  grid(rows: readonly string[], [x0, y0]: Pt, c: number): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'b') this.set(x0 + x, y0 + y, c);
        else if (row[x] !== '.') this.set(x0 + x, y0 + y, paletteIndex(row[x]));
      }
    });
  }

  /** Linha de Bresenham de `a` até `b`; `thick` engrossa para trás (coxa e antebraço). */
  line([x0, y0]: Pt, [x1, y1]: Pt, c: number, thick = false): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let [x, y, err] = [x0, y0, dx + dy];
    for (;;) {
      this.set(x, y, c);
      if (thick) this.set(x - 1, y, c);
      if (x === x1 && y === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) [err, x] = [err + dy, x + sx];
      if (e2 <= dx) [err, y] = [err + dx, y + sy];
    }
  }

  leg(joints: Leg, dy: number, c: number): void {
    const pts: Pt[] = joints.map((p, i) => (i === 0 ? [p[0], p[1] + dy] : p));
    for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i], pts[i + 1], c, i === 0);
    const [px, py] = pts[pts.length - 1];
    this.set(px + 1, py, c);
  }

  /** Borda de cima no roxo: todo texel preto acima da linha `below` com o vazio logo acima (as patas ficam pretas). */
  rim(below: number = DOGS_FRAME.h): void {
    for (let y = Math.min(below, DOGS_FRAME.h) - 1; y >= 0; y--)
      for (let x = 0; x < DOGS_FRAME.w; x++) if (this.get(x, y) === B && this.get(x, y - 1) === 0) this.set(x, y, RIM);
  }
}

function drawPose(p: Pose): Uint8Array {
  const c = new DogCanvas();
  const at = (q: Pt, dy = p.dy): Pt => [q[0], q[1] + dy];
  c.leg(p.legs[1], p.dy, FAR);
  c.leg(p.legs[3], p.dy, FAR);
  c.grid(p.tail, at(TAIL_AT), B);
  c.grid(TORSO, at(TORSO_AT), B);
  c.grid(p.headGrid ?? HEAD, at(HEAD_AT, p.dy + (p.head ?? 0)), B);
  c.leg(p.legs[0], p.dy, B);
  c.leg(p.legs[2], p.dy, B);
  c.rim(S[1] + p.dy);
  return c.px;
}

// Sumindo na sombra: o corpo afunda numa poça, sobram as costas, a orelha e o olho.
// prettier-ignore
const VANISH = [
  '........................',
  '........................',
  '........................',
  '........................',
  '...............u........',
  '......v..........b......',
  '.................bb.....',
  '................bbbb....',
  '...........u...bbbbbb...',
  '..............bbbbWWbb..',
  '.............bbbbbbbbbb.',
  '.......bbbbbbbbbbbbbb...',
  '....bbbbbbbbbbbbbbbbbb..',
  '..bbbbbbbbbbbbbbbbbbbbb.',
  '.bbbbbbbbbbbbbbbbbbbbbbb',
  '...bbbbbbbbbbbbbbbbbbb..',
];

function drawVanish(): Uint8Array {
  const c = new DogCanvas();
  c.grid(VANISH, [0, 0], B);
  c.rim();
  return c.px;
}

let cached: HdSheet | undefined;

/** A folha `dogs` (calculada uma vez). */
export function dogsSheet(): HdSheet {
  if (cached) return cached;
  const frames: Record<string, Uint8Array> = {};
  for (const name of DOG_FRAMES) frames[name] = name === 'vanish' ? drawVanish() : drawPose(POSES[name]);
  cached = { frameW: DOGS_FRAME.w, frameH: DOGS_FRAME.h, colors: PALETTE_COLORS, frames };
  return cached;
}
