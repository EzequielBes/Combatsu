import { describe, expect, it } from 'vitest';
import { BossBrain, type BossBrainTuning } from '../../src/core/bossBrain';
import { EnemyBrain, type EnemyTuning } from '../../src/core/enemyBrain';
import type { Hit } from '../../src/core/hit';
import { BOSS } from '../../src/data/tuning';
import { TECH_RULE } from '../../src/data/techRule';

const T: EnemyTuning = {
  maxHp: 200,
  hitstunMs: 100,
  ragdollStunMs: 500,
  getUpMs: 200,
  deathRagdollMs: 1000,
  dissolveMs: 300,
  staggerMs: 150,
};
const BONUS = TECH_RULE.maxHpPct.enemy;
/** Postura sem teto: o golpe nunca abre o `stagger` por conta própria. */
const HIGH_POISE: BossBrainTuning = { ...BOSS, poise: { ...BOSS.poise, max: 1_000_000 } };

function hit(over: Partial<Hit> = {}): Hit {
  return { ownerId: 1, damage: 10, strength: 'light', direction: { x: 1, y: 0 }, force: 3, ...over };
}

/** Derruba o comum: entra em `ragdollStun` com os 500 ms do tuning. */
function downed(): EnemyBrain {
  const b = new EnemyBrain(T);
  b.receiveHit(hit({ strength: 'heavy', knockdown: true, damage: 1 }));
  expect(b.state).toBe('ragdollStun');
  return b;
}

describe('EnemyBrain.holdDown: o caído fica no chão (VRM-15)', () => {
  it('em ragdollStun segura 599 ms e levanta aos 600', () => {
    const b = downed();
    b.update(400); // sobravam 100 ms do derrubar
    b.holdDown(600);
    expect(b.update(599)).toEqual([]);
    expect(b.state).toBe('ragdollStun');
    expect(b.update(1)).toEqual([{ type: 'getUp' }]);
    expect(b.state).toBe('gettingUp');
  });

  it('fora do ragdollStun não faz nada', () => {
    const b = new EnemyBrain(T);
    b.holdDown(600);
    expect(b.state).toBe('idle');
    b.receiveHit(hit());
    expect(b.state).toBe('hitstun');
    b.holdDown(600);
    b.update(T.hitstunMs);
    expect(b.state).toBe('idle');
  });
});

describe('Cérebros com a fração da vida máxima (VRM-16)', () => {
  it('o comum tira damage + round(4% do maxHp) e grava esse total em lastDamage', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(hit({ maxHpBonus: BONUS }));
    const total = 10 + Math.round(BONUS * T.maxHp);
    expect(total).toBe(18);
    expect(b.hp).toBe(T.maxHp - total);
    expect(b.lastDamage).toBe(total);
  });

  it('sem bônus o lastDamage do comum é o damage; golpe recusado zera', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(hit());
    expect(b.lastDamage).toBe(10);
    const d = downed();
    d.receiveHit(hit()); // o golpe do chão (GND-01)
    expect(d.receiveHit(hit())).toEqual([]); // o segundo é recusado (GND-02)
    expect(d.lastDamage).toBe(0);
  });

  it('o chefe fica no teto de 1% do maxHp mesmo com o bônus de 4%', () => {
    const brain = new BossBrain(1000, HIGH_POISE);
    brain.update(HIGH_POISE.introMs);
    brain.receiveHit(hit({ maxHpBonus: BONUS }));
    expect(brain.lastDamage).toBe(10 + Math.round(0.01 * 1000));
    expect(brain.hp).toBe(1000 - 20);
  });

  it('no chefe a fração entra antes do ×1,5 do stagger', () => {
    const brain = new BossBrain(1000, HIGH_POISE);
    brain.update(HIGH_POISE.introMs);
    brain.stun(1500);
    brain.receiveHit(hit({ maxHpBonus: BONUS }));
    expect(brain.lastDamage).toBe(Math.round(20 * HIGH_POISE.staggerDamageMult));
  });
});
