import { describe, expect, it } from 'vitest';
import { Arsenal } from '../../src/core/arsenal';
import { Perks } from '../../src/core/build';
import { NO_STRIKE_MODS, statSheet, traitsOf, type StatInput } from '../../src/core/statSheet';
import { vowEffects } from '../../src/core/vows';
import { MOVES } from '../../src/data/moves';
import type { PerkId } from '../../src/data/perks';

function perksWith(id: PerkId): Perks {
  const perks = new Perks();
  perks.add(id);
  return perks;
}

const base = (over: Partial<StatInput> = {}): StatInput => ({
  perks: new Perks(),
  arsenal: new Arsenal(),
  vows: vowEffects([], { kills: 0 }),
  baseMaxHp: 100,
  ...over,
});

const STRIKES = [MOVES.jab, MOVES.cotovelada, MOVES.contra];

describe('CRP-02: Impacto na folha', () => {
  it('Impacto 0 (ou ausente) deixa a grade da F29 igual, com toBe', () => {
    const plain = statSheet(base());
    const zero = statSheet(base({ impact: 0 }));
    for (const move of STRIKES) {
      for (const shadow of [false, true]) {
        expect(zero.meleeMul(traitsOf(move, shadow))).toBe(plain.meleeMul(traitsOf(move, shadow)));
      }
    }
    expect(zero.maxHp).toBe(plain.maxHp);
    expect(zero.relicTechMul).toBe(plain.relicTechMul);
    expect(zero.vowTechMul).toBe(plain.vowTechMul);
    expect(zero.costMul).toBe(plain.costMul);
    expect(zero.damageTakenMul).toBe(plain.damageTakenMul);
  });

  it('Impacto 1, 2 e 3 multiplicam o meleeMul por 1,1, 1,2 e 1,3', () => {
    const plain = statSheet(base());
    const traits = traitsOf(MOVES.cotovelada, false);
    expect(statSheet(base({ impact: 1 })).meleeMul(traits)).toBeCloseTo(plain.meleeMul(traits) * 1.1, 10);
    expect(statSheet(base({ impact: 2 })).meleeMul(traits)).toBeCloseTo(plain.meleeMul(traits) * 1.2, 10);
    expect(statSheet(base({ impact: 3 })).meleeMul(traits)).toBeCloseTo(plain.meleeMul(traits) * 1.3, 10);
  });

  it('o Impacto vale por cima das passivas, não no lugar delas', () => {
    const perks = perksWith('punhoPesado');
    const without = statSheet(base({ perks }));
    const traits = traitsOf(MOVES.cotovelada, false);
    expect(without.meleeMul(traits)).toBeGreaterThan(1);
    expect(statSheet(base({ perks, impact: 3 })).meleeMul(traits)).toBeCloseTo(without.meleeMul(traits) * 1.3, 10);
  });

  it('só o meleeMul muda: a vida, as técnicas e o dano sofrido ficam', () => {
    const plain = statSheet(base());
    const three = statSheet(base({ impact: 3 }));
    expect(three.maxHp).toBe(plain.maxHp);
    expect(three.relicTechMul).toBe(plain.relicTechMul);
    expect(three.vowTechMul).toBe(plain.vowTechMul);
    expect(three.costMul).toBe(plain.costMul);
    expect(three.damageTakenMul).toBe(plain.damageTakenMul);
  });

  it('Impacto fora de 0 a 3 lança RangeError', () => {
    expect(() => statSheet(base({ impact: 4 }))).toThrow(RangeError);
    expect(() => statSheet(base({ impact: -1 }))).toThrow(RangeError);
  });
});

describe('CRP-15: StrikeMods padrão', () => {
  it('não muda o golpe: dano e força 1, alcance 0, recovery 1 e nenhuma marca', () => {
    expect(NO_STRIKE_MODS).toEqual({ damage: 1, force: 1, reachPx: 0, recoveryMul: 1, marks: {} });
  });

  it('é imutável, para ninguém mudar o padrão dos outros golpes', () => {
    expect(Object.isFrozen(NO_STRIKE_MODS)).toBe(true);
    expect(Object.isFrozen(NO_STRIKE_MODS.marks)).toBe(true);
  });
});
