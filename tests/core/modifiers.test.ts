import { describe, expect, it } from 'vitest';
import { Modifiers } from '../../src/core/modifiers';
import { SHOP_CATALOG } from '../../src/data/shop';

const entry = (id: string) => SHOP_CATALOG.find((e) => e.id === id)!;

describe('Modifiers: níveis iniciam em 0 (MOD-01)', () => {
  it('toda run nova começa com todos os níveis 0', () => {
    const m = new Modifiers();
    expect(m.levels).toEqual({ vida: 0, forca: 0, agilidade: 0, ima: 0, sorte: 0 });
  });
});

describe('Modifiers: teto de nível (MOD-02, MOD-03)', () => {
  it('vida sobe até 5 (dentro do teto) e trava em 5 (max+1 recusado, L-010)', () => {
    const m = new Modifiers();
    for (let i = 0; i < 5; i++) expect(m.apply('vida')).toBe(true);
    expect(m.level('vida')).toBe(5);
    expect(m.apply('vida')).toBe(false); // 6ª chamada = max + 1
    expect(m.level('vida')).toBe(5);
  });

  it('agilidade sobe até 3 e trava em 3 (max+1 recusado, L-010)', () => {
    const m = new Modifiers();
    for (let i = 0; i < 3; i++) expect(m.apply('agilidade')).toBe(true);
    expect(m.level('agilidade')).toBe(3);
    expect(m.apply('agilidade')).toBe(false);
    expect(m.level('agilidade')).toBe(3);
  });

  it('canLevel é true abaixo do teto e false no teto', () => {
    const m = new Modifiers();
    for (let i = 0; i < 3; i++) {
      expect(m.canLevel('sorte')).toBe(true);
      m.apply('sorte');
    }
    expect(m.canLevel('sorte')).toBe(false);
  });
});

describe('Modifiers: maxHp (MOD-04)', () => {
  it('nível 0 → 100, nível 1 → 115, nível max (5) → 175', () => {
    const m = new Modifiers();
    expect(m.maxHp).toBe(100);
    m.apply('vida');
    expect(m.maxHp).toBe(115);
    for (let i = 0; i < 4; i++) m.apply('vida');
    expect(m.level('vida')).toBe(5);
    expect(m.maxHp).toBe(175);
  });
});

describe('Modifiers: meleeDamage arredonda meio para cima (MOD-05)', () => {
  it('base 8: nível 0 → 8, nível 1 → 9 (8,8 arredonda para cima)', () => {
    const m = new Modifiers();
    expect(m.meleeDamage(8)).toBe(8);
    m.apply('forca');
    expect(m.meleeDamage(8)).toBe(9);
  });

  it('base 18 no nível máximo (5) → 27', () => {
    const m = new Modifiers();
    for (let i = 0; i < 5; i++) m.apply('forca');
    expect(m.meleeDamage(18)).toBe(27);
  });

  it('base 5 nível 1 → 6 (5,5 arredonda para cima)', () => {
    const m = new Modifiers();
    m.apply('forca');
    expect(m.meleeDamage(5)).toBe(6);
  });
});

describe('Modifiers: runSpeed (MOD-06)', () => {
  it('nível 0 → 220, nível 1 → 237,6, nível máximo (3) → 272,8', () => {
    const m = new Modifiers();
    expect(m.runSpeed).toBe(220);
    m.apply('agilidade');
    expect(m.runSpeed).toBeCloseTo(237.6, 6);
    m.apply('agilidade');
    m.apply('agilidade');
    expect(m.level('agilidade')).toBe(3);
    expect(m.runSpeed).toBeCloseTo(272.8, 6);
  });
});

describe('Modifiers: magnetRange (MOD-07)', () => {
  it('nível 0 → 72, nível 1 → 93,6, nível máximo (3) → 136,8', () => {
    const m = new Modifiers();
    expect(m.magnetRange).toBe(72);
    m.apply('ima');
    expect(m.magnetRange).toBeCloseTo(93.6, 6);
    m.apply('ima');
    m.apply('ima');
    expect(m.level('ima')).toBe(3);
    expect(m.magnetRange).toBeCloseTo(136.8, 6);
  });
});

describe('Modifiers: healChance (MOD-08, MOD-12 é do debug/Loot, fora daqui)', () => {
  it('nível 0 → 0,10, nível 1 → 0,13, nível máximo (3) → 0,19', () => {
    const m = new Modifiers();
    expect(m.healChance).toBeCloseTo(0.1, 6);
    m.apply('sorte');
    expect(m.healChance).toBeCloseTo(0.13, 6);
    m.apply('sorte');
    m.apply('sorte');
    expect(m.level('sorte')).toBe(3);
    expect(m.healChance).toBeCloseTo(0.19, 6);
  });
});

describe('Modifiers: cost por nível atual (MOD-09)', () => {
  it('vida: 12 no nível 0, 18 no nível 1, 36 no nível 4', () => {
    const m = new Modifiers();
    expect(m.cost(entry('vida'))).toBe(12);
    m.apply('vida');
    expect(m.cost(entry('vida'))).toBe(18);
    m.apply('vida');
    m.apply('vida');
    m.apply('vida');
    expect(m.level('vida')).toBe(4);
    expect(m.cost(entry('vida'))).toBe(36);
  });

  it('forca: 15 no nível 0, 23 no nível 1', () => {
    const m = new Modifiers();
    expect(m.cost(entry('forca'))).toBe(15);
    m.apply('forca');
    expect(m.cost(entry('forca'))).toBe(23);
  });

  it('agilidade: 10 no nível 0, 16 no nível 1', () => {
    const m = new Modifiers();
    expect(m.cost(entry('agilidade'))).toBe(10);
    m.apply('agilidade');
    expect(m.cost(entry('agilidade'))).toBe(16);
  });

  it('ima: 6 no nível 0, 10 no nível 1', () => {
    const m = new Modifiers();
    expect(m.cost(entry('ima'))).toBe(6);
    m.apply('ima');
    expect(m.cost(entry('ima'))).toBe(10);
  });

  it('sorte: 10 no nível 0, 16 no nível 1', () => {
    const m = new Modifiers();
    expect(m.cost(entry('sorte'))).toBe(10);
    m.apply('sorte');
    expect(m.cost(entry('sorte'))).toBe(16);
  });
});

describe('Modifiers: reset zera todos os níveis (MOD-01, MOD-10)', () => {
  it('depois de subir vários níveis, reset volta tudo a 0', () => {
    const m = new Modifiers();
    m.apply('vida');
    m.apply('forca');
    m.apply('agilidade');
    m.apply('ima');
    m.apply('sorte');
    m.reset();
    expect(m.levels).toEqual({ vida: 0, forca: 0, agilidade: 0, ima: 0, sorte: 0 });
    expect(m.maxHp).toBe(100);
  });
});
