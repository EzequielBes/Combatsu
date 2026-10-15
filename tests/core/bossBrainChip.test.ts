import { describe, expect, it } from 'vitest';
import { BossBrain, type BossBrainTuning } from '../../src/core/bossBrain';
import { BOSS } from '../../src/data/tuning';
import type { Hit, HitBand, Strength } from '../../src/core/hit';

const MAX_HP = 600;

function hit(damage: number, strength: Strength, band?: HitBand): Hit {
  return { ownerId: 999, damage, strength, direction: { x: 1, y: 0 }, force: 0, ...(band ? { band } : {}) };
}

/** Sai da intro e chega em `active`. */
function active(t: BossBrainTuning = BOSS): BossBrain {
  const brain = new BossBrain(MAX_HP, t);
  brain.update(t.introMs);
  return brain;
}

/** Postura perdida por um único acerto num chefe ativo e descansado. */
function poiseLost(h: Hit, t: BossBrainTuning = BOSS): number {
  const brain = active(t);
  const before = brain.poise;
  brain.receiveHit(h);
  return before - brain.poise;
}

describe('BossBrain: postura do acerto com banda (POW-03.6)', () => {
  it('BOSS.chipPoiseMul vale 0,5', () => {
    expect(BOSS.chipPoiseMul).toBe(0.5);
  });

  it.each(['light', 'heavy'] as const)('chip %s tira dano × 0,5 da postura', (strength) => {
    expect(poiseLost(hit(8, strength, 'chip'))).toBe(4);
  });

  it('chip segue o chipPoiseMul do tuning', () => {
    expect(poiseLost(hit(8, 'light', 'chip'), { ...BOSS, chipPoiseMul: 0.25 })).toBe(2);
  });

  it('micro leve tira o dano; micro forte tira 2 × dano', () => {
    expect(poiseLost(hit(6, 'light', 'micro'))).toBe(6);
    expect(poiseLost(hit(6, 'heavy', 'micro'))).toBe(12);
  });

  it('sem banda continua igual a hoje (leve = dano, forte = 2 × dano)', () => {
    expect(poiseLost(hit(6, 'light'))).toBe(6);
    expect(poiseLost(hit(6, 'heavy'))).toBe(12);
  });

  it('o chip tira o hp inteiro: a faixa só reduz a postura', () => {
    const brain = active();
    brain.receiveHit(hit(8, 'light', 'chip'));
    expect(brain.hp).toBe(MAX_HP - 8);
  });

  it('chips somados ainda zeram a postura e entram em stagger', () => {
    const brain = active();
    const events = [];
    // 100 de postura a 5 por chip (10 × 0,5): o 20º chip zera.
    for (let i = 0; i < 20; i++) events.push(...brain.receiveHit(hit(10, 'light', 'chip')));
    expect(brain.poise).toBe(0);
    expect(brain.state).toBe('stagger');
    expect(events).toContainEqual({ type: 'staggerStart' });
  });
});
