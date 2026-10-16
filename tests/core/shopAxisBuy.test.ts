import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Shop, type BuyContext, type OfferView } from '../../src/core/shop';
import { axisPointPrice, inflate } from '../../src/core/shopPricing';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { Rng } from '../../src/core/rng';
import { Wallet } from '../../src/core/wallet';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG } from '../../src/data/shop';
import { PRICING, SHOP } from '../../src/data/tuning';
import type { AxisId, AxisItem } from '../../src/data/techAxes';
import { equipRed } from './redLevel';

/** Rng falso: devolve os valores dados na ordem e depois repete o último. */
const fakeRng = (...values: number[]): Rng => {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)] } as unknown as Rng;
};

/** Vermelho Nv 2 (1 ponto de Potência) no slot 0 e Azul no slot 1: o Vermelho é o foco. */
const redFocusLoadout = (): Loadout => {
  const loadout = new Loadout();
  equipRed(loadout, 0, 2);
  loadout.equip(1, 'azul');
  return loadout;
};

/** Loja da rodada 10; o `axisRng` 0,59 e depois 0 põe o Vermelho na carta 0 com os eixos Potência e Escala. */
const redShop = (loadout: Loadout, axisRng: Rng = fakeRng(0.59, 0)): Shop =>
  new Shop(GAME_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), new Rng(3), 10, loadout, undefined, undefined, axisRng);

const richWallet = (): Wallet => {
  const wallet = new Wallet();
  wallet.add(500);
  return wallet;
};

const ctxFor = (loadout: Loadout, wallet: Wallet) => {
  const applyAxis = vi.fn((item: AxisItem, axis: AxisId) => {
    loadout.axes.add(item, axis as 'potencia');
  });
  const ctx: BuyContext = {
    wallet,
    hp: 100,
    maxHp: 100,
    applyModifier: () => {},
    healPlayer: () => {},
    applyTechnique: () => {},
    applyAxis,
  };
  return { ctx, applyAxis };
};

const viewOf = (shop: Shop, wallet: Wallet = richWallet()): OfferView[] => shop.view(wallet, 100, 100).offers;

describe('PRC-02: o ponto de eixo custa 12 + 4 por ponto já posto', () => {
  it('a regra dá 12, 16, 20, 24 e 28 pelos pontos 0 a 4', () => {
    expect([0, 1, 2, 3, 4].map(axisPointPrice)).toEqual([12, 16, 20, 24, 28]);
    expect(PRICING.axisPoint).toEqual({ base: 12, step: 4 });
  });

  it('a carta do Vermelho mostra o preço do ponto na rodada 10 (PRC-03) e Nv N/6', () => {
    for (let points = 0; points <= 4; points++) {
      const loadout = new Loadout();
      equipRed(loadout, 0, 1);
      for (const axis of ['potencia', 'potencia', 'escala', 'escala'].slice(0, points)) {
        loadout.axes.add('vermelho', axis as 'potencia');
      }
      const card = viewOf(redShop(loadout, fakeRng(0.59, 0)))[0];
      expect(card.id).toBe('vermelho');
      expect(card.cost).toBe(inflate(12 + 4 * points, 10));
      expect(card.levelText).toBe(`Nv ${points + 2}/6`);
    }
  });

  it('a carta do Corpo custa pelo ponto e lê o nível dos eixos, sem tocar no preço de atributo', () => {
    const loadout = new Loadout();
    loadout.axes.add('corpo', 'impacto');
    loadout.axes.add('corpo', 'peso');
    const shop = new Shop(
      GAME_SHOP_CATALOG,
      new Modifiers(FULL_SHOP_CATALOG),
      new Rng(1),
      10,
      loadout,
      undefined,
      undefined,
      fakeRng(0, 0),
    );
    const card = viewOf(shop)[0];
    expect(card.id).toBe('corpo');
    expect(card.cost).toBe(31); // round(20 × 1,54)
    expect(card.levelText).toBe('Nv 4/6');
  });

  it('o Vermelho equipado no Nv 2 custa 16 (1 ponto) × 1,54 = 25 na rodada 10, não os 60 de técnica de antes', () => {
    const card = viewOf(redShop(redFocusLoadout()))[0];
    expect(card.cost).toBe(25);
  });
});

describe('Shop: carta de eixo com 4 cartas (CRD-01, CRD-04, CRD-05)', () => {
  const offers = SHOP.offers;
  beforeAll(() => {
    SHOP.offers = 4;
  });
  afterAll(() => {
    SHOP.offers = offers;
  });

  it('a loja tem 4 cartas e a carta 0 do Vermelho traz os dois eixos, o foco primeiro', () => {
    const cards = viewOf(redShop(redFocusLoadout()));
    expect(cards).toHaveLength(4);
    expect(cards[0].id).toBe('vermelho');
    expect(cards[0].axes).toEqual(['potencia', 'escala']);
    expect(cards[0].selectedAxis).toBe('potencia');
    expect(cards.slice(1).every((c) => c.axes.length === 0 || c.id === 'corpo')).toBe(true);
  });

  it('chooseAxis(+1) troca para o 2º eixo e a prévia marca a escolhida', () => {
    const shop = redShop(redFocusLoadout());
    expect(viewOf(shop)[0].preview!.split('\n')[0].startsWith('›Potência')).toBe(true);
    shop.chooseAxis(1);
    const card = viewOf(shop)[0];
    expect(card.selectedAxis).toBe('escala');
    const lines = card.preview!.split('\n');
    expect(lines[0].startsWith(' Potência')).toBe(true);
    expect(lines[1]).toBe('›Escala 96→120');
  });

  it('chooseAxis(-1) volta em ciclo e não faz nada numa carta sem eixo', () => {
    const shop = redShop(redFocusLoadout());
    shop.chooseAxis(-1);
    expect(viewOf(shop)[0].selectedAxis).toBe('escala');
    shop.chooseAxis(-1);
    expect(viewOf(shop)[0].selectedAxis).toBe('potencia');
    shop.move(1);
    const plain = viewOf(shop)[1];
    expect(plain.axes.length === 0 || plain.id === 'corpo').toBe(true);
    if (plain.axes.length === 0) {
      shop.chooseAxis(1);
      expect(viewOf(shop)[1].selectedAxis).toBeNull();
    }
  });

  it('a compra põe o ponto no eixo escolhido e gasta o preço do ponto', () => {
    const loadout = redFocusLoadout();
    const shop = redShop(loadout);
    shop.chooseAxis(1);
    const wallet = richWallet();
    const { ctx, applyAxis } = ctxFor(loadout, wallet);
    const result = shop.buy(0, ctx);
    expect(result).toEqual({ ok: true, id: 'vermelho', cost: 25 });
    expect(applyAxis).toHaveBeenCalledWith('vermelho', 'escala');
    expect(loadout.axes.points('vermelho', 'escala')).toBe(1);
    expect(loadout.axes.points('vermelho', 'potencia')).toBe(1);
    expect(wallet.fragments).toBe(500 - 25);
  });

  it('sem escolher, a compra vai ao eixo-foco', () => {
    const loadout = redFocusLoadout();
    const shop = redShop(loadout);
    const { ctx } = ctxFor(loadout, richWallet());
    shop.buy(0, ctx);
    expect(loadout.axes.points('vermelho', 'potencia')).toBe(2);
  });

  it('compra sem saldo não muda nada (checar, gastar, aplicar)', () => {
    const loadout = redFocusLoadout();
    const shop = redShop(loadout);
    const wallet = new Wallet();
    wallet.add(24); // o ponto custa 25
    const { ctx, applyAxis } = ctxFor(loadout, wallet);
    expect(shop.buy(0, ctx)).toEqual({ ok: false, reason: 'funds' });
    expect(applyAxis).not.toHaveBeenCalled();
    expect(wallet.fragments).toBe(24);
    expect(loadout.axes.total('vermelho')).toBe(1);
    expect(viewOf(shop, wallet)[0].sold).toBe(false);
  });

  it('com saldo exato de 25 a compra passa', () => {
    const loadout = redFocusLoadout();
    const shop = redShop(loadout);
    const wallet = new Wallet();
    wallet.add(25);
    const { ctx } = ctxFor(loadout, wallet);
    expect(shop.buy(0, ctx).ok).toBe(true);
    expect(wallet.fragments).toBe(0);
  });

  it('o reroll sorteia de novo e a escolha volta ao eixo-foco (edge case)', () => {
    const shop = redShop(redFocusLoadout(), fakeRng(0.59, 0, 0.59, 0.99));
    shop.chooseAxis(1);
    expect(viewOf(shop)[0].selectedAxis).toBe('escala');
    const wallet = richWallet();
    expect(shop.reroll(wallet)).toBe(true);
    const card = shop.view(wallet, 100, 100).offers[0];
    expect(card.id).toBe('vermelho');
    expect(card.axes).toEqual(['potencia', 'perfuracao']); // o axisRng sorteou de novo
    expect(card.selectedAxis).toBe('potencia');
  });

  it('o número de cartas vem de SHOP.offers e a seleção cicla nas 4', () => {
    const shop = redShop(redFocusLoadout());
    for (let i = 0; i < 4; i++) shop.move(1);
    expect(shop.selected).toBe(0);
    shop.move(-1);
    expect(shop.selected).toBe(3);
  });
});
