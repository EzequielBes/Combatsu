import { describe, expect, it } from 'vitest';
import { buildOfEntry, buildPoints, buildWeight, dominantBuild, Perks, strikeMultiplier } from '../../src/core/build';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import type { Rng } from '../../src/core/rng';
import { eligible, Shop, type BuyContext } from '../../src/core/shop';
import { Wallet } from '../../src/core/wallet';
import { PERK, PERK_IDS } from '../../src/data/perks';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG, PERK_SHOP_ENTRIES, type ModifierId } from '../../src/data/shop';

/** Rng falso: devolve os valores de `next()` na ordem dada (mesmo padrão de tests/core/shop.test.ts). */
const fakeRng = (values: number[]): Rng => {
  let i = 0;
  return { next: () => values[i++] ?? 0.99 } as unknown as Rng;
};
const fresh = () => ({ modifiers: new Modifiers(FULL_SHOP_CATALOG), loadout: new Loadout(), perks: new Perks() });
const levelUp = (m: Modifiers, id: ModifierId, n: number): void => {
  for (let i = 0; i < n; i++) m.apply(id);
};

describe('BLD-01: passivas da run', () => {
  it('cada passiva entra uma vez só e some no reset', () => {
    const perks = new Perks();
    expect(perks.add('refluxo')).toBe(true);
    expect(perks.add('refluxo')).toBe(false);
    expect(perks.list).toEqual(['refluxo']);
    perks.reset();
    expect(perks.has('refluxo')).toBe(false);
  });
});

describe('BLD-02/03: a build sai das compras', () => {
  it('sem compras não há build', () => {
    const { modifiers, loadout, perks } = fresh();
    const points = buildPoints(modifiers, loadout, perks);
    expect(points).toEqual({ lutador: 0, feiticeiro: 0, veloz: 0 });
    expect(dominantBuild(points)).toBeNull();
  });

  it('a primeira técnica não conta para feiticeiro; os níveis acima dela contam', () => {
    const { modifiers, loadout, perks } = fresh();
    loadout.equip(0, 'divergente', 1);
    expect(buildPoints(modifiers, loadout, perks).feiticeiro).toBe(0);
    loadout.upgrade('divergente');
    levelUp(modifiers, 'energia', 1);
    const points = buildPoints(modifiers, loadout, perks);
    expect(points.feiticeiro).toBe(2);
    expect(dominantBuild(points)).toBe('feiticeiro');
  });

  it('força e vida somam em lutador, agilidade em veloz, e cada passiva vale 2 na própria build', () => {
    const { modifiers, loadout, perks } = fresh();
    levelUp(modifiers, 'forca', 1);
    levelUp(modifiers, 'vida', 2);
    levelUp(modifiers, 'agilidade', 1);
    perks.add('contraAfiado');
    const points = buildPoints(modifiers, loadout, perks);
    expect(points).toEqual({ lutador: 2, feiticeiro: 0, veloz: 3 });
    expect(dominantBuild(points)).toBe('veloz');
  });

  it('um ponto só não define build', () => {
    expect(dominantBuild({ lutador: 1, feiticeiro: 1, veloz: 0 })).toBeNull();
  });
});

describe('BLD-04/05: a loja puxa a build do jogador', () => {
  it('cada carta pertence a uma build, ou a nenhuma', () => {
    expect(buildOfEntry('forca')).toBe('lutador');
    expect(buildOfEntry('azul')).toBe('feiticeiro');
    expect(buildOfEntry('agilidade')).toBe('veloz');
    expect(buildOfEntry('executor')).toBe('lutador');
    expect(buildOfEntry('cura')).toBeNull();
    expect(buildOfEntry('ima')).toBeNull();
  });

  it('o peso cresce meio ponto por ponto de afinidade, até 4 pontos', () => {
    const points = { lutador: 2, feiticeiro: 9, veloz: 0 };
    expect(buildWeight('forca', points)).toBe(2);
    expect(buildWeight('azul', points)).toBe(3);
    expect(buildWeight('agilidade', points)).toBe(1);
    expect(buildWeight('cura', points)).toBe(1);
  });

  it('com afinidade, a carta da build vence um sorteio que sem ela daria outra carta', () => {
    const catalog = GAME_SHOP_CATALOG.filter((e) => e.id === 'ima' || e.id === 'executor');
    const firstOffer = (forca: number) => {
      const { modifiers, loadout, perks } = fresh();
      loadout.equip(0, 'divergente', 1);
      loadout.equip(1, 'corte', 1);
      levelUp(modifiers, 'forca', forca);
      // Pesos: ímã 3 (comum), executor 1 (raro) × afinidade. Com x = 0,7: sem força cai no ímã, com força 4 no executor.
      const shop = new Shop(catalog, modifiers, fakeRng([0.7]), 5, loadout, perks);
      return shop.view(new Wallet(), 100, 100).offers[0].id;
    };
    expect(firstOffer(0)).toBe('ima');
    expect(firstOffer(4)).toBe('executor');
  });
});

describe('BLD-06: multiplicador de dano das passivas', () => {
  const plain = { heavy: false, counter: false, shadow: false };

  it('sem passiva, nada muda', () => {
    expect(strikeMultiplier(new Perks(), { heavy: true, counter: true, shadow: true })).toBe(1);
  });

  it('cada passiva só vale no golpe dela, e os bônus se multiplicam', () => {
    const perks = new Perks();
    perks.add('punhoPesado');
    perks.add('contraAfiado');
    perks.add('passoSombrio');
    expect(strikeMultiplier(perks, plain)).toBe(1);
    expect(strikeMultiplier(perks, { ...plain, heavy: true })).toBe(PERK.heavyMul);
    expect(strikeMultiplier(perks, { ...plain, counter: true })).toBe(PERK.counterMul);
    expect(strikeMultiplier(perks, { ...plain, shadow: true })).toBe(PERK.shadowMul);
    const both = strikeMultiplier(perks, { heavy: true, counter: false, shadow: true });
    expect(both).toBeCloseTo(PERK.heavyMul * PERK.shadowMul);
  });
});

describe('BLD-07: passivas na loja', () => {
  it('o catálogo do jogo tem uma carta por passiva, rara e sem nível', () => {
    expect(PERK_SHOP_ENTRIES.map((e) => e.id)).toEqual(PERK_IDS);
    for (const e of PERK_SHOP_ENTRIES) expect([e.kind, e.rarity, e.maxLevel]).toEqual(['perk', 'rare', 0]);
  });

  it('só entram no pool com `perks`, a partir da rodada mínima, e saem depois de compradas', () => {
    const { modifiers, loadout, perks } = fresh();
    const ids = (round: number, owned?: Perks) =>
      eligible(GAME_SHOP_CATALOG, modifiers, round, loadout, owned)
        .filter((e) => e.kind === 'perk')
        .map((e) => e.id);
    expect(ids(9)).toEqual([]);
    expect(ids(PERK.minRound - 1, perks)).toEqual([]);
    expect(ids(PERK.minRound, perks)).toEqual(PERK_IDS);
    perks.add('refluxo');
    expect(ids(PERK.minRound, perks)).not.toContain('refluxo');
  });

  it('comprar cobra o custo, registra a passiva e a carta mostra a build e o efeito', () => {
    const { modifiers, loadout, perks } = fresh();
    const entry = PERK_SHOP_ENTRIES.find((e) => e.id === 'refluxo')!;
    const shop = new Shop([entry], modifiers, fakeRng([0]), 5, loadout, perks);
    const wallet = new Wallet();
    wallet.add(50);
    const card = shop.view(wallet, 100, 100).offers[0];
    expect([card.name, card.levelText, card.preview, card.cost]).toEqual([
      'Refluxo',
      'Feiticeiro',
      'parry devolve 12 de energia',
      PERK.cost,
    ]);
    const ctx: BuyContext = {
      wallet,
      hp: 100,
      maxHp: 100,
      applyModifier: () => {},
      healPlayer: () => {},
      applyTechnique: () => {},
      applyPerk: (id) => perks.add(id),
    };
    expect(shop.buy(0, ctx)).toEqual({ ok: true, id: 'refluxo', cost: PERK.cost });
    expect(perks.has('refluxo')).toBe(true);
    expect(wallet.fragments).toBe(50 - PERK.cost);
  });
});
