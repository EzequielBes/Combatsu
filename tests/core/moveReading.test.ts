import { describe, expect, it } from 'vitest';
import { EnemyGuard, type GuardTrigger } from '../../src/core/enemyGuard';
import { LightStreak, MoveReading, baseConditionsHold, guardChance, readingBonus, shoveRoll } from '../../src/core/moveReading';
import { Rng } from '../../src/core/rng';
import { READING } from '../../src/data/moves';

/** Sorteio que grava a probabilidade pedida e responde `answer`. */
function fakeRoll(answer: boolean): { chance: (p: number) => boolean; asked: number[] } {
  const asked: number[] = [];
  return {
    asked,
    chance: (p: number) => {
      asked.push(p);
      return answer;
    },
  };
}

describe('READING (dados do design)', () => {
  it('tem os números do design: 3000 ms, +25% por repetição, 80 px, 4 leves, 1500 ms, 35%, 48 px, 150 ms, 300 ms', () => {
    expect(READING).toEqual({
      windowMs: 3000,
      perRepeat: 0.25,
      rangePx: 80,
      streakMin: 4,
      streakGapMs: 1500,
      shoveChance: 0.35,
      shovePx: 48,
      shoveMs: 150,
      shoveLockMs: 300,
    });
  });
});

describe('MoveReading.note (RDG-01)', () => {
  it('o 1º uso devolve 0 e o histórico passa a mostrar o golpe', () => {
    const r = new MoveReading();
    expect(r.last).toEqual({ move: null, repeats: 0 });
    expect(r.note('jab', 0)).toBe(0);
    expect(r.last).toEqual({ move: 'jab', repeats: 0 });
  });

  it('os usos seguintes do mesmo golpe contam, sem contar o atual', () => {
    const r = new MoveReading();
    expect(r.note('chuteFrontal', 0)).toBe(0);
    expect(r.note('chuteFrontal', 500)).toBe(1);
    expect(r.note('chuteFrontal', 1000)).toBe(2);
    expect(r.note('chuteFrontal', 1500)).toBe(3);
    expect(r.note('chuteFrontal', 2000)).toBe(4);
    expect(r.last).toEqual({ move: 'chuteFrontal', repeats: 4 });
  });

  it('um uso feito há 3000 ms conta e há 3001 ms não', () => {
    const at3000 = new MoveReading();
    at3000.note('jab', 0);
    expect(at3000.note('jab', 3000)).toBe(1);
    const at3001 = new MoveReading();
    at3001.note('jab', 0);
    expect(at3001.note('jab', 3001)).toBe(0);
  });

  it('só os usos dentro da janela entram: 0, 1500 e 3001 contam apenas o de 1500', () => {
    const r = new MoveReading();
    r.note('jab', 0);
    r.note('jab', 1500);
    expect(r.note('jab', 3001)).toBe(1);
  });

  it('golpes diferentes não se somam', () => {
    const r = new MoveReading();
    expect(r.note('jab', 0)).toBe(0);
    expect(r.note('direto', 100)).toBe(0);
    expect(r.last).toEqual({ move: 'direto', repeats: 0 });
    expect(r.note('jab', 200)).toBe(1); // só o jab de 0 ms
    expect(r.note('direto', 300)).toBe(1); // só o direto de 100 ms
    expect(r.last).toEqual({ move: 'direto', repeats: 1 });
  });

  it('reset() esvazia o histórico', () => {
    const r = new MoveReading();
    r.note('jab', 0);
    expect(r.note('jab', 10)).toBe(1);
    r.reset();
    expect(r.last).toEqual({ move: null, repeats: 0 });
    expect(r.note('jab', 20)).toBe(0);
  });

  it('usa a janela do tuning recebido (1000 ms): 1000 conta e 1001 não', () => {
    const a = new MoveReading({ windowMs: 1000 });
    a.note('jab', 0);
    expect(a.note('jab', 1000)).toBe(1);
    const b = new MoveReading({ windowMs: 1000 });
    b.note('jab', 0);
    expect(b.note('jab', 1001)).toBe(0);
  });
});

describe('readingBonus (RDG-02)', () => {
  it('0, 0,25, 0,5, 0,75 e 1 para 0 a 4 repetições', () => {
    expect([0, 1, 2, 3, 4].map((n) => readingBonus(n))).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('o teto é 1: 5 repetições e mais continuam em 1', () => {
    expect(readingBonus(5)).toBe(1);
    expect(readingBonus(12)).toBe(1);
  });

  it('usa o bônus por repetição do tuning recebido (0,1): 3 dão 0,3 e 11 chegam ao teto', () => {
    expect(readingBonus(3, { perRepeat: 0.1 })).toBeCloseTo(0.3, 10);
    expect(readingBonus(10, { perRepeat: 0.1 })).toBe(1);
    expect(readingBonus(11, { perRepeat: 0.1 })).toBe(1);
  });
});

describe('baseConditionsHold (RDG-03, condições do EBL-01)', () => {
  const NEAR: GuardTrigger = { round: 1, idle: true, playerFacingEnemy: true, distancePx: 40 };

  it('golpe leve, inimigo idle, jogador de frente e a 40 px: vale', () => {
    expect(baseConditionsHold(NEAR, 'light')).toBe(true);
  });

  it('60 px dentro e 61 px fora', () => {
    expect(baseConditionsHold({ ...NEAR, distancePx: 60 }, 'light')).toBe(true);
    expect(baseConditionsHold({ ...NEAR, distancePx: 61 }, 'light')).toBe(false);
  });

  it('golpe forte não vale, nem fora de idle, nem com o jogador de costas', () => {
    expect(baseConditionsHold(NEAR, 'heavy')).toBe(false);
    expect(baseConditionsHold({ ...NEAR, idle: false }, 'light')).toBe(false);
    expect(baseConditionsHold({ ...NEAR, playerFacingEnemy: false }, 'light')).toBe(false);
  });
});

describe('guardChance (RDG-03, RDG-10)', () => {
  it('sem override soma a base e a leitura', () => {
    expect(guardChance({ base: 0.1, reading: 0.25, baseConditions: true })).toBeCloseTo(0.35, 10);
  });

  it('sem override, com as condições base valendo e sem leitura, vale só a base', () => {
    expect(guardChance({ base: 0.1, reading: 0, baseConditions: true })).toBeCloseTo(0.1, 10);
  });

  it('sem override a soma tem teto 1', () => {
    expect(guardChance({ base: 0.4, reading: 1, baseConditions: true })).toBe(1);
    expect(guardChance({ base: 0.4, reading: 0.75, baseConditions: true })).toBe(1);
  });

  it('sem override e sem as condições base, a base some e fica só a leitura', () => {
    expect(guardChance({ base: 0.4, reading: 0.5, baseConditions: false })).toBe(0.5);
    expect(guardChance({ base: 0.4, reading: 0, baseConditions: false })).toBe(0);
  });

  it('com override e as condições base valendo devolve o override, sem somar a leitura', () => {
    expect(guardChance({ base: 0.1, reading: 0.5, override: 0.7, baseConditions: true })).toBe(0.7);
    expect(guardChance({ base: 0.1, reading: 0.5, override: 0, baseConditions: true })).toBe(0);
    expect(guardChance({ base: 0.1, reading: 0.5, override: 1, baseConditions: true })).toBe(1);
  });

  it('com override e sem as condições base devolve 0, mesmo com leitura', () => {
    expect(guardChance({ base: 0.1, reading: 1, override: 1, baseConditions: false })).toBe(0);
    expect(guardChance({ base: 0.1, reading: 0.5, override: 0.7, baseConditions: false })).toBe(0);
  });
});

describe('guardChance com EnemyGuard.tryRaise (RDG-03, RDG-04)', () => {
  const NEAR: GuardTrigger = { round: 1, idle: true, playerFacingEnemy: true, distancePx: 40 };
  /** Sorteia a guarda como o `Enemy.onPlayerMove`: a chance sai de `guardChance`, o sorteio de `tryRaise`. */
  const tryGuard = (trigger: GuardTrigger, repeats: number, roll: ReturnType<typeof fakeRoll>): boolean =>
    new EnemyGuard(roll).tryRaise(
      guardChance({
        base: EnemyGuard.chanceFor(trigger.round),
        reading: readingBonus(repeats),
        baseConditions: baseConditionsHold(trigger, 'light'),
      }),
      repeats > 0,
    );

  it('dentro das condições do EBL-01 e sem leitura, sorteia com a chance da rodada (60 px)', () => {
    const roll = fakeRoll(true);
    expect(tryGuard({ ...NEAR, distancePx: 60 }, 0, roll)).toBe(true);
    expect(roll.asked).toEqual([EnemyGuard.chanceFor(1)]);
  });

  it('61 px sem leitura: chance 0, nenhum sorteio e a guarda não sobe', () => {
    const roll = fakeRoll(true);
    expect(tryGuard({ ...NEAR, distancePx: 61 }, 0, roll)).toBe(false);
    expect(roll.asked).toEqual([]);
  });

  it('fora de idle ou com o jogador de costas, sem leitura: nenhum sorteio', () => {
    const roll = fakeRoll(true);
    expect(tryGuard({ ...NEAR, idle: false }, 0, roll)).toBe(false);
    expect(tryGuard({ ...NEAR, playerFacingEnemy: false }, 0, roll)).toBe(false);
    expect(roll.asked).toEqual([]);
  });

  it('fora das condições do EBL-01 mas com leitura, sorteia só com o bônus de leitura', () => {
    const roll = fakeRoll(true);
    expect(tryGuard({ ...NEAR, distancePx: 61 }, 2, roll)).toBe(true);
    expect(roll.asked).toEqual([0.5]);
  });
});

describe('LightStreak (RDG-13, RDG-14, RDG-15)', () => {
  it('começa em 0 e o 1º golpe leve leva a 1', () => {
    const s = new LightStreak();
    expect(s.count).toBe(0);
    expect(s.onLight(0)).toBe(1);
    expect(s.count).toBe(1);
  });

  it('1500 ms depois do leve anterior soma e 1501 ms volta a 1', () => {
    const soma = new LightStreak();
    soma.onLight(0);
    expect(soma.onLight(1500)).toBe(2);
    const volta = new LightStreak();
    volta.onLight(0);
    expect(volta.onLight(1501)).toBe(1);
    expect(volta.count).toBe(1);
  });

  it('o intervalo é medido até o leve anterior, não até o primeiro', () => {
    const s = new LightStreak();
    expect([0, 1000, 2000, 3000, 4000].map((t) => s.onLight(t))).toEqual([1, 2, 3, 4, 5]);
  });

  it('um intervalo longo no meio recomeça a contagem', () => {
    const s = new LightStreak();
    s.onLight(0);
    s.onLight(1000);
    s.onLight(2000);
    expect(s.onLight(3501)).toBe(1);
    expect(s.onLight(4000)).toBe(2);
  });

  it('onHeavy zera a contagem e o leve seguinte volta a 1', () => {
    const s = new LightStreak();
    s.onLight(0);
    s.onLight(100);
    s.onLight(200);
    expect(s.count).toBe(3);
    s.onHeavy();
    expect(s.count).toBe(0);
    expect(s.onLight(300)).toBe(1);
  });

  it('reset() zera a contagem', () => {
    const s = new LightStreak();
    s.onLight(0);
    s.onLight(100);
    s.reset();
    expect(s.count).toBe(0);
    expect(s.onLight(200)).toBe(1);
  });

  it('usa o intervalo do tuning recebido (400 ms): 400 soma e 401 volta a 1', () => {
    const a = new LightStreak({ streakGapMs: 400 });
    a.onLight(0);
    expect(a.onLight(400)).toBe(2);
    const b = new LightStreak({ streakGapMs: 400 });
    b.onLight(0);
    expect(b.onLight(401)).toBe(1);
  });
});

describe('shoveRoll (RDG-16, RDG-23)', () => {
  it('com streak 3 não sorteia e não empurra', () => {
    const roll = fakeRoll(true);
    expect(shoveRoll({ streak: 3, chance: 0.35, roll })).toBe(false);
    expect(roll.asked).toEqual([]);
  });

  it('com streak 4 sorteia uma vez com a chance recebida e devolve o resultado', () => {
    const yes = fakeRoll(true);
    expect(shoveRoll({ streak: 4, chance: 0.35, roll: yes })).toBe(true);
    expect(yes.asked).toEqual([0.35]);
    const no = fakeRoll(false);
    expect(shoveRoll({ streak: 4, chance: 0.35, roll: no })).toBe(false);
    expect(no.asked).toEqual([0.35]);
  });

  it('com streak acima de 4 também sorteia', () => {
    const roll = fakeRoll(true);
    expect(shoveRoll({ streak: 7, chance: 0.2, roll })).toBe(true);
    expect(roll.asked).toEqual([0.2]);
  });

  it('com o Rng da run, chance 1 sempre empurra e chance 0 nunca, sem consumir o stream', () => {
    const rng = new Rng(11);
    expect(shoveRoll({ streak: 4, chance: 1, roll: rng })).toBe(true);
    expect(shoveRoll({ streak: 4, chance: 0, roll: rng })).toBe(false);
    expect(rng.next()).toBe(new Rng(11).next());
  });

  it('usa o mínimo de leves do tuning recebido (2): 1 não sorteia e 2 sorteia', () => {
    const roll = fakeRoll(true);
    expect(shoveRoll({ streak: 1, chance: 0.5, roll }, { streakMin: 2 })).toBe(false);
    expect(roll.asked).toEqual([]);
    expect(shoveRoll({ streak: 2, chance: 0.5, roll }, { streakMin: 2 })).toBe(true);
    expect(roll.asked).toEqual([0.5]);
  });
});
