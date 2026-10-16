import { describe, expect, it } from 'vitest';
import { expectedIncome } from '../../src/core/economy';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { axisEligible } from '../../src/core/shopEligibility';
import { cardCost } from '../../src/core/shopPricing';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG } from '../../src/data/shop';
import { ECONOMY, WAVE } from '../../src/data/tuning';
import { equipRed } from './redLevel';

const RED = GAME_SHOP_CATALOG.find((e) => e.id === 'vermelho')!;

/**
 * Simula as lojas das rodadas 1 a `lastRound` de uma build que só compra pontos do Vermelho (ESC-03.7): a renda
 * acumulada é `expectedIncome(r)`, cada ponto custa o `cardCost` da loja daquela rodada com a inflação, a trava por
 * rodada vem do `axisEligible`, e toda carta é suposta à venda. Devolve o nível do Vermelho ao fim de cada loja.
 */
function redLevelsByShop(lastRound: number): number[] {
  const loadout = new Loadout();
  equipRed(loadout, 0, 1);
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);
  const axes = ['potencia', 'potencia', 'potencia', 'escala', 'escala'] as const;
  let spent = 0;
  const levels: number[] = [];
  for (let round = 1; round <= lastRound; round++) {
    const wallet = expectedIncome(round, WAVE, ECONOMY) - spent;
    let left = wallet;
    while (axisEligible(RED, loadout, round)) {
      const price = cardCost(RED, { modifiers, loadout, round });
      if (price > left) break;
      left -= price;
      loadout.axes.add('vermelho', axes[loadout.axes.total('vermelho')]);
    }
    spent += wallet - left;
    levels.push(loadout.levelOf('vermelho'));
  }
  return levels;
}

describe('ESC-03.7: curva de build do Vermelho focado, com a renda esperada', () => {
  const levels = redLevelsByShop(10);

  it('Nv 2 até a loja da rodada 3', () => {
    expect(levels[2]).toBeGreaterThanOrEqual(2);
  });

  it('Nv 5 até a loja da rodada 10', () => {
    expect(levels[9]).toBeGreaterThanOrEqual(5);
  });

  it('a trava vale na curva: sem ponto na loja da rodada 1', () => {
    expect(levels[0]).toBe(1);
  });
});
