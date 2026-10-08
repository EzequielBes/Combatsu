import { describe, expect, it } from 'vitest';
import { drawVows, Vows } from '../../src/core/vows';
import { Rng } from '../../src/core/rng';
import { VOW_IDS, type VowId } from '../../src/data/vows';

describe('votos tomados (VOW-05, VOW-08)', () => {
  it('cada voto entra uma vez; reset limpa', () => {
    const vows = new Vows();
    expect(vows.take('furia')).toBe(true);
    expect(vows.take('furia')).toBe(false);
    expect(vows.list).toEqual(['furia']);
    vows.reset();
    expect(vows.list).toEqual([]);
    expect(vows.has('furia')).toBe(false);
  });
});

describe('sorteio do painel (VOW-05, VOW-06, VOW-07)', () => {
  it('3 votos distintos e nenhum já tomado, em 200 seeds', () => {
    const taken: VowId[] = ['corpoDeVidro', 'semGuarda'];
    for (let seed = 0; seed < 200; seed++) {
      const offers = drawVows(new Rng(seed), taken);
      expect(offers).toHaveLength(3);
      expect(new Set(offers).size).toBe(3);
      for (const id of offers) expect(taken).not.toContain(id);
    }
  });

  it('com 2 restantes oferece os 2; com 1, o 1; com 0, nada', () => {
    const left = (n: number): VowId[] => VOW_IDS.slice(0, VOW_IDS.length - n);
    expect(drawVows(new Rng(1), left(2)).sort()).toEqual(VOW_IDS.slice(-2).sort());
    expect(drawVows(new Rng(1), left(1))).toEqual(VOW_IDS.slice(-1));
    expect(drawVows(new Rng(1), left(0))).toEqual([]);
  });

  it('mesma seed e mesmos tomados dão o mesmo sorteio; seeds diferentes variam', () => {
    expect(drawVows(new Rng(42), ['furia'])).toEqual(drawVows(new Rng(42), ['furia']));
    const all = new Set(Array.from({ length: 30 }, (_, s) => drawVows(new Rng(s), []).join(',')));
    expect(all.size).toBeGreaterThan(1);
  });

  it('o catálogo tem os 8 votos da spec', () => {
    expect(VOW_IDS).toHaveLength(8);
  });
});
