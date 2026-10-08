import { ART_SCALE } from '../../../src/game/art/palette';
import type { PaintSink } from '../../../src/game/art/scenery/brush';

/**
 * Sink de pintura para os testes do cenário (CEN-01, CEN-09, CEN-12): grava a cor final de cada texel de 2 px, como
 * o `Graphics` desenharia (a última pintura cobre a anterior). Mede o desenho sem o Phaser.
 */
export class RasterSink implements PaintSink {
  private color = 0;
  /** Cor por texel, na chave `"tx,ty"` (coordenada em px dividida por `ART_SCALE`). */
  readonly texels = new Map<string, number>();

  fillStyle(color: number): this {
    this.color = color;
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number): this {
    const s = ART_SCALE;
    for (let ty = Math.floor(y / s); ty < Math.ceil((y + h) / s); ty++) {
      for (let tx = Math.floor(x / s); tx < Math.ceil((x + w) / s); tx++) this.texels.set(`${tx},${ty}`, this.color);
    }
    return this;
  }

  /** Cor do texel que contém o px (`x`, `y`); `undefined` se nada foi pintado ali. */
  at(x: number, y: number): number | undefined {
    return this.texels.get(`${Math.floor(x / ART_SCALE)},${Math.floor(y / ART_SCALE)}`);
  }

  /** Cores distintas pintadas na janela [x, x + w) × [y, y + h), em px. */
  colorsIn(x: number, y: number, w: number, h: number): Set<number> {
    const out = new Set<number>();
    for (let py = y; py < y + h; py += ART_SCALE) {
      for (let px = x; px < x + w; px += ART_SCALE) {
        const c = this.at(px, py);
        if (c !== undefined) out.add(c);
      }
    }
    return out;
  }

  /** Menor y (px) pintado; `Infinity` se nada foi pintado. */
  topY(): number {
    let min = Infinity;
    for (const key of this.texels.keys()) min = Math.min(min, Number(key.split(',')[1]) * ART_SCALE);
    return min;
  }
}

/**
 * Janelas de `size` px que cobrem a faixa [x0, x1) × [y0, y1) lado a lado, com o número de cores de cada uma; as
 * janelas sem nada pintado ficam de fora quando `skipEmpty`.
 */
export function windowColorCounts(
  sink: RasterSink,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  size = 32,
  skipEmpty = false,
): { x: number; y: number; colors: number }[] {
  const out: { x: number; y: number; colors: number }[] = [];
  for (let y = y0; y + size <= y1; y += size) {
    for (let x = x0; x + size <= x1; x += size) {
      const colors = sink.colorsIn(x, y, size, size).size;
      if (skipEmpty && colors === 0) continue;
      out.push({ x, y, colors });
    }
  }
  return out;
}
