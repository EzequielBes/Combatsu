import { describe, expect, it } from 'vitest';
import { bossFinisherDamage } from '../../src/core/bossFinisher';
import { BOSS } from '../../src/data/tuning';

const base = { dist: 0, state: 'stagger', finisherReady: true, maxHp: 400, t: BOSS.finisher };

describe('BFX-06..08: bossFinisherDamage', () => {
  it('alcance: 48 px tira round(0,12 x 400) = 48; 49 px tira 0', () => {
    expect(bossFinisherDamage({ ...base, dist: 48 })).toBe(48);
    expect(bossFinisherDamage({ ...base, dist: 49 })).toBe(0);
    expect(bossFinisherDamage({ ...base, dist: 0 })).toBe(48);
  });

  it('fora do stagger, 0 (BFX-08)', () => {
    for (const state of ['intro', 'active', 'roar', 'dead', 'windup', 'rest']) {
      expect(bossFinisherDamage({ ...base, state })).toBe(0);
    }
  });

  it('sem finalizador pronto, 0 (BFX-07)', () => {
    expect(bossFinisherDamage({ ...base, finisherReady: false })).toBe(0);
  });

  it('arredonda a fração do HP máximo', () => {
    expect(bossFinisherDamage({ ...base, maxHp: 405 })).toBe(49); // 48,6
    expect(bossFinisherDamage({ ...base, maxHp: 404 })).toBe(48); // 48,48
  });
});
