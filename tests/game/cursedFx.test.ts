import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/game/art/palette';
import { CURSED_FX_KEYS, canSpawnParticle, trailPolygon } from '../../src/game/CursedFx';
import { IMPACT_FEEL } from '../../src/data/feel';

describe('CursedFx (parte pura)', () => {
  it('TRL-06: as cores do efeito são exatamente d, c, C, u e U, todas na paleta', () => {
    expect([...CURSED_FX_KEYS].sort()).toEqual(['C', 'U', 'c', 'd', 'u']);
    for (const k of CURSED_FX_KEYS) expect(PALETTE[k]).toBeTypeOf('number');
    for (const k of ['k', 'b', 'a', 'A']) expect(CURSED_FX_KEYS).not.toContain(k);
  });

  it('EDG-03: estilhaços e resíduos são pulados a partir do teto, não antes', () => {
    expect(canSpawnParticle(IMPACT_FEEL.fxCap - 1)).toBe(true);
    expect(canSpawnParticle(IMPACT_FEEL.fxCap)).toBe(false);
    expect(canSpawnParticle(IMPACT_FEEL.fxCap + 1)).toBe(false);
  });

  it('TRL-03: o polígono do rastro cai na grade de 2 px e é mais fino nas pontas que no meio', () => {
    const poly = trailPolygon([{ x: 100, y: 200 }, { x: 160, y: 180 }], 8);
    expect(poly.length).toBeGreaterThanOrEqual(6);
    for (const p of poly) {
      expect(p.x % 2).toBe(0);
      expect(p.y % 2).toBe(0);
    }
    const xs = poly.map((p) => p.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(98);
    expect(Math.max(...xs)).toBeLessThanOrEqual(162);
    const near = (x: number): number[] => poly.filter((p) => Math.abs(p.x - x) <= 4).map((p) => p.y);
    const span = (ys: number[]): number => Math.max(...ys) - Math.min(...ys);
    expect(span(near(130))).toBeGreaterThan(span(near(102)));
  });

  it('TRL-03: caminho com menos de 2 pontos não gera polígono', () => {
    expect(trailPolygon([{ x: 1, y: 1 }], 4)).toEqual([]);
  });
});
