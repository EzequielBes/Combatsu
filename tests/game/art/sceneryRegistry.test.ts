import { describe, expect, it } from 'vitest';
import { THEME_SCENERY } from '../../../src/game/art/scenery/index';
import { THEME_FRAMES } from '../../../src/game/art/tilesThemes';

describe('pintores de cenário por tema (CEN-07)', () => {
  it('há pintores da média e da próxima para cada tema do jogo', () => {
    expect(Object.keys(THEME_SCENERY).sort()).toEqual(Object.keys(THEME_FRAMES).sort());
    for (const s of Object.values(THEME_SCENERY)) {
      expect(typeof s.mid).toBe('function');
      expect(typeof s.near).toBe('function');
    }
  });
});
