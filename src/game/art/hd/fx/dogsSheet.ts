/*
 * Folha `dogs`: os Cães Divinos de Megumi (JJK), shikigami de sombra com porte de lobo. Silhueta preta (`b`) com o
 * olho branco (`W`); a borda de cima (lombo, cabeça, orelha e cauda) em roxo `u`, que segura o recorte contra o céu
 * noturno (`E`) onde os cães correm; as patas e a orelha do lado de lá no roxo escuro `v`, que as separa do corpo.
 * Quadros de 32x22 texels, 1 texel = 1 px, virado para a direita (o jogo espelha), patas na última linha e cernelha a
 * 15 texels do chão (um quarto da altura do player, ~60 px) e a cabeça a 21. O lobo da Totalidade é a mesma folha
 * em escala 1,5. Puro, sem `phaser`.
 *
 * Desenho em código: tronco, cabeça e cauda são grades; as patas são linhas grossas entre juntas (ombro ou quadril,
 * cotovelo ou joelho, pulso ou jarrete, pata), uma pose por quadro. Galope em 4 tempos: esticado no ar, mãos pousando,
 * recolhido (dorso arqueado, traseiras pousando na frente), impulso das traseiras.
 */
import type { HdSheet } from '../sheet';
import { PALETTE_COLORS, paletteIndex } from '../paletteGrid';

/** Quadro dos cães: 32x22 texels, pata no chão na última linha. */
export const DOGS_FRAME = { w: 32, h: 22 } as const;

/** Quadros da folha, na ordem: os 4 da corrida, a mordida e o sumir na sombra. */
export const DOG_FRAMES = ['run-0', 'run-1', 'run-2', 'run-3', 'bite', 'vanish'] as const;
export type DogFrame = (typeof DOG_FRAMES)[number];

type Pt = readonly [number, number];
/** Pata: juntas da raiz (ombro ou quadril) até a pata, a largura de cada segmento e para onde aponta o dedo. */
interface Leg {
  pts: readonly Pt[];
  widths: readonly number[];
  /** Dedo para trás (pata dobrada depois do impulso); o padrão é para a frente. */
  toeBack?: boolean;
}

interface Pose {
  /** Deslocamento vertical do corpo (cabeça, tronco, cauda) e da raiz das patas. */
  dy: number;
  torso: Body;
  /** Deslocamento extra da cabeça: [x, y]. */
  head?: Pt;
  /** Grade da cabeça, se não for a de boca fechada. */
  headGrid?: readonly string[];
  tail: Body;
  /** Patas: dianteira de cá, dianteira de lá, traseira de cá, traseira de lá. */
  legs: readonly [Leg, Leg, Leg, Leg];
}

/** Uma grade e onde ela fica com o corpo em `dy` 0. */
interface Body {
  rows: readonly string[];
  at: Pt;
}

const B = paletteIndex('b');
/** Roxo escuro das patas de lá. */
const FAR = paletteIndex('v');
/** Roxo da borda de cima: contraste de ~2,4:1 contra o céu `E`, onde o `v` some. */
const RIM = paletteIndex('u');

// Tronco normal: cernelha alta, peito fundo na frente (direita), barriga recolhida e a coxa pendurada atrás.
// prettier-ignore
const TORSO: Body = { at: [5, 6], rows: [
  '...........bbbbb.',
  '.bbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbb',
  'bbbbbb....bbbbbbb',
  'bbbbb......bbbbbb',
  '.bbb.......bbbbbb',
  '............bbbb.',
] };
// Esticado (voo e bote): 2 texels mais longo, lombo baixo e reto, peito mais raso.
// prettier-ignore
const TORSO_LONG: Body = { at: [3, 7], rows: [
  '..............bbbbb',
  '.bbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbb',
  'bbbbbb.....bbbbbbbb',
  '.bbb........bbbbbbb',
  '.............bbbbb.',
] };
// Recolhido: 2 texels mais curto, dorso arqueado (o lombo sobe no meio), garupa caída.
// prettier-ignore
const TORSO_SHORT: Body = { at: [7, 5], rows: [
  '....bbbbb......',
  '..bbbbbbbbbbbbb',
  '.bbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbb',
  'bbbbbb...bbbbbb',
  'bbbb.....bbbbbb',
  '.bb.......bbbb.',
] };

// Cabeça de lobo baixa, à frente do lombo: duas orelhas em pé caídas para trás (a de lá em `v`, 1 texel atrás), testa,
// o degrau do focinho e 5 texels de focinho depois do olho; o canto da boca aberto marca a mandíbula.
// prettier-ignore
const HEAD = [
  '..vb.........',
  '..vbb........',
  '.vbbb........',
  '.bbbbbbbb....',
  'bbbbbbWWbb...',
  'bbbbbbbbbbbbb',
  'bbbbbbbbbbbb.',
  'bbbbbbbbb....',
  'bbbbbbbbbbb..',
  'bbbbbbb......',
];
// Boca aberta: maxilar de cima 1 texel acima, o de baixo caído 2, a boca vermelha em cunha e os dentes nas pontas.
// prettier-ignore
const HEAD_OPEN = [
  '..vb.........',
  '..vbb........',
  '.vbbb........',
  '.bbbbbbbbbb..',
  'bbbbbbWWbbbbb',
  'bbbbbbbbbbbw.',
  'bbbbbbbbr....',
  'bbbbbbbbrr...',
  'bbbbbbbbbrrw.',
  'bbbbbbbbbbbb.',
  'bbbbbbbbb....',
];
const HEAD_AT: Pt = [18, 1];

// Cauda grossa de lobo, na linha do lombo ou abaixo dela (lobo corre de cauda baixa).
// prettier-ignore
const TAIL_FLAT: Body = { at: [0, 8], rows: ['..bbbb', 'bbbbbb', 'bbbbb.', 'bb....'] };
// prettier-ignore
const TAIL_MID: Body = { at: [0, 7], rows: ['....bb', '..bbbb', '.bbbbb', 'bbbb..', 'bbb...', 'bb....'] };
// prettier-ignore
const TAIL_LOW: Body = { at: [1, 6], rows: [
  '.....bb', '....bbb', '...bbbb', '..bbbb.', '.bbbb..', '.bbb...', 'bbb....', 'bb.....',
] };

/** Larguras dos segmentos: braço, antebraço (2 texels) e quartela; coxa, perna e canela. */
const FRONT = [3, 2, 1] as const;
const HIND = [4, 2, 1] as const;
const fore = (...pts: Pt[]): Leg => ({ pts, widths: FRONT });
const hind = (...pts: Pt[]): Leg => ({ pts, widths: HIND });

const back = (l: Leg): Leg => ({ ...l, toeBack: true });

// A raiz de cada pata (ombro ou quadril) acompanha o `dy` do corpo; as de lá saem 1 texel para dentro.
const POSES: Record<Exclude<DogFrame, 'vanish'>, Pose> = {
  // Esticado no ar: mãos lá na frente, pés lá atrás, nenhuma pata no chão.
  'run-0': {
    dy: 0,
    torso: TORSO_LONG,
    head: [0, 1],
    tail: TAIL_FLAT,
    legs: [
      fore([19, 11], [22, 14], [26, 16], [28, 17]),
      fore([18, 11], [21, 15], [24, 17], [25, 19]),
      back(hind([7, 10], [4, 13], [2, 16], [1, 17])),
      back(hind([8, 10], [6, 14], [4, 17], [3, 19])),
    ],
  },
  // A mão de cá pousa embaixo do peito; a de lá desce para pousar; as traseiras vêm no ar com o jarrete dobrado.
  'run-1': {
    dy: 0,
    torso: TORSO,
    head: [0, 1],
    tail: TAIL_MID,
    legs: [
      fore([19, 12], [19, 16], [19, 19], [19, 21]),
      fore([18, 12], [21, 15], [23, 18], [24, 20]),
      hind([8, 11], [11, 14], [8, 16], [10, 16]),
      hind([9, 11], [13, 14], [14, 17], [15, 17]),
    ],
  },
  // Recolhido: a mão de lá empurra o chão, a de cá já dobrada no ar, as traseiras pousam na frente, embaixo da barriga.
  'run-2': {
    dy: 1,
    torso: TORSO_SHORT,
    tail: TAIL_LOW,
    legs: [
      back(fore([20, 11], [19, 15], [17, 17], [16, 16])),
      fore([18, 11], [18, 15], [18, 18], [18, 21]),
      hind([10, 10], [13, 14], [13, 17], [14, 21]),
      hind([11, 10], [13, 14], [11, 17], [11, 21]),
    ],
  },
  // Impulso: as traseiras empurram o chão para trás, as mãos dobradas sobem para a frente.
  'run-3': {
    dy: 0,
    torso: TORSO,
    tail: TAIL_MID,
    legs: [
      fore([19, 12], [22, 15], [22, 18], [24, 18]),
      fore([18, 12], [20, 15], [19, 17], [21, 17]),
      hind([8, 11], [7, 14], [5, 17], [3, 21]),
      back(hind([9, 11], [7, 14], [4, 16], [2, 18])),
    ],
  },
  // Bote: corpo esticado para a frente e para baixo, traseiras estendidas empurrando, cabeça projetada, boca aberta.
  bite: {
    dy: 1,
    torso: TORSO_LONG,
    head: [1, 1],
    headGrid: HEAD_OPEN,
    tail: TAIL_FLAT,
    legs: [
      fore([19, 11], [22, 15], [25, 18], [27, 20]),
      fore([18, 11], [20, 15], [22, 18], [23, 21]),
      hind([7, 10], [5, 14], [3, 17], [1, 21]),
      hind([8, 10], [7, 14], [5, 18], [4, 21]),
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

  grid(rows: readonly string[], [x0, y0]: Pt): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++)
        if (row[x] !== '.') this.set(x0 + x, y0 + y, row[x] === 'b' ? B : paletteIndex(row[x]));
    });
  }

  /** Linha de Bresenham de `a` até `b`, `w` texels de largura: para trás no segmento em pé, para baixo no deitado. */
  line([x0, y0]: Pt, [x1, y1]: Pt, c: number, w: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const flat = dx > -dy;
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let [x, y, err] = [x0, y0, dx + dy];
    for (;;) {
      for (let i = 0; i < w; i++) this.set(flat ? x : x - i, flat ? y + i : y, c);
      if (x === x1 && y === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) [err, x] = [err + dy, x + sx];
      if (e2 <= dx) [err, y] = [err + dx, y + sy];
    }
  }

  leg({ pts, widths, toeBack }: Leg, dy: number, c: number): void {
    const at: Pt[] = pts.map((p, i) => (i === 0 ? [p[0], p[1] + dy] : p));
    for (let i = 0; i + 1 < at.length; i++) this.line(at[i], at[i + 1], c, widths[i] ?? 1);
    const [px, py] = at[at.length - 1];
    this.set(px + (toeBack ? -1 : 1), py, c);
  }

  /**
   * Borda de cima em `u`: o primeiro texel de cada coluna, se for preto e estiver acima da linha `below` (lombo,
   * cabeça, orelha e cauda; as patas, a mandíbula e a orelha de lá ficam como estão).
   */
  rim(below: number): void {
    for (let x = 0; x < DOGS_FRAME.w; x++) {
      let y = 0;
      while (y < below && this.get(x, y) === 0) y++;
      if (y < below && this.get(x, y) === B) this.set(x, y, RIM);
    }
  }
}

function drawPose(p: Pose): Uint8Array {
  const c = new DogCanvas();
  const at = (q: Pt, dx = 0, dy = 0): Pt => [q[0] + dx, q[1] + p.dy + dy];
  c.leg(p.legs[1], p.dy, FAR);
  c.leg(p.legs[3], p.dy, FAR);
  c.grid(p.tail.rows, at(p.tail.at));
  c.grid(p.torso.rows, at(p.torso.at));
  c.grid(p.headGrid ?? HEAD, at(HEAD_AT, p.head?.[0], p.head?.[1]));
  c.leg(p.legs[0], p.dy, B);
  c.leg(p.legs[2], p.dy, B);
  c.rim(11 + p.dy);
  return c.px;
}

// Sumindo na sombra: uma poça rasa com a borda de cima roxa; acima dela só a ponta da orelha, o olho e os fiapos.
// prettier-ignore
const VANISH = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.......u........................',
  '.......u.....u..........b.......',
  '.......u.....u.........vb.......',
  '.............u........bWWb......',
  '......uvvvvvvvvvvvvvvvbbbbu.....',
  '.....bbbbbbbbbbbbbbbbbbbbbbb....',
  '.......bbbbbbbbbbbbbbbbbbbb.....',
];

let cached: HdSheet | undefined;

/** A folha `dogs` (calculada uma vez). */
export function dogsSheet(): HdSheet {
  if (cached) return cached;
  const frames: Record<string, Uint8Array> = {};
  for (const name of DOG_FRAMES) {
    if (name !== 'vanish') frames[name] = drawPose(POSES[name]);
    else {
      const c = new DogCanvas();
      c.grid(VANISH, [0, 0]);
      frames[name] = c.px;
    }
  }
  cached = { frameW: DOGS_FRAME.w, frameH: DOGS_FRAME.h, colors: PALETTE_COLORS, frames };
  return cached;
}
