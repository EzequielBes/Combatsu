import { describe, expect, it } from 'vitest';
import { Shop, type BuyContext } from '../../src/core/shop';
import { previewText } from '../../src/core/shopPreview';
import { eligible } from '../../src/core/shopEligibility';
import { Modifiers } from '../../src/core/modifiers';
import { Loadout } from '../../src/core/loadout';
import { Rng } from '../../src/core/rng';
import { Wallet } from '../../src/core/wallet';
import { CursedEnergy, cursedEnergyRegenAtLevel } from '../../src/core/energy';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
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
    expect(technique('vermelho')).toMatchObject({ kind: 'technique', rarity: 'rare', maxLevel: 6 });
  });
});

describe('TSH-02: custo = base + step × nível atual (0 se não equipada)', () => {
  it('bases e steps do catálogo: divergente 15+11n, corte 23+11n, azul 26+15n, vermelho 30+15n (ECN-01)', () => {
    expect(technique('divergente').cost).toEqual({ base: 15, step: 11 });
    expect(technique('corte').cost).toEqual({ base: 23, step: 11 });
    expect(technique('azul').cost).toEqual({ base: 26, step: 15 });
    expect(technique('vermelho').cost).toEqual({ base: 30, step: 15 });
  });

  it('não equipada (n=0): divergente custa 15', () => {
    const loadout = new Loadout();
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    expect(shop.view(wallet, 100, 100).offers[0].cost).toBe(15);
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

  it('nível 1 → 2 exige rodada ≥ 2 (ECN-02): fora na 1, dentro na 2', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 1, loadout).some((e) => e.id === 'divergente')).toBe(false);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 2, loadout).some((e) => e.id === 'divergente')).toBe(true);
  });

  it('nível 2 → 3 exige rodada ≥ 4 (ECN-09): fora na 3, dentro na 4', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 2);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 3, loadout).some((e) => e.id === 'divergente')).toBe(false);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 4, loadout).some((e) => e.id === 'divergente')).toBe(true);
  });

  it('nível 3 (máximo): nunca elegível, mesmo em rodada alta', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 3);
    expect(eligible(FULL_SHOP_CATALOG, modifiers, 999, loadout).some((e) => e.id === 'divergente')).toBe(false);
  });
});

describe('TSH-05 → CRD-03: com os dois slots vazios, a carta 1 é uma técnica nova (também após reroll)', () => {
  /** Rng falso com zeros de sobra: toda escolha cai na primeira entrada. */
  const zeros = (): Rng => fakeRng(Array.from({ length: 40 }, () => 0));

  it('rng zerado: carta 0 é o Corpo (único dono), carta 1 é a divergente (1ª técnica nova) e o resto é vida e forca', () => {
    const loadout = new Loadout();
    const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), zeros(), 10, loadout);
    const ids = shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
    expect(ids).toEqual(['corpo', 'divergente', 'vida', 'forca']);
  });

  it('depois do reroll, a carta 1 continua sendo uma técnica nova', () => {
    const loadout = new Loadout();
    const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), zeros(), 10, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    expect(shop.reroll(wallet)).toBe(true);
    const ids = shop.view(wallet, 100, 100).offers.map((o) => o.id);
    expect(ids[1]).toBe('divergente');
  });

  it('sem loadout (comportamento antigo da F4): a garantia não se aplica, slot 0 sorteia normalmente', () => {
    const shop = new Shop(GAME_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), fakeRng([0, 0, 0, 0]), 10);
    const ids = shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
    expect(ids).toEqual(['vida', 'forca', 'agilidade', 'ima']); // nenhuma técnica: sem loadout elas nem entram no pool
  });
});

describe('TSH-06: comprar técnica não equipada equipa nível 1 no primeiro slot vazio', () => {
  it('slot 1 vazio: compra equipa em nível 1', () => {
    const loadout = new Loadout();
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    const result = shop.buy(0, techBuyCtx(loadout, wallet));
    expect(result).toEqual({ ok: true, id: 'divergente', cost: 15 });
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
  it('divergente equipada no nível 1, comprada de novo na rodada 2: vira nível 2', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 2, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    const result = shop.buy(0, techBuyCtx(loadout, wallet));
    expect(result).toEqual({ ok: true, id: 'divergente', cost: 26 }); // 15 + 11×1
    expect(loadout.levelOf('divergente')).toBe(2);
  });
});

describe('TSH-08, TSH-15: catálogo tem `energia` (max 5, custo 10+6n) e `fluxo` (max 4, custo 12+6n)', () => {
  it('energia: comum, maxLevel 5, cost 10+6n', () => {
    expect(technique('energia')).toMatchObject({
      kind: 'modifier',
      rarity: 'common',
      maxLevel: 5,
      cost: { base: 10, step: 6 },
    });
  });

  it('fluxo: comum, maxLevel 4, cost 12+6n', () => {
    expect(technique('fluxo')).toMatchObject({
      kind: 'modifier',
      rarity: 'common',
      maxLevel: 4,
      cost: { base: 12, step: 6 },
    });
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

describe('ECN-05 → CRD-02: a carta 0 é a melhoria de um item dono (técnica equipada ou Corpo)', () => {
  const ids = (shop: Shop): (string | null)[] => shop.view(new Wallet(), 100, 100).offers.map((o) => o.id);
  const zeros = (): Rng => fakeRng(Array.from({ length: 40 }, () => 0));
  const fresh = (
    loadout: Loadout,
    round: number,
    rng: Rng,
    catalog: readonly ShopEntry[] = GAME_SHOP_CATALOG,
    axisRng?: Rng,
  ): Shop => new Shop(catalog, new Modifiers(FULL_SHOP_CATALOG), rng, round, loadout, undefined, undefined, axisRng);

  it('Nv1 equipada na loja da rodada 2 (techLevelGate(2) = 2): a carta 0 é ela ou o Corpo, qualquer que seja a seed', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const loadout = new Loadout();
      loadout.equip(0, 'divergente', 1);
      expect(['divergente', 'corpo']).toContain(ids(fresh(loadout, 2, new Rng(seed)))[0]);
    }
  });

  it('rodada 1: nenhuma carta de eixo (PRC-04); na rodada 2 o foco é a divergente', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(ids(fresh(loadout, 1, zeros()))).not.toContain('corpo');
    expect(ids(fresh(loadout, 1, zeros()))[0]).not.toBe('divergente');
    expect(ids(fresh(loadout, 2, zeros()))).toEqual(['divergente', 'corte', 'vida', 'forca']);
  });

  it('Nv2 equipada: a melhoria só a partir da rodada 4 (techLevelGate(3) = 4), fora na 3 e dentro na 4', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 2);
    expect(ids(fresh(loadout, 3, zeros()))[0]).toBe('corpo');
    expect(ids(fresh(loadout, 4, zeros()))[0]).toBe('divergente');
  });

  it('a técnica melhorada sai do pool: não aparece duas vezes na mesma loja', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const loadout = new Loadout();
      loadout.equip(0, 'divergente', 1);
      const list = ids(fresh(loadout, 2, new Rng(seed)));
      expect(list.filter((id) => id === 'divergente').length).toBeLessThanOrEqual(1);
    }
  });

  it('reroll mantém a carta 0 como melhoria de um dono (ECN-06)', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const loadout = new Loadout();
      loadout.equip(1, 'azul', 1);
      const shop = fresh(loadout, 2, new Rng(seed));
      const wallet = new Wallet();
      wallet.add(100);
      expect(shop.reroll(wallet)).toBe(true);
      expect(['azul', 'corpo']).toContain(shop.view(wallet, 100, 100).offers[0].id);
    }
  });

  it('duas candidatas: o axisRng escolhe entre elas, e a carta 0 é sempre uma delas', () => {
    const make = (): Loadout => {
      const loadout = new Loadout();
      loadout.equip(0, 'divergente', 1);
      loadout.equip(1, 'corte', 1);
      return loadout;
    };
    // 0,6 ou mais sai do foco (divergente) e cai entre os outros donos: corte e Corpo
    expect(ids(fresh(make(), 2, zeros(), GAME_SHOP_CATALOG, fakeRng([0.6, 0, 0, 0])))[0]).toBe('corte');
    expect(ids(fresh(make(), 2, zeros(), GAME_SHOP_CATALOG, fakeRng([0.6, 0.99, 0, 0])))[0]).toBe('corpo');
    expect(ids(fresh(make(), 2, zeros(), GAME_SHOP_CATALOG, fakeRng([0.59, 0, 0, 0])))[0]).toBe('divergente');
  });

  it('só uma candidata elegível (a outra no Nv3): a melhoria vai para a elegível ou o Corpo', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 3);
    loadout.equip(1, 'corte', 1);
    expect(ids(fresh(loadout, 2, zeros()))[0]).toBe('corte');
  });

  it('as duas técnicas no Nv3: só o Corpo sobe e o resto vem do sorteio por peso (EDG-04)', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 3);
    loadout.equip(1, 'corte', 3);
    expect(ids(fresh(loadout, 10, zeros()))).toEqual(['corpo', 'vida', 'forca', 'agilidade']);
  });

  it('tuning não padrão: com minRound = 5 a melhoria só aparece da rodada 5 em diante', () => {
    const late: ShopEntry = { ...technique('divergente'), minRound: () => 5 };
    const catalog = [...GAME_SHOP_CATALOG.filter((e) => e.id !== 'divergente'), late];
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(ids(fresh(loadout, 4, zeros(), catalog))[0]).toBe('corpo');
    expect(ids(fresh(loadout, 5, zeros(), catalog))[0]).toBe('divergente');
  });
});

describe('ECN-08: a carta de técnica mostra Nv {nível atual + 1}/3', () => {
  const levelTextOf = (level: 1 | 2 | 3, round: number): string => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', level);
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), round, loadout);
    return shop.view(new Wallet(), 100, 100).offers[0].levelText;
  };

  it('Nv1 equipada → "Nv 2/3"; Nv2 equipada → "Nv 3/3"', () => {
    expect(levelTextOf(1, 2)).toBe('Nv 2/3');
    expect(levelTextOf(2, 4)).toBe('Nv 3/3');
  });

  it('não equipada → "Nv 1/3"', () => {
    const shop = new Shop([technique('divergente')], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, new Loadout());
    expect(shop.view(new Wallet(), 100, 100).offers[0].levelText).toBe('Nv 1/3');
  });

  it('consumível continua sem texto de nível', () => {
    const cura = FULL_SHOP_CATALOG.find((e) => e.id === 'cura')!;
    const shop = new Shop([cura], new Modifiers(FULL_SHOP_CATALOG), fakeRng([0]), 1, new Loadout());
    expect(shop.view(new Wallet(), 100, 100).offers[0].levelText).toBe('');
  });
});

describe('PRG-02, PRG-06: comprar Fluxo sobe o nível em 1 e a regen aplicada é a do nível', () => {
  it('Shop.buy de fluxo: fluxo 0 -> 1, e CursedEnergy.setLevels aplica cursedEnergyRegenAtLevel(1)', () => {
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    const shop = new Shop([technique('fluxo')], modifiers, fakeRng([0]), 10, loadout);
    const wallet = new Wallet();
    wallet.add(100);
    const ctx: BuyContext = { ...techBuyCtx(loadout, wallet), applyModifier: (id) => void modifiers.apply(id) };
    expect(modifiers.level('fluxo')).toBe(0);
    expect(shop.buy(0, ctx)).toEqual({ ok: true, id: 'fluxo', cost: 12 }); // 12 + 6×0
    expect(modifiers.level('fluxo')).toBe(1);
    expect(modifiers.level('energia')).toBe(0);
    const energy = new CursedEnergy();
    energy.setLevels(modifiers.level('energia'), modifiers.level('fluxo'));
    expect(energy.regen).toBe(cursedEnergyRegenAtLevel(1));
    expect(energy.regen).toBeGreaterThan(8); // acima da regen base (CE-01)
  });
});

describe('PRG-03, PRG-04: no teto, energia (Nv 5) e fluxo (Nv 4) saem do sorteio', () => {
  const loadout = new Loadout();
  loadout.equip(0, 'divergente', 1);
  const ids = (m: Modifiers) => eligible(FULL_SHOP_CATALOG, m, 30, loadout).map((e) => e.id);
  const levelTo = (m: Modifiers, id: 'energia' | 'fluxo', n: number) => {
    for (let i = 0; i < n; i++) m.apply(id);
  };

  it('energia: no nível 4 ainda entra; no 5 sai (e fluxo segue elegível)', () => {
    const m = new Modifiers(FULL_SHOP_CATALOG);
    levelTo(m, 'energia', 4);
    expect(ids(m)).toContain('energia');
    levelTo(m, 'energia', 1);
    expect(m.level('energia')).toBe(5);
    expect(ids(m)).not.toContain('energia');
    expect(ids(m)).toContain('fluxo');
  });

  it('fluxo: no nível 3 ainda entra; no 4 sai (e energia segue elegível)', () => {
    const m = new Modifiers(FULL_SHOP_CATALOG);
    levelTo(m, 'fluxo', 3);
    expect(ids(m)).toContain('fluxo');
    levelTo(m, 'fluxo', 1);
    expect(m.level('fluxo')).toBe(4);
    expect(ids(m)).not.toContain('fluxo');
    expect(ids(m)).toContain('energia');
  });
});
