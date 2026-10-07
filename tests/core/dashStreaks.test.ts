import { describe, expect, it } from 'vitest';
import { dashStreaks } from '../../src/core/dashStreaks';

const OPTS = { count: 8, height: 44, distance: 96, dir: 1 as const };
const even = (v: number): boolean => Math.abs(v % 2) === 0;

describe('dashStreaks (DGA-02)', () => {
  it('gera os riscos pedidos, na grade de 2 px, dentro da altura do corpo', () => {
    const s = dashStreaks(1, OPTS);
    expect(s).toHaveLength(8);
    for (const k of s) {
      expect([k.y, k.x0, k.x1].every(even)).toBe(true);
      expect(k.y).toBeLessThan(0);
      expect(k.y).toBeGreaterThanOrEqual(-OPTS.height);
    }
  });

  it('cada risco fica dentro do caminho do dash e segue o sentido dele', () => {
    for (const dir of [1, -1] as const) {
      for (const k of dashStreaks(7, { ...OPTS, dir })) {
        expect(Math.sign(k.x1 - k.x0)).toBe(dir);
        for (const x of [k.x0, k.x1]) {
          expect(x * dir).toBeGreaterThanOrEqual(-2);
          expect(x * dir).toBeLessThanOrEqual(OPTS.distance + 2);
        }
      }
    }
  });

  it('as alturas se espalham pelo corpo, sem amontoar', () => {
    const ys = dashStreaks(3, OPTS).map((k) => k.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(OPTS.height * 0.5);
  });

  it('mesma seed, mesmos riscos; seed diferente, riscos diferentes', () => {
    expect(dashStreaks(4, OPTS)).toEqual(dashStreaks(4, OPTS));
    expect(dashStreaks(4, OPTS)).not.toEqual(dashStreaks(5, OPTS));
  });
});
