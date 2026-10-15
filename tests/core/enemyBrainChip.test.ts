import { describe, expect, it } from 'vitest';
import { EnemyBrain, type EnemyTuning } from '../../src/core/enemyBrain';
import type { Hit, HitBand } from '../../src/core/hit';

const T: EnemyTuning = {
  maxHp: 30,
  hitstunMs: 100,
  ragdollStunMs: 500,
  getUpMs: 200,
  deathRagdollMs: 1000,
  dissolveMs: 300,
  staggerMs: 150,
};
const hit = (extra: Partial<Hit> = {}): Hit => ({
  ownerId: 1,
  damage: 2,
  strength: 'light',
  direction: { x: 0, y: -1 },
  force: 1,
  ...extra,
});
const band = (b: HitBand, extra: Partial<Hit> = {}): Hit => hit({ band: b, tech: true, ...extra });
const knockdown = (): Hit => hit({ damage: 1, strength: 'heavy', knockdown: true });

/** Cérebro no chão: derrubado por um golpe que derruba (sem banda). */
const grounded = (): EnemyBrain => {
  const b = new EnemyBrain(T);
  b.receiveHit(knockdown());
  expect(b.state).toBe('ragdollStun');
  return b;
};

describe('EnemyBrain: acerto com banda (POW-03)', () => {
  it.each(['chip', 'micro'] as const)('%s vivo em idle: devolve só chip e não muda o estado', (b) => {
    const brain = new EnemyBrain(T);
    const h = band(b);
    expect(brain.receiveHit(h)).toEqual([{ type: 'chip', hit: h }]);
    expect(brain.state).toBe('idle');
    expect(brain.hp).toBe(28);
  });

  it('o chip não entra em hitstun, stagger nem ragdoll, mesmo forte e com knockdown', () => {
    const brain = new EnemyBrain(T);
    const h = band('micro', { strength: 'heavy', knockdown: true });
    expect(brain.receiveHit(h)).toEqual([{ type: 'chip', hit: h }]);
    expect(brain.state).toBe('idle');
  });

  it('no hitstun: mantém o estado e não estica o tempo da reação', () => {
    const brain = new EnemyBrain(T);
    brain.receiveHit(hit());
    brain.update(60);
    expect(brain.receiveHit(band('chip'))).toHaveLength(1);
    expect(brain.state).toBe('hitstun');
    brain.update(40);
    expect(brain.state).toBe('idle');
  });

  it('no stagger: mantém o cambaleio e o tempo dele', () => {
    const brain = new EnemyBrain(T);
    brain.receiveHit(hit({ strength: 'heavy' }));
    expect(brain.state).toBe('stagger');
    brain.update(100);
    brain.receiveHit(band('micro'));
    expect(brain.state).toBe('stagger');
    brain.update(50);
    expect(brain.state).toBe('idle');
  });

  it('comprometido: devolve chip, não armored (POW-03.4)', () => {
    const brain = new EnemyBrain(T);
    const h = band('chip');
    expect(brain.receiveHit(h, { committed: true })).toEqual([{ type: 'chip', hit: h }]);
  });

  it.each([true, false])('no chão (tech: %s): devolve chip e o downHits fica igual (POW-03.4)', (tech) => {
    const brain = grounded();
    const h = band('chip', { tech });
    expect(brain.receiveHit(h)).toEqual([{ type: 'chip', hit: h }]);
    expect(brain.state).toBe('ragdollStun');
    expect(brain.downHits).toBe(0);
  });

  it.each(['chip', 'micro'] as const)('%s letal: died e ragdoll como qualquer golpe (POW-03.5)', (b) => {
    const brain = new EnemyBrain({ ...T, maxHp: 2 });
    const h = band(b);
    expect(brain.receiveHit(h)).toEqual([
      { type: 'died', hit: h },
      { type: 'ragdoll', hit: h },
    ]);
    expect(brain.state).toBe('deadRagdoll');
    expect(brain.isDead).toBe(true);
  });

  it('letal no chão também morre', () => {
    const brain = new EnemyBrain({ ...T, maxHp: 3 });
    brain.receiveHit(knockdown());
    expect(brain.receiveHit(band('chip', { tech: false })).map((e) => e.type)).toEqual(['died', 'ragdoll']);
  });

  it('morto recusa o chip', () => {
    const brain = new EnemyBrain({ ...T, maxHp: 2 });
    brain.receiveHit(band('chip'));
    expect(brain.receiveHit(band('chip'))).toEqual([]);
    expect(brain.hp).toBe(0);
  });
});

describe('EnemyBrain: recusas com banda (edge cases)', () => {
  const gettingUp = (): EnemyBrain => {
    const b = grounded();
    b.update(T.ragdollStunMs);
    expect(b.state).toBe('gettingUp');
    return b;
  };
  /** No chão com o golpe do chão já gasto (downHits 1). */
  const spent = (): EnemyBrain => {
    const b = grounded();
    b.receiveHit(hit({ damage: 1 }));
    expect(b.downHits).toBe(1);
    return b;
  };

  it.each([
    ['gettingUp', gettingUp],
    ['downHits 1', spent],
  ] as const)('%s: recusa o chip sem tech', (_name, make) => {
    const brain = make();
    const hp = brain.hp;
    expect(brain.receiveHit(band('chip', { tech: false }))).toEqual([]);
    expect(brain.hp).toBe(hp);
  });

  it.each([
    ['gettingUp', gettingUp, 'gettingUp'],
    ['downHits 1', spent, 'ragdollStun'],
  ] as const)('%s: aceita o chip com tech e não muda estado nem downHits', (_name, make, state) => {
    const brain = make();
    const before = brain.downHits;
    const h = band('chip', { tech: true });
    expect(brain.receiveHit(h)).toEqual([{ type: 'chip', hit: h }]);
    expect(brain.state).toBe(state);
    expect(brain.downHits).toBe(before);
  });
});
