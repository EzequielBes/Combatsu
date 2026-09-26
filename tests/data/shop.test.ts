import { describe, expect, it } from 'vitest';
import { SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import { SHOP } from '../../src/data/tuning';

const entry = (id: string): ShopEntry => {
  const found = SHOP_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`entrada ausente do catálogo: ${id}`);
  return found;
};

describe('SHOP (tuning da loja, T1, valores das Assumptions)', () => {
  it('offers 3, weights comum 3 / raro 1, reroll 5/+5, salt 0x85ebca6b, cura 30 hp', () => {
    expect(SHOP).toEqual({
      offers: 3,
      weights: { common: 3, rare: 1 },
      rerollBase: 5,
      rerollStep: 5,
      rngSalt: 0x85ebca6b,
      curaHp: 30,
      vidaPerLevel: 15,
      forcaPerLevel: 0.1,
      agilidadePerLevel: 0.08,
      imaPerLevel: 0.3,
      sortePerLevel: 0.03,
    });
  });
});

describe('SHOP_CATALOG: ordem e forma (SHOP-08 usa a ordem do catálogo)', () => {
  it('ordem: vida, forca, agilidade, ima, sorte, cura', () => {
    expect(SHOP_CATALOG.map((e) => e.id)).toEqual(['vida', 'forca', 'agilidade', 'ima', 'sorte', 'cura']);
  });
});

describe('SHOP_CATALOG: maxLevel (MOD-03)', () => {
  it('vida 5, forca 5, agilidade 3, ima 3, sorte 3, cura 0', () => {
    expect(entry('vida').maxLevel).toBe(5);
    expect(entry('forca').maxLevel).toBe(5);
    expect(entry('agilidade').maxLevel).toBe(3);
    expect(entry('ima').maxLevel).toBe(3);
    expect(entry('sorte').maxLevel).toBe(3);
    expect(entry('cura').maxLevel).toBe(0);
  });
});

describe('SHOP_CATALOG: raridade (SHOP-08 usa comum 3 / raro 1)', () => {
  it('vida, agilidade, ima e cura são comuns; forca e sorte são raros', () => {
    expect(entry('vida').rarity).toBe('common');
    expect(entry('agilidade').rarity).toBe('common');
    expect(entry('ima').rarity).toBe('common');
    expect(entry('cura').rarity).toBe('common');
    expect(entry('forca').rarity).toBe('rare');
    expect(entry('sorte').rarity).toBe('rare');
  });
});

describe('SHOP_CATALOG: custo base/step (MOD-09)', () => {
  it('vida 12+6n, forca 15+8n, agilidade 10+6n, ima 6+4n, sorte 10+6n, cura 8+0n', () => {
    expect(entry('vida').cost).toEqual({ base: 12, step: 6 });
    expect(entry('forca').cost).toEqual({ base: 15, step: 8 });
    expect(entry('agilidade').cost).toEqual({ base: 10, step: 6 });
    expect(entry('ima').cost).toEqual({ base: 6, step: 4 });
    expect(entry('sorte').cost).toEqual({ base: 10, step: 6 });
    expect(entry('cura').cost).toEqual({ base: 8, step: 0 });
  });
});

describe('SHOP_CATALOG: minRound (SHOP-18)', () => {
  it('vida: nível 3 → 1, nível 4 → 6, nível 5 → 6', () => {
    expect(entry('vida').minRound(3)).toBe(1);
    expect(entry('vida').minRound(4)).toBe(6);
    expect(entry('vida').minRound(5)).toBe(6);
  });

  it('forca: nível 3 → 1, nível 4 → 6, nível 5 → 6', () => {
    expect(entry('forca').minRound(3)).toBe(1);
    expect(entry('forca').minRound(4)).toBe(6);
    expect(entry('forca').minRound(5)).toBe(6);
  });

  it('agilidade: nível 2 → 1, nível 3 → 4', () => {
    expect(entry('agilidade').minRound(2)).toBe(1);
    expect(entry('agilidade').minRound(3)).toBe(4);
  });

  it('demais (ima, sorte, cura): sempre 1, em qualquer nível pedido', () => {
    expect(entry('ima').minRound(1)).toBe(1);
    expect(entry('ima').minRound(3)).toBe(1);
    expect(entry('sorte').minRound(1)).toBe(1);
    expect(entry('sorte').minRound(3)).toBe(1);
    expect(entry('cura').minRound(1)).toBe(1);
  });
});
