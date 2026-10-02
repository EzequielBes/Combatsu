import { describe, expect, it } from 'vitest';
import { masteryBarWidth } from '../../src/core/masteryBar';

describe('MST-08: masteryBarWidth', () => {
  it('round(48 x pontos / limiar)', () => {
    expect(masteryBarWidth(48, 14, 15)).toBe(45);
    expect(masteryBarWidth(48, 0, 15)).toBe(0);
    expect(masteryBarWidth(48, 15, 15)).toBe(48);
    expect(masteryBarWidth(48, 12, 25)).toBe(23); // 23,04
    expect(masteryBarWidth(48, 13, 25)).toBe(25); // 24,96
  });

  it('Nv3 (limiar null): sem barra', () => {
    expect(masteryBarWidth(48, 0, null)).toBeNull();
    expect(masteryBarWidth(48, 10, null)).toBeNull();
  });
});
