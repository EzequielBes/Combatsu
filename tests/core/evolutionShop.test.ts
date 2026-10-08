import { describe, expect, it } from 'vitest';
import { Arsenal } from '../../src/core/arsenal';
import { Perks } from '../../src/core/build';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { Rng } from '../../src/core/rng';
import { eligible, Shop, type BuyContext } from '../../src/core/shop';
import { Wallet } from '../../src/core/wallet';
import { GAME_SHOP_CATALOG } from '../../src/data/shop';
import type { TechId } from '../../src/data/techniques';

function loadoutWith(a: [TechId, 1 | 2 | 3] | null, b: [TechId, 1 | 2 | 3] | null): Loadout {
  const lo = new Loadout();
  if (a) lo.equip(0, a[0], a[1]);
  if (b) lo.equip(1, b[0], b[1]);
  return lo;
}

const pool = (lo: Loadout): string[] =>
  eligible(GAME_SHOP_CATALOG, new Modifiers(), 6, lo, new Perks(), new Arsenal()).map((e) => e.id);

describe('evolução na loja (EVO-01, EVO-02, EVO-04)', () => {
  it('EVO-01: receita pronta, a carta do Vazio Roxo está nas ofertas (em toda seed)', () => {
    for (let seed = 0; seed < 40; seed++) {
      const lo = loadoutWith(['azul', 3], ['vermelho', 3]);
      const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(), new Rng(seed), 6, lo, new Perks(), new Arsenal());
      const ids = shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
      expect(ids, `seed ${seed}`).toContain('roxo');
    }
  });

  it('EVO-02: uma das duas no nível 2, ou faltando, a evolução não entra no pool', () => {
    expect(pool(loadoutWith(['azul', 3], ['vermelho', 2]))).not.toContain('roxo');
    expect(pool(loadoutWith(['azul', 2], ['vermelho', 3]))).not.toContain('roxo');
    expect(pool(loadoutWith(['azul', 3], ['corte', 3]))).not.toContain('roxo');
    expect(pool(loadoutWith(['azul', 3], ['vermelho', 3]))).toContain('roxo');
  });

  it('EVO-04: custa 60 e, comprada, chama a fusão uma vez; a mesma carta não se vende duas vezes', () => {
    const lo = loadoutWith(['azul', 3], ['vermelho', 3]);
    const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(), new Rng(1), 6, lo, new Perks(), new Arsenal());
    const slot = shop.view(new Wallet(), 100, 100).offers.findIndex((o) => o.id === 'roxo');
    expect(shop.view(new Wallet(), 100, 100).offers[slot].cost).toBe(60);
    const wallet = new Wallet();
    wallet.add(200);
    const evolved: TechId[] = [];
    const ctx: BuyContext = {
      wallet,
      hp: 100,
      maxHp: 100,
      applyModifier: () => undefined,
      healPlayer: () => undefined,
      applyTechnique: () => undefined,
      applyEvolution: (id) => evolved.push(id),
    };
    expect(shop.buy(slot, ctx)).toEqual({ ok: true, id: 'roxo', cost: 60 });
    expect(wallet.fragments).toBe(140);
    expect(evolved).toEqual(['roxo']);
    expect(shop.buy(slot, ctx)).toEqual({ ok: false, reason: 'sold' });
  });

  it('com 59 fragmentos não compra (59 < 60) e nada muda', () => {
    const lo = loadoutWith(['azul', 3], ['vermelho', 3]);
    const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(), new Rng(1), 6, lo, new Perks(), new Arsenal());
    const slot = shop.view(new Wallet(), 100, 100).offers.findIndex((o) => o.id === 'roxo');
    const wallet = new Wallet();
    wallet.add(59);
    const evolved: TechId[] = [];
    const ctx: BuyContext = {
      wallet,
      hp: 100,
      maxHp: 100,
      applyModifier: () => undefined,
      healPlayer: () => undefined,
      applyTechnique: () => undefined,
      applyEvolution: (id) => evolved.push(id),
    };
    expect(shop.buy(slot, ctx)).toEqual({ ok: false, reason: 'funds' });
    expect(evolved).toEqual([]);
  });

  it('edge case: com o Vazio Roxo equipado, Azul e Vermelho não voltam à loja e a evolução também não', () => {
    const lo = loadoutWith(['roxo', 1], null);
    const ids = pool(lo);
    expect(ids).not.toContain('azul');
    expect(ids).not.toContain('vermelho');
    expect(ids).not.toContain('roxo');
    expect(ids).toContain('corte');
  });
});
