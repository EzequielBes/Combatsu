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
