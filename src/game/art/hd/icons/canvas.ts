/*
 * Tela dos ícones HD de técnica: duas camadas de índices na paleta única do jogo (`art/palette.ts`), a placa do
 * fundo e o símbolo. O símbolo ganha no fim o contorno externo de 1 texel por cima da placa; a placa nunca tem
 * contorno. A mesma receita desenha o ícone em qualquer tamanho, porque as formas estão no espaço 0 a 1 e a
 * espessura de linha vem em texels (`px`). Luz única de todos os ícones: de cima e da esquerda. Puro, sem `phaser`.
 */
import { PALETTE } from '../../palette';
import type { Sdf } from './sdf';

/** Chaves da paleta na ordem dos índices: o índice `i + 1` é a cor `ICON_KEYS[i]` (o 0 é transparente). */
const ICON_KEYS: readonly string[] = Object.keys(PALETTE);

/** Tabela de cores 0xRRGGBB por índice, a mesma em todos os ícones (o 0 é transparente e não é lido). */
export const ICON_COLORS: readonly number[] = [0, ...ICON_KEYS.map((k) => PALETTE[k])];

const indexOf = (key: string): number => {
  const i = ICON_KEYS.indexOf(key);
  if (i < 0) throw new Error(`Cor '${key}' fora da paleta única`);
  return i + 1;
};

/** Tinta: uma chave da paleta, ou uma função que escolhe a chave por ponto (luz, faixas, pontilhado). */
export type Ink = string | ((x: number, y: number) => string);

export interface FillOpts {
  /** Traço interno na borda da forma, nesta cor: separa a forma do que já estava embaixo. */
  line?: string;
  /** Espessura do traço interno em texels (padrão 1). */
  linePx?: number;
}

/** Direção da luz no plano da tela (de cima e da esquerda) e em 3D, para as esferas. */
const LIGHT2 = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
const LIGHT3 = (() => {
  const l = Math.hypot(-0.5, -0.62, 0.6);
  return { x: -0.5 / l, y: -0.62 / l, z: 0.6 / l };
})();

/**
 * Esfera iluminada com 5 tons, do mais escuro ao brilho: sombra, corpo, corpo, luz e o reflexo pequeno do lado da
 * luz (repetir um tom na rampa alarga a faixa dele).
 */
export function sphereInk(cx: number, cy: number, r: number, ramp: readonly string[]): Ink {
  const steps = [-0.3, 0.2, 0.62, 0.9];
  return (x, y) => {
    const nx = (x - cx) / r;
    const ny = (y - cy) / r;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const d = nx * LIGHT3.x + ny * LIGHT3.y + nz * LIGHT3.z;
    let t = 0;
    for (const s of steps) if (d >= s) t++;
    return ramp[Math.min(t, ramp.length - 1)];
  };
}

/** Chanfro de forma chapada: a borda virada para a luz no tom claro, a de baixo e da direita no escuro. */
export function bevelInk(s: Sdf, px: number, base: string, hi: string, lo: string, width = 1.5): Ink {
  const k = width * px;
  return (x, y) => {
    if (s(x + LIGHT2.x * k, y + LIGHT2.y * k) > 0) return hi;
    if (s(x - LIGHT2.x * k, y - LIGHT2.y * k) > 0) return lo;
    return base;
  };
}

/** Faixas concêntricas: `[raio, chave]` do centro para fora; fora da última, a última chave. */
export function bandsInk(cx: number, cy: number, bands: readonly (readonly [number, string])[]): Ink {
  return (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    for (const [r, key] of bands) if (d <= r) return key;
    return bands[bands.length - 1][1];
  };
}

export class IconCanvas {
  readonly size: number;
  /** Um texel no espaço do ícone. */
  readonly px: number;
  /** O símbolo só é pintado dentro desta forma (a placa a define, para o contorno do símbolo caber nela). */
  clip?: Sdf;
  private readonly plate: Uint8Array;
  private readonly sym: Uint8Array;

  constructor(size: number) {
    this.size = size;
    this.px = 1 / size;
    this.plate = new Uint8Array(size * size);
    this.sym = new Uint8Array(size * size);
  }

  /** Pinta na placa do fundo: sem contorno externo, o símbolo fica por cima. */
  back(s: Sdf, ink: Ink, o: FillOpts = {}): void {
    this.paint(this.plate, s, ink, o);
  }

  /** Pinta no símbolo: a silhueta do símbolo ganha o contorno externo no `finish`. */
  fill(s: Sdf, ink: Ink, o: FillOpts = {}): void {
    const clip = this.clip;
    this.paint(this.sym, clip ? (x, y) => Math.max(s(x, y), clip(x, y)) : s, ink, o);
  }

  /** Apaga o símbolo dentro da forma (vão, recorte). */
  cut(s: Sdf): void {
    this.each(s, (i) => (this.sym[i] = 0));
  }

  private each(s: Sdf, fn: (i: number, d: number, x: number, y: number) => void): void {
    const n = this.size;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n;
        const y = (j + 0.5) / n;
        const d = s(x, y);
        if (d <= 0) fn(j * n + i, d, x, y);
      }
    }
  }

  private paint(layer: Uint8Array, s: Sdf, ink: Ink, o: FillOpts): void {
    const edge = o.line !== undefined ? -(o.linePx ?? 1) * this.px : Infinity;
    const line = o.line !== undefined ? indexOf(o.line) : 0;
    this.each(s, (i, d, x, y) => {
      layer[i] = d > edge ? line : indexOf(typeof ink === 'string' ? ink : ink(x, y));
    });
  }

  /** Índices de cor do ícone: a placa, o contorno externo do símbolo (4 vizinhos) na `outline` e o símbolo. */
  finish(outline = 'k'): Uint8Array {
    const n = this.size;
    const out = Uint8Array.from(this.plate);
    const ink = indexOf(outline);
    const on = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < n && j < n && this.sym[j * n + i] !== 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const at = j * n + i;
        if (this.sym[at] !== 0) out[at] = this.sym[at];
        else if (out[at] !== 0 && (on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1))) out[at] = ink;
      }
    }
    return out;
  }
}
