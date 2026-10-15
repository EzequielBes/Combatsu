import { describe, expect, it } from 'vitest';
import { BossBrain, type BossBrainTuning } from '../../src/core/bossBrain';
import { BOSS } from '../../src/data/tuning';
import type { Hit, Strength } from '../../src/core/hit';

/** Postura sem teto: o golpe nunca abre o `stagger` por conta própria. */
const HIGH_POISE: BossBrainTuning = { ...BOSS, poise: { ...BOSS.poise, max: 1_000_000 } };

function hit(damage: number, strength: Strength = 'light'): Hit {
  return { ownerId: 999, damage, strength, direction: { x: 1, y: 0 }, force: 0 };
}

/** Sai da intro e chega em `active`. */
function active(maxHp: number, t: BossBrainTuning = BOSS): BossBrain {
  const brain = new BossBrain(maxHp, t);
  brain.update(t.introMs);
  return brain;
}

describe('BossBrain.lastDamage: o dano que o número mostra (POW-06.7)', () => {
  it('fora do stagger é o dano do golpe; em stagger, round(dano × 1,5) (BFX-05)', () => {
    const brain = active(400, HIGH_POISE);
    brain.receiveHit(hit(18, 'heavy'));
    expect(brain.lastDamage).toBe(18);
    brain.stun(1500);
    const before = brain.hp;
    brain.receiveHit(hit(18, 'heavy'));
    expect(brain.lastDamage).toBe(27);
    expect(before - brain.hp).toBe(27);
  });

  it('finalizador e Kokusen guardam o que tiraram; golpe ignorado zera', () => {
    const brain = active(400, HIGH_POISE);
    brain.stun(1500);
    brain.receiveFinisher();
    expect(brain.lastDamage).toBe(48);
    brain.receiveFinisher(); // segundo uso no mesmo stagger: nada
    expect(brain.lastDamage).toBe(0);
    brain.receiveKokusen(45, 135);
    expect(brain.lastDamage).toBe(45);
    const intro = new BossBrain(400);
    expect(intro.receiveHit(hit(18))).toEqual([]);
    expect(intro.lastDamage).toBe(0);
  });
});
