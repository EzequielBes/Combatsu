import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que o módulo não carrega o `phaser` como valor (SHOP-24).
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { SHOP_PANEL_COLORS } from '../../src/game/art/shopPanel';

describe('SHOP_PANEL_COLORS (SHOP-24)', () => {
  it('toda cor de SHOP_PANEL_COLORS é chave de PALETTE', () => {
    for (const [name, key] of Object.entries(SHOP_PANEL_COLORS)) {
      expect(PALETTE_KEYS.has(key), `${name} -> '${key}'`).toBe(true);
    }
  });

  it('cobre fundo, bordas por raridade, borda realçada e textos', () => {
    expect(Object.keys(SHOP_PANEL_COLORS)).toEqual(
      expect.arrayContaining(['bg', 'cardBg', 'borderCommon', 'borderRare', 'borderSelected', 'text', 'textDanger', 'flash']),
    );
  });
});
