import { describe, expect, it } from 'vitest';
import { HUD_TEXT_STYLE, RUN_TEXT_STYLE } from '../../src/game/Hud';

/** O texto creme do HUD sumia sobre o talismã creme do selo: todo texto do HUD leva contorno `k` de 3 px (CEN-05). */
describe('contorno dos textos do HUD (CEN-05)', () => {
  it.each([
    ['rótulos, fragmentos e item na mão', HUD_TEXT_STYLE],
    ['rodada e inimigos restantes', RUN_TEXT_STYLE],
  ])('%s: contorno #0b0d1a de 3 px', (_, style) => {
    expect(style.stroke).toBe('#0b0d1a');
    expect(style.strokeThickness).toBe(3);
  });
});
