import { describe, expect, it } from 'vitest';
import { multipliersFor } from '../../src/core/difficulty';
import { activationDamage } from '../../src/core/domainActivation';
import {
  SanctuaryTriggers,
  sanctuaryCutDamage,
  sanctuaryTargets,
  worldCutHits,
  type SanctuaryTarget,
} from '../../src/core/sanctuary';
import { DOMAINS, SANCTUARY } from '../../src/data/domains';
import { DIFFICULTY, ENEMY } from '../../src/data/tuning';

const C = { x: 0, y: 0 };
const common = (id: number, x: number, hp = 60, maxHp = 60): SanctuaryTarget => ({
  id,
  center: { x, y: 0 },
  hp,
  maxHp,
  isBoss: false,
});
const boss = (x: number, hp: number, maxHp = 1000): SanctuaryTarget => ({
  id: 99,
  center: { x, y: 0 },
  hp,
  maxHp,
  isBoss: true,
});

describe('SanctuaryTriggers: 4 gatilhos por 1000 ms de jogo (SAN-02)', () => {
  it('4 gatilhos dentro de 1000 ms aceitos e o 5º recusado', () => {
    const t = new SanctuaryTriggers();
    expect([0, 100, 200, 300].map((ms) => t.tryRelease(ms))).toEqual([true, true, true, true]);
    expect(t.tryRelease(400)).toBe(false);
    expect(t.countAt(400)).toBe(4);
  });

  it('o 5º em 999 ms é recusado; em 1000 e 1001 ms é aceito', () => {
    const t = new SanctuaryTriggers();
    [0, 0, 0, 0].forEach((x) => t.tryRelease(x));
    expect(t.tryRelease(999)).toBe(false);
    expect(t.tryRelease(1000)).toBe(true);
    const u = new SanctuaryTriggers();
    [0, 0, 0, 0].forEach((x) => u.tryRelease(x));
    expect(u.tryRelease(1001)).toBe(true);
  });

  it('um gatilho conta enquanto now − t < 1000', () => {
    const t = new SanctuaryTriggers();
    t.tryRelease(0);
    expect(t.countAt(999)).toBe(1);
    expect(t.countAt(1000)).toBe(0);
  });

  it('gatilho sem alvo conta na janela (edge case): a regra não sabe de alvo', () => {
    const t = new SanctuaryTriggers();
    // Quatro gatilhos soltos com a tela vazia ainda ocupam a janela.
    [0, 10, 20, 30].forEach((x) => t.tryRelease(x));
    expect(sanctuaryTargets(C, [], SANCTUARY.targets[0])).toEqual([]);
    expect(t.tryRelease(40)).toBe(false);
  });

  it('reset esvazia a janela', () => {
    const t = new SanctuaryTriggers();
    [0, 0, 0, 0].forEach((x) => t.tryRelease(x));
    t.reset();
    expect(t.countAt(0)).toBe(0);
    expect(t.tryRelease(0)).toBe(true);
  });
});

describe('sanctuaryTargets: até 4/6 vivos a 320 px, do mais perto (SAN-03)', () => {
  const eight = [8, 7, 6, 5, 4, 3, 2, 1].map((id) => common(id, id * 30));

  it('até 4 alvos no Nv 1 e 6 no Nv 2 e 3, os mais perto', () => {
    expect(SANCTUARY.targets).toEqual([4, 6, 6]);
    expect(sanctuaryTargets(C, eight, SANCTUARY.targets[0]).map((t) => t.id)).toEqual([1, 2, 3, 4]);
    expect(sanctuaryTargets(C, eight, SANCTUARY.targets[1]).map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sanctuaryTargets(C, eight, SANCTUARY.targets[2]).map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('no empate de distância, o menor id primeiro', () => {
    const tied = [common(5, 50), common(2, -50), common(9, 10)];
    expect(sanctuaryTargets(C, tied, 4).map((t) => t.id)).toEqual([9, 2, 5]);
  });

  it('a 320 px entra e a 321 px fica fora; o chefe entra', () => {
    const list = [common(1, 320), common(2, -321), boss(-100, 500)];
    expect(sanctuaryTargets(C, list, 6).map((t) => t.id)).toEqual([99, 1]);
  });

  it('morto fica fora', () => {
    expect(sanctuaryTargets(C, [common(1, 10, 0), common(2, 20)], 4).map((t) => t.id)).toEqual([2]);
  });
});

describe('sanctuaryCutDamage: round(6 × hpMul) (SAN-03)', () => {
  it('r1 dá 6 e r19 dá 12', () => {
    expect(sanctuaryCutDamage(multipliersFor(1, DIFFICULTY).hp)).toBe(6);
    expect(sanctuaryCutDamage(multipliersFor(19, DIFFICULTY).hp)).toBe(12);
  });
});

describe('limpeza do Santuário Nv 1 com os golpes de referência (SAN-03.5)', () => {
  /** Golpes de referência a partir de 0 ms: leve a cada 1000, forte a cada 4000, conjuração a cada 5000. */
  const referenceStrikes = (durationMs: number): number[] => {
    const times: number[] = [];
    for (let t = 0; t < durationMs; t += 1000) times.push(t);
    for (let t = 0; t < durationMs; t += 4000) times.push(t);
    for (let t = 0; t < durationMs; t += 5000) times.push(t);
    return times.sort((a, b) => a - b);
  };

  const released = (): number => {
    const triggers = new SanctuaryTriggers();
    return referenceStrikes(DOMAINS.santuario.durationMs[0]).filter((t) => triggers.tryRelease(t)).length;
  };

  /** 4 comuns de HP cheio a até 320 px: ativação de 40% e depois `cuts` cortes nos 4 (até 4 alvos no Nv 1). */
  const survivors = (round: number, cuts: number): number[] => {
    const hpMul = multipliersFor(round, DIFFICULTY).hp;
    const maxHp = Math.round(ENEMY.maxHp * hpMul);
    const four = [1, 2, 3, 4].map((id) => common(id, id * 60, maxHp, maxHp));
    for (const t of four) t.hp -= activationDamage(DOMAINS.santuario.activation.common, maxHp);
    for (let i = 0; i < cuts; i++) {
      for (const t of sanctuaryTargets(C, four, SANCTUARY.targets[0])) t.hp -= sanctuaryCutDamage(hpMul);
    }
    return four.filter((t) => t.hp > 0).map((t) => t.hp);
  };

  it('os golpes de referência dentro de 6000 ms soltam 10 gatilhos', () => {
    expect(released()).toBe(10);
  });

  it('r4 (HP 71, ativação 28, corte 7) e r19 (HP 125, ativação 50, corte 12): os 4 chegam a 0', () => {
    const r4 = multipliersFor(4, DIFFICULTY).hp;
    const r19 = multipliersFor(19, DIFFICULTY).hp;
    expect([Math.round(ENEMY.maxHp * r4), activationDamage(0.4, 71), sanctuaryCutDamage(r4)]).toEqual([71, 28, 7]);
    expect([Math.round(ENEMY.maxHp * r19), activationDamage(0.4, 125), sanctuaryCutDamage(r19)]).toEqual([125, 50, 12]);
    expect(survivors(4, released())).toEqual([]);
    expect(survivors(19, released())).toEqual([]);
  });

  it('com só 6 gatilhos, na r4 um comum fica vivo (o teste discrimina)', () => {
    expect(survivors(4, 6).length).toBeGreaterThan(0);
  });
});

describe('worldCutHits: Corte do Mundo (SAN-05)', () => {
  it('comum com HP = 35% do máximo morre: leva o HP restante', () => {
    expect(worldCutHits(C, [common(1, 50, 21, 60)])).toEqual([{ target: common(1, 50, 21, 60), damage: 21 }]);
  });

  it('comum com 35% + 1 HP fica de fora', () => {
    expect(worldCutHits(C, [common(1, 50, 22, 60)])).toEqual([]);
  });

  it('o chefe leva round(0,08 × maxHp), com qualquer HP', () => {
    expect(worldCutHits(C, [boss(100, 900, 1000)]).map((h) => h.damage)).toEqual([80]);
    expect(worldCutHits(C, [boss(100, 500, 1234)]).map((h) => h.damage)).toEqual([99]);
  });

  it('o chefe com 8% ou menos morre (o dano cobre o HP); com mais, fica vivo', () => {
    const [atEight] = worldCutHits(C, [boss(100, 80, 1000)]);
    expect(atEight.target.hp - atEight.damage).toBeLessThanOrEqual(0);
    const [above] = worldCutHits(C, [boss(100, 81, 1000)]);
    expect(above.target.hp - above.damage).toBe(1);
  });

  it('alvo a 321 px fica de fora; a 320 px entra; morto fica de fora', () => {
    const list = [common(1, 321, 5), boss(-321, 50), common(2, 320, 5), common(3, 10, 0)];
    expect(worldCutHits(C, list).map((h) => h.target.id)).toEqual([2]);
  });
});
