import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que o módulo não carrega o `phaser` como valor (SHOP-24).
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { SHOP_PANEL_COLORS } from '../../src/game/art/shopPanel';
import { SHOP } from '../../src/data/tuning';
import source from '../../src/game/ShopPanel.ts?raw';

describe('SHOP_PANEL_COLORS (SHOP-24)', () => {
  it('toda cor de SHOP_PANEL_COLORS é chave de PALETTE', () => {
    for (const [name, key] of Object.entries(SHOP_PANEL_COLORS)) {
      expect(PALETTE_KEYS.has(key), `${name} -> '${key}'`).toBe(true);
    }
  });

  it('cobre fundo, bordas por raridade, borda realçada e textos', () => {
    expect(Object.keys(SHOP_PANEL_COLORS)).toEqual(
      expect.arrayContaining([
        'bg',
        'cardBg',
        'borderCommon',
        'borderRare',
        'borderSelected',
        'text',
        'textDanger',
        'flash',
      ]),
    );
  });
});

describe('ShopPanel: quatro cartas e a dica nova (CRD-01, CRD-05.9, SHX-03)', () => {
  it('o painel desenha 4 cartas, o mesmo número de SHOP.offers', () => {
    expect(source).toMatch(/const CARD_COUNT = 4;/);
    expect(SHOP.offers).toBe(4);
  });

  it('a dica diz 1-4 comprar, W/S eixo, R rerolar (n) e Enter continuar', () => {
    expect(source).toContain('`1-${CARD_COUNT} comprar · W/S eixo · R rerolar (${view.rerollCost}) · Enter continuar`');
  });
});
