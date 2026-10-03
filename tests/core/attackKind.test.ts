import { describe, expect, it } from 'vitest';
import {
  attackKindFor,
  hitFieldsFor,
  KIND_COLOR,
  parseAttackKind,
  parseStringLength,
  type AttackKind,
} from '../../src/core/attackKind';
import { ENEMY_VARIANTS } from '../../src/core/enemyVariant';
import { PALETTE } from '../../src/game/art/palette';

describe('attackKindFor (HGT-01, HGT-02, HGT-03)', () => {
  it('porrete dá red nas 3 aparências, inclusive rastejante (HGT-01)', () => {
    for (const variant of ENEMY_VARIANTS) {
      expect(attackKindFor({ variant, weapon: 'cursedClub' })).toBe('red');
    }
  });

  it('rastejante sem arma e com faca dá low (HGT-02)', () => {
    expect(attackKindFor({ variant: 'rastejante', weapon: null })).toBe('low');
    expect(attackKindFor({ variant: 'rastejante', weapon: 'cursedKnife' })).toBe('low');
  });

  it('corcunda e bruto sem arma e com faca dão white (HGT-03)', () => {
    for (const variant of ['corcunda', 'bruto'] as const) {
      expect(attackKindFor({ variant, weapon: null })).toBe('white');
      expect(attackKindFor({ variant, weapon: 'cursedKnife' })).toBe('white');
    }
  });
});

describe('hitFieldsFor (HGT-04, HGT-05, HGT-06)', () => {
  it('white = high, sem unblockable verdadeiro (HGT-04)', () => {
    const f = hitFieldsFor('white');
    expect(f.height).toBe('high');
    expect(f.unblockable).not.toBe(true);
  });

  it('red = high e unblockable verdadeiro (HGT-05)', () => {
    expect(hitFieldsFor('red')).toEqual({ height: 'high', unblockable: true });
  });

  it('low = low e unblockable verdadeiro (HGT-06)', () => {
    expect(hitFieldsFor('low')).toEqual({ height: 'low', unblockable: true });
  });
});

describe('parseAttackKind (HGT-13, EDG-08)', () => {
  it('aceita só white, red e low', () => {
    expect(parseAttackKind('white')).toBe('white');
    expect(parseAttackKind('red')).toBe('red');
    expect(parseAttackKind('low')).toBe('low');
  });

  it('devolve null para null, undefined, vazio, maiúscula e valor de outro vocabulário', () => {
    expect(parseAttackKind(null)).toBeNull();
    expect(parseAttackKind(undefined)).toBeNull();
    expect(parseAttackKind('')).toBeNull();
    expect(parseAttackKind('RED')).toBeNull();
    expect(parseAttackKind('high')).toBeNull();
  });
});

describe('parseStringLength (DFL-14, EDG-09)', () => {
  it('aceita 1, 2, 3 e 4', () => {
    expect(parseStringLength('1')).toBe(1);
    expect(parseStringLength('2')).toBe(2);
    expect(parseStringLength('3')).toBe(3);
    expect(parseStringLength('4')).toBe(4);
  });

  it('devolve null para 0, 5, 2.5, abc, vazio, null e undefined', () => {
    expect(parseStringLength('0')).toBeNull();
    expect(parseStringLength('5')).toBeNull();
    expect(parseStringLength('2.5')).toBeNull();
    expect(parseStringLength('abc')).toBeNull();
    expect(parseStringLength('')).toBeNull();
    expect(parseStringLength(null)).toBeNull();
    expect(parseStringLength(undefined)).toBeNull();
  });
});

describe('KIND_COLOR (CMT-02)', () => {
  it('white = w, red = t, low = A', () => {
    expect(KIND_COLOR).toEqual({ white: 'w', red: 't', low: 'A' });
  });

  it('cada cor aponta para uma chave que existe em PALETTE', () => {
    for (const kind of Object.keys(KIND_COLOR) as AttackKind[]) {
      expect(PALETTE[KIND_COLOR[kind]]).toBeTypeOf('number');
    }
  });
});
