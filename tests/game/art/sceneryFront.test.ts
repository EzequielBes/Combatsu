import { describe, expect, it } from 'vitest';
import { Brush } from '../../../src/game/art/scenery/brush';
import { paintFront } from '../../../src/game/art/scenery/frontArt';
import { RasterSink } from './sceneryRaster';

/** Topo do piso em px de mundo (linha 15 × 32) e o fundo da camada, abaixo da borda da tela. */
const FLOOR_TOP = 480;

describe('primeiro plano (CEN-12)', () => {
  it.each(['rua', 'beco', 'parque', 'konbini', 'santuario'] as const)('%s: nada acima do topo do piso', (theme) => {
    const sink = new RasterSink();
    paintFront(new Brush(sink), theme, { x0: 0, x1: 2000, floorTop: FLOOR_TOP, bottom: 560 });
    expect(sink.topY()).toBeGreaterThanOrEqual(FLOOR_TOP);
  });

  it.each(['rua', 'beco', 'parque', 'konbini', 'santuario'] as const)('%s: tem peças', (theme) => {
    const sink = new RasterSink();
    paintFront(new Brush(sink), theme, { x0: 0, x1: 2000, floorTop: FLOOR_TOP, bottom: 560 });
    expect(sink.texels.size).toBeGreaterThan(0);
  });
});
