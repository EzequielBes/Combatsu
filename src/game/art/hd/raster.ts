/*
 * Tela do rasterizador HD: cada texel guarda material, tom e a parte do corpo a que pertence. As formas devolvem a
 * normal da superfície no centro do texel; a luz quente da frente escolhe um dos 5 tons da rampa e a luz fria de trás
 * acende a borda (recorte). No fim, `finish` desenha a linha entre partes na cor do material e o contorno externo.
 * Puro, sem `phaser`.
 */
import { OUTLINE_INDEX, RIM, colorIndex } from './palette';

export interface Normal {
  x: number;
  y: number;
  z: number;
}

/** Forma: a normal no ponto (x, y) da tela, ou `null` fora dela. */
export type Shape = (x: number, y: number) => Normal | null;

const unit3 = (x: number, y: number, z: number): Normal => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
};

/** Luz principal: quente, de frente e de cima (o player olha para a direita). */
const KEY = unit3(0.55, -0.65, 0.52);
/** Luz de recorte: fria, de trás (a lua). */
const BACK = unit3(-0.92, -0.3, 0.1);
/** Limiares da luz principal que separam os 5 tons. */
const STEPS = [-0.28, 0.12, 0.58, 0.86];
const RIM_FROM = 0.8;

const dot = (a: Normal, b: Normal): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Tom (0..4) da luz principal para uma normal. */
export function keyTone(n: Normal): number {
  const d = dot(n, KEY);
  let t = 0;
  for (const s of STEPS) if (d >= s) t++;
  return t;
}

export interface PaintOpts {
  /** Soma ao tom (partes de longe ficam um tom abaixo). */
  bias?: number;
  /** Acende a borda de trás com a luz de recorte. */
  rim?: boolean;
  /** Tom fixo, sem luz (feições, botão). */
  flat?: number;
  /** Só pinta por cima de texels desta parte (detalhes que não mudam a silhueta). */
  onlyOn?: number;
}

function toneFor(n: Normal, o: PaintOpts): number {
  if (o.flat !== undefined) return o.flat;
  if (o.rim && dot(n, BACK) > RIM_FROM) return RIM;
  return Math.min(4, Math.max(0, keyTone(n) + (o.bias ?? 0)));
}

export class HdCanvas {
  readonly w: number;
  readonly h: number;
  readonly mat: Uint8Array;
  readonly tone: Uint8Array;
  readonly part: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.mat = new Uint8Array(w * h);
    this.tone = new Uint8Array(w * h);
    this.part = new Uint8Array(w * h);
  }

  /** Pinta a forma com o material; a parte decide onde entram as linhas internas. */
  paint(shape: Shape, mat: number, part: number, o: PaintOpts = {}): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (o.onlyOn !== undefined && this.part[i] !== o.onlyOn) continue;
        const n = shape(x + 0.5, y + 0.5);
        if (!n) continue;
        this.mat[i] = mat;
        this.part[i] = part;
        this.tone[i] = toneFor(n, o);
      }
    }
  }
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** O texel (x, y) encosta numa parte desenhada por cima da sua? */
function underFront(c: HdCanvas, x: number, y: number): boolean {
  const p = c.part[y * c.w + x];
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= c.w || ny < 0 || ny >= c.h) continue;
    if (c.part[ny * c.w + nx] > p) return true;
  }
  return false;
}

/** Linha interna: o texel da parte de trás que encosta numa parte da frente vira o tom mais escuro do seu material. */
function innerLines(c: HdCanvas): void {
  const dark: number[] = [];
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (c.part[y * c.w + x] !== 0 && underFront(c, x, y)) dark.push(y * c.w + x);
    }
  }
  for (const i of dark) c.tone[i] = 0;
}

function outlineAt(c: HdCanvas, x: number, y: number): number {
  const at = (dx: number, dy: number): number => {
    const nx = x + dx;
    const ny = y + dy;
    return nx < 0 || nx >= c.w || ny < 0 || ny >= c.h ? 0 : c.mat[ny * c.w + nx];
  };
  // Vizinho de baixo ou da esquerda: este texel está em cima ou na frente do corpo, do lado da luz.
  const lit = at(0, 1) || at(-1, 0);
  if (lit) return colorIndex(lit, 0);
  return at(0, -1) || at(1, 0) ? OUTLINE_INDEX : 0;
}

/**
 * Índices de cor do quadro: o desenho, a linha interna e o contorno externo. Em cima e na frente (o lado da luz) o
 * contorno é o tom escuro do material vizinho; embaixo e atrás é o quase preto.
 */
export function finish(c: HdCanvas): Uint8Array {
  innerLines(c);
  const out = new Uint8Array(c.w * c.h);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const i = y * c.w + x;
      out[i] = c.mat[i] !== 0 ? colorIndex(c.mat[i], c.tone[i]) : outlineAt(c, x, y);
    }
  }
  return out;
}
