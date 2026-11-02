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

/** Sais dos streams que já existiam em `run.ts` antes do baú. */
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
  0x9b05688c,
  SHOP.axisSalt,
];

describe('Run: stream do baú (VEU-02)', () => {
  it('chestRng é null antes do primeiro start e existe depois dele', () => {
    expect(new Run(RUN, WAVE).chestRng).toBeNull();
    expect(startedWith(3).chestRng).toBeInstanceOf(Rng);
  });

  it('a mesma seed dá a mesma sequência, igual à de new Rng(seed ^ SHOP.chestSalt)', () => {
    const a = startedWith(7);
    const b = startedWith(7);
    const expected = new Rng(7 ^ SHOP.chestSalt);
    for (let i = 0; i < 20; i++) {
      const v = a.chestRng!.next();
      expect(v).toBe(b.chestRng!.next());
      expect(v).toBe(expected.next());
    }
  });

  it('sorteios no chestRng não deslocam o shopRng nem o axisRng', () => {
    const quiet = startedWith(5);
    const busy = startedWith(5);
    for (let i = 0; i < 50; i++) busy.chestRng!.next();
    for (let i = 0; i < 10; i++) {
      expect(busy.shopRng!.next()).toBe(quiet.shopRng!.next());
      expect(busy.axisRng!.next()).toBe(quiet.axisRng!.next());
    }
  });

  it('o sal 0xa54ff53a não repete nenhum dos outros streams', () => {
    expect(SHOP.chestSalt).toBe(0xa54ff53a);
    expect(OTHER_SALTS).not.toContain(SHOP.chestSalt);
  });
});

/** Sal do stream do Domínio. O design pedia `0x9b05688c`, que já é o do `bossAffixRng` (F32). */
const DOMAIN_SALT = 0xbb67ae85;

describe('Run: stream do Domínio (JAC-03)', () => {
  it('domainRng é null antes do primeiro start e existe depois dele', () => {
    expect(new Run(RUN, WAVE).domainRng).toBeNull();
    expect(startedWith(3).domainRng).toBeInstanceOf(Rng);
  });

  it('a mesma seed dá a mesma sequência, igual à de new Rng(seed ^ sal); seeds diferentes divergem', () => {
    const a = startedWith(7);
    const b = startedWith(7);
    const expected = new Rng(7 ^ DOMAIN_SALT);
    const seq: number[] = [];
    for (let i = 0; i < 20; i++) {
      const v = a.domainRng!.next();
      seq.push(v);
      expect(v).toBe(b.domainRng!.next());
      expect(v).toBe(expected.next());
    }
    const other = startedWith(8);
    expect(Array.from({ length: 20 }, () => other.domainRng!.next())).not.toEqual(seq);
  });

  it('sorteios no domainRng não deslocam o shopRng, o axisRng nem o chestRng', () => {
    const quiet = startedWith(5);
    const busy = startedWith(5);
    for (let i = 0; i < 50; i++) busy.domainRng!.next();
    for (let i = 0; i < 10; i++) {
      expect(busy.shopRng!.next()).toBe(quiet.shopRng!.next());
      expect(busy.axisRng!.next()).toBe(quiet.axisRng!.next());
      expect(busy.chestRng!.next()).toBe(quiet.chestRng!.next());
    }
  });

  it('o sal do Domínio não repete nenhum dos outros streams nem o do baú', () => {
    expect(OTHER_SALTS).not.toContain(DOMAIN_SALT);
    expect(DOMAIN_SALT).not.toBe(SHOP.chestSalt);
    expect(DOMAIN_SALT).not.toBe(SHOP.rngSalt);
  });

  it('o domainRng não sorteia igual a nenhum outro stream da mesma seed', () => {
    const run = startedWith(11);
    const first = run.domainRng!.next();
    const others = [run.shopRng, run.axisRng, run.chestRng, run.bossAffixRng, run.lootRng, run.kokusenRng];
    for (const rng of others) expect(rng!.next()).not.toBe(first);
  });
});
