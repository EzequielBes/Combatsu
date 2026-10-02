import { describe, expect, it } from 'vitest';
import { multipliersFor, scaleFor, type DifficultyTuning, type EnemyBase } from '../../src/core/difficulty';
import { DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';

const BASE: EnemyBase = { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK };

/** Tuning com crescimento (o do jogo antes do AD-014): mantém coberta a fórmula de escala e os tetos (DIF-01, DIF-05). */
const GROWING: DifficultyTuning = {
  hpPerRound: 0.12,
  hpCap: 3.0,
  damagePerRound: 0.08,
  damageCap: 2.5,
  speedPerRound: 0.03,
  speedCap: 1.4,
};

describe('scaleFor: maxHp por rodada com tuning crescente (DIF-01)', () => {
  it.each([
    [1, 60],
    [2, 67],
    [5, 89],
    [10, 125],
    [18, 180],
    [30, 180],
  ])('rodada %i => maxHp %i', (round, expected) => {
    expect(scaleFor(round, BASE, GROWING).brain.maxHp).toBe(expected);
  });
});

describe('scaleFor: dano por rodada com tuning crescente (DIF-05)', () => {
  it.each([
    [1, 12],
    [2, 13],
    [5, 16],
    [19, 29],
    [20, 30],
    [40, 30],
  ])('rodada %i => dano %i', (round, expected) => {
    expect(scaleFor(round, BASE, GROWING).attack.damage).toBe(expected);
  });
});

describe('DIFFICULTY real: HP e dano dos comuns fixos por rodada (SPN-13, SPN-14, AD-014)', () => {
  it('hpPerRound e damagePerRound são 0; a velocidade continua escalando', () => {
    expect(DIFFICULTY.hpPerRound).toBe(0);
    expect(DIFFICULTY.damagePerRound).toBe(0);
    expect(DIFFICULTY.speedPerRound).toBe(0.03);
  });

  it.each([2, 5, 10, 18, 30])('rodada %i: maxHp e dano iguais aos da rodada 1 (60 e 12)', (round) => {
    const r1 = scaleFor(1, BASE, DIFFICULTY);
    const r = scaleFor(round, BASE, DIFFICULTY);
    expect(r1.brain.maxHp).toBe(60);
    expect(r1.attack.damage).toBe(12);
    expect(r.brain.maxHp).toBe(r1.brain.maxHp);
    expect(r.attack.damage).toBe(r1.attack.damage);
  });

  it('para toda rodada de 1 a 30, maxHp e dano são os da rodada 1', () => {
    const r1 = scaleFor(1, BASE, DIFFICULTY);
    for (let r = 1; r <= 30; r++) {
      const s = scaleFor(r, BASE, DIFFICULTY);
      expect(s.brain.maxHp).toBe(r1.brain.maxHp);
      expect(s.attack.damage).toBe(r1.attack.damage);
    }
  });

  it('a velocidade ainda escala: rodada 2 = x1,03 e rodada 30 = teto x1,4', () => {
    expect(scaleFor(2, BASE, DIFFICULTY).ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.03);
    expect(scaleFor(30, BASE, DIFFICULTY).ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.4);
  });
});

describe('scaleFor: velocidade por rodada (DIF-06)', () => {
  it('rodada 1: velocidade sem mudança', () => {
    const scaled = scaleFor(1, BASE, DIFFICULTY);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1);
  });

  it('rodada 15: teto de x1.4', () => {
    const scaled = scaleFor(15, BASE, DIFFICULTY);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.4);
  });

  it('rodada 30: continua no teto de x1.4', () => {
    const scaled = scaleFor(30, BASE, DIFFICULTY);
    expect(scaled.ai.chaseSpeed).toBeCloseTo(ENEMY_AI.chaseSpeed * 1.4);
  });

  it('só chaseSpeed muda; os outros campos da IA ficam iguais', () => {
    const scaled = scaleFor(15, BASE, DIFFICULTY);
    expect(scaled.ai.holdRange).toBe(ENEMY_AI.holdRange);
    expect(scaled.ai.farRange).toBe(ENEMY_AI.farRange);
    expect(scaled.ai.farSpeedMult).toBe(ENEMY_AI.farSpeedMult);
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
