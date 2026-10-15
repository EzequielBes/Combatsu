import { describe, expect, it } from 'vitest';
import { evolve, recipeReady } from '../../src/core/evolution';
import { Loadout } from '../../src/core/loadout';
import { RECIPES } from '../../src/data/evolutions';
import { equipRed } from './redLevel';

const ROXO = RECIPES[0];

describe('receita do Vazio Roxo (EVO-01, EVO-02)', () => {
  it('pronta só com Azul e Vermelho os dois no nível 3', () => {
    const lo = new Loadout();
    lo.equip(0, 'azul', 3);
    equipRed(lo, 1, 3);
    expect(recipeReady(ROXO, lo)).toBe(true);
  });

  it('nível 2 em qualquer uma das duas: não está pronta', () => {
    const a = new Loadout();
    a.equip(0, 'azul', 2);
    equipRed(a, 1, 3);
    expect(recipeReady(ROXO, a)).toBe(false);
    const b = new Loadout();
    b.equip(0, 'azul', 3);
    equipRed(b, 1, 2);
    expect(recipeReady(ROXO, b)).toBe(false);
  });

  it('faltando uma das duas: não está pronta', () => {
    const lo = new Loadout();
    lo.equip(0, 'azul', 3);
    lo.equip(1, 'corte', 3);
    expect(recipeReady(ROXO, lo)).toBe(false);
  });
});

describe('fusão (EVO-03)', () => {
  it('Azul no slot 1: o Vazio Roxo entra no slot 1 em nível 1 e o slot 2 esvazia', () => {
    const lo = new Loadout();
    lo.equip(0, 'azul', 3);
    equipRed(lo, 1, 3);
    expect(evolve(ROXO, lo)).toBe(true);
    expect(lo.slotsView).toEqual([{ id: 'roxo', level: 1 }, null]);
  });

  it('Azul no slot 2: o Vazio Roxo entra no slot 2 e o slot 1 esvazia', () => {
    const lo = new Loadout();
    equipRed(lo, 0, 3);
    lo.equip(1, 'azul', 3);
    expect(evolve(ROXO, lo)).toBe(true);
    expect(lo.slotsView).toEqual([null, { id: 'roxo', level: 1 }]);
  });

  it('receita não pronta: recusa e não muda nada', () => {
    const lo = new Loadout();
    lo.equip(0, 'azul', 3);
    equipRed(lo, 1, 2);
    expect(evolve(ROXO, lo)).toBe(false);
    expect(lo.slotsView).toEqual([
      { id: 'azul', level: 3 },
      { id: 'vermelho', level: 2 },
    ]);
  });
});
