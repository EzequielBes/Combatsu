import { describe, expect, it } from 'vitest';
import { composeWithStats, type Grid } from '../../src/game/art/sprites/player';

describe('compose conta pixels opacos cortados (SPF-02)', () => {
  const part: Grid = ['kkk', 'k.k'];

  it('uma parte com 3 pixels opacos em x = -1 gera clipped = 3', () => {
    // Coluna 0 da parte cai em x = -1: 'k','k' ... 3 opacos na coluna cortada.
    const col: Grid = ['k', 'k', 'k'];
    expect(composeWithStats([col, -1, 5]).clipped).toBe(3);
  });

  it('uma parte inteira dentro da grade gera clipped = 0', () => {
    expect(composeWithStats([part, 4, 4]).clipped).toBe(0);
  });

  it('pixels transparentes fora da grade não contam, e os opacos fora de cima, de baixo e da direita contam', () => {
    expect(composeWithStats([['.k'], -1, 0]).clipped).toBe(0);
    expect(composeWithStats([['k'], 0, -1]).clipped).toBe(1);
    expect(composeWithStats([['k'], 0, 24]).clipped).toBe(1);
    expect(composeWithStats([['k'], 30, 0]).clipped).toBe(1);
    expect(composeWithStats([['k'], 29, 0]).clipped).toBe(0);
  });
});
