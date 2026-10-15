import { describe, expect, it } from 'vitest';
import { bossDamageMultFor, bossHpFor, bossSpecFor, tierFor } from '../../src/core/bossTier';
import type { BossLineup } from '../../src/core/bossAffix';

const lineup = (over: Partial<BossLineup> = {}): BossLineup => ({
  archetype: 'oni',
  affixes: [],
  finger: false,
  ...over,
});

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

describe('bossHpFor: vida por tier (BTIER-01, BFX-01)', () => {
  it('o chefe do tier 1 tem 400 de HP (BFX-01)', () => {
    expect(bossHpFor(1)).toBe(400);
    expect(bossSpecFor(5, lineup()).maxHp).toBe(400);
  });

  it.each([
    [1, 400],
    [2, 600],
    [3, 800],
    [6, 1400],
    [7, 1600],
    [20, 1600],
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
    const spec = bossSpecFor(tier * 5, lineup());
    expect(spec.damage.charge).toBe(expected);
  });

  it.each([
    [1, 20],
    [2, 23],
    [7, 38],
    [8, 40],
    [20, 40],
  ])('tier %i => dano do pouso %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5, lineup());
    expect(spec.damage.leap).toBe(expected);
  });

  it.each([
    [1, 12],
    [2, 14],
    [7, 23],
    [8, 24],
    [20, 24],
  ])('tier %i => dano da onda %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5, lineup());
    expect(spec.damage.shockwave).toBe(expected);
  });

  it.each([
    [1, 10],
    [2, 12],
    [7, 19],
    [8, 20],
    [20, 20],
  ])('tier %i => dano do projétil %i (mesma regra do BTIER-02)', (tier, expected) => {
    const spec = bossSpecFor(tier * 5, lineup());
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

describe('bossSpecFor: nome e rajada por arquétipo (BTIER-05, BTIER-07)', () => {
  it('Oni na r5: Oni do Portão, volleyCount 3, projectileSpeed 260', () => {
    const spec = bossSpecFor(5, lineup());
    expect(spec.name).toBe('Oni do Portão');
    expect(spec.archetype).toBe('oni');
    expect(spec.volleyCount).toBe(3);
    expect(spec.projectileSpeed).toBe(260);
  });

  it('Tecelã na r15: Tecelã de Maldições, volleyCount 5, projectileSpeed 325', () => {
    const spec = bossSpecFor(15, lineup({ archetype: 'tecela' }));
    expect(spec.name).toBe('Tecelã de Maldições');
    expect(spec.archetype).toBe('tecela');
    expect(spec.volleyCount).toBe(5);
    expect(spec.projectileSpeed).toBe(325);
  });

  it('Oni na r20: Oni do Portão, volleyCount 3, projectileSpeed 260', () => {
    const spec = bossSpecFor(20, lineup());
    expect(spec.name).toBe('Oni do Portão');
    expect(spec.volleyCount).toBe(3);
    expect(spec.projectileSpeed).toBe(260);
  });
});

describe('bossSpecFor com escalação (BLN-08)', () => {
  it('o arquétipo vem da escalação, não da paridade do tier', () => {
    expect(bossSpecFor(5, lineup({ archetype: 'tecela' })).archetype).toBe('tecela');
    expect(bossSpecFor(5, lineup({ archetype: 'tecela' })).name).toBe('Tecelã de Maldições');
    expect(bossSpecFor(15, lineup({ archetype: 'oni' })).archetype).toBe('oni');
    expect(bossSpecFor(15, lineup({ archetype: 'oni' })).volleyCount).toBe(3);
  });

  it('os afixos da escalação passam para a especificação, na mesma ordem', () => {
    const spec = bossSpecFor(15, lineup({ affixes: ['sangue', 'igneo'] }));
    expect(spec.affixes).toEqual(['sangue', 'igneo']);
  });
});

describe('dano de lava e do feixe por tier (IGN-03, SNG-03)', () => {
  it.each([
    [1, 4, 16],
    [2, 5, 18],
    [7, 8, 30],
    [8, 8, 32],
    [20, 8, 32],
  ])('tier %i => lava round(4 × mult) = %i, feixe round(16 × mult) = %i', (tier, lava, beam) => {
    const spec = bossSpecFor(tier * 5, lineup());
    expect(spec.damage.lava).toBe(lava);
    expect(spec.damage.beam).toBe(beam);
  });
});

describe('Portador de Dedo (PDD-03..05)', () => {
  it('corpo em escala 1,25 com a moldura e 1 sem ela (PDD-03)', () => {
    expect(bossSpecFor(10, lineup({ finger: true })).bodyScale).toBe(1.25);
    expect(bossSpecFor(10, lineup()).bodyScale).toBe(1);
  });

  it('r10: vida 600 × 1,3 = 780 e cada dano round(base × 1,15 × 1,5), um arredondamento só (PDD-04)', () => {
    const spec = bossSpecFor(10, lineup({ finger: true }));
    expect(spec.finger).toBe(true);
    expect(spec.maxHp).toBe(780);
    // Arredondar duas vezes daria investida 32, projétil 18 e feixe 27.
    expect(spec.damage).toEqual({ charge: 31, leap: 35, shockwave: 21, projectile: 17, lava: 7, beam: 28 });
  });

  it('a lava do Portador também leva × 1,5: 7 na r10, não round(5 × 1,5) = 8 (edge case)', () => {
    expect(bossSpecFor(10, lineup()).damage.lava).toBe(5);
    expect(bossSpecFor(10, lineup({ finger: true })).damage.lava).toBe(7);
  });

  it('a rajada sai com um projétil a mais que o arquétipo (PDD-05)', () => {
    expect(bossSpecFor(10, lineup({ finger: true })).volleyCount).toBe(4);
    expect(bossSpecFor(15, lineup({ archetype: 'tecela', finger: true })).volleyCount).toBe(6);
  });

  it('o Portador não muda a velocidade do projétil nem o nome do arquétipo', () => {
    const spec = bossSpecFor(15, lineup({ archetype: 'tecela', finger: true }));
    expect(spec.projectileSpeed).toBe(325);
    expect(spec.name).toBe('Tecelã de Maldições');
  });
});
