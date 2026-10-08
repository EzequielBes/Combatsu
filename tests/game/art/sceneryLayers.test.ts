import { describe, expect, it } from 'vitest';
import { TILE } from '../../../src/core/level';
import { layerBands, seams, toLayerX } from '../../../src/game/art/scenery/layers';

const SPANS = [
  { theme: 'beco' as const, col0: 1, col1: 20 },
  { theme: 'parque' as const, col0: 21, col1: 52 },
  { theme: 'rua' as const, col0: 53, col1: 93 },
];

describe('faixas por camada de parallax (CEN-07, CEN-02)', () => {
  it.each([0.3, 0.6, 1.15])('no fator %f a fronteira é f·X + (1 − f)·320', (f) => {
    const bands = layerBands(SPANS, -128, 4000, f);
    expect(bands.map((b) => b.theme)).toEqual(['beco', 'parque', 'rua']);
    expect(bands[0].x0).toBe(-128);
    expect(bands[2].x1).toBe(4000);
    expect(bands[0].x1).toBeCloseTo(f * 21 * TILE + (1 - f) * 320, 9);
    expect(bands[1].x0).toBe(bands[0].x1);
    expect(bands[1].x1).toBeCloseTo(f * 53 * TILE + (1 - f) * 320, 9);
    expect(bands[2].x0).toBe(bands[1].x1);
  });

  it('toLayerX no fator 1 é a própria coordenada de mundo', () => {
    expect(toLayerX(777, 1)).toBe(777);
  });

  it('seams devolve as fronteiras internas; um trecho só não tem fronteira', () => {
    const bands = layerBands(SPANS, -128, 4000, 0.6);
    expect(seams(bands)).toEqual([bands[0].x1, bands[1].x1]);
    expect(seams(layerBands([SPANS[0]], -128, 4000, 0.6))).toEqual([]);
  });
});
