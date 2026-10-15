import { describe, expect, it } from 'vitest';
import { colorsFor, DamageBook, sizeFor, type DamageKind } from '../../src/core/damageNumber';

const SCALED: DamageKind[] = ['strike', 'tech', 'crit', 'kokusen'];

describe('sizeFor (POW-05.1)', () => {
  it.each(SCALED)('%s: 12 px em 14, 16 px em 15 e 39, 20 px em 40', (kind) => {
    expect(sizeFor(14, kind)).toBe(12);
    expect(sizeFor(15, kind)).toBe(16);
    expect(sizeFor(39, kind)).toBe(16);
    expect(sizeFor(40, kind)).toBe(20);
  });

  it.each(['micro', 'chip'] as DamageKind[])('%s fica sempre em 12 px', (kind) => {
    expect(sizeFor(14, kind)).toBe(12);
    expect(sizeFor(15, kind)).toBe(12);
    expect(sizeFor(40, kind)).toBe(12);
    expect(sizeFor(999, kind)).toBe(12);
  });
});

describe('colorsFor (POW-05.2)', () => {
  it('cada tipo tem a sua cor e o contorno k, menos o Kokusen (b com contorno R)', () => {
    expect(colorsFor('strike')).toEqual({ fill: 'w', outline: 'k' });
    expect(colorsFor('tech')).toEqual({ fill: 'c', outline: 'k' });
    expect(colorsFor('crit')).toEqual({ fill: 'A', outline: 'k' });
    expect(colorsFor('kokusen')).toEqual({ fill: 'b', outline: 'R' });
    expect(colorsFor('micro')).toEqual({ fill: 'c', outline: 'k' });
    expect(colorsFor('chip')).toEqual({ fill: 'S', outline: 'k' });
  });
});

describe('DamageBook: fusão por alvo (POW-05.3, POW-05.4)', () => {
  it('acerto a 300 ms do último somado entra no mesmo número e reinicia a vida', () => {
    const book = new DamageBook();
    const first = book.add(1, 10, 'strike', 0);
    const second = book.add(1, 7, 'strike', 300);
    expect(second.merged).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.value).toBe(17);
    expect(book.live).toBe(1);
    expect(book.last).toEqual({ value: 17, kind: 'strike' });
    // A vida conta do último acerto somado (300), não do primeiro (0).
    expect(book.expire(999)).toEqual([]);
    expect(book.live).toBe(1);
  });

  it('a janela conta do último acerto somado: três acertos a 300 ms viram um número só', () => {
    const book = new DamageBook();
    book.add(1, 5, 'strike', 0);
    book.add(1, 5, 'strike', 300);
    const third = book.add(1, 5, 'strike', 600);
    expect(third.merged).toBe(true);
    expect(third.entry.value).toBe(15);
    expect(book.live).toBe(1);
  });

  it('acerto a 301 ms abre um número novo', () => {
    const book = new DamageBook();
    const first = book.add(1, 10, 'strike', 0);
    const second = book.add(1, 7, 'strike', 301);
    expect(second.merged).toBe(false);
    expect(second.entry.id).not.toBe(first.entry.id);
    expect(second.entry.value).toBe(7);
    expect(first.entry.value).toBe(10);
    expect(book.live).toBe(2);
    expect(book.last).toEqual({ value: 7, kind: 'strike' });
  });

  it('acerto em outro alvo nunca funde', () => {
    const book = new DamageBook();
    book.add(1, 10, 'strike', 0);
    const other = book.add(2, 4, 'strike', 10);
    expect(other.merged).toBe(false);
    expect(other.entry.value).toBe(4);
    expect(book.live).toBe(2);
  });

  it('na fusão fica o tipo de maior prioridade: Kokusen, crit, tech, strike, micro, chip', () => {
    const order: DamageKind[] = ['kokusen', 'crit', 'tech', 'strike', 'micro', 'chip'];
    for (let hi = 0; hi < order.length; hi++) {
      for (let lo = hi + 1; lo < order.length; lo++) {
        const up = new DamageBook();
        up.add(1, 1, order[lo], 0);
        expect(up.add(1, 1, order[hi], 100).entry.kind).toBe(order[hi]);
        const down = new DamageBook();
        down.add(1, 1, order[hi], 0);
        expect(down.add(1, 1, order[lo], 100).entry.kind).toBe(order[hi]);
      }
    }
  });
});

describe('DamageBook: teto de 12 (POW-05.5)', () => {
  /** 12 números vivos em 12 alvos (ids 1 a 12), um a cada 10 ms. */
  function fullBook(): DamageBook {
    const book = new DamageBook();
    for (let t = 1; t <= 12; t++) book.add(t, t, 'strike', t * 10);
    return book;
  }

  it('12 alvos cabem; o 13º alvo despeja o número mais antigo', () => {
    const book = fullBook();
    expect(book.live).toBe(12);
    const change = book.add(13, 50, 'tech', 200);
    expect(change.merged).toBe(false);
    expect(change.evicted).toBe(1);
    expect(change.entry.value).toBe(50);
    expect(book.live).toBe(12);
    // O alvo 1 perdeu o número: um acerto nele agora abre outro (e despeja o seguinte mais antigo, o do alvo 2).
    const back = book.add(1, 3, 'strike', 210);
    expect(back.merged).toBe(false);
    expect(back.evicted).toBe(2);
    expect(book.live).toBe(12);
  });

  it('cheio, acerto fora da janela funde no número mais recente do mesmo alvo em vez de abrir outro', () => {
    const book = fullBook();
    const change = book.add(5, 20, 'crit', 400);
    expect(change.merged).toBe(true);
    expect(change.evicted).toBeNull();
    expect(change.entry.value).toBe(25);
    expect(change.entry.kind).toBe('crit');
    expect(book.live).toBe(12);
  });

  it('cheio com dois números do mesmo alvo, funde no mais recente', () => {
    const book = new DamageBook();
    const old = book.add(1, 10, 'strike', 0);
    const recent = book.add(1, 20, 'strike', 400);
    for (let t = 2; t <= 11; t++) book.add(t, 1, 'strike', 400 + t);
    expect(book.live).toBe(12);
    const change = book.add(1, 5, 'strike', 800);
    expect(change.entry.id).toBe(recent.entry.id);
    expect(change.entry.value).toBe(25);
    expect(old.entry.value).toBe(10);
    expect(book.live).toBe(12);
  });
});

describe('DamageBook: promote, expire e clear', () => {
  it('promote troca o tipo do número mais recente do alvo para o Kokusen sem mudar o valor', () => {
    const book = new DamageBook();
    book.add(1, 30, 'tech', 0);
    const change = book.promote(1, 'kokusen');
    expect(change?.entry.kind).toBe('kokusen');
    expect(change?.entry.value).toBe(30);
    expect(book.live).toBe(1);
    expect(book.last).toEqual({ value: 30, kind: 'kokusen' });
  });

  it('promote nunca rebaixa e devolve null sem número do alvo', () => {
    const book = new DamageBook();
    book.add(1, 30, 'kokusen', 0);
    expect(book.promote(1, 'tech')?.entry.kind).toBe('kokusen');
    expect(book.promote(2, 'kokusen')).toBeNull();
  });

  it('expire tira o número aos 700 ms do último acerto somado e devolve os ids', () => {
    const book = new DamageBook();
    const a = book.add(1, 10, 'strike', 0);
    const b = book.add(2, 10, 'strike', 100);
    expect(book.expire(699)).toEqual([]);
    expect(book.live).toBe(2);
    expect(book.expire(700)).toEqual([a.entry.id]);
    expect(book.live).toBe(1);
    expect(book.expire(800)).toEqual([b.entry.id]);
    expect(book.live).toBe(0);
  });

  it('clear some com tudo e zera o último', () => {
    const book = new DamageBook();
    book.add(1, 10, 'strike', 0);
    book.add(2, 10, 'tech', 0);
    book.clear();
    expect(book.live).toBe(0);
    expect(book.last).toBeNull();
    expect(book.promote(1, 'kokusen')).toBeNull();
  });
});
