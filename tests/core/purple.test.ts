import { describe, expect, it } from 'vitest';
import { PURPLE, PurpleSphere, purpleGeometry } from '../../src/core/purple';
import { resolveTechStats } from '../../src/core/techStats';

const target = (id: number, x: number, y = 300) => ({ id, x, y, halfW: 10, halfH: 20 });

describe('esfera do Vazio Roxo (EVO-05)', () => {
  it('avança a 180 px/s: 0, 144 e 288 px aos 0, 800 e 1600 ms, para a frente', () => {
    const s = new PurpleSphere(100, 300, 1);
    expect(s.x).toBe(100);
    s.update(800, []);
    expect(s.x).toBeCloseTo(244, 9);
    s.update(800, []);
    expect(s.x).toBeCloseTo(388, 9);
    const back = new PurpleSphere(100, 300, -1);
    back.update(800, []);
    expect(back.x).toBeCloseTo(-44, 9);
  });

  it('vive 1600 ms: viva aos 1599, morta aos 1600, e não toca ninguém depois', () => {
    const s = new PurpleSphere(0, 300, 1);
    s.update(1599, []);
    expect(s.alive).toBe(true);
    s.update(1, []);
    expect(s.alive).toBe(false);
    expect(s.update(16, [target(1, s.x)])).toEqual([]);
    expect(PURPLE.speed).toBe(180);
    expect(PURPLE.lifeMs).toBe(1600);
  });
});

describe('cada alvo uma vez (EVO-06)', () => {
  it('atravessa uma fila e toca cada um exatamente uma vez', () => {
    const s = new PurpleSphere(0, 300, 1);
    const row = [target(1, 60), target(2, 120), target(3, 200)];
    const all: number[] = [];
    while (s.alive) all.push(...s.update(16, row));
    expect(all).toEqual([1, 2, 3]);
  });

  it('alvo fora do raio (acima da esfera) não é tocado; na borda do raio, é', () => {
    const above = new PurpleSphere(100, 300, 1);
    // A borda de baixo da caixa fica 2 px além do raio; na outra, encosta no raio.
    expect(above.update(1, [{ id: 9, x: 100, y: 300 - PURPLE.radius - 20 - 2, halfW: 10, halfH: 20 }])).toEqual([]);
    const edge = new PurpleSphere(100, 300, 1);
    expect(edge.update(1, [{ id: 9, x: 100, y: 300 - PURPLE.radius - 20, halfW: 10, halfH: 20 }])).toEqual([9]);
  });
});

describe('a esfera lê a geometria do stat (TST-02)', () => {
  it('voo, vida e raio vêm da geometria passada; sem ela, os da tabela', () => {
    const geometry = { speed: 100, lifeMs: 500, radius: 10 };
    const s = new PurpleSphere(0, 300, 1, geometry);
    s.update(400, []);
    expect(s.x).toBeCloseTo(40, 9);
    expect(s.traveled).toBeCloseTo(40, 9);
    s.update(100, []);
    expect(s.alive).toBe(false);
    expect(s.traveled).toBeCloseTo(50, 9);
    // Raio 10: a caixa a 12 px de borda do centro fica de fora; com o raio da tabela (36), entra.
    const far = { id: 4, x: 0, y: 300 - 10 - 20 - 2, halfW: 10, halfH: 20 };
    expect(new PurpleSphere(0, 300, 1, geometry).update(1, [far])).toEqual([]);
    expect(new PurpleSphere(0, 300, 1).update(1, [far])).toEqual([4]);
  });

  it('purpleGeometry: o bloco purple do stat do Roxo; outra técnica cai na tabela', () => {
    const at = (id: 'roxo' | 'azul') => resolveTechStats({ id, level: 2, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    expect(purpleGeometry(at('roxo'))).toBe(PURPLE);
    const own = { ...PURPLE };
    expect(purpleGeometry({ ...at('roxo'), purple: own })).toBe(own);
    expect(purpleGeometry(at('azul'))).toBe(PURPLE);
  });
});
