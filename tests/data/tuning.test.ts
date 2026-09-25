import { describe, expect, it } from 'vitest';
import { DIFFICULTY, WAVE, RUN, BOSS, ECONOMY, PICKUP, ARMED, DROPPED_TOOLS } from '../../src/data/tuning';
import { BOSS_DEFEAT_HITSTOP_MS } from '../../src/data/fx';

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

describe('tuning do chefe (T1, valores das Assumptions da spec boss-a-cada-5)', () => {
  it('introMs 1500 (BOSS-06)', () => {
    expect(BOSS.introMs).toBe(1500);
  });

  it('phaseThresholds = 66% e 33% (BAI-01)', () => {
    expect(BOSS.phaseThresholds).toEqual({ phase2: 0.66, phase3: 0.33 });
  });

  it('roarMs 900 e roarImpulse 6 (BAI-04, BAI-13)', () => {
    expect(BOSS.roarMs).toBe(900);
    expect(BOSS.roarImpulse).toBe(6);
  });

  it('staggerMs 1200 (BAI-08)', () => {
    expect(BOSS.staggerMs).toBe(1200);
  });

  it('poise = max 100, regenPerSec 15, regenDelayMs 2000 (BAI-07, BAI-08, BAI-09)', () => {
    expect(BOSS.poise).toEqual({ max: 100, regenPerSec: 15, regenDelayMs: 2000 });
  });

  it('phases: multiplicadores 1.0/0.85/0.7 e descansos 900/700/500 ms (BAI-03, BAI-11)', () => {
    expect(BOSS.phases).toEqual([
      { windupMult: 1.0, restMs: 900 },
      { windupMult: 0.85, restMs: 700 },
      { windupMult: 0.7, restMs: 500 },
    ]);
  });

  it('charge = windupMs 600, speed 320, maxDist 360, damage 18 (BAT-01, BAT-09)', () => {
    expect(BOSS.charge).toEqual({ windupMs: 600, speed: 320, maxDist: 360, damage: 18 });
  });

  it('leap = windupMs 500, durationMs 700, damage 20 (BAT-02, BAT-10)', () => {
    expect(BOSS.leap).toEqual({ windupMs: 500, durationMs: 700, damage: 20 });
  });

  it('shockwave = speed 240, maxDist 600, height 20, damage 12 (BAT-03)', () => {
    expect(BOSS.shockwave).toEqual({ speed: 240, maxDist: 600, height: 20, damage: 12 });
  });

  it('volley = windupMs 700, count 3, intervalMs 150, speed 260, damage 10, maxDist 1200 (BAT-04)', () => {
    expect(BOSS.volley).toEqual({ windupMs: 700, count: 3, intervalMs: 150, speed: 260, damage: 10, maxDist: 1200 });
  });

  it('tier = hpBase 600, hpPerTier 0.5, hpCap 4.0, damagePerTier 0.15, damageCap 2.0 (BTIER-01, BTIER-02)', () => {
    expect(BOSS.tier).toEqual({ hpBase: 600, hpPerTier: 0.5, hpCap: 4.0, damagePerTier: 0.15, damageCap: 2.0 });
  });

  it('archetypes: oni só tem nome; tecela tem nome, volleyCount 5 e projectileSpeedMult 1.25 (BTIER-04, BTIER-05, BTIER-07)', () => {
    expect(BOSS.archetypes.oni).toEqual({ name: 'Oni do Portão' });
    expect(BOSS.archetypes.tecela).toEqual({
      name: 'Tecelã de Maldições',
      volleyCount: 5,
      projectileSpeedMult: 1.25,
    });
  });

  it('healFraction 0.3 (BWIN-01)', () => {
    expect(BOSS.healFraction).toBe(0.3);
  });
});

describe('BOSS_DEFEAT_HITSTOP_MS (BWIN-02)', () => {
  it('é 250', () => {
    expect(BOSS_DEFEAT_HITSTOP_MS).toBe(250);
  });
});

describe('tuning da economia (T1, valores das Assumptions da spec economia-drops-cura)', () => {
  it('ECONOMY = fragmentos 2-4, +2 se armado, chefe 15, valor a cada 5 rodadas', () => {
    expect(ECONOMY).toEqual({
      fragmentsMin: 2,
      fragmentsMax: 4,
      armedBonus: 2,
      bossFragments: 15,
      valueEvery: 5,
      healChance: 0.1,
      healAmount: 8,
      maxLiveFragments: 60,
      armed: { startRound: 3, base: 0.15, perRound: 0.05, cap: 0.5, rareChance: 0.15 },
    });
  });

  it('PICKUP = gravidade 900, quiques, ímã e tempos de vida das Assumptions', () => {
    expect(PICKUP).toEqual({
      gravity: 900,
      bounce: 0.35,
      wallBounce: 0.5,
      size: 8,
      magnetDelayMs: 300,
      magnetRange: 72,
      magnetSpeed0: 120,
      magnetAccel: 1200,
      magnetSpeedMax: 600,
      fragmentLifeMs: 15000,
      healLifeMs: 10000,
      blinkLastMs: 3000,
      blinkEveryMs: 150,
    });
  });

  it('ARMED = faca ×1,25 (+8 px) e porrete ×1,6 (+12 px, +150 ms de preparo)', () => {
    expect(ARMED).toEqual({
      knife: { dmg: 1.25, widen: 8 },
      club: { dmg: 1.6, widen: 12, windupPlus: 150 },
    });
  });

  it('DROPPED_TOOLS = 20 s em repouso, teto de 6', () => {
    expect(DROPPED_TOOLS).toEqual({ restMs: 20000, max: 6 });
  });
});
