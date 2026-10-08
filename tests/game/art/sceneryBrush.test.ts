import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../../src/game/art/palette';
import { Brush, clipX } from '../../../src/game/art/scenery/brush';
import { RasterSink } from './sceneryRaster';

describe('pincel do cenário', () => {
  it('rect alinha à grade de 2 px de texel', () => {
    const sink = new RasterSink();
    new Brush(sink).rect(3, 3, 4, 4, 'k');
    // 3 arredonda para 4 e 7 para 8: só o texel de 4..8 é pintado.
    expect(sink.at(4, 4)).toBe(PALETTE.k);
    expect(sink.at(6, 6)).toBe(PALETTE.k);
    expect(sink.at(2, 2)).toBeUndefined();
    expect(sink.at(8, 8)).toBeUndefined();
  });

  it('dither pinta metade dos texels em xadrez', () => {
    const sink = new RasterSink();
    new Brush(sink).dither(0, 0, 8, 8, 'E');
    expect(sink.texels.size).toBe(8);
    expect(sink.at(0, 0)).toBe(PALETTE.E);
    expect(sink.at(2, 0)).toBeUndefined();
    expect(sink.at(2, 2)).toBe(PALETTE.E);
  });
});

describe('recorte da faixa do tema (CEN-07)', () => {
  it('clipX só deixa passar o trecho dentro de [x0, x1)', () => {
    const sink = new RasterSink();
    new Brush(clipX(sink, 10, 20)).rect(0, 0, 40, 2, 'k');
    expect(sink.at(8, 0)).toBeUndefined();
    expect(sink.at(10, 0)).toBe(PALETTE.k);
    expect(sink.at(18, 0)).toBe(PALETTE.k);
    expect(sink.at(20, 0)).toBeUndefined();
  });

  it('clipX descarta o retângulo inteiro fora da faixa', () => {
    const sink = new RasterSink();
    new Brush(clipX(sink, 10, 20)).rect(20, 0, 10, 2, 'k');
    expect(sink.texels.size).toBe(0);
  });
});
