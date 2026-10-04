import { describe, expect, it } from 'vitest';
import {
  headLeftCol,
  isOpaque,
  isSingleComponent,
  thighShinHeights,
  topRowOf,
  touchesBottom,
} from '../../src/core/frameInvariants';

describe('isOpaque', () => {
  const grid = ['.k.', 'k..'];
  it('é verdadeiro num texel pintado', () => {
    expect(isOpaque(grid, 1, 0)).toBe(true);
    expect(isOpaque(grid, 0, 1)).toBe(true);
  });
  it('é falso num texel transparente', () => {
    expect(isOpaque(grid, 0, 0)).toBe(false);
    expect(isOpaque(grid, 2, 1)).toBe(false);
  });
  it('é falso fora da grade', () => {
    expect(isOpaque(grid, -1, 0)).toBe(false);
    expect(isOpaque(grid, 3, 0)).toBe(false);
    expect(isOpaque(grid, 0, -1)).toBe(false);
    expect(isOpaque(grid, 0, 2)).toBe(false);
  });
});

describe('isSingleComponent', () => {
  it('uma mancha contínua é um componente só', () => {
    expect(isSingleComponent(['kk.', '.kk', '..k'])).toBe(true);
  });
  it('diagonal conta como conectado (8-vizinhança)', () => {
    expect(isSingleComponent(['k.', '.k'])).toBe(true);
    expect(isSingleComponent(['..k', '.k.', 'k..'])).toBe(true);
  });
  it('dois blocos separados por uma coluna vazia são dois componentes', () => {
    expect(isSingleComponent(['k.k', 'k.k'])).toBe(false);
  });
  it('um texel solto a 2 de distância quebra o componente', () => {
    expect(isSingleComponent(['kk...', 'kk..k'])).toBe(false);
  });
  it('grade sem nenhum texel opaco não é um componente', () => {
    expect(isSingleComponent(['...', '...'])).toBe(false);
  });
  it('um único texel é um componente', () => {
    expect(isSingleComponent(['...', '.k.'])).toBe(true);
  });
});

describe('touchesBottom', () => {
  it('é verdadeiro com texel na última linha', () => {
    expect(touchesBottom(['...', '.k.'])).toBe(true);
  });
  it('é falso quando só há texel acima da última linha', () => {
    expect(touchesBottom(['.k.', '...'])).toBe(false);
  });
});

describe('headLeftCol', () => {
  const grid = ['.....', '..H..', '.jh.k', 'kk...'];
  it('devolve a menor coluna com cor de cabelo, ignorando as outras cores', () => {
    expect(headLeftCol(grid, ['h', 'H', 'j'])).toBe(1);
  });
  it('respeita o conjunto de chaves passado', () => {
    expect(headLeftCol(grid, ['H'])).toBe(2);
    expect(headLeftCol(grid, ['h'])).toBe(2);
  });
  it('devolve null sem nenhum texel de cabelo', () => {
    expect(headLeftCol(['kk', '..'], ['h', 'H', 'j'])).toBeNull();
  });
});

describe('topRowOf', () => {
  const grid = ['.....', '.....', '..H..', '.jh.k', 'kk...'];
  it('devolve a linha mais alta com alguma das chaves', () => {
    expect(topRowOf(grid, ['h', 'H', 'j'])).toBe(2);
    expect(topRowOf(grid, ['j'])).toBe(3);
    expect(topRowOf(grid, ['k'])).toBe(3);
  });
  it('devolve null se nenhuma chave aparece', () => {
    expect(topRowOf(grid, ['z'])).toBeNull();
  });
});

describe('thighShinHeights', () => {
  // Perna horizontal: a coxa (coluna 1) tem 5 linhas opacas; a canela (coluna 4) tem 4.
  const leg = ['.kkkk.', '.ssNN.', '.NNnn.', '.nnkk.', '.kk...'];
  it('mede a altura opaca da coluna da coxa e da coluna da canela dentro das linhas da perna', () => {
    expect(thighShinHeights(leg, { top: 0, bottom: 4 }, 1, 4)).toEqual({ thigh: 5, shin: 4 });
  });
  it('só conta as linhas pedidas', () => {
    expect(thighShinHeights(leg, { top: 0, bottom: 3 }, 1, 4)).toEqual({ thigh: 4, shin: 4 });
  });
  it('coluna vazia mede 0', () => {
    expect(thighShinHeights(leg, { top: 0, bottom: 4 }, 5, 0)).toEqual({ thigh: 0, shin: 0 });
  });
  it('perna reta tem coxa e canela iguais', () => {
    const flat = ['kkkk', 'ssNN', 'nnkk'];
    const h = thighShinHeights(flat, { top: 0, bottom: 2 }, 0, 3);
    expect(h.thigh - h.shin).toBe(0);
  });
});
