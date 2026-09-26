import { describe, expect, it } from 'vitest';
import { DivergentState } from '../../src/core/divergent';

describe('DIV-03: o 1º impacto registra o alvo', () => {
  it('firstImpact grava o alvo do 1º impacto', () => {
    const state = new DivergentState();
    expect(state.targetId).toBe(null);
    state.firstImpact(7);
    expect(state.targetId).toBe(7);
  });
});

describe('DIV-04: 2º impacto exatamente aos 200 ms de jogo desde o 1º impacto (L-010)', () => {
  it('aos 199 ms ainda não houve 2º impacto', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    expect(state.update(199)).toBe(null);
  });

  it('ao completar 200 ms, o 2º impacto acontece nesse frame e devolve o id do alvo', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    state.update(199);
    expect(state.update(1)).toBe(1);
  });

  it('um salto de dt que cruza 200 ms de uma vez também dispara o 2º impacto', () => {
    const state = new DivergentState();
    state.firstImpact(3);
    expect(state.update(250)).toBe(3);
  });

  it('o 2º impacto só acontece uma vez por 1º impacto', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    state.update(200);
    expect(state.update(1000)).toBe(null);
  });
});

describe('DIV-05: sem toque em ninguém durante o release, nenhum 2º impacto acontece', () => {
  it('sem firstImpact, update nunca devolve um alvo', () => {
    const state = new DivergentState();
    expect(state.update(500)).toBe(null);
    expect(state.targetId).toBe(null);
  });
});

describe('DIV-06: alvo morto pelo 1º impacto não recebe o 2º', () => {
  it('targetDied antes dos 200 ms cancela o 2º impacto', () => {
    const state = new DivergentState();
    state.firstImpact(9);
    state.targetDied();
    expect(state.update(200)).toBe(null);
  });
});

describe('DIV-08: raio do anel de aproximação (32 × (1 − t/200), ±2 px)', () => {
  it('no 1º impacto (t=0) o raio é 32 px', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    expect(state.ringRadius()).toBeCloseTo(32, 1);
  });

  it('na metade do atraso (t=100 ms) o raio é 16 px', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    state.update(100);
    expect(state.ringRadius()).toBeCloseTo(16, 1);
  });

  it('ao completar 200 ms o raio chega a 0 px', () => {
    const state = new DivergentState();
    state.firstImpact(1);
    state.update(200);
    expect(state.ringRadius()).toBeCloseTo(0, 1);
  });

  it('sem 1º impacto o raio é 0', () => {
    const state = new DivergentState();
    expect(state.ringRadius()).toBe(0);
  });
});
