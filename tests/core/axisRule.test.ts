import { describe, expect, it } from 'vitest';
import {
  axisAt,
  axisLevel,
  bitePctFor,
  boxCenter,
  killRefundPct,
  maxHpBite,
  resolveBuild,
} from '../../src/core/axisRule';

const ZERO = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };

describe('TRL-01: nível = 1 + pontos', () => {
  it('sem pontos é Nv 1', () => {
    expect(axisLevel(ZERO)).toBe(1);
  });

  it('5 pontos espalhados é Nv 6, o teto', () => {
    expect(axisLevel({ ...ZERO, a: 3, b: 1, f: 1 })).toBe(6);
  });
});

describe('TRL-02: pontos inválidos lançam RangeError', () => {
  it('4 pontos num eixo', () => {
    expect(() => axisLevel({ ...ZERO, a: 4 })).toThrow(RangeError);
  });

  it('ponto negativo ou fracionado', () => {
    expect(() => axisLevel({ ...ZERO, a: -1 })).toThrow(RangeError);
    expect(() => axisLevel({ ...ZERO, a: 1.5 })).toThrow(RangeError);
  });

  it('6 pontos somados (acima do teto de 5)', () => {
    expect(() => axisLevel({ ...ZERO, a: 3, b: 3 })).toThrow(RangeError);
  });
});

describe('TRL-03 e TRL-04: ramo no Nv 2, Despertar no Nv 5', () => {
  it('ramo no Nv 1 lança RangeError', () => {
    expect(() => resolveBuild({ axes: ZERO, branch: 'x' })).toThrow(RangeError);
  });

  it('Nv 2 com ramo: ramo vale, sem Despertar', () => {
    expect(resolveBuild({ axes: { ...ZERO, a: 1 }, branch: 'x' })).toEqual({ level: 2, branch: 'x', awakened: false });
  });

  it('Nv 4 com ramo ainda não desperta; Nv 5 desperta', () => {
    expect(resolveBuild({ axes: { ...ZERO, a: 3 }, branch: 'x' }).awakened).toBe(false);
    expect(resolveBuild({ axes: { ...ZERO, a: 3, b: 1 }, branch: 'x' }).awakened).toBe(true);
  });

  it('Nv 6 sem ramo escolhido não desperta', () => {
    expect(resolveBuild({ axes: { ...ZERO, a: 3, b: 2 }, branch: null })).toEqual({
      level: 6,
      branch: null,
      awakened: false,
    });
  });
});

describe('TRL-05: componente proporcional', () => {
  it('comum toma 4% arredondado; chefe toma no máximo 1%', () => {
    expect(maxHpBite(60, 'enemy')).toBe(2); // 2,4
    expect(maxHpBite(100, 'enemy')).toBe(4);
    expect(maxHpBite(800, 'boss')).toBe(8); // 4% pedido, 1% no chefe
    expect(maxHpBite(800, 'boss', 0.005)).toBe(4); // abaixo do teto vale o pedido
  });

  it('bitePctFor dá 4% e 1%', () => {
    expect(bitePctFor('enemy')).toBe(0.04);
    expect(bitePctFor('boss')).toBe(0.01);
  });
});

describe('ajudantes', () => {
  it('axisAt lê a tabela pelos pontos', () => {
    expect(axisAt([10, 20, 30, 40], 0)).toBe(10);
    expect(axisAt([10, 20, 30, 40], 3)).toBe(40);
  });

  it('axisAt com eixo faltando ou fora da tabela lança RangeError (não vira NaN)', () => {
    expect(() => axisAt([10, 20, 30, 40], undefined as unknown as number)).toThrow(RangeError);
    expect(() => axisAt([10, 20, 30, 40], 4)).toThrow(RangeError);
    expect(() => axisAt([10, 20, 30, 40], -1)).toThrow(RangeError);
  });

  it('boxCenter', () => {
    expect(boxCenter({ x: 10, y: 20, width: 20, height: 40 })).toEqual({ x: 20, y: 40 });
  });
});

describe('TRL-06: Recarga no 3º ponto devolve 30% no abate', () => {
  it('só com o eixo no teto', () => {
    expect(killRefundPct(3)).toBe(0.3);
    expect(killRefundPct(2)).toBe(0);
    expect(killRefundPct(0)).toBe(0);
  });
});
