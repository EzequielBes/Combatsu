import { describe, expect, it } from 'vitest';
import { multipliersFor, scaleFor, type EnemyBase } from '../../src/core/difficulty';
import { DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';

const BASE: EnemyBase = { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK };

describe('scaleFor: maxHp por rodada (DIF-01)', () => {
  it.each([
    [1, 60],
    [2, 67],
    [5, 89],
    [10, 125],
    [18, 180],
    [30, 180],
  ])('rodada %i => maxHp %i', (round, expected) => {
    expect(scaleFor(round, BASE, DIFFICULTY).brain.maxHp).toBe(expected);
  });
});

describe('scaleFor: dano por rodada (DIF-05)', () => {
  it.each([
    [1, 12],
    [2, 13],
    [5, 16],
    [19, 29],
    [20, 30],
    [40, 30],
  ])('rodada %i => dano %i', (round, expected) => {
    expect(scaleFor(round, BASE, DIFFICULTY).attack.damage).toBe(expected);
  });
});

describe('scaleFor: velocidade por rodada (DIF-06)', () => {
  it('rodada 1: velocidade sem mudança', () => {
    const scaled = scaleFor(1, BASE, DIFFICULTY);
    expect(scaled.ai.patrolSpeed).toBeCloseTo(ENEMY_AI.patrolSpeed * 1);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1);
  });

  it('rodada 15: teto de x1.4', () => {
    const scaled = scaleFor(15, BASE, DIFFICULTY);
    expect(scaled.ai.patrolSpeed).toBeCloseTo(ENEMY_AI.patrolSpeed * 1.4);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.4);
  });

  it('rodada 30: continua no teto de x1.4', () => {
    const scaled = scaleFor(30, BASE, DIFFICULTY);
    expect(scaled.ai.patrolSpeed).toBeCloseTo(ENEMY_AI.patrolSpeed * 1.4);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.4);
  });

  it('só patrolSpeed e chaseSpeed mudam; os outros campos da IA ficam iguais', () => {
    const scaled = scaleFor(15, BASE, DIFFICULTY);
    expect(scaled.ai.patrolRange).toBe(ENEMY_AI.patrolRange);
    expect(scaled.ai.chaseRange).toBe(ENEMY_AI.chaseRange);
    expect(scaled.ai.attackRange).toBe(ENEMY_AI.attackRange);
    expect(scaled.ai.windupMs).toBe(ENEMY_AI.windupMs);
    expect(scaled.ai.attackMs).toBe(ENEMY_AI.attackMs);
    expect(scaled.ai.restMs).toBe(ENEMY_AI.restMs);
  });
});

describe('multipliersFor: monotonicidade (DIF-02)', () => {
  it('para r de 2 a 100, cada multiplicador é >= ao de r - 1', () => {
    for (let r = 2; r <= 100; r++) {
      const prev = multipliersFor(r - 1, DIFFICULTY);
      const cur = multipliersFor(r, DIFFICULTY);
      expect(cur.hp).toBeGreaterThanOrEqual(prev.hp);
      expect(cur.damage).toBeGreaterThanOrEqual(prev.damage);
      expect(cur.speed).toBeGreaterThanOrEqual(prev.speed);
    }
  });
});

describe('multipliersFor: rodadas inválidas viram rodada 1 (DIF-03)', () => {
  it.each([0, -3, 2.5])('rodada %s devolve exatamente os valores da rodada 1', (round) => {
    expect(multipliersFor(round, DIFFICULTY)).toEqual(multipliersFor(1, DIFFICULTY));
  });
});

describe('scaleFor: não muta o objeto base', () => {
  it('brain, ai e attack do base continuam com os valores originais', () => {
    const brainBefore = { ...ENEMY };
    const aiBefore = { ...ENEMY_AI };
    const attackBefore = { ...ENEMY_ATTACK };
    scaleFor(10, BASE, DIFFICULTY);
    expect(ENEMY).toEqual(brainBefore);
    expect(ENEMY_AI).toEqual(aiBefore);
    expect(ENEMY_ATTACK).toEqual(attackBefore);
  });
});
