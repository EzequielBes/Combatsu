import { describe, expect, it } from 'vitest';
import { EnemyGuard, type GuardTrigger } from '../../src/core/enemyGuard';
import { Rng } from '../../src/core/rng';

const NEAR: GuardTrigger = { round: 1, idle: true, playerFacingEnemy: true, distancePx: 40 };

/** Sorteio que grava a probabilidade pedida e responde `answer`. */
function fakeRoll(answer: boolean): { chance: (p: number) => boolean; asked: number[] } {
  const asked: number[] = [];
  return {
    asked,
    chance: (p: number) => {
      asked.push(p);
      return answer;
    },
  };
}

const guardUp = (): EnemyGuard => {
  const g = new EnemyGuard(fakeRoll(true));
  expect(g.onPlayerLightMove(NEAR)).toBe(true);
  return g;
};

describe('EBL-01: chance por rodada = min(0.1 + 0.03 × (rodada − 1), 0.4)', () => {
  it('rodada 1 → 0.1, rodada 11 → 0.4, rodada 20 → 0.4 (teto)', () => {
    expect(EnemyGuard.chanceFor(1)).toBeCloseTo(0.1, 10);
    expect(EnemyGuard.chanceFor(11)).toBeCloseTo(0.4, 10);
    expect(EnemyGuard.chanceFor(20)).toBe(0.4);
  });

  it('rodada 10 ainda está abaixo do teto (0.37) e a 11 chega nele', () => {
    expect(EnemyGuard.chanceFor(10)).toBeCloseTo(0.37, 10);
    expect(EnemyGuard.chanceFor(10)).toBeLessThan(EnemyGuard.chanceFor(11));
  });

  it('sorteia com a chance da rodada', () => {
    const roll = fakeRoll(false);
    const g = new EnemyGuard(roll);
    g.onPlayerLightMove({ ...NEAR, round: 1 });
    g.onPlayerLightMove({ ...NEAR, round: 20 });
    expect(roll.asked[0]).toBeCloseTo(0.1, 10);
    expect(roll.asked[1]).toBe(0.4);
  });

  it('usa o RNG da run: com a mesma seed, sobe a guarda exatamente quando o sorteio cai abaixo da chance', () => {
    for (let seed = 0; seed < 20; seed++) {
      const expected = new Rng(seed).next() < 0.4;
      const g = new EnemyGuard(new Rng(seed));
      expect(g.onPlayerLightMove({ ...NEAR, round: 20 })).toBe(expected);
    }
  });

  it('a guarda dura 600 ms: 599 ainda guarda, 600 acabou', () => {
    const g = guardUp();
    g.update(599);
    expect(g.guarding).toBe(true);
    g.update(1);
    expect(g.guarding).toBe(false);
  });

  it('sorteio que falha não levanta a guarda', () => {
    const g = new EnemyGuard(fakeRoll(false));
    expect(g.onPlayerLightMove(NEAR)).toBe(false);
    expect(g.guarding).toBe(false);
  });

  it('só reage a 60 px ou menos (60 sim, 61 não), sem sortear fora das condições', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.onPlayerLightMove({ ...NEAR, distancePx: 61 })).toBe(false);
    expect(roll.asked).toEqual([]);
    expect(g.onPlayerLightMove({ ...NEAR, distancePx: 60 })).toBe(true);
  });

  it('só em `idle` e com o jogador virado para ele', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.onPlayerLightMove({ ...NEAR, idle: false })).toBe(false);
    expect(g.onPlayerLightMove({ ...NEAR, playerFacingEnemy: false })).toBe(false);
    expect(roll.asked).toEqual([]);
  });
});

describe('EBL-02: leve de frente na guarda', () => {
  it('0 de dano, +8 de estrutura e bloqueado', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(r).toEqual({ damage: 0, structureGain: 8, blocked: true, guardEnded: false });
    expect(g.guarding).toBe(true);
  });

  it('leve pelas costas passa com o dano e a estrutura normais', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: false, structureGain: 4 });
    expect(r).toEqual({ damage: 6, structureGain: 4, blocked: false, guardEnded: false });
  });

  it('sem guarda o leve causa dano normal', () => {
    const g = new EnemyGuard(fakeRoll(false));
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(r).toEqual({ damage: 6, structureGain: 4, blocked: false, guardEnded: false });
  });
});

describe('EBL-03, EBL-05: forte de frente na guarda', () => {
  it('dano cheio, estrutura normal e a guarda acaba no mesmo golpe', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 12, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(r).toEqual({ damage: 12, structureGain: 10, blocked: false, guardEnded: true });
    expect(g.guarding).toBe(false);
  });
});

describe('EBL-04: chuteCarregado na guarda', () => {
  it('dano cheio (24) e +40 de estrutura, sem ser bloqueado', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 24, strength: 'heavy', unblockable: true, fromFront: true, structureGain: 40 });
    expect(r).toEqual({ damage: 24, structureGain: 40, blocked: false, guardEnded: true });
  });
});
