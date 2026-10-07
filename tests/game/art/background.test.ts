import { describe, expect, it } from 'vitest';
import { TILE } from '../../../src/core/level';
import { NEAR_COLORS, PARALLAX, bandsFor } from '../../../src/game/art/background';
import { PALETTE } from '../../../src/game/art/palette';
import { THEME_FRAMES } from '../../../src/game/art/tilesThemes';

const THEMES = Object.keys(THEME_FRAMES);

describe('faixa de fundo por tema (THM-02)', () => {
  it('há uma cor para cada tema e só chaves da PALETTE', () => {
    expect(Object.keys(NEAR_COLORS).sort()).toEqual([...THEMES].sort());
    for (const { wall, top } of Object.values(NEAR_COLORS)) {
      expect(Object.keys(PALETTE)).toContain(wall);
      expect(Object.keys(PALETTE)).toContain(top);
    }
  });

  it('bandsFor dá uma faixa por trecho, com a cor do tema dele', () => {
    const spans = [
      { theme: 'beco' as const, col0: 0, col1: 20 },
      { theme: 'parque' as const, col0: 21, col1: 52 },
      { theme: 'rua' as const, col0: 53, col1: 93 },
    ];
    const bands = bandsFor(spans, -128, 4000);
    expect(bands).toHaveLength(3);
    expect(bands.map(({ wall, top }) => ({ wall, top }))).toEqual(spans.map((sp) => NEAR_COLORS[sp.theme]));
  });

  it('as faixas se encontram na fronteira do trecho, na coordenada da camada próxima', () => {
    const spans = [
      { theme: 'beco' as const, col0: 0, col1: 20 },
      { theme: 'parque' as const, col0: 21, col1: 52 },
    ];
    const [first, last] = bandsFor(spans, -128, 4000);
    const f = PARALLAX[2];
    expect(first.x0).toBe(-128);
    expect(last.x1).toBe(4000);
    expect(first.x1).toBe(f * (21 * TILE) + (1 - f) * 320);
    expect(last.x0).toBe(first.x1);
  });
});
