import { describe, expect, it } from 'vitest';
import { bossRewardSlot } from '../../src/core/bossReward';

describe('BFX-09: bossRewardSlot', () => {
  it('uma só técnica: o slot dela', () => {
    expect(bossRewardSlot([{ level: 1 }, null])).toBe(0);
    expect(bossRewardSlot([null, { level: 2 }])).toBe(1);
  });

  it('duas técnicas: a de menor nível', () => {
    expect(bossRewardSlot([{ level: 2 }, { level: 1 }])).toBe(1);
    expect(bossRewardSlot([{ level: 1 }, { level: 2 }])).toBe(0);
  });

  it('empate: slot 0', () => {
    expect(bossRewardSlot([{ level: 2 }, { level: 2 }])).toBe(0);
  });

  it('Nv3 não é upável: pula para a outra; as duas Nv3 ou vazias dão null', () => {
    expect(bossRewardSlot([{ level: 3 }, { level: 2 }])).toBe(1);
    expect(bossRewardSlot([{ level: 2 }, { level: 3 }])).toBe(0);
    expect(bossRewardSlot([{ level: 3 }, { level: 3 }])).toBeNull();
    expect(bossRewardSlot([{ level: 3 }, null])).toBeNull();
    expect(bossRewardSlot([null, null])).toBeNull();
  });
});
