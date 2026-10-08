import { describe, expect, it } from 'vitest';
import { paintBands } from '../../../src/game/art/background';
import { PALETTE } from '../../../src/game/art/palette';
import { Brush, clipX } from '../../../src/game/art/scenery/brush';
import { THEME_SCENERY } from '../../../src/game/art/scenery/index';
import { RasterSink } from './sceneryRaster';

const AREA = { ground: 450, bottom: 500 };

describe('pilar na emenda dos módulos (CEN-02)', () => {
  it.each(['near'] as const)('camada %s: pilar de 20 px centrado em cada fronteira', (which) => {
    const sink = new RasterSink();
    const bands = [
      { x0: 0, x1: 400, theme: 'beco' as const },
      { x0: 400, x1: 900, theme: 'parque' as const },
      { x0: 900, x1: 1400, theme: 'rua' as const },
    ];
    paintBands(sink, bands, which, AREA);
    for (const seam of [400, 900]) {
      const y = AREA.ground - 60;
      // Pilar de seam − 10 a seam + 10: borda escura (K) de 2 px, luz (f) de 2 px à esquerda e miolo (E).
      expect(sink.at(seam - 8, y)).toBe(PALETTE.f);
      for (const x of [seam - 6, seam - 2, seam, seam + 6]) expect(sink.at(x, y), `x ${x}`).toBe(PALETTE.E);
      expect(sink.at(seam - 10, y)).toBe(PALETTE.K);
      expect(sink.at(seam + 8, y)).toBe(PALETTE.K);
    }
  });

  it.each(['near', 'mid'] as const)(
    'camada %s: com um trecho só, só o pintor do tema e nenhum pilar a mais',
    (which) => {
      const viaBands = new RasterSink();
      paintBands(viaBands, [{ x0: 0, x1: 1400, theme: 'parque' }], which, AREA);
      const direct = new RasterSink();
      THEME_SCENERY.parque[which](new Brush(clipX(direct, 0, 1400)), { x0: 0, x1: 1400, ...AREA });
      expect([...viaBands.texels]).toEqual([...direct.texels]);
    },
  );
});

describe('cada faixa com o pintor do seu tema (CEN-07)', () => {
  it.each(['mid', 'near'] as const)('camada %s: três temas, cada faixa igual ao pintor do tema dela', (which) => {
    const bands = [
      { x0: 0, x1: 400, theme: 'beco' as const },
      { x0: 400, x1: 900, theme: 'parque' as const },
      { x0: 900, x1: 1400, theme: 'rua' as const },
    ];
    const sink = new RasterSink();
    paintBands(sink, bands, which, AREA);
    for (const band of bands) {
      const direct = new RasterSink();
      THEME_SCENERY[band.theme][which](new Brush(clipX(direct, band.x0, band.x1)), { ...band, ...AREA });
      // Fora da coluna do pilar (só na próxima), o raster da faixa é exatamente o do pintor do tema.
      const inBand = (key: string): boolean => {
        const x = Number(key.split(',')[0]) * 2;
        return x >= band.x0 + 16 && x < band.x1 - 16;
      };
      const got = [...sink.texels].filter(([k]) => inBand(k));
      const want = [...direct.texels].filter(([k]) => inBand(k));
      expect(got, band.theme).toEqual(want);
    }
  });
});
