import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/level';
import { LEVEL_1 } from '../../src/data/level1';

describe('LEVEL_1', () => {
  it('é uma sala fechada de 40x17 tiles', () => {
    expect(LEVEL_1).toHaveLength(17);
    for (const row of LEVEL_1) {
      expect(row).toHaveLength(40);
      expect(row[0]).toBe('#');
      expect(row[row.length - 1]).toBe('#');
    }
    expect(LEVEL_1[0]).toBe('#'.repeat(40));
    expect(LEVEL_1[LEVEL_1.length - 1]).toBe('#'.repeat(40));
  });

  it('tem 1 player, 2 inimigos, 2 cadeiras e 2 garrafas', () => {
    const lvl = parseLevel(LEVEL_1);
    expect(lvl.enemies).toHaveLength(2);
    expect(lvl.props.filter((p) => p.key === 'chair')).toHaveLength(2);
    expect(lvl.props.filter((p) => p.key === 'bottle')).toHaveLength(2);
  });
});
