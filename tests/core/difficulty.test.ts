import { describe, expect, it } from 'vitest';
import { multipliersFor, scaleFor, type DifficultyTuning, type EnemyBase } from '../../src/core/difficulty';
import { DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';

const BASE: EnemyBase = { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK };

/** Tuning com crescimento (o do jogo antes da AD-014): mantém coberta a fórmula de escala e os tetos (DIF-01, DIF-05). */
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

describe('DIFFICULTY real: HP +6% e dano +5% por rodada (ESC-01, AD-025, que revisa a AD-014)', () => {
  it('hpPerRound 0,06, damagePerRound 0,05, tetos 3,0 e 2,5 e velocidade 0,03/1,4 como antes', () => {
    expect(DIFFICULTY).toEqual({
      hpPerRound: 0.06,
      hpCap: 3.0,
      damagePerRound: 0.05,
      damageCap: 2.5,
      speedPerRound: 0.03,
      speedCap: 1.4,
    });
  });

  it.each([
    [1, 60],
    [2, 64],
    [9, 89],
    [11, 96],
    [19, 125],
  ])('o comum nasce na rodada %i com maxHp %i (ESC-01.2)', (round, expected) => {
    expect(scaleFor(round, BASE, DIFFICULTY).brain.maxHp).toBe(expected);
  });

  it('o dano do comum é 12 na rodada 1 e 13 na rodada 2 (ESC-01.2)', () => {
    expect(scaleFor(1, BASE, DIFFICULTY).attack.damage).toBe(12);
    expect(scaleFor(2, BASE, DIFFICULTY).attack.damage).toBe(13);
  });

  it('teto do HP de 3,0: a rodada 34 ainda está abaixo (179), a 35 chega a 180 e depois dela fica em 180', () => {
    expect([34, 35, 36, 100].map((r) => scaleFor(r, BASE, DIFFICULTY).brain.maxHp)).toEqual([179, 180, 180, 180]);
  });

  it('teto do dano de 2,5: a rodada 30 ainda está abaixo (29), a 31 chega a 30 e depois dela fica em 30', () => {
    expect([30, 31, 32, 100].map((r) => scaleFor(r, BASE, DIFFICULTY).attack.damage)).toEqual([29, 30, 30, 30]);
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

describe('scaleFor: tipo do golpe e sequência (DFL-01, HGT-03)', () => {
  it('o golpe base do inimigo é white e a sequência base tem 1 golpe', () => {
    expect(ENEMY_ATTACK.kind).toBe('white');
    expect(ENEMY_AI.hits).toBe(1);
  });

  it('preserva o kind e os hits em qualquer rodada', () => {
    for (const round of [1, 2, 15, 30]) {
      const scaled = scaleFor(round, BASE, DIFFICULTY);
      expect(scaled.attack.kind).toBe('white');
      expect(scaled.ai.hits).toBe(1);
      expect(scaled.ai.commitMs).toBe(ENEMY_AI.commitMs);
      expect(scaled.ai.stringGapMs).toBe(ENEMY_AI.stringGapMs);
    }
  });

  it('preserva valores diferentes do padrão (kind red e 3 golpes)', () => {
    const custom: EnemyBase = { brain: ENEMY, ai: { ...ENEMY_AI, hits: 3 }, attack: { ...ENEMY_ATTACK, kind: 'red' } };
    const scaled = scaleFor(15, custom, DIFFICULTY);
    expect(scaled.attack.kind).toBe('red');
    expect(scaled.ai.hits).toBe(3);
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
