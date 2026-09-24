import { describe, expect, it } from 'vitest';
import { DIFFICULTY, WAVE, RUN } from '../../src/data/tuning';

describe('tuning da dificuldade, onda e run (T1, valores das Assumptions da spec)', () => {
  it('DIFFICULTY = hpPerRound 0.12, hpCap 3.0, damagePerRound 0.08, damageCap 2.5, speedPerRound 0.03, speedCap 1.4', () => {
    expect(DIFFICULTY).toEqual({
      hpPerRound: 0.12,
      hpCap: 3.0,
      damagePerRound: 0.08,
      damageCap: 2.5,
      speedPerRound: 0.03,
      speedCap: 1.4,
    });
  });

  it('WAVE = base 3, max 12, maxAlive 4, pointGapMs 800', () => {
    expect(WAVE).toEqual({ base: 3, max: 12, maxAlive: 4, pointGapMs: 800 });
  });

  it('RUN = intermissionMs 2500, gameOverLockMs 1000, spawnGraceMs 600, bannerMs 1500', () => {
    expect(RUN).toEqual({ intermissionMs: 2500, gameOverLockMs: 1000, spawnGraceMs: 600, bannerMs: 1500 });
  });
});
