import { describe, expect, it } from 'vitest';
import {
  dogsStats,
  summonDogs,
  type DogEvent,
  type DogPack,
  type DogTarget,
  type DogsBuild,
} from '../../src/core/divineDogs';
import type { DogsAxisId, DogsBranchId } from '../../src/data/divineDogs';

const ZERO: Record<DogsAxisId, number> = { caes: 0, alcance: 0, mordidas: 0, prisao: 0, eficiencia: 0, recarga: 0 };
const build = (axes: Partial<Record<DogsAxisId, number>> = {}, branch: DogsBranchId | null = null): DogsBuild => ({
  axes: { ...ZERO, ...axes },
  branch,
});

/** Chão em y = 100; alvo de 20×40 de pé no chão, com o centro x em `cx` (centro da caixa em y = 80). */
const FEET = { x: 0, y: 100 };
const tgt = (id: number, cx: number, kind: 'enemy' | 'boss' = 'enemy', maxHp = 100): DogTarget => ({
  id,
  kind,
  box: { x: cx - 10, y: 60, width: 20, height: 40 },
  maxHp,
});

const summon = (b: DogsBuild, facing: 1 | -1 = 1) => summonDogs(dogsStats(b), FEET, facing).pack;

/** Roda a matilha em passos de 10 ms e devolve os eventos com o instante. */
function play(pack: DogPack, targets: DogTarget[] | (() => DogTarget[]), ms: number) {
  const out: { t: number; e: DogEvent }[] = [];
  for (let t = 10; t <= ms; t += 10) {
    const list = typeof targets === 'function' ? targets() : targets;
    for (const e of pack.update(10, list)) out.push({ t, e });
  }
  return out;
}
const bites = (log: { t: number; e: DogEvent }[]) =>
  log.flatMap(({ t, e }) =>
    e.type === 'bite' ? [{ t, dog: e.dogId, target: e.targetId, damage: e.damage, root: e.rootMs, bite: e.bite }] : [],
  );

describe('CAO-01: números base', () => {
  it('2 cães, alcance 200, 1 mordida de 6, prisão 0, custo 24, recarga 3500, vida 1200', () => {
    expect(dogsStats(build())).toMatchObject({
      level: 1,
      branch: null,
      awakened: false,
      dogs: 2,
      dashPxS: 480,
      rangePx: 200,
      bites: 1,
      biteDamage: 6,
      rootMs: 0,
      cost: 24,
      cooldownMs: 3500,
      killRefundPct: 0,
      lifeMs: 1200,
    });
    expect(summonDogs(dogsStats(build()), FEET, 1).cost).toBe(24);
  });
});

describe('CAO-02: cada eixo no 0 e no 3', () => {
  it.each([
    ['caes', { dogs: 4, dashPxS: 600 }],
    ['alcance', { rangePx: 320 }],
    ['mordidas', { bites: 3, biteDamage: 8 }],
    ['prisao', { rootMs: 600, bossRootMs: 150 }],
    ['eficiencia', { cost: 14 }],
    ['recarga', { cooldownMs: 2000, killRefundPct: 0.3 }],
  ] as const)('%s', (axis, expected) => {
    expect(dogsStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });

  it('o 2º ponto ainda não traz o bônus do 3º', () => {
    expect(dogsStats(build({ caes: 2, mordidas: 2 }))).toMatchObject({
      dogs: 4,
      dashPxS: 480,
      bites: 3,
      biteDamage: 6,
    });
  });
});

describe('CAO-03: investida e mordida', () => {
  it('os 2 cães correm a 480 px/s e mordem o 1º alvo à frente (micro de 6); quem está atrás fica de fora', () => {
    const log = play(summon(build()), [tgt(1, 100), tgt(2, -100)], 600);
    expect(bites(log)).toEqual([
      { t: 190, dog: 1, target: 1, damage: 6, root: 0, bite: 0 },
      { t: 190, dog: 2, target: 1, damage: 6, root: 0, bite: 0 },
    ]);
    expect(log.find((l) => l.e.type === 'bite')?.e).toMatchObject({ band: 'micro' });
  });

  it('o mais perto na faixa vem primeiro; olhando para a esquerda, morde à esquerda', () => {
    expect(bites(play(summon(build()), [tgt(1, 100), tgt(2, 60)], 300)).map((b) => b.target)).toEqual([2, 2]);
    expect(bites(play(summon(build(), -1), [tgt(1, 100), tgt(2, -100)], 300)).map((b) => b.target)).toEqual([2, 2]);
  });

  it('com 2 mordidas, a 2ª sai 200 ms depois da 1ª', () => {
    const log = bites(play(summon(build({ mordidas: 1 })), [tgt(1, 100)], 600));
    expect(log.filter((b) => b.dog === 1).map((b) => b.t)).toEqual([190, 390]);
  });
});

describe('CAO-04: os cães somem', () => {
  it('depois da última mordida', () => {
    const log = play(summon(build()), [tgt(1, 100)], 600);
    expect(log.filter((l) => l.e.type === 'gone').map((l) => l.t)).toEqual([200, 200]);
  });

  it('no fim do alcance, sem alvo; alvo além do alcance não é mordido', () => {
    const pack = summon(build());
    const log = play(pack, [tgt(1, 215)], 600);
    expect(bites(log)).toEqual([]);
    expect(log.filter((l) => l.e.type === 'gone').map((l) => [l.t, l.e.type === 'gone' && l.e.at.x])).toEqual([
      [420, 200],
      [420, 200],
    ]);
    expect(pack.done).toBe(true);
  });

  it('o cão cujo alvo morre no meio das mordidas some sem morder de novo', () => {
    let alive = [tgt(1, 100)];
    const pack = summon(build({ mordidas: 2 }));
    const log = play(pack, () => alive, 200);
    alive = [];
    log.push(...play(pack, () => alive, 300));
    expect(bites(log)).toHaveLength(2);
    expect(pack.done).toBe(true);
  });

  it('aos 1200 ms, mesmo mordendo', () => {
    const pack = summon(build({ caes: 3, mordidas: 1 }, 'matilha'));
    const log = play(pack, [tgt(1, 100), tgt(2, 160), tgt(3, 220)], 1300);
    expect(log.filter((l) => l.e.type === 'gone' && l.e.dogId <= 2).map((l) => l.t)).toEqual([1200, 1200]);
    expect(pack.done).toBe(true);
    expect(pack.view).toEqual([]);
  });
});

describe('CAO-05: prisão', () => {
  it('só a 1ª mordida de cada cão prende; o chefe fica 25%', () => {
    const log = bites(play(summon(build({ prisao: 3, mordidas: 1 })), [tgt(1, 100)], 600));
    expect(log.map((b) => [b.dog, b.root])).toEqual([
      [1, 600],
      [2, 600],
      [1, 0],
      [2, 0],
    ]);
    const boss = bites(play(summon(build({ prisao: 3 })), [tgt(1, 100, 'boss', 3000)], 400));
    expect(boss.map((b) => b.root)).toEqual([150, 150]);
  });
});

describe('CAO-06: Totalidade', () => {
  it('um lobo morde por mordida × cães e salta, a cada 150 ms, por 3 alvos a até 120 px', () => {
    const pack = summon(build({ caes: 1 }, 'totalidade'));
    expect(pack.view).toHaveLength(1);
    const log = play(pack, [tgt(1, 100), tgt(2, 180), tgt(3, 260), tgt(4, 340)], 800);
    expect(bites(log)).toEqual([
      { t: 190, dog: 1, target: 1, damage: 18, root: 0, bite: 0 },
      { t: 340, dog: 1, target: 2, damage: 18, root: 0, bite: 0 },
      { t: 490, dog: 1, target: 3, damage: 18, root: 0, bite: 0 },
    ]);
    expect(log.filter((l) => l.e.type === 'leap').map((l) => l.e.type === 'leap' && l.e.to)).toEqual([
      { x: 180, y: 80 },
      { x: 260, y: 80 },
    ]);
    expect(pack.done).toBe(true);
  });

  it('não salta para quem está a 121 px; as Mordidas não se aplicam ao lobo', () => {
    const log = bites(play(summon(build({ mordidas: 2 }, 'totalidade')), [tgt(1, 100), tgt(2, 221)], 800));
    expect(log.map((b) => b.target)).toEqual([1]);
  });
});

describe('CAO-07: Matilha', () => {
  it('3 cães: 2 à frente e 1 para trás', () => {
    const log = bites(play(summon(build({ caes: 1 }, 'matilha')), [tgt(1, 100), tgt(2, -100)], 300));
    expect(log.map((b) => [b.dog, b.target])).toEqual([
      [1, 1],
      [2, 1],
      [3, 2],
    ]);
  });
});

describe('CAO-08: Totalidade Negra (Despertar)', () => {
  it('o lobo salta por até 5 alvos, e cada um toma 4% (chefe 1%)', () => {
    const ts = [
      tgt(1, 100),
      tgt(2, 180, 'boss', 3000),
      tgt(3, 260),
      tgt(4, 340),
      tgt(5, 420, 'enemy', 200),
      tgt(6, 500),
    ];
    const log = bites(play(summon(build({ caes: 3, alcance: 1 }, 'totalidade')), ts, 1200));
    expect(log.map((b) => [b.target, b.damage, b.bite])).toEqual([
      [1, 24, 4],
      [2, 24, 30],
      [3, 24, 4],
      [4, 24, 4],
      [5, 24, 8],
    ]);
  });

  it('no Nv 4 (sem Despertar) para no 3º alvo e sem componente', () => {
    const log = bites(
      play(summon(build({ caes: 3 }, 'totalidade')), [tgt(1, 100), tgt(2, 180), tgt(3, 260), tgt(4, 340)], 1200),
    );
    expect(log.map((b) => b.bite)).toEqual([0, 0, 0]);
  });
});

describe('CAO-09: Matilha Faminta (Despertar)', () => {
  // Cães no 3: investida a 600 px/s, chega no 1º alvo aos 150 ms.
  const awake = build({ caes: 3, mordidas: 1 }, 'matilha');

  it('o cão que acaba as mordidas pula para o vivo mais perto a até 80 px que ele não mordeu; 4% uma vez por alvo', () => {
    const log = bites(play(summon(awake), [tgt(1, 100), tgt(2, 160)], 1200));
    expect(log.filter((b) => b.dog === 1).map((b) => [b.t, b.target, b.bite])).toEqual([
      [150, 1, 4],
      [350, 1, 0],
      [550, 2, 4],
      [750, 2, 0],
    ]);
    expect(log.filter((b) => b.dog === 2).every((b) => b.bite === 0)).toBe(true);
  });

  it('a 81 px não pula; sem o Despertar (Nv 4) o cão some depois das mordidas', () => {
    expect(bites(play(summon(awake), [tgt(1, 100), tgt(2, 181)], 1200)).map((b) => b.target)).toEqual([1, 1, 1, 1]);
    const plain = bites(play(summon(build({ caes: 3 }, 'matilha')), [tgt(1, 100), tgt(2, 160)], 1200));
    expect(plain.map((b) => b.target)).toEqual([1, 1]);
  });
});

describe('CAO-10: abate com Recarga no 3', () => {
  it('o 1º abate da conjuração devolve 30% (600 ms), os seguintes 0; abaixo do teto, 0', () => {
    const pack = summon(build({ recarga: 3 }));
    expect(pack.claimKillRefund()).toBe(600);
    expect(pack.claimKillRefund()).toBe(0);
    expect(summon(build({ recarga: 2 })).claimKillRefund()).toBe(0);
  });
});

describe('bordas da entrada', () => {
  it('eixo acima de 3, soma acima de 5 ou ramo no Nv 1 lança RangeError', () => {
    expect(() => dogsStats(build({ caes: 4 }))).toThrow(RangeError);
    expect(() => dogsStats(build({ caes: 3, alcance: 3 }))).toThrow(RangeError);
    expect(() => dogsStats(build({}, 'matilha'))).toThrow(RangeError);
  });
});
