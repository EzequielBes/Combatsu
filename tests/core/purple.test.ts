import { describe, expect, it } from 'vitest';
import { PURPLE, PurpleSphere } from '../../src/core/purple';

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
