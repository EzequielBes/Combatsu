import { describe, expect, it } from 'vitest';
import { RecordBook, isBetter } from '../../src/core/recordBook';
import type { RunState } from '../../src/core/run';
import type { RunRecord } from '../../src/core/save';

const EMPTY_BUILD = { techniques: [], perks: [], relic: null, weapon: null, vows: [] };
const rec = (round: number, kills: number): RunRecord => ({ round, kills, build: EMPTY_BUILD });

describe('isBetter (REC-02)', () => {
  const best = rec(5, 20);

  it('mesma rodada: mais abates ganha; abates iguais ou menos perdem (L-010)', () => {
    expect(isBetter({ round: 5, kills: 21 }, best)).toBe(true);
    expect(isBetter({ round: 5, kills: 20 }, best)).toBe(false);
    expect(isBetter({ round: 5, kills: 19 }, best)).toBe(false);
  });

  it('rodada maior ganha mesmo com menos abates; rodada menor perde mesmo com mais abates', () => {
    expect(isBetter({ round: 6, kills: 0 }, best)).toBe(true);
    expect(isBetter({ round: 4, kills: 999 }, best)).toBe(false);
  });

  it('sem recorde qualquer run é melhor, até a r1 com 0 abates', () => {
    expect(isBetter({ round: 1, kills: 0 }, null)).toBe(true);
  });
});

describe('RecordBook.death (REC-01, REC-03, REC-09)', () => {
  it('run melhor vira o recorde e pede uma escrita', () => {
    const book = new RecordBook(rec(3, 10));
    const run = rec(4, 2);
    expect(book.death(run, { canRecord: true })).toEqual({ newRecord: true, write: true });
    expect(book.best).toEqual(run);
    expect(book.lastDeathNewRecord).toBe(true);
  });

  it('a primeira run sem recorde vira o recorde', () => {
    const book = new RecordBook(null);
    expect(book.death(rec(1, 0), { canRecord: true })).toEqual({ newRecord: true, write: true });
    expect(book.best).toEqual(rec(1, 0));
  });

  it('empate exato mantém o recorde antigo e não escreve', () => {
    const old = rec(3, 10);
    const book = new RecordBook(old);
    expect(book.death(rec(3, 10), { canRecord: true })).toEqual({ newRecord: false, write: false });
    expect(book.best).toBe(old);
    expect(book.lastDeathNewRecord).toBe(false);
  });

  it('run pior mantém o recorde antigo e não escreve', () => {
    const old = rec(3, 10);
    const book = new RecordBook(old);
    expect(book.death(rec(2, 50), { canRecord: true })).toEqual({ newRecord: false, write: false });
    expect(book.best).toBe(old);
  });

  it('canRecord falso não troca nada, nem com run melhor nem sem recorde', () => {
    const old = rec(3, 10);
    const book = new RecordBook(old);
    expect(book.death(rec(9, 99), { canRecord: false })).toEqual({ newRecord: false, write: false });
    expect(book.best).toBe(old);
    expect(book.lastDeathNewRecord).toBe(false);

    const empty = new RecordBook(null);
    expect(empty.death(rec(9, 99), { canRecord: false })).toEqual({ newRecord: false, write: false });
    expect(empty.best).toBeNull();
  });

  it('lastDeathNewRecord acompanha a última morte: recorde e depois empate', () => {
    const book = new RecordBook(null);
    book.death(rec(2, 5), { canRecord: true });
    expect(book.lastDeathNewRecord).toBe(true);
    book.startRun();
    book.death(rec(2, 5), { canRecord: true });
    expect(book.lastDeathNewRecord).toBe(false);
    expect(book.best).toEqual(rec(2, 5));
  });
});

describe('RecordBook.marker (RMK-01, RMK-03, RMK-04, RMK-07)', () => {
  const FIGHT: RunState[] = ['roundActive', 'intermission', 'traverse', 'shop'];

  it('sem recorde fica escondido em todo estado', () => {
    const book = new RecordBook(null);
    for (const state of [...FIGHT, 'title', 'gameOver'] as RunState[]) {
      expect(book.marker(1, state).visible).toBe(false);
    }
  });

  it('com recorde aparece em roundActive, intermission, traverse e shop com Recorde: rN', () => {
    const book = new RecordBook(rec(4, 0));
    for (const state of FIGHT) {
      expect(book.marker(2, state)).toEqual({ visible: true, text: 'Recorde: r4', highlight: false });
    }
  });

  it('em title e gameOver some mesmo com recorde', () => {
    const book = new RecordBook(rec(4, 0));
    expect(book.marker(2, 'title').visible).toBe(false);
    expect(book.marker(2, 'gameOver').visible).toBe(false);
  });

  it('na rodada do recorde não destaca; acima mostra a rodada atual com destaque', () => {
    const book = new RecordBook(rec(4, 0));
    expect(book.marker(4, 'roundActive')).toEqual({ visible: true, text: 'Recorde: r4', highlight: false });
    expect(book.marker(5, 'roundActive')).toEqual({ visible: true, text: 'Recorde: r5', highlight: true });
    expect(book.marker(7, 'shop')).toEqual({ visible: true, text: 'Recorde: r7', highlight: true });
  });

  it('passed só vira verdadeiro acima do recorde e volta a falso na run nova', () => {
    const book = new RecordBook(rec(4, 0));
    book.marker(4, 'roundActive');
    expect(book.passed).toBe(false);
    book.marker(5, 'roundActive');
    expect(book.passed).toBe(true);
    book.startRun();
    expect(book.passed).toBe(false);
  });
});

describe('RecordBook.roundBanner (RMK-05, RMK-06)', () => {
  it('comemora só na rodada recorde + 1', () => {
    const book = new RecordBook(rec(3, 0));
    expect(book.roundBanner(2)).toBe('Rodada 2');
    expect(book.roundBanner(3)).toBe('Rodada 3');
    expect(book.roundBanner(4)).toBe('Rodada 4 · Novo recorde!');
    expect(book.roundBanner(5)).toBe('Rodada 5');
  });

  it('uma vez por run: repetir a rodada recorde + 1 não comemora de novo', () => {
    const book = new RecordBook(rec(3, 0));
    expect(book.roundBanner(4)).toBe('Rodada 4 · Novo recorde!');
    expect(book.roundBanner(4)).toBe('Rodada 4');
  });

  it('volta a comemorar depois de startRun', () => {
    const book = new RecordBook(rec(3, 0));
    book.roundBanner(4);
    book.startRun();
    expect(book.roundBanner(4)).toBe('Rodada 4 · Novo recorde!');
  });

  it('a rodada que passa do recorde marca passed', () => {
    const book = new RecordBook(rec(3, 0));
    book.roundBanner(3);
    expect(book.passed).toBe(false);
    book.roundBanner(4);
    expect(book.passed).toBe(true);
  });

  it('sem recorde nunca comemora, nem marca passed', () => {
    const book = new RecordBook(null);
    for (let round = 1; round <= 5; round++) expect(book.roundBanner(round)).toBe(`Rodada ${round}`);
    expect(book.passed).toBe(false);
  });

  it('a run nova comemora contra o recorde gravado pela última morte', () => {
    const book = new RecordBook(rec(2, 0));
    book.death(rec(5, 9), { canRecord: true });
    book.startRun();
    expect(book.roundBanner(3)).toBe('Rodada 3');
    expect(book.roundBanner(6)).toBe('Rodada 6 · Novo recorde!');
  });
});

describe('RecordBook.bossBanner (RMK-05, RMK-06 na rodada de chefe)', () => {
  it('a rodada de chefe recorde + 1 não comemora no banner da rodada e deixa a vez para a faixa do chefe', () => {
    const book = new RecordBook(rec(4, 0));
    expect(book.roundBanner(5)).toBe('Rodada 5');
    expect(book.passed).toBe(true);
    expect(book.bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão · Novo recorde!');
  });

  it('a faixa do chefe comemora uma vez por run e volta depois de startRun', () => {
    const book = new RecordBook(rec(4, 0));
    book.roundBanner(5);
    expect(book.bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão · Novo recorde!');
    expect(book.bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão');
    expect(book.roundBanner(6)).toBe('Rodada 6');
    book.startRun();
    expect(book.bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão · Novo recorde!');
  });

  it('só a rodada de chefe recorde + 1 comemora; sem recorde nunca', () => {
    expect(new RecordBook(rec(3, 0)).bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão');
    expect(new RecordBook(rec(9, 0)).bossBanner('Oni do Portão', 10)).toBe('Chefe: Oni do Portão · Novo recorde!');
    expect(new RecordBook(null).bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão');
  });

  it('depois de comemorar na rodada comum, a faixa do chefe seguinte não comemora de novo', () => {
    const book = new RecordBook(rec(3, 0));
    expect(book.roundBanner(4)).toBe('Rodada 4 · Novo recorde!');
    expect(book.bossBanner('Oni do Portão', 5)).toBe('Chefe: Oni do Portão');
  });
});
