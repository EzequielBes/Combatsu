import { describe, expect, it } from 'vitest';
import { drawOffers, eligible } from '../../src/core/shop';
import { Modifiers } from '../../src/core/modifiers';
import { Rng } from '../../src/core/rng';
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
