import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { Loot, armedChance, burstVelocity, capDrop, fragmentValue, type ToolKey } from '../../src/core/loot';
import { Modifiers } from '../../src/core/modifiers';
import { ECONOMY } from '../../src/data/tuning';

describe('fragmentValue (ECO-04)', () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 2],
    [10, 2],
    [11, 3],
  ])('rodada %i vale %i', (round, expected) => {
    expect(fragmentValue(round, ECONOMY)).toBe(expected);
  });
});

describe('armedChance (ARM-02)', () => {
  it.each([
    [2, 0],
    [3, 0.15],
    [4, 0.2],
    [9, 0.45],
    [10, 0.5],
    [20, 0.5],
  ])('rodada %i => %s', (round, expected) => {
    expect(armedChance(round, ECONOMY.armed)).toBeCloseTo(expected, 9);
  });
});

describe('capDrop (ECO-15, ECO-28)', () => {
  it('live 56 + 4: cabe tudo, sem extra', () => {
    expect(capDrop(4, 56, 60)).toEqual({ spawn: 4, extraOnLast: 0 });
  });

  it('live 57 + 4: spawna 3, 1 de extra', () => {
    expect(capDrop(4, 57, 60)).toEqual({ spawn: 3, extraOnLast: 1 });
  });

  it('live 60 + 3: spawna 1 (mínimo), 2 de extra', () => {
    expect(capDrop(3, 60, 60)).toEqual({ spawn: 1, extraOnLast: 2 });
  });

  it('live 70 + 2: spawna 1 (mínimo), 1 de extra', () => {
    expect(capDrop(2, 70, 60)).toEqual({ spawn: 1, extraOnLast: 1 });
  });
});

describe('burstVelocity (ECO-06)', () => {
  it('vx em [-120, 120] e vy em [-260, -180] em 1000 sorteios', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const { vx, vy } = burstVelocity(rng);
      expect(vx).toBeGreaterThanOrEqual(-120);
      expect(vx).toBeLessThanOrEqual(120);
      expect(vy).toBeGreaterThanOrEqual(-260);
      expect(vy).toBeLessThanOrEqual(-180);
    }
  });
});

describe('Loot.enemyDrop (ECO-02, ECO-03, ECO-04, HEAL-01)', () => {
  it('inimigo comum: quantidade sempre em [2, 4], com os três valores aparecendo em 1000 sorteios', () => {
    const loot = new Loot(new Rng(1), ECONOMY);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const { fragments } = loot.enemyDrop(1, false);
      expect(fragments).toBeGreaterThanOrEqual(2);
      expect(fragments).toBeLessThanOrEqual(4);
      seen.add(fragments);
    }
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it('inimigo armado: quantidade sempre em [4, 6] (2-4 + 2 do bônus)', () => {
    const loot = new Loot(new Rng(1), ECONOMY);
    for (let i = 0; i < 1000; i++) {
      const { fragments } = loot.enemyDrop(1, true);
      expect(fragments).toBeGreaterThanOrEqual(4);
      expect(fragments).toBeLessThanOrEqual(6);
    }
  });

  it('valor do pickup segue fragmentValue da rodada do drop', () => {
    const loot = new Loot(new Rng(1), ECONOMY);
    expect(loot.enemyDrop(1, false).value).toBe(1);
    expect(loot.enemyDrop(6, false).value).toBe(2);
    expect(loot.enemyDrop(11, false).value).toBe(3);
  });

  it('chance de cura fica perto de 0,10 numa seed fixa, em 10000 abates', () => {
    const loot = new Loot(new Rng(42), ECONOMY);
    let heals = 0;
    for (let i = 0; i < 10000; i++) {
      if (loot.enemyDrop(1, false).heal) heals++;
    }
    expect(heals / 10000).toBeGreaterThan(0.08);
    expect(heals / 10000).toBeLessThan(0.12);
  });
});

describe('Loot.bossDrop (ECO-05, HEAL-02)', () => {
  it('sempre 15 fragmentos e nunca cura', () => {
    const loot = new Loot(new Rng(1), ECONOMY);
    for (let round = 1; round <= 20; round++) {
      const drop = loot.bossDrop(round);
      expect(drop.fragments).toBe(15);
      expect(drop.heal).toBe(false);
    }
  });
});

/** Rng falso que só registra a ordem das chamadas, para provar a ordem fixa dos sorteios. */
function recordingRng(calls: string[]): Rng {
  return {
    chance: (_p: number) => {
      calls.push('chance');
      return true;
    },
    int: (min: number, _max: number) => {
      calls.push('int');
      return min;
    },
    next: () => {
      calls.push('next');
      return 0;
    },
  } as unknown as Rng;
}

describe('Ordem dos sorteios (ECO-17, spec "Ordem dos sorteios por abate")', () => {
  it('enemyDrop sorteia a cura antes da quantidade de fragmentos', () => {
    const calls: string[] = [];
    const loot = new Loot(recordingRng(calls), ECONOMY);
    loot.enemyDrop(1, false);
    expect(calls).toEqual(['chance', 'int']);
  });

  it('rollArmed sorteia chance, depois ferramenta, depois raro', () => {
    const calls: string[] = [];
    const loot = new Loot(recordingRng(calls), ECONOMY);
    loot.rollArmed(3);
    expect(calls).toEqual(['chance', 'int', 'chance']);
  });
});

describe('Loot.rollArmed (ARM-01..03)', () => {
  it('rodada <= 2: nunca arma', () => {
    const loot = new Loot(new Rng(1), ECONOMY);
    for (let i = 0; i < 200; i++) {
      expect(loot.rollArmed(1)).toBeNull();
      expect(loot.rollArmed(2)).toBeNull();
    }
  });

  it('sorteia cursedKnife ou cursedClub com igual probabilidade', () => {
    const loot = new Loot(new Rng(9), ECONOMY);
    const seen = new Set<ToolKey>();
    for (let i = 0; i < 2000; i++) {
      const r = loot.rollArmed(20); // rodada 20: chance no teto 0.5, garante muitas armadas
      if (r) seen.add(r.tool);
    }
    expect([...seen].sort()).toEqual(['cursedClub', 'cursedKnife']);
  });
});

describe('Overrides de debug', () => {
  it('healChance: 1 dá cura sempre (HEAL-06)', () => {
    const loot = new Loot(new Rng(1), ECONOMY, { healChance: 1 });
    for (let i = 0; i < 20; i++) expect(loot.enemyDrop(1, false).heal).toBe(true);
  });

  it('armed: cursedClub arma sempre com porrete, mesmo na rodada 1 (ARM-15)', () => {
    const loot = new Loot(new Rng(1), ECONOMY, { armed: 'cursedClub' });
    for (let i = 0; i < 20; i++) {
      const r = loot.rollArmed(1);
      expect(r).not.toBeNull();
      expect(r!.tool).toBe('cursedClub');
    }
  });

  it('rare: true dá ferramenta rara sempre (RAR-05)', () => {
    const loot = new Loot(new Rng(1), ECONOMY, { armed: 'cursedKnife', rare: true });
    for (let i = 0; i < 20; i++) {
      expect(loot.rollArmed(1)!.rare).toBe(true);
    }
  });
});

describe('Loot.enemyDrop lê healChance de Modifiers (MOD-08, MOD-12)', () => {
  it('sorte nível 0: healChance perto de 0,10 em 10000 abates', () => {
    const modifiers = new Modifiers();
    const loot = new Loot(new Rng(42), ECONOMY, {}, modifiers);
    let heals = 0;
    for (let i = 0; i < 10000; i++) {
      if (loot.enemyDrop(1, false).heal) heals++;
    }
    expect(heals / 10000).toBeGreaterThan(0.08);
    expect(heals / 10000).toBeLessThan(0.12);
  });

  it('sorte nível 3: healChance perto de 0,19 em 10000 abates', () => {
    const modifiers = new Modifiers();
    modifiers.apply('sorte');
    modifiers.apply('sorte');
    modifiers.apply('sorte');
    const loot = new Loot(new Rng(42), ECONOMY, {}, modifiers);
    let heals = 0;
    for (let i = 0; i < 10000; i++) {
      if (loot.enemyDrop(1, false).heal) heals++;
    }
    expect(heals / 10000).toBeGreaterThan(0.17);
    expect(heals / 10000).toBeLessThan(0.21);
  });

  it('override heal=1 vence mesmo com sorte no máximo (MOD-12)', () => {
    const modifiers = new Modifiers();
    modifiers.apply('sorte');
    modifiers.apply('sorte');
    modifiers.apply('sorte');
    const loot = new Loot(new Rng(1), ECONOMY, { healChance: 1 }, modifiers);
    for (let i = 0; i < 20; i++) expect(loot.enemyDrop(1, false).heal).toBe(true);
  });
});

describe('Determinismo por seed', () => {
  it('a mesma seed produz a mesma sequência de drops', () => {
    const a = new Loot(new Rng(123), ECONOMY);
    const b = new Loot(new Rng(123), ECONOMY);
    for (let i = 0; i < 20; i++) {
      expect(a.enemyDrop(3, i % 2 === 0)).toEqual(b.enemyDrop(3, i % 2 === 0));
    }
  });
});
