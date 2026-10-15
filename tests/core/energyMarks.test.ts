import { describe, expect, it } from 'vitest';
import { COST_MARKS_MAX, costMarks } from '../../src/core/energy';

describe('VRM-20: marcas de custo na barra de energia', () => {
  it.each([
    [29, 0],
    [30, 1],
    [59, 1],
    [60, 2],
    [90, 3],
  ])('custo 30 com %i de energia dá %i marcas', (cur, n) => {
    expect(costMarks(30, cur, 100)).toHaveLength(n);
  });

  it('as marcas ficam nos múltiplos do custo, em unidades de energia', () => {
    expect(costMarks(30, 90, 100)).toEqual([30, 60, 90]);
  });

  it('custo 0 não gera marca', () => {
    expect(costMarks(0, 100, 100)).toEqual([]);
  });

  it('a energia acima do teto não conta e a contagem para no teto de marcas', () => {
    expect(costMarks(30, 150, 100)).toHaveLength(3);
    expect(costMarks(1, 200, 200)).toHaveLength(COST_MARKS_MAX);
    expect(COST_MARKS_MAX).toBe(16);
  });
});
