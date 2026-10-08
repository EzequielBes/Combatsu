import { describe, expect, it } from 'vitest';
import type { ModuleTheme } from '../../../src/core/module';
import { PALETTE } from '../../../src/game/art/palette';
import { Brush, clipX } from '../../../src/game/art/scenery/brush';
import { THEME_SCENERY } from '../../../src/game/art/scenery/index';
import { schoolMid } from '../../../src/game/art/scenery/school';
import { RasterSink, windowColorCounts } from './sceneryRaster';

/** Faixa de teste: 1408 px de largura (44 janelas de 32 px), com as linhas do chão de cada camada do jogo. */
const X0 = 0;
const X1 = 1408;
const NEAR_GROUND = 450;
const MID_GROUND = 420;

/** Temas que já têm muro próprio (CEN-01) e horizonte próprio (CEN-08, CEN-09). */
const NEAR_THEMES: readonly ModuleTheme[] = ['rua', 'beco', 'parque', 'konbini', 'santuario'];
const MID_THEMES: readonly ModuleTheme[] = ['rua', 'beco', 'parque', 'konbini', 'santuario'];

function paint(theme: ModuleTheme, which: 'mid' | 'near', ground: number): RasterSink {
  const sink = new RasterSink();
  THEME_SCENERY[theme][which](new Brush(clipX(sink, X0, X1)), {
    x0: X0,
    x1: X1,
    ground,
    bottom: ground + 40,
    variant: null,
  });
  return sink;
}

const PALETTE_COLORS = new Set(Object.values(PALETTE));

describe('muro da camada próxima por tema (CEN-01)', () => {
  it.each(NEAR_THEMES)('%s: toda janela de 32x32 de 76 px acima a 20 px abaixo do chão tem ≥ 3 cores', (theme) => {
    const sink = paint(theme, 'near', NEAR_GROUND);
    const flat = windowColorCounts(sink, X0, X1, NEAR_GROUND - 76, NEAR_GROUND + 20).filter((w) => w.colors < 3);
    expect(flat).toEqual([]);
  });

  it.each(NEAR_THEMES)('%s: só cores da PALETTE', (theme) => {
    for (const c of paint(theme, 'near', NEAR_GROUND).texels.values()) expect(PALETTE_COLORS.has(c)).toBe(true);
  });
});

describe('horizonte da camada média por tema (CEN-08, CEN-09)', () => {
  it.each(MID_THEMES)('%s: toda janela pintada de 60 a 20 px acima do chão tem ≥ 2 cores', (theme) => {
    const sink = paint(theme, 'mid', MID_GROUND);
    // Duas fileiras de janelas de 32 px cobrem a faixa inteira de 40 px: uma colada em cima e outra colada embaixo.
    const flat = [MID_GROUND - 60, MID_GROUND - 52]
      .flatMap((y) => windowColorCounts(sink, X0, X1, y, y + 32, 32, true))
      .filter((w) => w.colors < 2);
    expect(flat).toEqual([]);
  });

  it.each(MID_THEMES)('%s: só cores da PALETTE', (theme) => {
    for (const c of paint(theme, 'mid', MID_GROUND).texels.values()) expect(PALETTE_COLORS.has(c)).toBe(true);
  });

  it('os horizontes próprios são distintos entre si e do da escola', () => {
    const school = new RasterSink();
    const area = { x0: X0, x1: X1, ground: MID_GROUND, bottom: MID_GROUND + 40, variant: null };
    schoolMid(new Brush(clipX(school, X0, X1)), area);
    const rasters = [...MID_THEMES.map((t) => [...paint(t, 'mid', MID_GROUND).texels]), [...school.texels]].map((r) =>
      JSON.stringify(r),
    );
    expect(new Set(rasters).size).toBe(rasters.length);
  });
});

describe('santuário por arquétipo do chefe (ARN-04)', () => {
  it('oni e tecela pintam a camada média de jeitos diferentes, e diferentes da arena sem chefe', () => {
    const draw = (variant: 'oni' | 'tecela' | null): string => {
      const sink = new RasterSink();
      THEME_SCENERY.santuario.mid(new Brush(clipX(sink, X0, X1)), {
        x0: X0,
        x1: X1,
        ground: MID_GROUND,
        bottom: MID_GROUND + 40,
        variant,
      });
      return JSON.stringify([...sink.texels]);
    };
    expect(new Set([draw('oni'), draw('tecela'), draw(null)]).size).toBe(3);
  });
});
