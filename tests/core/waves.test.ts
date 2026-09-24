import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { WaveSpawner, waveSize, requireSpawnPoints, type WaveTuning } from '../../src/core/waves';

const WAVE: WaveTuning = { base: 3, max: 12, maxAlive: 4, pointGapMs: 800 };
/** seed 7: rng.int(0, P-1) = 0 para P = 2 e P = 3 (checado fora do teste). */
const SEED = 7;

describe('waveSize: tamanho da onda por rodada (WAVE-01)', () => {
  it.each([
    [1, 3],
    [5, 7],
    [10, 12],
    [11, 12],
    [20, 12],
  ])('rodada %i => %i inimigos', (round, expected) => {
    expect(waveSize(round, WAVE)).toBe(expected);
  });
});

describe('requireSpawnPoints: level sem ponto E (edge case)', () => {
  it('lança com o nome do level na mensagem', () => {
    expect(() => requireSpawnPoints({ enemies: [] }, 'level1')).toThrow(/level1/);
  });

  it('não lança quando há ao menos um ponto', () => {
    expect(() => requireSpawnPoints({ enemies: [{}] }, 'level1')).not.toThrow();
  });
});

describe('WaveSpawner: rodízio de pontos (WAVE-02)', () => {
  it('k-ésimo spawn sai no ponto (s + k) mod P, com s = rng.int(0, P - 1)', () => {
    const rng = new Rng(SEED);
    expect(rng.int(0, 2)).toBe(0); // confirma s = 0 para esta seed com P = 3
    const spawner = new WaveSpawner(1, 3, new Rng(SEED), WAVE); // round 1 => 3 inimigos, P = 3
    const orders = spawner.update(0);
    expect(orders.map((o) => o.point)).toEqual([0, 1, 2]);
    expect(orders.map((o) => o.k)).toEqual([0, 1, 2]);
  });
});

describe('WaveSpawner: teto de vivos (WAVE-03)', () => {
  it('com 4 vivos, nenhum spawn sai mesmo passados 800 ms', () => {
    const spawner = new WaveSpawner(10, 1, new Rng(SEED), WAVE); // round 10 => 12 inimigos, P = 1
    spawner.update(0); // k0 em t=0
    spawner.update(800); // k1 em t=800
    spawner.update(800); // k2 em t=1600
    spawner.update(800); // k3 em t=2400 -> alive = 4
    expect(spawner.alive).toBe(4);
    const orders = spawner.update(800); // t=3200, gap satisfeito, mas 4 vivos
    expect(orders).toEqual([]);
    expect(spawner.alive).toBe(4);
  });
});

describe('WaveSpawner: fila com menos de 4 vivos e 800 ms (WAVE-04)', () => {
  it('799 ms não libera o próximo spawn no mesmo ponto; 800 ms libera', () => {
    const spawner = new WaveSpawner(1, 1, new Rng(SEED), WAVE); // round 1 => 3 inimigos, P = 1
    const first = spawner.update(0);
    expect(first).toEqual([{ k: 0, point: 0, atMs: 0 }]);
    const before = spawner.update(799);
    expect(before).toEqual([]);
    const after = spawner.update(1); // total 800 ms desde o spawn do ponto 0
    expect(after).toEqual([{ k: 1, point: 0, atMs: 800 }]);
  });

  it('libera o spawn assim que um abate abre vaga e o gap já foi cumprido', () => {
    const spawner = new WaveSpawner(10, 1, new Rng(SEED), WAVE); // P = 1, 12 inimigos
    spawner.update(0); // k0 t=0
    spawner.update(800); // k1 t=800
    spawner.update(800); // k2 t=1600
    spawner.update(800); // k3 t=2400, alive = 4
    expect(spawner.update(800)).toEqual([]); // t=3200, sem vaga
    spawner.enemyDied(1001); // abre vaga: alive = 3
    const orders = spawner.update(0); // gap (3200 - 2400 = 800) já cumprido
    expect(orders).toEqual([{ k: 4, point: 0, atMs: 3200 }]);
  });
});

describe('WaveSpawner: P = 1, todos no mesmo ponto espaçados de 800 ms (edge)', () => {
  it('cada spawn sai 800 ms depois do anterior, todos no ponto 0', () => {
    const spawner = new WaveSpawner(1, 1, new Rng(SEED), WAVE); // 3 inimigos
    const o0 = spawner.update(0);
    const o1 = spawner.update(800);
    const o2 = spawner.update(800);
    expect(o0).toEqual([{ k: 0, point: 0, atMs: 0 }]);
    expect(o1).toEqual([{ k: 1, point: 0, atMs: 800 }]);
    expect(o2).toEqual([{ k: 2, point: 0, atMs: 1600 }]);
  });
});

describe('WaveSpawner: dedupe de abate (WAVE-06)', () => {
  it('o mesmo id morto duas vezes conta 1 em kills e 1 em remaining; o segundo enemyDied devolve false', () => {
    const spawner = new WaveSpawner(1, 1, new Rng(SEED), WAVE); // 3 inimigos
    expect(spawner.enemyDied(42)).toBe(true);
    expect(spawner.kills).toBe(1);
    expect(spawner.remaining).toBe(2);
    expect(spawner.enemyDied(42)).toBe(false);
    expect(spawner.kills).toBe(1);
    expect(spawner.remaining).toBe(2);
  });
});

describe('WaveSpawner: duas mortes diferentes antes do mesmo update (WAVE-08)', () => {
  it('kills soma 2 e remaining cai 2', () => {
    const spawner = new WaveSpawner(1, 1, new Rng(SEED), WAVE); // 3 inimigos
    expect(spawner.enemyDied(1)).toBe(true);
    expect(spawner.enemyDied(2)).toBe(true);
    expect(spawner.kills).toBe(2);
    expect(spawner.remaining).toBe(1);
  });
});

describe('WaveSpawner: mesma seed e mesma sequência de mortes (WAVE-07)', () => {
  it('duas instâncias produzem os mesmos pares (atMs, point)', () => {
    const a = new WaveSpawner(5, 3, new Rng(SEED), WAVE); // round 5 => 7 inimigos, P = 3
    const b = new WaveSpawner(5, 3, new Rng(SEED), WAVE);

    const stepsAndDeaths: Array<{ dt: number; deaths: number[] }> = [
      { dt: 0, deaths: [] },
      { dt: 800, deaths: [1] },
      { dt: 800, deaths: [2, 3] },
      { dt: 800, deaths: [] },
      { dt: 800, deaths: [] },
    ];

    for (const { dt, deaths } of stepsAndDeaths) {
      const ordersA = a.update(dt);
      const ordersB = b.update(dt);
      expect(ordersA.map((o) => [o.atMs, o.point])).toEqual(ordersB.map((o) => [o.atMs, o.point]));
      for (const id of deaths) {
        a.enemyDied(id);
        b.enemyDied(id);
      }
    }
  });
});
