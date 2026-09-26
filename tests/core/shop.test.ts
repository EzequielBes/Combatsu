import { describe, expect, it } from 'vitest';
import { drawOffers, eligible, previewText, Shop, type BuyContext } from '../../src/core/shop';
import { Modifiers } from '../../src/core/modifiers';
import { Rng } from '../../src/core/rng';
import { Wallet } from '../../src/core/wallet';
import { SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';

const entry = (id: string): ShopEntry => {
  const found = SHOP_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`entrada ausente do catálogo: ${id}`);
  return found;
};

/** Rng falso: devolve os valores de `next()` na ordem dada, sem depender do estado interno de `Rng`. */
function fakeRng(values: number[]): Rng {
  let i = 0;
  return {
    next: () => values[i++],
  } as unknown as Rng;
}

describe('eligible: teto de nível (SHOP-07)', () => {
  it('modificador no nível máximo nunca entra no pool', () => {
    const m = new Modifiers();
    for (let i = 0; i < 5; i++) m.apply('vida');
    expect(eligible(SHOP_CATALOG, m, 999).some((e) => e.id === 'vida')).toBe(false);
  });
});

describe('eligible: rodada mínima do próximo nível (SHOP-07, SHOP-18, L-010)', () => {
  it('vida no nível 3 (próximo é 4, exige rodada 6): fora na 5, dentro na 6', () => {
    const m = new Modifiers();
    m.apply('vida');
    m.apply('vida');
    m.apply('vida');
    expect(m.level('vida')).toBe(3);
    expect(eligible(SHOP_CATALOG, m, 5).some((e) => e.id === 'vida')).toBe(false);
    expect(eligible(SHOP_CATALOG, m, 6).some((e) => e.id === 'vida')).toBe(true);
  });

  it('agilidade no nível 2 (próximo é 3, exige rodada 4): fora na 3, dentro na 4', () => {
    const m = new Modifiers();
    m.apply('agilidade');
    m.apply('agilidade');
    expect(m.level('agilidade')).toBe(2);
    expect(eligible(SHOP_CATALOG, m, 3).some((e) => e.id === 'agilidade')).toBe(false);
    expect(eligible(SHOP_CATALOG, m, 4).some((e) => e.id === 'agilidade')).toBe(true);
  });
});

describe('eligible: cura sempre no pool (SHOP-39)', () => {
  it('mesmo na rodada 1 e com todo modificador no teto', () => {
    const m = new Modifiers();
    for (const id of ['vida', 'forca', 'agilidade', 'ima', 'sorte'] as const) {
      for (let i = 0; i < 5; i++) m.apply(id);
    }
    expect(eligible(SHOP_CATALOG, m, 1).map((e) => e.id)).toEqual(['cura']);
  });

  it('rodada 1 sem nenhuma compra: cura, agilidade, ima e sorte elegíveis (vida/forca exigem nível 1, sempre abertos)', () => {
    const m = new Modifiers();
    const ids = eligible(SHOP_CATALOG, m, 1).map((e) => e.id);
    expect(ids).toContain('cura');
    expect(ids).toEqual(['vida', 'forca', 'agilidade', 'ima', 'sorte', 'cura']);
  });
});

describe('drawOffers: sorteio ponderado sem reposição (SHOP-08)', () => {
  it('next() = 0 pega a 1ª entrada do pool', () => {
    const drawn = drawOffers([entry('vida'), entry('forca')], fakeRng([0]), 1);
    expect(drawn).toEqual([entry('vida')]);
  });

  it('valor logo abaixo do peso acumulado de vida (3) escolhe vida', () => {
    // pool: vida (comum, peso 3), forca (raro, peso 1); W = 4; x = next() * 4.
    const pool = [entry('vida'), entry('forca')];
    const drawn = drawOffers(pool, fakeRng([2.999 / 4]), 1);
    expect(drawn).toEqual([entry('vida')]);
  });

  it('valor logo acima do peso acumulado de vida (3) escolhe forca', () => {
    const pool = [entry('vida'), entry('forca')];
    const drawn = drawOffers(pool, fakeRng([3.001 / 4]), 1);
    expect(drawn).toEqual([entry('forca')]);
  });

  it('sem reposição: 2 sorteios de um pool de 2 devolvem as duas entradas, sem repetir', () => {
    const pool = [entry('vida'), entry('forca')];
    const drawn = drawOffers(pool, fakeRng([0, 0]), 2);
    expect(drawn).toHaveLength(2);
    expect(new Set(drawn.map((e) => e.id)).size).toBe(2);
  });

  it('pool com 2 elegíveis pedindo 3 devolve só 2 ofertas (SHOP-06)', () => {
    const drawn = drawOffers([entry('vida'), entry('forca')], new Rng(1), 3);
    expect(drawn).toHaveLength(2);
  });

  it('1000 sorteios com seeds distintas: nenhum tem ids repetidos dentro do próprio sorteio', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const ids = drawOffers(SHOP_CATALOG, new Rng(seed), 3).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('mesma seed produz sempre as mesmas ofertas, na mesma ordem', () => {
    const a = drawOffers(SHOP_CATALOG, new Rng(777), 3).map((e) => e.id);
    const b = drawOffers(SHOP_CATALOG, new Rng(777), 3).map((e) => e.id);
    expect(a).toEqual(b);
  });
});

/**
 * Contexto de compra (a loja não conhece o Player): por padrão `applyModifier` sobe o nível no `modifiers` que
 * a própria loja usa (como a cena faz de verdade) e `healPlayer` só registra a quantidade pedida.
 */
function buyCtx(
  modifiers: Modifiers,
  overrides: Partial<BuyContext> & { wallet: Wallet },
): BuyContext & { applied: ('vida' | 'forca' | 'agilidade' | 'ima' | 'sorte')[]; healed: number[] } {
  const applied: ('vida' | 'forca' | 'agilidade' | 'ima' | 'sorte')[] = [];
  const healed: number[] = [];
  return {
    hp: 100,
    maxHp: 100,
    applyModifier: (id) => {
      applied.push(id);
      modifiers.apply(id);
    },
    healPlayer: (n) => healed.push(n),
    ...overrides,
    applied,
    healed,
  };
}

/** Loja com round alto e nenhuma compra prévia: sorteio [0,0,0] cai sempre em vida, forca, agilidade (catálogo). */
function freshShop(rng: Rng = fakeRng([0, 0, 0]), round = 10, modifiers = new Modifiers()): Shop {
  return new Shop(SHOP_CATALOG, modifiers, rng, round);
}

describe('Shop: sorteio determinístico usado nos testes de compra', () => {
  it('fakeRng([0,0,0]) na rodada 10 sorteia vida, forca e agilidade, nessa ordem', () => {
    const shop = freshShop();
    const view = shop.view(new Wallet(), 100, 100);
    expect(view.offers.map((o) => o.id)).toEqual(['vida', 'forca', 'agilidade']);
  });
});

describe('Shop.buy: saldo exato compra, saldo − 1 recusa por falta de fundos (SHOP-45, SHOP-19, SHOP-41, SHOP-42, SHOP-10, L-010)', () => {
  it('saldo = custo (12): compra, saldo some, nível de vida sobe 1, oferta marcada como vendida', () => {
    const modifiers = new Modifiers();
    const shop = freshShop(fakeRng([0, 0, 0]), 10, modifiers);
    const wallet = new Wallet();
    wallet.add(12);
    const ctx = buyCtx(modifiers, { wallet });
    const result = shop.buy(0, ctx);
    expect(result).toEqual({ ok: true, id: 'vida', cost: 12 });
    expect(wallet.fragments).toBe(0);
    expect(modifiers.level('vida')).toBe(1);
    expect(ctx.applied).toEqual(['vida']);
    expect(shop.view(wallet, 100, 100).offers[0].sold).toBe(true);
  });

  it('saldo = custo − 1 (11): recusa por falta de fundos, carteira e nível intactos', () => {
    const modifiers = new Modifiers();
    const shop = freshShop(fakeRng([0, 0, 0]), 10, modifiers);
    const wallet = new Wallet();
    wallet.add(11);
    const ctx = buyCtx(modifiers, { wallet });
    const result = shop.buy(0, ctx);
    expect(result).toEqual({ ok: false, reason: 'funds' });
    expect(wallet.fragments).toBe(11);
    expect(modifiers.level('vida')).toBe(0);
    expect(ctx.applied).toEqual([]);
  });
});

describe('Shop.buy: carta já vendida e slot vazio não mudam nada (SHOP-11, SHOP-14)', () => {
  it('comprar de novo a mesma carta: recusa por sold, nada muda', () => {
    const modifiers = new Modifiers();
    const shop = freshShop(fakeRng([0, 0, 0]), 10, modifiers);
    const wallet = new Wallet();
    wallet.add(100);
    shop.buy(0, buyCtx(modifiers, { wallet }));
    const before = wallet.fragments;
    const result = shop.buy(0, buyCtx(modifiers, { wallet }));
    expect(result).toEqual({ ok: false, reason: 'sold' });
    expect(wallet.fragments).toBe(before);
    expect(modifiers.level('vida')).toBe(1); // não sobe de novo
  });

  it('slot vazio (loja com só 1 elegível): recusa por empty, nada muda', () => {
    const modifiers = new Modifiers();
    for (const id of ['vida', 'forca', 'agilidade', 'ima', 'sorte'] as const) {
      for (let i = 0; i < 5; i++) modifiers.apply(id);
    }
    const shop = new Shop(SHOP_CATALOG, modifiers, fakeRng([0]), 1); // só cura elegível: slots 1 e 2 vazios
    const wallet = new Wallet();
    wallet.add(100);
    const ctx = buyCtx(modifiers, { wallet });
    const result = shop.buy(1, ctx);
    expect(result).toEqual({ ok: false, reason: 'empty' });
    expect(wallet.fragments).toBe(100);
    expect(ctx.applied).toEqual([]);
    expect(ctx.healed).toEqual([]);
  });
});

describe('Shop.buy: cura com vida cheia recusa, vida cheia − 1 compra e cura até o teto (SHOP-13, SHOP-12, L-010)', () => {
  it('hp = maxHp: recusa por fullHp, carteira intacta', () => {
    // Rodada 1, sem compras: pool = catálogo inteiro (6). O 3º sorteio (índice 2) precisa cair em `cura` para o
    // teste ficar direto; em vez de calcular pesos à mão, drena o pool até sobrar só `cura` (nível máximo em
    // todo o resto) e sorteia com a loja resultante (só 1 oferta, sempre `cura`).
    const modifiers = new Modifiers();
    for (const id of ['vida', 'forca', 'agilidade', 'ima', 'sorte'] as const) {
      for (let i = 0; i < 5; i++) modifiers.apply(id);
    }
    const shop = new Shop(SHOP_CATALOG, modifiers, fakeRng([0]), 1);
    const wallet = new Wallet();
    wallet.add(100);
    const ctx = buyCtx(modifiers, { wallet, hp: 100, maxHp: 100 });
    const result = shop.buy(0, ctx);
    expect(result).toEqual({ ok: false, reason: 'fullHp' });
    expect(wallet.fragments).toBe(100);
    expect(ctx.healed).toEqual([]);
  });

  it('hp = maxHp − 1: compra, cura chamada com 30, hp final vira maxHp (min(hp+30,maxHp))', () => {
    const modifiers = new Modifiers();
    for (const id of ['vida', 'forca', 'agilidade', 'ima', 'sorte'] as const) {
      for (let i = 0; i < 5; i++) modifiers.apply(id);
    }
    const shop = new Shop(SHOP_CATALOG, modifiers, fakeRng([0]), 1);
    const wallet = new Wallet();
    wallet.add(100);
    let hp = 99;
    const maxHp = 100;
    const ctx = buyCtx(modifiers, { wallet, hp, maxHp, healPlayer: (n) => (hp = Math.min(hp + n, maxHp)) });
    const result = shop.buy(0, ctx);
    expect(result).toEqual({ ok: true, id: 'cura', cost: 8 });
    expect(hp).toBe(100);
    expect(wallet.fragments).toBe(92);
  });

  it('hp 70/100: cura leva a 100 (SHOP-12: min(hp + 30, maxHp))', () => {
    const modifiers = new Modifiers();
    for (const id of ['vida', 'forca', 'agilidade', 'ima', 'sorte'] as const) {
      for (let i = 0; i < 5; i++) modifiers.apply(id);
    }
    const shop = new Shop(SHOP_CATALOG, modifiers, fakeRng([0]), 1);
    const wallet = new Wallet();
    wallet.add(100);
    let hp = 70;
    const maxHp = 100;
    const ctx = buyCtx(modifiers, { wallet, hp, maxHp, healPlayer: (n) => (hp = Math.min(hp + n, maxHp)) });
    shop.buy(0, ctx);
    expect(hp).toBe(100);
  });
});

describe('Shop.view: ofertas não compradas mantêm id, slot e custo depois de uma compra (SHOP-15, SHOP-44)', () => {
  it('comprar o slot 0 não muda id/custo/slot dos slots 1 e 2; affordable = custo ≤ saldo', () => {
    const modifiers = new Modifiers();
    const shop = freshShop(fakeRng([0, 0, 0]), 10, modifiers);
    const wallet = new Wallet();
    wallet.add(100);
    const before = shop.view(wallet, 100, 100);
    shop.buy(0, buyCtx(modifiers, { wallet }));
    const after = shop.view(wallet, 100, 100);
    expect(after.offers[1]).toMatchObject({ id: before.offers[1].id, cost: before.offers[1].cost, slot: 1 });
    expect(after.offers[2]).toMatchObject({ id: before.offers[2].id, cost: before.offers[2].cost, slot: 2 });
    // saldo 88 (100-12): forca custa 15 (affordable), agilidade custa 10 (affordable).
    expect(after.offers[1].affordable).toBe(15 <= wallet.fragments);
    expect(after.offers[2].affordable).toBe(10 <= wallet.fragments);
  });

  it('affordable vira false quando o saldo cai abaixo do custo', () => {
    const shop = freshShop();
    const wallet = new Wallet();
    wallet.add(11); // abaixo do custo de vida (12)
    expect(shop.view(wallet, 100, 100).offers[0].affordable).toBe(false);
    wallet.add(1); // agora 12, exatamente o custo
    expect(shop.view(wallet, 100, 100).offers[0].affordable).toBe(true);
  });
});

describe('Shop.view: levelText "Nv n+1/max" (SHOP-21)', () => {
  it('vida no nível 0 mostra Nv 1/5; depois de comprar, Nv 2/5', () => {
    const modifiers = new Modifiers();
    const shop = freshShop(fakeRng([0, 0, 0]), 10, modifiers);
    const wallet = new Wallet();
    wallet.add(100);
    expect(shop.view(wallet, 100, 100).offers[0].levelText).toBe('Nv 1/5');
    shop.buy(0, buyCtx(modifiers, { wallet }));
    expect(shop.view(wallet, 100, 100).offers[0].levelText).toBe('Nv 2/5');
  });
});

describe('previewText: textos exatos das Assumptions (SHOP-21)', () => {
  it('vida: "Vida máx. 100 → 115"', () => {
    expect(previewText(entry('vida'), new Modifiers(), 100, 100)).toBe('Vida máx. 100 → 115');
  });

  it('forca: "Dano ×1,0 → ×1,1"', () => {
    expect(previewText(entry('forca'), new Modifiers(), 100, 100)).toBe('Dano ×1,0 → ×1,1');
  });

  it('agilidade: "Velocidade 220 → 238"', () => {
    expect(previewText(entry('agilidade'), new Modifiers(), 100, 100)).toBe('Velocidade 220 → 238');
  });

  it('ima: "Ímã 72 → 94"', () => {
    expect(previewText(entry('ima'), new Modifiers(), 100, 100)).toBe('Ímã 72 → 94');
  });

  it('sorte: "Cura 10% → 13%"', () => {
    expect(previewText(entry('sorte'), new Modifiers(), 100, 100)).toBe('Cura 10% → 13%');
  });

  it('cura: hp 70/100 → "Vida 70 → 100"', () => {
    expect(previewText(entry('cura'), new Modifiers(), 70, 100)).toBe('Vida 70 → 100');
  });
});
