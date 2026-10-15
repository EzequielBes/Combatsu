import { describe, expect, it } from 'vitest';
import { Run } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

/** Salt do stream da escalação dos chefes (BLN-01). */
const BOSS_AFFIX_SALT = 0x9b05688c;

/** Salts dos 10 streams que já existiam em `run.ts` antes deste. */
const OTHER_SALTS = [
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
];

const startedWith = (seed: number): Run => {
  const run = new Run(RUN, WAVE);
  run.startPressed();
  run.update(0, () => seed);
  return run;
};

describe('Run: stream da escalação dos chefes com seed própria (BLN-01)', () => {
  it('bossAffixRng é null antes do primeiro start', () => {
    expect(new Run(RUN, WAVE).bossAffixRng).toBeNull();
  });

  it('depois do start com seed s, a sequência é a de new Rng(s ^ 0x9b05688c)', () => {
    const run = startedWith(7);
    const expected = new Rng(7 ^ BOSS_AFFIX_SALT);
    for (let i = 0; i < 20; i++) expect(run.bossAffixRng!.next()).toBe(expected.next());
  });

  it('uma nova run cria outro objeto Rng, com a seed nova', () => {
    const run = startedWith(1);
    const first = run.bossAffixRng;
    first!.next(); // consome um sorteio na run anterior

    run.playerDied();
    run.update(0, () => 1); // gameOver
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2); // nova run, seed 2

    expect(run.bossAffixRng).not.toBe(first);
    expect(run.bossAffixRng!.next()).toBe(new Rng(2 ^ BOSS_AFFIX_SALT).next());
  });

  it('o salt é diferente dos 10 streams que já existem', () => {
    expect(new Set(OTHER_SALTS).size).toBe(OTHER_SALTS.length);
    expect(OTHER_SALTS).not.toContain(BOSS_AFFIX_SALT);
  });

  it('não começa igual a nenhum dos outros streams da mesma run', () => {
    const run = startedWith(7);
    const others = [
      run.lootRng,
      run.shopRng,
      run.guardRng,
      run.variantRng,
      run.spawnRng,
      run.elixirRng,
      run.stageRng,
      run.slotRng,
      run.vowRng,
      run.kokusenRng,
    ].map((rng) => rng!.next());
    expect(others).not.toContain(run.bossAffixRng!.next());
  });
});
