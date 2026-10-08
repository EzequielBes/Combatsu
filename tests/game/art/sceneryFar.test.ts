import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../../src/game/art/palette';
import { Brush } from '../../../src/game/art/scenery/brush';
import { farPainterFor, THEME_SCENERY } from '../../../src/game/art/scenery/index';
import { schoolFar } from '../../../src/game/art/scenery/school';
import { RasterSink } from './sceneryRaster';

describe('camada distante por tema (ARN-01)', () => {
  it('área só de santuário: o céu do santuário', () => {
    expect(THEME_SCENERY.santuario.far).toBeDefined();
    expect(farPainterFor([{ theme: 'santuario' }])).toBe(THEME_SCENERY.santuario.far);
  });

  it('santuário misturado com outro tema: a escola', () => {
    expect(farPainterFor([{ theme: 'santuario' }, { theme: 'rua' }])).toBe(schoolFar);
  });

  it('sem trechos (a sala) e áreas de combate: a escola', () => {
    expect(farPainterFor([])).toBe(schoolFar);
    expect(farPainterFor([{ theme: 'rua' }, { theme: 'beco' }])).toBe(schoolFar);
  });
});

describe('céu do Véu (ARN-02)', () => {
  const paint = (painter: typeof schoolFar): RasterSink => {
    const sink = new RasterSink();
    painter(new Brush(sink), { x0: -128, x1: 1500, ground: 400, bottom: 460, variant: null });
    return sink;
  };

  it('nenhum texel das janelas acesas (a ou A) e só cores da PALETTE', () => {
    const colors = new Set(paint(THEME_SCENERY.santuario.far!).texels.values());
    expect(colors.has(PALETTE.a)).toBe(false);
    expect(colors.has(PALETTE.A)).toBe(false);
    const all = new Set(Object.values(PALETTE));
    for (const c of colors) expect(all.has(c)).toBe(true);
  });

  it('a escola tem as janelas acesas que o céu do Véu não tem', () => {
    expect(new Set(paint(schoolFar).texels.values()).has(PALETTE.a)).toBe(true);
  });
});
