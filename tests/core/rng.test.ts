import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';

const take = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => rng.next());

describe('Rng: reprodutível pela seed (FND-01)', () => {
  it('mesma seed: os primeiros 1000 next() são idênticos', () => {
    expect(take(new Rng(12345), 1000)).toEqual(take(new Rng(12345), 1000));
  });

  it('seeds diferentes dão sequências diferentes', () => {
    expect(take(new Rng(1), 1000)).not.toEqual(take(new Rng(2), 1000));
  });
});

describe('Rng: next() em [0, 1) (FND-02)', () => {
  it('10 000 amostras ficam em [0, 1)', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Rng: int(min, max) inteiro em [min, max] (FND-20)', () => {
  it('10 000 amostras de int(-2, 5) são inteiras e ficam em [-2, 5], alcançando as duas pontas', () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const v = rng.int(-2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.has(-2)).toBe(true);
    expect(seen.has(5)).toBe(true);
  });

  it('borda: int(3, 3) === 3', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 100; i++) expect(rng.int(3, 3)).toBe(3);
  });
});

describe('Rng: chance(p) nos limites (FND-03, FND-21)', () => {
  it('p <= 0 é sempre false', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 1000; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(-1)).toBe(false);
    }
  });

  it('p >= 1 é sempre true', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 1000; i++) {
      expect(rng.chance(1)).toBe(true);
      expect(rng.chance(2)).toBe(true);
    }
  });
});
