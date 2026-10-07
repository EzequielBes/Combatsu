import { describe, expect, it } from 'vitest';
import { inwardStreaks, vortexArms } from '../../src/core/blueVortex';

const ARMS = { arms: 4, outer: 44, inner: 6, turns: 1.2, spin: 7, samples: 18 };
const STREAKS = { count: 10, outer: 64, inner: 12, lifeMs: 420, swirl: 2.4, length: 0.3 };
const even = (v: number): boolean => Math.abs(v % 2) === 0;

describe('vortexArms (BLA-01)', () => {
  it('gera os braços pedidos, cada um com os pontos pedidos, todos na grade de 2 px', () => {
    const arms = vortexArms(123, ARMS);
    expect(arms).toHaveLength(4);
    for (const arm of arms) {
      expect(arm).toHaveLength(18);
      for (const p of arm) expect(even(p.x) && even(p.y)).toBe(true);
    }
  });

  it('afunila da borda ao núcleo: o raio cai ao longo do braço e depth vai de 0 a 1', () => {
    for (const arm of vortexArms(0, ARMS)) {
      const r = arm.map((p) => Math.hypot(p.x, p.y));
      expect(r[0]).toBeGreaterThan(ARMS.outer - 2);
      expect(r[r.length - 1]).toBeLessThan(ARMS.inner + 3);
      expect(arm[0].depth).toBe(0);
      expect(arm[arm.length - 1].depth).toBe(1);
    }
  });

  it('gira com o tempo e é determinístico', () => {
    expect(vortexArms(0, ARMS)).not.toEqual(vortexArms(200, ARMS));
    expect(vortexArms(200, ARMS)).toEqual(vortexArms(200, ARMS));
  });
});

describe('inwardStreaks (BLA-02)', () => {
  it('gera os riscos pedidos, com cabeça e cauda na grade de 2 px', () => {
    const s = inwardStreaks(1, 300, STREAKS);
    expect(s).toHaveLength(10);
    for (const k of s) expect([k.head.x, k.head.y, k.tail.x, k.tail.y].every(even)).toBe(true);
  });

  it('a cabeça fica sempre mais perto do núcleo que a cauda e dentro do raio de fora', () => {
    for (let t = 0; t < 2000; t += 37) {
      for (const k of inwardStreaks(5, t, STREAKS)) {
        const rh = Math.hypot(k.head.x, k.head.y);
        expect(rh).toBeLessThanOrEqual(Math.hypot(k.tail.x, k.tail.y) + 2);
        expect(rh).toBeLessThanOrEqual(STREAKS.outer + 2);
        expect(rh).toBeGreaterThanOrEqual(STREAKS.inner - 2);
      }
    }
  });

  it('mesma seed e tempo, mesmos riscos; seed diferente, ângulos diferentes', () => {
    expect(inwardStreaks(3, 500, STREAKS)).toEqual(inwardStreaks(3, 500, STREAKS));
    expect(inwardStreaks(3, 500, STREAKS)).not.toEqual(inwardStreaks(4, 500, STREAKS));
  });
});
