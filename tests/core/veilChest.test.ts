import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { drawVeil } from '../../src/core/veilChest';
import { DOMAIN_IDS } from '../../src/data/domains';

describe('drawVeil: dois Domínios diferentes dos três (VEU-02)', () => {
  it('o par tem sempre 2 ids diferentes, os dois entre os 3 Domínios', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const [a, b] = drawVeil(new Rng(seed));
      expect(a).not.toBe(b);
      expect(DOMAIN_IDS).toContain(a);
      expect(DOMAIN_IDS).toContain(b);
    }
  });

  it('a mesma seed dá o mesmo par (VEU-02.3)', () => {
    for (const seed of [1, 42, 0xdeadbeef]) {
      expect(drawVeil(new Rng(seed))).toEqual(drawVeil(new Rng(seed)));
    }
  });

  it('1000 seeds cobrem os 3 pares possíveis', () => {
    const pairs = new Set<string>();
    for (let seed = 0; seed < 1000; seed++) pairs.add([...drawVeil(new Rng(seed))].sort().join('+'));
    expect([...pairs].sort()).toEqual(['amplificacao+jackpot', 'amplificacao+santuario', 'jackpot+santuario']);
  });
});
