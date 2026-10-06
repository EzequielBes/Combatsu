import { describe, expect, it } from 'vitest';
import { auraMotes, auraWisps } from '../../src/core/reverseAura';

const OPTS = { count: 7, width: 20, height: 40, samples: 8 };
const even = (v: number): boolean => Math.abs(v % 2) === 0;

describe('auraWisps (RCA-01, RCA-02)', () => {
  it('gera as línguas pedidas, todas na grade de 2 px', () => {
    const w = auraWisps(250, 1, OPTS);
    expect(w).toHaveLength(7);
    for (const wisp of w) {
      expect(wisp).toHaveLength(8);
      for (const p of wisp) expect(even(p.x) && even(p.y)).toBe(true);
    }
  });

  it('cada língua sobe da base à ponta, e a ponta passa da altura do corpo na intensidade cheia', () => {
    for (let t = 0; t < 3000; t += 113) {
      const wisps = auraWisps(t, 1, OPTS);
      for (const wisp of wisps) expect(wisp[wisp.length - 1].y).toBeLessThan(wisp[0].y);
      expect(Math.min(...wisps.map((w) => w[w.length - 1].y))).toBeLessThan(-OPTS.height);
    }
  });

  it('a intensidade encolhe a aura: zero fica na base, metade fica mais baixa que cheia', () => {
    const top = (k: number): number => Math.min(...auraWisps(400, k, OPTS).map((w) => w[w.length - 1].y));
    expect(top(0)).toBeGreaterThan(-OPTS.height * 0.5);
    expect(top(0.5)).toBeGreaterThan(top(1));
  });

  it('ondula com o tempo e é determinística', () => {
    expect(auraWisps(0, 1, OPTS)).not.toEqual(auraWisps(160, 1, OPTS));
    expect(auraWisps(160, 1, OPTS)).toEqual(auraWisps(160, 1, OPTS));
  });
});

describe('auraMotes (RCA-03)', () => {
  it('gera as partículas pedidas, na grade de 2 px, acima do pé', () => {
    const m = auraMotes(700, 12, 20, 40, 900);
    expect(m).toHaveLength(12);
    for (const p of m) {
      expect(even(p.x) && even(p.y)).toBe(true);
      expect(p.y).toBeLessThan(0);
      expect(p.life).toBeGreaterThanOrEqual(0);
      expect(p.life).toBeLessThan(1);
    }
  });

  it('cada partícula sobe enquanto vive', () => {
    const a = auraMotes(100, 6, 20, 40, 900);
    const b = auraMotes(160, 6, 20, 40, 900);
    for (let i = 0; i < 6; i++) if (b[i].life > a[i].life) expect(b[i].y).toBeLessThan(a[i].y + 4);
  });
});
