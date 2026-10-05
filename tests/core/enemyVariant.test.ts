import { describe, expect, it } from 'vitest';
import { ENEMY_VARIANTS, parseVariant, pickEnemyVariant } from '../../src/core/enemyVariant';
import { Rng } from '../../src/core/rng';

describe('pickEnemyVariant (EVR-04)', () => {
  it('sorteio uniforme: cada aparência fica em 33% +/- 3% em 10.000 sorteios', () => {
    const rng = new Rng(12345);
    const count: Record<string, number> = { corcunda: 0, rastejante: 0, bruto: 0 };
    for (let i = 0; i < 10000; i++) count[pickEnemyVariant(rng)]++;
    for (const v of ENEMY_VARIANTS) {
      const pct = (count[v] / 10000) * 100;
      expect(pct).toBeGreaterThanOrEqual(30);
      expect(pct).toBeLessThanOrEqual(36);
    }
  });

  it('mesma seed, mesma sequência; seeds diferentes divergem', () => {
    const seq = (seed: number) => {
      const r = new Rng(seed);
      return Array.from({ length: 50 }, () => pickEnemyVariant(r));
    };
    expect(seq(99)).toEqual(seq(99));
    expect(seq(99)).not.toEqual(seq(100));
  });

  it('só devolve ids válidos e alcança os 3', () => {
    const r = new Rng(1);
    const seen = new Set(Array.from({ length: 200 }, () => pickEnemyVariant(r)));
    expect([...seen].sort()).toEqual([...ENEMY_VARIANTS].sort());
  });
});

describe('parseVariant (EVR-05)', () => {
  it.each(['corcunda', 'rastejante', 'bruto'])('aceita %s', (id) => {
    expect(parseVariant(id)).toBe(id);
  });

  it.each(['', 'Corcunda', 'bruto ', 'zumbi', 'constructor', 'toString', '0'])('rejeita %j', (id) => {
    expect(parseVariant(id)).toBeNull();
  });

  it('rejeita null e undefined', () => {
    expect(parseVariant(null)).toBeNull();
    expect(parseVariant(undefined)).toBeNull();
  });
});
