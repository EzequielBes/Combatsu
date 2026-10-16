import { describe, expect, it } from 'vitest';
import {
  axisGate,
  axisPointPrice,
  cardCost,
  inflate,
  newTechPrice,
  techLevelGate,
  type CardCostCtx,
} from '../../src/core/shopPricing';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import { equipRed } from './redLevel';

const entryOf = (id: string): ShopEntry => GAME_SHOP_CATALOG.find((e) => e.id === id)!;

const ctxOf = (round: number, loadout = new Loadout()): CardCostCtx => ({
  modifiers: new Modifiers(FULL_SHOP_CATALOG),
  loadout,
  round,
});

describe('PRC-01: a técnica nova custa 20 a comum e 26 a rara', () => {
  it('a regra dá 20 e 26', () => {
    expect(newTechPrice('common')).toBe(20);
    expect(newTechPrice('rare')).toBe(26);
  });

  it('o Vermelho novo (raro) custa 26 na rodada 1 e o Divergente novo (comum) 20', () => {
    expect(cardCost(entryOf('vermelho'), ctxOf(1))).toBe(26);
    expect(cardCost(entryOf('divergente'), ctxOf(1))).toBe(20);
  });
});

describe('PRC-02: o ponto de eixo custa 12 + 4 por ponto', () => {
  it('dá 12, 16, 20, 24 e 28', () => {
    expect([0, 1, 2, 3, 4].map(axisPointPrice)).toEqual([12, 16, 20, 24, 28]);
  });
});

describe('PRC-03: inflação de 6% por rodada depois da 1ª', () => {
  it('multiplica por 1,00 / 1,06 / 1,54 / 2,14 nas rodadas 1, 2, 10 e 20', () => {
    expect([1, 2, 10, 20].map((r) => inflate(100, r))).toEqual([100, 106, 154, 214]);
  });

  it('arredonda o preço da carta', () => {
    expect(inflate(12, 2)).toBe(13); // 12,72
    expect(inflate(8, 2)).toBe(8); // 8,48
    expect(inflate(10, 5)).toBe(12); // 12,4
  });

  it('o 1º ponto de eixo do Vermelho custa 13 na rodada 2', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 1);
    expect(cardCost(entryOf('vermelho'), ctxOf(2, loadout))).toBe(13);
  });
});

describe('PRC-04: trava por rodada do ponto de eixo', () => {
  const open = (points: number, round: number): boolean => axisGate(points) <= round;

  it('o 1º ponto: recusado na rodada 1, aceito na 2', () => {
    expect([open(0, 1), open(0, 2)]).toEqual([false, true]);
  });

  it('o 2º ponto: recusado na rodada 1, aceito na 2', () => {
    expect([open(1, 1), open(1, 2)]).toEqual([false, true]);
  });

  it('o 3º ponto: recusado na rodada 3, aceito na 4', () => {
    expect([open(2, 3), open(2, 4)]).toEqual([false, true]);
  });

  it('o 4º ponto: recusado na rodada 3, aceito na 4', () => {
    expect([open(3, 3), open(3, 4)]).toEqual([false, true]);
  });

  it('o 5º ponto: recusado na rodada 5, aceito na 6', () => {
    expect([open(4, 5), open(4, 6)]).toEqual([false, true]);
  });

  it('não há 6º ponto', () => {
    expect(open(5, 1000)).toBe(false);
  });
});

describe('PRC-04: trava de nível das técnicas sem eixos', () => {
  it('o Nv 2 abre na rodada 2: recusado na 1, aceito na 2', () => {
    expect([techLevelGate(2) <= 1, techLevelGate(2) <= 2]).toEqual([false, true]);
  });

  it('o Nv 3 abre na rodada 4: recusado na 3, aceito na 4', () => {
    expect([techLevelGate(3) <= 3, techLevelGate(3) <= 4]).toEqual([false, true]);
  });
});

describe('PRC-06: o nível das outras técnicas fica em base + passo × nível, com a inflação', () => {
  it('Azul Nv 1 → 2 custa 41 na rodada 1 e round(41 × 1,06) = 43 na 2', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul');
    expect(cardCost(entryOf('azul'), ctxOf(1, loadout))).toBe(41);
    expect(cardCost(entryOf('azul'), ctxOf(2, loadout))).toBe(43);
  });

  it('Desmantelar Nv 2 → 3 custa 23 + 11 × 2 = 45 na rodada 1 e round(45 × 1,54) = 69 na 10', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'corte', 2);
    expect(cardCost(entryOf('corte'), ctxOf(1, loadout))).toBe(45);
    expect(cardCost(entryOf('corte'), ctxOf(10, loadout))).toBe(69);
  });
});
