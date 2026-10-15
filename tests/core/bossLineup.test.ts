import { describe, expect, it } from 'vitest';
import { BossLineups, drawLineup, type BossLineup } from '../../src/core/bossAffix';
import { Rng } from '../../src/core/rng';
import { Run } from '../../src/core/run';
import { AFFIX_RULES, type AffixRules } from '../../src/data/bossAffixes';
import { RUN, WAVE } from '../../src/data/tuning';

/** Salt do stream da escalação dos chefes (BLN-01). */
const BOSS_AFFIX_SALT = 0x9b05688c;

/** Stream que devolve os valores dados, em ordem, para testar os limiares dos dois lados (L-010). */
class FixedRng extends Rng {
  private calls = 0;
  constructor(private readonly values: number[]) {
    super(0);
  }
  override next(): number {
    return this.values[this.calls++ % this.values.length];
  }
}

const startedWith = (seed: number): Run => {
  const run = new Run(RUN, WAVE);
  run.startPressed();
  run.update(0, () => seed);
  return run;
};

const seeds = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Escalação sorteada do zero com o stream da seed. */
const drawn = (seed: number, round: number, rules?: AffixRules): BossLineup =>
  drawLineup(new Rng(seed ^ BOSS_AFFIX_SALT), round, rules);

/** Valor do stream depois de `n` sorteios. */
const after = (rngSeed: number, n: number): number => {
  const rng = new Rng(rngSeed);
  for (let i = 0; i < n; i++) rng.next();
  return rng.next();
};

describe('drawLineup: arquétipo 50/50 em todo tier (BLN-04)', () => {
  it('next() abaixo de 0,5 dá Oni; 0,5 dá Tecelã', () => {
    expect(drawLineup(new FixedRng([0.4999, 0, 0.9]), 5).archetype).toBe('oni');
    expect(drawLineup(new FixedRng([0.5, 0, 0.9]), 5).archetype).toBe('tecela');
  });

  it.each([5, 10, 15, 20, 25])('na r%i, 1000 seeds dão cada arquétipo perto de metade das vezes', (round) => {
    const oni = seeds(1, 1000).filter((s) => drawn(s, round).archetype === 'oni').length;
    expect(oni).toBeGreaterThan(450);
    expect(oni).toBeLessThan(550);
  });
});

describe('drawLineup: afixos pelo tier (BLN-05, BLN-06)', () => {
  it('seeds 1..50 na r5 dão os 2 arquétipos e os 2 leves, sempre exatamente 1 afixo leve', () => {
    const lineups = seeds(1, 50).map((s) => drawn(s, 5));
    for (const l of lineups) {
      expect(l.affixes).toHaveLength(1);
      expect(['igneo', 'invocador']).toContain(l.affixes[0]);
    }
    expect(new Set(lineups.map((l) => l.archetype))).toEqual(new Set(['oni', 'tecela']));
    expect(new Set(lineups.map((l) => l.affixes[0]))).toEqual(new Set(['igneo', 'invocador']));
  });

  it.each([
    [5, 1],
    [10, 1],
    [15, 2],
    [20, 2],
    [25, 3],
    [30, 3],
    [50, 3],
  ])('na r%i o chefe tem exatamente %i afixo(s), sem repetir', (round, count) => {
    for (const s of seeds(1, 50)) {
      const { affixes } = drawn(s, round);
      expect(affixes).toHaveLength(count);
      expect(new Set(affixes).size).toBe(count);
    }
  });

  it('da r10 em diante o pool é o inteiro: Sangue e Adaptativo saem na r10', () => {
    const seen = new Set(seeds(1, 50).flatMap((s) => drawn(s, 10).affixes));
    expect(seen).toEqual(new Set(['igneo', 'invocador', 'sangue', 'adaptativo']));
  });

  it('a r5 nunca traz Sangue nem Adaptativo', () => {
    const seen = new Set(seeds(1, 500).flatMap((s) => drawn(s, 5).affixes));
    expect(seen).toEqual(new Set(['igneo', 'invocador']));
  });
});

describe('drawLineup: sem par incompatível (BLN-07)', () => {
  const both = (l: BossLineup): boolean => l.affixes.includes('igneo') && l.affixes.includes('sangue');

  it('com Ígneo × Sangue injetado, os dois nunca saem juntos, mas cada um ainda sai', () => {
    const rules: AffixRules = { ...AFFIX_RULES, incompatible: [['igneo', 'sangue']] };
    const lineups = seeds(1, 300).map((s) => drawn(s, 25, rules));
    expect(lineups.filter(both)).toEqual([]);
    const seen = new Set(lineups.flatMap((l) => l.affixes));
    expect(seen.has('igneo')).toBe(true);
    expect(seen.has('sangue')).toBe(true);
  });

  it('o par vale na ordem inversa em que foi escrito', () => {
    const reversed: AffixRules = { ...AFFIX_RULES, incompatible: [['sangue', 'igneo']] };
    expect(
      seeds(1, 300)
        .map((s) => drawn(s, 25, reversed))
        .filter(both),
    ).toEqual([]);
  });

  it('sem a regra, o par sai junto em alguma seed (o teste acima discrimina)', () => {
    expect(
      seeds(1, 300)
        .map((s) => drawn(s, 25))
        .filter(both).length,
    ).toBeGreaterThan(0);
  });
});

describe('drawLineup: Portador de Dedo (PDD-01, PDD-02)', () => {
  it('nunca antes da r10, nem com next() em 0', () => {
    expect(drawLineup(new FixedRng([0.1, 0, 0]), 5).finger).toBe(false);
    for (const s of seeds(1, 500)) expect(drawn(s, 5).finger).toBe(false);
  });

  it('na r10, next() abaixo de 0,10 dá Portador; 0,10 não', () => {
    expect(drawLineup(new FixedRng([0.1, 0, 0.0999]), 10).finger).toBe(true);
    expect(drawLineup(new FixedRng([0.1, 0, 0.1]), 10).finger).toBe(false);
  });

  it.each([10, 25])('na r%i sai perto de 10% das vezes', (round) => {
    const fingers = seeds(1, 1000).filter((s) => drawn(s, round).finger).length;
    expect(fingers).toBeGreaterThan(70);
    expect(fingers).toBeLessThan(130);
  });

  it('o Portador não ocupa vaga: na r10 ele ainda tem 1 afixo, na r25 ainda 3', () => {
    const r10 = seeds(1, 300)
      .map((s) => drawn(s, 10))
      .filter((l) => l.finger);
    const r25 = seeds(1, 300)
      .map((s) => drawn(s, 25))
      .filter((l) => l.finger);
    expect(r10.length).toBeGreaterThan(0);
    expect(r25.length).toBeGreaterThan(0);
    for (const l of r10) expect(l.affixes).toHaveLength(1);
    for (const l of r25) expect(l.affixes).toHaveLength(3);
  });
});

describe('drawLineup: consumo do stream fixo por tier', () => {
  it('r5 e r10 consomem igual: arquétipo, 1 vaga e o Portador (3 sorteios), com ou sem Portador', () => {
    for (const s of seeds(1, 50)) {
      const r5 = new Rng(s);
      const r10 = new Rng(s);
      drawLineup(r5, 5);
      drawLineup(r10, 10);
      expect(r5.next()).toBe(after(s, 3));
      expect(r10.next()).toBe(after(s, 3));
    }
  });

  it('r25 consome arquétipo, 3 vagas e o Portador (5 sorteios)', () => {
    const rng = new Rng(9);
    drawLineup(rng, 25);
    expect(rng.next()).toBe(after(9, 5));
  });

  it('pool esvaziado por incompatibilidade ainda consome a vaga', () => {
    const allClash: AffixRules = {
      ...AFFIX_RULES,
      incompatible: [
        ['igneo', 'invocador'],
        ['igneo', 'sangue'],
        ['igneo', 'adaptativo'],
        ['invocador', 'sangue'],
        ['invocador', 'adaptativo'],
        ['sangue', 'adaptativo'],
      ],
    };
    const rng = new Rng(4);
    expect(drawLineup(rng, 25, allClash).affixes).toHaveLength(1);
    expect(rng.next()).toBe(after(4, 5));
  });
});

describe('BossLineups: cache por rodada (BLN-02, BLN-03)', () => {
  it('pedir a mesma rodada de novo devolve a mesma escalação sem consumir o stream', () => {
    const run = startedWith(11);
    const lineups = new BossLineups();
    const first = lineups.lineupFor(run.bossAffixRng!, 5);
    expect(lineups.lineupFor(run.bossAffixRng!, 5)).toEqual(first);
    expect(run.bossAffixRng!.next()).toBe(after(11 ^ BOSS_AFFIX_SALT, 3));
  });

  it('a mesma seed dá a mesma escalação em toda rodada de chefe', () => {
    const rounds = [5, 10, 15, 20, 25, 30];
    const runA = startedWith(23);
    const runB = startedWith(23);
    const a = new BossLineups();
    const b = new BossLineups();
    const fromA = rounds.map((r) => a.lineupFor(runA.bossAffixRng!, r));
    expect(rounds.map((r) => b.lineupFor(runB.bossAffixRng!, r))).toEqual(fromA);
  });

  it('run começando na r10 sorteia no 1º pedido da r10, com as mesmas regras', () => {
    expect(new BossLineups().lineupFor(startedWith(31).bossAffixRng!, 10)).toEqual(drawn(31, 10));
  });

  it('um Rng novo (run nova) zera o cache e sorteia com o stream novo', () => {
    const lineups = new BossLineups();
    lineups.lineupFor(new Rng(1), 5);
    const next = new Rng(2 ^ BOSS_AFFIX_SALT);
    expect(lineups.lineupFor(next, 5)).toEqual(drawn(2, 5));
    expect(next.next()).toBe(after(2 ^ BOSS_AFFIX_SALT, 3));
  });

  it('as regras injetadas valem no cache', () => {
    const rules: AffixRules = { ...AFFIX_RULES, countByTier: [2] };
    expect(new BossLineups(rules).lineupFor(new Rng(5), 10).affixes).toHaveLength(2);
  });
});

describe('Success Criteria 1: 20 seeds seguidas na r5', () => {
  it('as seeds 1..20 mostram os 2 arquétipos e os 2 afixos leves', () => {
    const lineups = seeds(1, 20).map((s) => new BossLineups().lineupFor(startedWith(s).bossAffixRng!, 5));
    expect(new Set(lineups.map((l) => l.archetype))).toEqual(new Set(['oni', 'tecela']));
    expect(new Set(lineups.flatMap((l) => l.affixes))).toEqual(new Set(['igneo', 'invocador']));
  });
});
