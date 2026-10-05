import { describe, expect, it } from 'vitest';
import {
  WaveSpawner,
  waveSize,
  maxAliveFor,
  requireSpawnPoints,
  isBossRound,
  farthestPoint,
  type WaveTuning,
} from '../../src/core/waves';
import { WAVE } from '../../src/data/tuning';

/** Tuning com valores diferentes do padrão, para pegar constantes fixas no código. */
const ALT: WaveTuning = {
  base: 4,
  perRound: 3,
  max: 10,
  maxAliveBase: 2,
  maxAliveEvery: 3,
  maxAliveCap: 4,
  initialBurst: 2,
  trickleMs: 1000,
  pointGapMs: 500,
};

describe('WAVE: valores de tuning da spec', () => {
  it('bate com a spec (SPN-01..04)', () => {
    expect(WAVE).toEqual({
      base: 6,
      perRound: 2,
      max: 20,
      maxAliveBase: 5,
      maxAliveEvery: 2,
      maxAliveCap: 8,
      initialBurst: 3,
      trickleMs: 1500,
      pointGapMs: 800,
    });
  });
});

describe('waveSize: tamanho da onda por rodada (SPN-01)', () => {
  it.each([
    [1, 6],
    [2, 8],
    [4, 12],
    [8, 20],
    [9, 20],
    [30, 20],
  ])('rodada %i => %i inimigos', (round, expected) => {
    expect(waveSize(round, WAVE)).toBe(expected);
  });

  it('usa base, perRound e max do tuning', () => {
    expect(waveSize(1, ALT)).toBe(4);
    expect(waveSize(2, ALT)).toBe(7);
    expect(waveSize(3, ALT)).toBe(10);
    expect(waveSize(4, ALT)).toBe(10);
  });
});

describe('maxAliveFor: teto de vivos por rodada (SPN-02)', () => {
  it.each([
    [1, 5],
    [2, 5],
    [3, 6],
    [4, 6],
    [7, 8],
    [30, 8],
  ])('rodada %i => %i vivos', (round, expected) => {
    expect(maxAliveFor(round, WAVE)).toBe(expected);
  });

  it('usa base, every e cap do tuning', () => {
    expect(maxAliveFor(1, ALT)).toBe(2);
    expect(maxAliveFor(3, ALT)).toBe(2);
    expect(maxAliveFor(4, ALT)).toBe(3);
    expect(maxAliveFor(7, ALT)).toBe(4);
    expect(maxAliveFor(40, ALT)).toBe(4);
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

describe('WaveSpawner: burst inicial (SPN-03)', () => {
  it('o 1º update libera exatamente 3 ordens na rodada 1, em ordem de k', () => {
    const sp = new WaveSpawner(1, WAVE);
    const orders = sp.update(0);
    expect(orders).toEqual([
      { k: 0, atMs: 0, kind: 'enemy' },
      { k: 1, atMs: 0, kind: 'enemy' },
      { k: 2, atMs: 0, kind: 'enemy' },
    ]);
    expect(sp.alive).toBe(3);
    expect(sp.queued).toBe(3);
  });

  it('o burst só acontece uma vez: o 2º update logo depois não libera nada', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(0);
    expect(sp.update(0)).toEqual([]);
  });

  it('com tuning não padrão, o burst vale min(initialBurst, maxAlive, size)', () => {
    expect(new WaveSpawner(1, ALT).update(0)).toHaveLength(2);
    expect(new WaveSpawner(1, { ...ALT, initialBurst: 9 }).update(0)).toHaveLength(2); // maxAlive 2
    expect(new WaveSpawner(1, { ...ALT, initialBurst: 9, maxAliveBase: 9, maxAliveCap: 9 }).update(0)).toHaveLength(4); // size 4
  });
});

describe('WaveSpawner: gotejamento de 1 a cada 1500 ms (SPN-04)', () => {
  it('1499 ms depois do burst nenhum spawn; 1500 ms libera um', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(0);
    expect(sp.update(1499)).toEqual([]);
    expect(sp.update(1)).toEqual([{ k: 3, atMs: 1500, kind: 'enemy' }]);
  });

  it('conta desde o último spawn: o seguinte sai 1500 ms depois do anterior', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(0);
    sp.update(1500); // k3
    expect(sp.update(1499)).toEqual([]);
    expect(sp.update(1)).toEqual([{ k: 4, atMs: 3000, kind: 'enemy' }]);
  });

  it('o burst conta como último spawn mesmo quando o 1º update tem dt > 0', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(100);
    expect(sp.update(1499)).toEqual([]);
    expect(sp.update(1)).toHaveLength(1);
  });

  it('usa trickleMs do tuning (1000 ms)', () => {
    const sp = new WaveSpawner(1, ALT);
    sp.update(0);
    sp.enemyDied(1); // abre vaga: alive 1 < 2
    expect(sp.update(999)).toEqual([]);
    expect(sp.update(1)).toHaveLength(1);
  });
});

describe('WaveSpawner: teto de vivos (SPN-05)', () => {
  it('com 5 vivos na rodada 1 nada nasce, mesmo passado muito tempo', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(0); // 3
    sp.update(1500); // 4
    sp.update(1500); // 5
    expect(sp.alive).toBe(5);
    expect(sp.update(10000)).toEqual([]);
    expect(sp.alive).toBe(5);
  });

  it('uma morte abre a vaga e o spawn sai no próximo update (gotejamento já cumprido)', () => {
    const sp = new WaveSpawner(1, WAVE);
    sp.update(0);
    sp.update(1500);
    sp.update(1500);
    sp.update(10000);
    sp.enemyDied(1001);
    expect(sp.update(0)).toEqual([{ k: 5, atMs: 13000, kind: 'enemy' }]);
  });

  it('maxAliveOverride vale no lugar de maxAliveFor', () => {
    const sp = new WaveSpawner(1, WAVE, 1);
    expect(sp.update(0)).toHaveLength(1);
    expect(sp.update(5000)).toEqual([]);
    const sp2 = new WaveSpawner(1, WAVE, 6);
    expect(sp2.update(0)).toHaveLength(3);
    sp2.update(1500);
    sp2.update(1500);
    sp2.update(1500);
    expect(sp2.alive).toBe(6);
    expect(sp2.update(1500)).toEqual([]);
  });

  it('maxAliveFor crescente: rodada 3 permite 6 vivos', () => {
    const sp = new WaveSpawner(3, WAVE);
    sp.update(0);
    for (let i = 0; i < 3; i++) sp.update(1500);
    expect(sp.alive).toBe(6);
    expect(sp.update(1500)).toEqual([]);
  });
});

describe('WaveSpawner: fila menor que o burst (EDG-01)', () => {
  it('libera só os da fila', () => {
    const sp = new WaveSpawner(1, { ...WAVE, base: 2 });
    expect(sp.update(0)).toHaveLength(2);
    expect(sp.queued).toBe(0);
  });
});

describe('WaveSpawner: fim da fila (EDG-02)', () => {
  it('depois do último spawn o gotejamento para e a onda só acaba quando todos morrem', () => {
    const sp = new WaveSpawner(1, { ...WAVE, base: 4 });
    expect(sp.update(0)).toHaveLength(3);
    expect(sp.update(1500)).toHaveLength(1); // k3, último
    expect(sp.queued).toBe(0);
    expect(sp.update(100000)).toEqual([]);
    expect(sp.cleared).toBe(false);
    for (const id of [1, 2, 3]) sp.enemyDied(id);
    expect(sp.cleared).toBe(false);
    sp.enemyDied(4);
    expect(sp.cleared).toBe(true);
  });
});

describe('WaveSpawner: dedupe de abate (WAVE-06)', () => {
  it('o mesmo id morto duas vezes conta 1 em kills e 1 em remaining; o segundo enemyDied devolve false', () => {
    const spawner = new WaveSpawner(1, WAVE); // 6 inimigos
    expect(spawner.enemyDied(42)).toBe(true);
    expect(spawner.kills).toBe(1);
    expect(spawner.remaining).toBe(5);
    expect(spawner.enemyDied(42)).toBe(false);
    expect(spawner.kills).toBe(1);
    expect(spawner.remaining).toBe(5);
  });
});

describe('WaveSpawner: duas mortes diferentes antes do mesmo update (WAVE-08)', () => {
  it('kills soma 2 e remaining cai 2', () => {
    const spawner = new WaveSpawner(1, WAVE);
    expect(spawner.enemyDied(1)).toBe(true);
    expect(spawner.enemyDied(2)).toBe(true);
    expect(spawner.kills).toBe(2);
    expect(spawner.remaining).toBe(4);
  });
});

describe('isBossRound: múltiplo de 5 (BOSS-01)', () => {
  it.each([
    [4, false],
    [5, true],
    [6, false],
    [9, false],
    [10, true],
    [15, true],
  ])('round %i => %s', (round, expected) => {
    expect(isBossRound(round)).toBe(expected);
  });
});

describe('farthestPoint: ponto E mais distante do player (BOSS-03)', () => {
  it('escolhe o ponto de maior distância absoluta', () => {
    expect(farthestPoint([{ x: 100 }, { x: 900 }], 200)).toBe(1);
    expect(farthestPoint([{ x: 100 }, { x: 900 }], 800)).toBe(0);
  });

  it('empate: escolhe o menor índice', () => {
    expect(farthestPoint([{ x: 0 }, { x: 200 }], 100)).toBe(0);
  });

  it('um único ponto: sempre 0', () => {
    expect(farthestPoint([{ x: 500 }], 0)).toBe(0);
  });
});

describe('WaveSpawner: rodada de chefe (BOSS-01, BOSS-02)', () => {
  it.each([5, 10, 15])('round %i: onda de tamanho 1 com uma ordem kind boss', (round) => {
    const spawner = new WaveSpawner(round, WAVE);
    const orders = spawner.update(0);
    expect(orders).toHaveLength(1);
    expect(orders[0].kind).toBe('boss');
    expect(spawner.remaining).toBe(1);
    expect(spawner.update(10000)).toEqual([]);
  });

  it.each([
    [4, 12],
    [6, 16],
    [9, 20],
  ])('round %i: onda de tamanho %i, só kind enemy, nenhum chefe', (round, expectedCount) => {
    const spawner = new WaveSpawner(round, WAVE);
    expect(spawner.remaining).toBe(expectedCount);
    const orders = spawner.update(0);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every((o) => o.kind === 'enemy')).toBe(true);
  });
});
