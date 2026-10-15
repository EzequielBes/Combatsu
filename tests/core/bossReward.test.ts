import { describe, expect, it } from 'vitest';
import { bossRewardSlot } from '../../src/core/bossReward';
import { Loadout } from '../../src/core/loadout';

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

describe('VRM-19: o prêmio do chefe no Vermelho', () => {
  it('Vermelho Nv 2 ao lado de uma técnica Nv 3: o prêmio vai ao Vermelho e dá 1 ponto no eixo-foco', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul', 3);
    loadout.equip(1, 'vermelho');
    loadout.axes.add('vermelho', 'recarga');
    const slot = bossRewardSlot(loadout.slotsView);
    expect(slot).toBe(1);
    expect(loadout.upgrade(loadout.slotsView[slot!]!.id)).toBe(true);
    expect(loadout.axes.points('vermelho', 'recarga')).toBe(2);
    expect(loadout.levelOf('vermelho')).toBe(3);
  });
});
