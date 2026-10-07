import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { pickSpawnPoint, type PickSpawnPointInput } from '../../src/core/spawnPoint';

/** Rng falso: `chance` devolve o valor forçado e `int` devolve `min + pick` (limitado a `max`). */
function fakeRng(chance: boolean, pick = 0): { rng: Rng; calls: { chance: number; int: number } } {
  const calls = { chance: 0, int: 0 };
  const rng = {
    chance: () => {
      calls.chance++;
      return chance;
    },
    int: (min: number, max: number) => {
      calls.int++;
      return Math.min(max, min + pick);
    },
  } as unknown as Rng;
  return { rng, calls };
}

const base = (over: Partial<PickSpawnPointInput> = {}): PickSpawnPointInput => ({
  points: [{ x: 48 }, { x: 624 }, { x: 1200 }, { x: 1232 }],
  viewLeft: 400,
  viewRight: 800,
  margin: 32,
  playerX: 600,
  playerFacing: 1,
  lastUsedAt: new Map(),
  nowMs: 10000,
  gapMs: 800,
  rng: fakeRng(false).rng,
  preferBackChance: 0.35,
  ...over,
});

describe('pickSpawnPoint: fora da câmera com margem (SPN-07)', () => {
  // Em cada caso o ponto testado é o único possível fora da câmera e o player está em cima dele: se ele fosse
  // candidato, sairia o índice 0; se estiver dentro, não há candidato e o farthestPoint escolhe o outro (índice 1).

  it('ponto em viewRight + 32 está dentro: não é candidato (cai no farthest, que aqui é o outro ponto)', () => {
    // pontos: [832 (limite), 500 (dentro)]; player em 832 => farthest = 500 (índice 1)
    const i = pickSpawnPoint(base({ points: [{ x: 832 }, { x: 500 }], playerX: 832 }));
    expect(i).toBe(1);
  });

  it('ponto em viewRight + 33 está fora: é o candidato escolhido', () => {
    const i = pickSpawnPoint(base({ points: [{ x: 833 }, { x: 500 }], playerX: 833 }));
    expect(i).toBe(0);
  });

  it('ponto em viewLeft - 32 está dentro: não é candidato', () => {
    const i = pickSpawnPoint(base({ points: [{ x: 368 }, { x: 500 }], playerX: 368 }));
    expect(i).toBe(1);
  });

  it('ponto em viewLeft - 33 está fora: é o candidato escolhido', () => {
    const i = pickSpawnPoint(base({ points: [{ x: 367 }, { x: 500 }], playerX: 367 }));
    expect(i).toBe(0);
  });

  it('usa a margem do parâmetro: x = 850 com margem 50 é dentro (850 <= 850) e com margem 49 é fora', () => {
    const pts = [{ x: 850 }, { x: 500 }];
    expect(pickSpawnPoint(base({ points: pts, margin: 50, playerX: 850 }))).toBe(1);
    expect(pickSpawnPoint(base({ points: pts, margin: 49, playerX: 850 }))).toBe(0);
  });

  it('nunca escolhe ponto dentro da câmera quando existe um fora', () => {
    for (let seed = 0; seed < 30; seed++) {
      const i = pickSpawnPoint(base({ rng: new Rng(seed) }));
      expect([0, 2, 3]).toContain(i); // 624 está dentro de [368, 832]
    }
  });
});

describe('pickSpawnPoint: preferência pelas costas (SPN-08)', () => {
  const opts = { points: [{ x: 48 }, { x: 1200 }], playerX: 600 };

  it('chance verdadeira + facing direita: escolhe o ponto à esquerda (costas)', () => {
    expect(pickSpawnPoint(base({ ...opts, playerFacing: 1, rng: fakeRng(true, 1).rng }))).toBe(0);
  });

  it('chance verdadeira + facing esquerda: escolhe o ponto à direita (costas)', () => {
    expect(pickSpawnPoint(base({ ...opts, playerFacing: -1, rng: fakeRng(true, 0).rng }))).toBe(1);
  });

  it('chance falsa: sorteia entre todos os de fora (o int escolhe o índice no pool)', () => {
    expect(pickSpawnPoint(base({ ...opts, playerFacing: 1, rng: fakeRng(false, 0).rng }))).toBe(0);
    expect(pickSpawnPoint(base({ ...opts, playerFacing: 1, rng: fakeRng(false, 1).rng }))).toBe(1);
  });

  it('chance verdadeira mas sem ponto de fora nas costas: cai no pool todo', () => {
    const points = [{ x: 1200 }, { x: 1232 }]; // facing direita => costas x < 600, não há
    expect(pickSpawnPoint(base({ points, playerFacing: 1, rng: fakeRng(true, 1).rng }))).toBe(1);
  });

  it('o rng.chance é consumido sempre, com ou sem ponto fora da câmera', () => {
    const a = fakeRng(false);
    pickSpawnPoint(base({ rng: a.rng }));
    expect(a.calls.chance).toBe(1);
    const b = fakeRng(true);
    pickSpawnPoint(base({ points: [{ x: 500 }], rng: b.rng })); // tudo dentro => farthest
    expect(b.calls.chance).toBe(1);
  });

  it('com Rng real, a mesma seed dá o mesmo ponto e consome o mesmo tanto do stream', () => {
    const r1 = new Rng(5);
    const r2 = new Rng(5);
    expect(pickSpawnPoint(base({ rng: r1 }))).toBe(pickSpawnPoint(base({ rng: r2 })));
    expect(r1.next()).toBe(r2.next());
  });

  it('usa preferBackChance do parâmetro (1 sempre prefere as costas)', () => {
    for (let seed = 0; seed < 10; seed++) {
      expect(pickSpawnPoint(base({ ...opts, playerFacing: 1, rng: new Rng(seed), preferBackChance: 1 }))).toBe(0);
    }
  });
});

describe('pickSpawnPoint: intervalo por ponto', () => {
  const pts = { points: [{ x: 48 }, { x: 1200 }], playerX: 600 };

  it('usado há 799 ms (gap 800): ponto excluído', () => {
    const lastUsedAt = new Map([[0, 10000 - 799]]);
    expect(pickSpawnPoint(base({ ...pts, lastUsedAt, rng: fakeRng(false, 0).rng }))).toBe(1);
  });

  it('usado há 800 ms: ponto liberado', () => {
    const lastUsedAt = new Map([[0, 10000 - 800]]);
    expect(pickSpawnPoint(base({ ...pts, lastUsedAt, rng: fakeRng(false, 0).rng }))).toBe(0);
  });

  it('todos usados dentro do gap: ignora o gap', () => {
    const lastUsedAt = new Map([
      [0, 9999],
      [1, 9999],
    ]);
    expect(pickSpawnPoint(base({ ...pts, lastUsedAt, rng: fakeRng(false, 1).rng }))).toBe(1);
  });

  it('usa gapMs do parâmetro: usado há 250 ms, gap 250 libera e gap 251 exclui', () => {
    const lastUsedAt = new Map([[0, 10000 - 250]]);
    expect(pickSpawnPoint(base({ ...pts, lastUsedAt, gapMs: 250, rng: fakeRng(false, 0).rng }))).toBe(0);
    expect(pickSpawnPoint(base({ ...pts, lastUsedAt, gapMs: 251, rng: fakeRng(false, 0).rng }))).toBe(1);
  });
});

describe('pickSpawnPoint: nenhum ponto fora da câmera (SPN-09)', () => {
  it('devolve o ponto de maior |x - player.x|', () => {
    const points = [{ x: 450 }, { x: 700 }, { x: 790 }];
    expect(pickSpawnPoint(base({ points, playerX: 450 }))).toBe(2);
    expect(pickSpawnPoint(base({ points, playerX: 790 }))).toBe(0);
  });
});

describe('pickSpawnPoint: alcance maxReach (RCH-01, RCH-02)', () => {
  // playerX 600, câmera 400..800 (margem 32): fora = x < 368 ou x > 832. Distância ao player = |x - 600|.
  const reach = (over: Partial<PickSpawnPointInput>): PickSpawnPointInput => base({ maxReach: 900, ...over });

  it('ponto a 900 px é candidato (<=)', () => {
    // [1500 (900 px), 100 (500 px)]: pick 0 escolhe o primeiro candidato; se 1500 não fosse candidato sairia o 1.
    expect(pickSpawnPoint(reach({ points: [{ x: 1500 }, { x: 100 }], rng: fakeRng(false, 0).rng }))).toBe(0);
  });

  it('ponto a 901 px não é candidato', () => {
    expect(pickSpawnPoint(reach({ points: [{ x: 1501 }, { x: 100 }], rng: fakeRng(false, 0).rng }))).toBe(1);
  });

  it('pontos a 500, 901 e 2000 px: só o de 500 é candidato', () => {
    const points = [{ x: 2600 }, { x: 1501 }, { x: 1100 }];
    for (let pick = 0; pick < 3; pick++) {
      const { rng, calls } = fakeRng(false, pick);
      expect(pickSpawnPoint(reach({ points, rng }))).toBe(2);
      expect(calls.int).toBe(1);
    }
  });

  it('o alcance conta a distância dos dois lados do player', () => {
    // -300 está a 900 px à esquerda (candidato) e -301 a 901 px (fora do alcance).
    const left = pickSpawnPoint(reach({ points: [{ x: -300 }, { x: 1100 }], rng: fakeRng(false, 0).rng }));
    expect(left).toBe(0);
    const farLeft = pickSpawnPoint(reach({ points: [{ x: -301 }, { x: 1100 }], rng: fakeRng(false, 0).rng }));
    expect(farLeft).toBe(1);
  });
});

describe('pickSpawnPoint: sem candidato no alcance (RCH-03, RCH-04)', () => {
  it('todos acima de 900 px: devolve o fora da câmera mais perto, sem consumir rng.int', () => {
    const { rng, calls } = fakeRng(false, 3);
    const points = [{ x: 2600 }, { x: 1501 }, { x: 3000 }];
    expect(pickSpawnPoint(base({ points, maxReach: 900, rng }))).toBe(1);
    expect(calls.int).toBe(0);
  });

  it('o mais perto vale dos dois lados e o empate fica com o menor índice', () => {
    expect(pickSpawnPoint(base({ points: [{ x: 2200 }, { x: -800 }], maxReach: 900 }))).toBe(1);
    expect(pickSpawnPoint(base({ points: [{ x: 2300 }, { x: -900 }], maxReach: 900 }))).toBe(1);
    // Empate: 1800 e -1200 distam 1200 px do player.
    expect(pickSpawnPoint(base({ points: [{ x: 1800 }, { x: -600 }], maxReach: 900 }))).toBe(0);
    expect(pickSpawnPoint(base({ points: [{ x: -600 }, { x: 1800 }], maxReach: 900 }))).toBe(0);
  });

  it('o ponto dentro da câmera não vale nem como o mais perto: só fora da câmera', () => {
    const points = [{ x: 600 }, { x: 2600 }];
    expect(pickSpawnPoint(base({ points, maxReach: 900 }))).toBe(1);
  });

  it('nenhum ponto fora da câmera: farthestPoint, com ou sem maxReach', () => {
    const points = [{ x: 450 }, { x: 700 }, { x: 790 }];
    expect(pickSpawnPoint(base({ points, playerX: 450, maxReach: 10 }))).toBe(2);
    expect(pickSpawnPoint(base({ points, playerX: 790, maxReach: 10 }))).toBe(0);
  });

  it('rng.chance é consumido uma vez em todos os ramos', () => {
    const run = (points: { x: number }[], maxReach?: number): number => {
      const { rng, calls } = fakeRng(true, 0);
      pickSpawnPoint(base({ points, maxReach, rng }));
      return calls.chance;
    };
    expect(run([{ x: 1100 }, { x: 100 }], 900)).toBe(1); // candidatos no alcance
    expect(run([{ x: 2600 }], 900)).toBe(1); // mais perto fora da câmera
    expect(run([{ x: 450 }], 900)).toBe(1); // farthestPoint
    expect(run([{ x: 2600 }])).toBe(1); // sem maxReach
  });
});

describe('pickSpawnPoint: costas e gap só sobre os do alcance (RCH-05)', () => {
  it('preferência pelas costas ignora o ponto de trás que está fora do alcance', () => {
    // player olha para a direita: -400 está atrás, mas a 1000 px; o único candidato é o 1100 (à frente).
    const points = [{ x: -400 }, { x: 1100 }];
    expect(pickSpawnPoint(base({ points, maxReach: 900, rng: fakeRng(true, 0).rng }))).toBe(1);
  });

  it('preferência pelas costas continua valendo entre os do alcance', () => {
    const points = [{ x: 1100 }, { x: 100 }];
    expect(pickSpawnPoint(base({ points, maxReach: 900, rng: fakeRng(true, 0).rng }))).toBe(1);
    expect(pickSpawnPoint(base({ points, maxReach: 900, rng: fakeRng(false, 0).rng }))).toBe(0);
  });

  it('o gap só olha os do alcance: o livre fora do alcance não tira o usado do alcance', () => {
    const lastUsedAt = new Map([[0, 9999]]);
    const points = [{ x: 1100 }, { x: 2600 }];
    expect(pickSpawnPoint(base({ points, lastUsedAt, maxReach: 900, rng: fakeRng(false, 0).rng }))).toBe(0);
  });

  it('o gap exclui o usado do alcance quando há outro livre no alcance', () => {
    const lastUsedAt = new Map([[0, 9999]]);
    const points = [{ x: 1100 }, { x: 100 }];
    expect(pickSpawnPoint(base({ points, lastUsedAt, maxReach: 900, rng: fakeRng(false, 0).rng }))).toBe(1);
  });
});

describe('pickSpawnPoint: sem maxReach nada muda (LEG-01)', () => {
  it('ponto a 2000 px é candidato sem maxReach e com maxReach infinito', () => {
    const points = [{ x: 2600 }, { x: 100 }];
    expect(pickSpawnPoint(base({ points, rng: fakeRng(false, 0).rng }))).toBe(0);
    expect(pickSpawnPoint(base({ points, maxReach: Infinity, rng: fakeRng(false, 0).rng }))).toBe(0);
  });
});
