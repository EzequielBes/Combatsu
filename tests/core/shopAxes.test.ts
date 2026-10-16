import { describe, expect, it } from 'vitest';
import { Run } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

const startedWith = (seed: number): Run => {
  const run = new Run(RUN, WAVE);
  run.startPressed();
  run.update(0, () => seed);
  return run;
};

describe('Run: stream da carta de eixo (CRD-06)', () => {
  it('axisRng é null antes do primeiro start', () => {
    expect(new Run(RUN, WAVE).axisRng).toBeNull();
  });

  it('a mesma seed dá a mesma sequência, igual à de new Rng(seed ^ SHOP.axisSalt)', () => {
    const a = startedWith(7);
    const b = startedWith(7);
    const expected = new Rng(7 ^ SHOP.axisSalt);
    for (let i = 0; i < 20; i++) {
      const v = a.axisRng!.next();
      expect(v).toBe(b.axisRng!.next());
      expect(v).toBe(expected.next());
    }
  });

  it('sorteios no axisRng não deslocam o shopRng', () => {
    const quiet = startedWith(5);
    const busy = startedWith(5);
    for (let i = 0; i < 50; i++) busy.axisRng!.next();
    for (let i = 0; i < 10; i++) expect(busy.shopRng!.next()).toBe(quiet.shopRng!.next());
  });

  it('o sal não repete nenhum dos outros streams', () => {
    const others = [
      0x9e3779b9,
      SHOP.rngSalt,
      0x2545f491,
      0x6a09e667,
      0x3c6ef372,
      0x510e527f,
      0x1f83d9ab,
      0x5be0cd19,
      0x13198a2e,
      0x3243f6a8,
      0x9b05688c,
    ];
    expect(others).not.toContain(SHOP.axisSalt);
  });

  it('uma nova run cria outro Rng, com a seed nova', () => {
    const run = startedWith(1);
    const first = run.axisRng;
    first!.next();
    run.playerDied();
    run.update(0, () => 1);
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2);
    expect(run.axisRng).not.toBe(first);
    expect(run.axisRng!.next()).toBe(new Rng(2 ^ SHOP.axisSalt).next());
  });
});
