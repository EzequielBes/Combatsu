import { describe, expect, it } from 'vitest';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { VOW_PANEL_COLORS } from '../../src/game/VowPanel';

describe('cores do painel de votos (ART-01)', () => {
  it('só chaves da PALETTE', () => {
    for (const key of Object.values(VOW_PANEL_COLORS)) expect(PALETTE_KEYS.has(key)).toBe(true);
  });
});
