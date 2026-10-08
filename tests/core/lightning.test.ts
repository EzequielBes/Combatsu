import { describe, expect, it } from 'vitest';
import { lightningBolts } from '../../src/core/lightning';

const ORIGIN = { x: 101, y: 53 }; // origem com coordenadas ímpares de propósito: só o deslocamento precisa ser par
const DIR = { x: 1, y: 0 };
const SEEDS = Array.from({ length: 1000 }, (_, i) => i);

function segmentSum(vertices: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < vertices.length; i++) {
    total += Math.hypot(vertices[i].x - vertices[i - 1].x, vertices[i].y - vertices[i - 1].y);
  }
  return total;
}

describe('KOK-18: 1000 seeds sempre devolvem entre 5 e 8 raios', () => {
  it('seeds 0..999', () => {
    for (const seed of SEEDS) {
      const n = lightningBolts(seed, ORIGIN, DIR).length;
      expect(n, `seed ${seed}`).toBeGreaterThanOrEqual(5);
      expect(n, `seed ${seed}`).toBeLessThanOrEqual(8);
    }
  });
});

describe('KOK-33: para 1000 seeds, a soma dos segmentos de cada raio fica entre 40 e 110 px', () => {
  it('seeds 0..999', () => {
    for (const seed of SEEDS) {
      for (const bolt of lightningBolts(seed, ORIGIN, DIR)) {
        const total = segmentSum(bolt.vertices);
        expect(total, `seed ${seed}`).toBeGreaterThanOrEqual(40);
        expect(total, `seed ${seed}`).toBeLessThanOrEqual(110);
      }
    }
  });
});

describe('KOK-19, TFX-02: para 1000 seeds, todo vértice fica em deslocamento inteiro par da origem', () => {
  it('seeds 0..999', () => {
    // Junta os vértices fora da regra e confere uma vez: milhões de `expect` levavam o teste a ~4 s e ele estourava
    // o limite de 5 s com o gate em paralelo. O predicado é o mesmo, e a falha lista os vértices culpados.
    const bad: { seed: number; dx: number; dy: number }[] = [];
    let checked = 0;
    for (const seed of SEEDS)
      for (const bolt of lightningBolts(seed, ORIGIN, DIR)) {
        for (const v of bolt.vertices) {
          const dx = v.x - ORIGIN.x;
          const dy = v.y - ORIGIN.y;
          checked++;
          // `%` pode devolver -0 para um par negativo (ex.: -6 % 2 === -0); -0 também é par, então compara com `===`.
          const ok = Number.isInteger(dx) && Number.isInteger(dy) && dx % 2 === 0 && dy % 2 === 0;
          if (!ok && bad.length < 20) bad.push({ seed, dx, dy });
        }
      }
    expect(checked).toBeGreaterThan(SEEDS.length);
    expect(bad).toEqual([]);
  });
});

describe('KOK-20: a mesma seed, origem e direção sempre devolvem os mesmos raios', () => {
  it('duas chamadas com os mesmos parâmetros são idênticas', () => {
    const a = lightningBolts(42, ORIGIN, DIR);
    const b = lightningBolts(42, ORIGIN, DIR);
    expect(b).toEqual(a);
  });

  it('seeds diferentes tendem a devolver raios diferentes', () => {
    const a = lightningBolts(1, ORIGIN, DIR);
    const b = lightningBolts(2, ORIGIN, DIR);
    expect(b).not.toEqual(a);
  });
});
