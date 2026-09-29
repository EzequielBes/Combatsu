import { describe, expect, it } from 'vitest';
import { eligible, previewText, Shop, type BuyContext } from '../../src/core/shop';
import { Modifiers } from '../../src/core/modifiers';
import { Loadout } from '../../src/core/loadout';
import { Rng } from '../../src/core/rng';
import { Wallet } from '../../src/core/wallet';
import { FULL_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import type { TechId } from '../../src/data/techniques';

const technique = (id: string): ShopEntry => {
  const found = FULL_SHOP_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`entrada ausente do catálogo: ${id}`);
  return found;
};

/** Rng falso: devolve os valores de `next()` na ordem dada (mesmo padrão de tests/core/shop.test.ts). */
function fakeRng(values: number[]): Rng {
  let i = 0;
  return { next: () => values[i++] } as unknown as Rng;
}

/** Contexto de compra cujo `applyTechnique` equipa (não equipada) ou sobe de nível (já equipada), como a cena fará. */
function techBuyCtx(loadout: Loadout, wallet: Wallet): BuyContext {
  return {
    wallet,
    hp: 100,
    maxHp: 100,
    applyModifier: () => {},
    healPlayer: () => {},
    applyTechnique: (id: TechId) => {
      if (loadout.levelOf(id) > 0) loadout.upgrade(id);
      else {
        const slot = loadout.firstEmpty();
        if (slot !== null) loadout.equip(slot, id, 1);
      }
    },
  };
}

describe('TSH-01: catálogo tem as 4 técnicas, kind e maxLevel certos', () => {
  it('divergente e corte comuns; azul e vermelho raras; todas kind technique maxLevel 3', () => {
    expect(technique('divergente')).toMatchObject({ kind: 'technique', rarity: 'common', maxLevel: 3 });
    expect(technique('corte')).toMatchObject({ kind: 'technique', rarity: 'common', maxLevel: 3 });
    expect(technique('azul')).toMatchObject({ kind: 'technique', rarity: 'rare', maxLevel: 3 });
    expect(technique('vermelho')).toMatchObject({ kind: 'technique', rarity: 'rare', maxLevel: 3 });
  });
});

describe('TSH-02: custo = base + step × nível atual (0 se não equipada)', () => {
  it('bases e steps do catálogo: divergente 20+15n, corte 30+15n, azul 35+20n, vermelho 40+20n', () => {
    expect(technique('divergente').cost).toEqual({ base: 20, step: 15 });
    expect(technique('corte').cost).toEqual({ base: 30, step: 15 });
    expect(technique('azul').cost).toEqual({ base: 35, step: 20 });
    expect(technique('vermelho').cost).toEqual({ base: 40, step: 20 });
  });

  it('Shop.view reporta o custo real: vermelho equipada no nível 2 custa 40 + 20×2 = 80', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'vermelho', 2);
    const shop = new Shop([technique('vermelho')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 6, loadout);
    const wallet = new Wallet();
    wallet.add(200);
    expect(shop.view(wallet, 100, 100).offers[0].cost).toBe(80);
  });

  it('não equipada (n=0): divergente custa 20', () => {
    const loadout = new Loadout();
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    expect(shop.view(wallet, 100, 100).offers[0].cost).toBe(20);
  });
});

describe('TSH-03: técnica não equipada entra no pool se e só se houver slot vazio', () => {
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);

  it('os dois slots vazios: divergente elegível', () => {
    const loadout = new Loadout();
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10, loadout).some((e) => e.id === 'divergente')).toBe(true);
  });

  it('os dois slots cheios (com outras técnicas): azul (não equipada) não é elegível', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    loadout.equip(1, 'corte', 1);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10, loadout).some((e) => e.id === 'azul')).toBe(false);
  });
});

describe('TSH-04: técnica equipada entra no pool se nível < 3 e a rodada mínima do próximo nível já passou (L-010)', () => {
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);

  it('nível 1 → 2 exige rodada ≥ 3: fora na 2, dentro na 3', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 2, loadout).some((e) => e.id === 'divergente')).toBe(false);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 3, loadout).some((e) => e.id === 'divergente')).toBe(true);
  });

  it('nível 2 → 3 exige rodada ≥ 6: fora na 5, dentro na 6', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 2);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 5, loadout).some((e) => e.id === 'divergente')).toBe(false);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 6, loadout).some((e) => e.id === 'divergente')).toBe(true);
  });

  it('nível 3 (máximo): nunca elegível, mesmo em rodada alta', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 3);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 999, loadout).some((e) => e.id === 'divergente')).toBe(false);
  });
});

describe('TSH-05: com os dois slots vazios, o slot 0 é sempre uma técnica (também após reroll)', () => {
  it('fakeRng([0,0,0]) escolhe divergente (peso 3, primeira do catálogo) e completa com vida/forca', () => {
    const loadout = new Loadout();
    const shop = new Shop(FULL_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), fakeRng([0, 0, 0, 0, 0, 0]), 10, loadout);
    const ids = shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
    expect(ids[0]).toBe('divergente');
    expect(ids).toEqual(['divergente', 'vida', 'forca']);
  });

  it('depois do reroll, o slot 0 continua sendo uma técnica', () => {
    const loadout = new Loadout();
    const shop = new Shop(FULL_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), fakeRng([0, 0, 0, 0, 0, 0]), 10, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    expect(shop.reroll(wallet)).toBe(true);
    const ids = shop.view(wallet, 100, 100).offers.map((o) => o.id);
    expect(ids[0]).toBe('divergente');
  });

  it('sem loadout (comportamento antigo da F4): a garantia não se aplica, slot 0 sorteia normalmente', () => {
    const shop = new Shop(FULL_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), fakeRng([0, 0, 0]), 10);
    const ids = shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
    expect(ids).toEqual(['vida', 'forca', 'agilidade']); // nenhuma técnica: sem loadout elas nem entram no pool
  });
});

describe('TSH-06: comprar técnica não equipada equipa nível 1 no primeiro slot vazio', () => {
  it('slot 1 vazio: compra equipa em nível 1', () => {
    const loadout = new Loadout();
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    const result = shop.buy(0, techBuyCtx(loadout, wallet));
    expect(result).toEqual({ ok: true, id: 'divergente', cost: 20 });
    expect(loadout.slotsView[0]).toEqual({ id: 'divergente', level: 1 });
  });

  it('slot 1 ocupado: compra equipa no slot 2', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'corte', 1);
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    shop.buy(0, techBuyCtx(loadout, wallet));
    expect(loadout.slotsView[1]).toEqual({ id: 'divergente', level: 1 });
  });
});

describe('TSH-07: comprar técnica já equipada sobe exatamente 1 nível', () => {
  it('divergente equipada no nível 1, comprada de novo na rodada 3: vira nível 2', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 3, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    const result = shop.buy(0, techBuyCtx(loadout, wallet));
    expect(result).toEqual({ ok: true, id: 'divergente', cost: 35 }); // 20 + 15×1
    expect(loadout.levelOf('divergente')).toBe(2);
  });
});

describe('TSH-08, TSH-15: catálogo tem `energia` (max 5, custo 10+6n) e `fluxo` (max 4, custo 12+6n)', () => {
  it('energia: comum, maxLevel 5, cost 10+6n', () => {
    expect(technique('energia')).toMatchObject({ kind: 'modifier', rarity: 'common', maxLevel: 5, cost: { base: 10, step: 6 } });
  });

  it('fluxo: comum, maxLevel 4, cost 12+6n', () => {
    expect(technique('fluxo')).toMatchObject({ kind: 'modifier', rarity: 'common', maxLevel: 4, cost: { base: 12, step: 6 } });
  });
});

describe('TSH-09: energia/fluxo só entram no pool com ao menos uma técnica equipada', () => {
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);

  it('sem loadout ou loadout vazio: nenhum dos dois é elegível', () => {
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10).some((e) => e.id === 'energia')).toBe(false);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10, new Loadout()).some((e) => e.id === 'fluxo')).toBe(false);
  });

  it('com uma técnica equipada: os dois ficam elegíveis', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10, loadout).some((e) => e.id === 'energia')).toBe(true);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 10, loadout).some((e) => e.id === 'fluxo')).toBe(true);
  });
});

describe('TSH-12: prévia de técnica não equipada mostra o slot de destino', () => {
  it('slot 1 vazio → "Nova · slot 1"', () => {
    const loadout = new Loadout();
    expect(previewText(technique('divergente'), new Modifiers(), 100, 100, loadout)).toBe('Nova · slot 1');
  });

  it('slot 1 ocupado, slot 2 vazio → "Nova · slot 2"', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'corte', 1);
    expect(previewText(technique('divergente'), new Modifiers(), 100, 100, loadout)).toBe('Nova · slot 2');
  });
});

describe('TSH-16: prévia de técnica equipada (nível < 3) mostra os fatores de dano do nível atual e do seguinte', () => {
  it('nível 1 → "Dano ×1,0 → ×1,25"', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(previewText(technique('divergente'), new Modifiers(), 100, 100, loadout)).toBe('Dano ×1,0 → ×1,25');
  });

  it('nível 2 → "Dano ×1,25 → ×1,5"', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 2);
    expect(previewText(technique('divergente'), new Modifiers(), 100, 100, loadout)).toBe('Dano ×1,25 → ×1,5');
  });
});

describe('TSH-13: prévia de `energia` mostra o teto atual e o do próximo nível', () => {
  it('nível 0 → "Energia máx. 100 → 120"', () => {
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    expect(previewText(technique('energia'), modifiers, 100, 100)).toBe('Energia máx. 100 → 120');
  });

  it('nível 4 → "Energia máx. 180 → 200"', () => {
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    for (let i = 0; i < 4; i++) modifiers.apply('energia');
    expect(previewText(technique('energia'), modifiers, 100, 100)).toBe('Energia máx. 180 → 200');
  });
});

describe('TSH-17: prévia de `fluxo` mostra o regen atual e o do próximo nível', () => {
  it('nível 0 → "Regen 8/s → 10/s"', () => {
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    expect(previewText(technique('fluxo'), modifiers, 100, 100)).toBe('Regen 8/s → 10/s');
  });

  it('nível 3 → "Regen 14/s → 16/s"', () => {
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    for (let i = 0; i < 3; i++) modifiers.apply('fluxo');
    expect(previewText(technique('fluxo'), modifiers, 100, 100)).toBe('Regen 14/s → 16/s');
  });
});
