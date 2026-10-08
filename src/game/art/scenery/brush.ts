import { ART_SCALE, PALETTE } from '../palette';

/** Chave de cor da `PALETTE` (ART-01). */
export type Key = keyof typeof PALETTE & string;

/**
 * Destino da pintura: o `Graphics` do Phaser já tem os dois métodos; os testes usam um sink que grava os texels
 * (`tests/game/art/sceneryRaster.ts`) para medir o desenho sem o motor.
 */
export interface PaintSink {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, width: number, height: number): unknown;
}

/** Pincel que só pinta em blocos de texel (ART_SCALE) e só com cores da paleta (ART-01). */
export class Brush {
  constructor(private readonly g: PaintSink) {}

  /** Retângulo em px de mundo, alinhado à grade de texel. */
  rect(x: number, y: number, w: number, h: number, key: Key): void {
    const s = ART_SCALE;
    const x0 = Math.round(x / s) * s;
    const y0 = Math.round(y / s) * s;
    const x1 = Math.round((x + w) / s) * s;
    const y1 = Math.round((y + h) / s) * s;
    if (x1 <= x0 || y1 <= y0) return;
    this.g.fillStyle(PALETTE[key], 1);
    this.g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  /** Um texel. */
  dot(x: number, y: number, key: Key): void {
    this.rect(x, y, ART_SCALE, ART_SCALE, key);
  }

  /** Disco pixelado (linha a linha de texels), sem borda suavizada. */
  disc(cx: number, cy: number, r: number, key: Key): void {
    const s = ART_SCALE;
    for (let dy = -r; dy <= r; dy += s) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy) / s) * s;
      this.rect(cx - half, cy + dy, half * 2 + s, s, key);
    }
  }

  /** Faixa de transição em xadrez entre duas cores (dither), para o gradiente não sair da paleta. */
  dither(x: number, y: number, w: number, h: number, key: Key): void {
    const s = ART_SCALE;
    for (let yy = 0; yy < h; yy += s) {
      for (let xx = (yy / s) % 2 === 0 ? 0 : s; xx < w; xx += s * 2) this.dot(x + xx, y + yy, key);
    }
  }
}

/** Gerador pseudoaleatório determinístico: o fundo é igual a cada reinício. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Sink que só deixa passar a parte dos retângulos dentro de [`x0`, `x1`) (CEN-07): o pintor de um tema não invade a
 * faixa do vizinho, mesmo quando um prédio passa da borda.
 */
export function clipX(sink: PaintSink, x0: number, x1: number): PaintSink {
  return {
    fillStyle: (color, alpha) => sink.fillStyle(color, alpha),
    fillRect: (x, y, w, h) => {
      const a = Math.max(x, x0);
      const b = Math.min(x + w, x1);
      return b > a ? sink.fillRect(a, y, b - a, h) : undefined;
    },
  };
}
