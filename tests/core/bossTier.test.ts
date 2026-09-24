import { describe, expect, it } from 'vitest';
import { archetypeFor, bossDamageMultFor, bossHpFor, bossSpecFor, tierFor } from '../../src/core/bossTier';

describe('tierFor: tier = round / 5', () => {
  it.each([
    [5, 1],
    [10, 2],
    [35, 7],
    [100, 20],
  ])('round %i => tier %i', (round, expected) => {
    expect(tierFor(round)).toBe(expected);
  });
});

describe('bossHpFor: vida por tier (BTIER-01)', () => {
  it.each([
    [1, 600],
    [2, 900],
    [3, 1200],
    [6, 2100],
    [7, 2400],
    [20, 2400],
  ])('tier %i => maxHp %i', (tier, expected) => {
    expect(bossHpFor(tier)).toBe(expected);
  });
});

describe('bossDamageMultFor e dano dos ataques por tier (BTIER-02)', () => {
  it.each([
    [1, 18],
    [2, 21],
    [7, 34],
    [8, 36],
    [20, 36],
  ])('tier %i => dano da investida %i', (tier, expected) => {
    const spec = bossSpecFor(tier * 5);
    expect(spec.damage.charge).toBe(expected);
  });

  it.each([
    [1, 20],
    [2, 23],
    [7, 38],
    [8, 40],
    [20, 40],
  ])('tier %i => dano do pouso %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5);
    expect(spec.damage.leap).toBe(expected);
  });

  it.each([
    [1, 12],
    [2, 14],
    [7, 23],
    [8, 24],
    [20, 24],
  ])('tier %i => dano da onda %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5);
    expect(spec.damage.shockwave).toBe(expected);
  });

  it.each([
    [1, 10],
    [2, 12],
    [7, 19],
    [8, 20],
    [20, 20],
  ])('tier %i => dano do projétil %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5);
    expect(spec.damage.projectile).toBe(expected);
  });
});

describe('BTIER-03: monotonicidade de t = 2 a 50', () => {
  it('hp e dano nunca caem de t-1 para t', () => {
    for (let t = 2; t <= 50; t++) {
      expect(bossHpFor(t)).toBeGreaterThanOrEqual(bossHpFor(t - 1));
      expect(bossDamageMultFor(t)).toBeGreaterThanOrEqual(bossDamageMultFor(t - 1));
    }
  });
});

describe('archetypeFor: arquétipo por tier (BTIER-04)', () => {
  it.each<[number, 'oni' | 'tecela']>([
    [1, 'oni'],
    [2, 'oni'],
    [3, 'tecela'],
    [4, 'oni'],
    [5, 'tecela'],
  ])('tier %i => %s', (tier, expected) => {
    expect(archetypeFor(tier)).toBe(expected);
  });
});

describe('bossSpecFor: nome e rajada por arquétipo (BTIER-04, BTIER-05, BTIER-07)', () => {
  it('tier 1 (round 5): Oni do Portão, volleyCount 3, projectileSpeed 260', () => {
    const spec = bossSpecFor(5);
    expect(spec.name).toBe('Oni do Portão');
    expect(spec.archetype).toBe('oni');
    expect(spec.volleyCount).toBe(3);
    expect(spec.projectileSpeed).toBe(260);
  });

  it('tier 3 (round 15): Tecelã de Maldições, volleyCount 5, projectileSpeed 325', () => {
    const spec = bossSpecFor(15);
    expect(spec.name).toBe('Tecelã de Maldições');
    expect(spec.archetype).toBe('tecela');
    expect(spec.volleyCount).toBe(5);
    expect(spec.projectileSpeed).toBe(325);
  });

  it('tier 4 (round 20): volta a ser Oni do Portão, volleyCount 3, projectileSpeed 260', () => {
    const spec = bossSpecFor(20);
    expect(spec.name).toBe('Oni do Portão');
    expect(spec.volleyCount).toBe(3);
    expect(spec.projectileSpeed).toBe(260);
  });
});
