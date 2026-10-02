import { describe, expect, it } from 'vitest';
import { Mastery } from '../../src/core/mastery';
import { MASTERY } from '../../src/data/tuning';

/** Acerta `n` inimigos comuns distintos numa mesma conjuração; devolve o último resultado. */
function hitMany(m: Mastery, level: 1 | 2 | 3, n: number, castId = 1): { levelUp: boolean } {
  let last = { levelUp: false };
  for (let i = 0; i < n; i++) last = m.registerHit(0, level, castId, `e${castId}-${i}`, false);
  return last;
}

describe('MASTERY (tuning padrão)', () => {
  it('limiares 15 e 25, chefe vale 3', () => {
    expect(MASTERY).toEqual({ thresholds: { 1: 15, 2: 25 }, bossPoints: 3 });
  });
});

describe('Mastery: limiar do Nv1 (MST-03)', () => {
  it('14 pontos não sobem de nível; o 15º sobe e zera os pontos', () => {
    const m = new Mastery();
    expect(hitMany(m, 1, 14).levelUp).toBe(false);
    expect(m.points(0)).toBe(14);
    expect(m.registerHit(0, 1, 1, 'e1-14', false).levelUp).toBe(true);
    expect(m.points(0)).toBe(0);
  });
});

describe('Mastery: limiar do Nv2 (MST-04)', () => {
  it('24 pontos não sobem de nível; o 25º sobe e zera os pontos', () => {
    const m = new Mastery();
    expect(hitMany(m, 2, 24).levelUp).toBe(false);
    expect(m.points(0)).toBe(24);
    expect(m.registerHit(0, 2, 1, 'e1-24', false).levelUp).toBe(true);
    expect(m.points(0)).toBe(0);
  });

  it('15 pontos no Nv2 não sobem (o limiar vale para o nível atual)', () => {
    expect(hitMany(new Mastery(), 2, 15).levelUp).toBe(false);
  });
});

describe('Mastery: deduplicação por (conjuração, alvo) (MST-01)', () => {
  it('o mesmo alvo na mesma conjuração conta 1 vez', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 7, 'a', false);
    m.registerHit(0, 1, 7, 'a', false);
    expect(m.points(0)).toBe(1);
  });

  it('o mesmo alvo em conjurações diferentes conta 2 vezes', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 7, 'a', false);
    m.registerHit(0, 1, 8, 'a', false);
    expect(m.points(0)).toBe(2);
  });

  it('alvos diferentes na mesma conjuração contam cada um', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 7, 'a', false);
    m.registerHit(0, 1, 7, 'b', false);
    expect(m.points(0)).toBe(2);
  });

  it('cada slot pontua à parte', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 7, 'a', false);
    m.registerHit(1, 1, 7, 'a', false);
    expect(m.points(0)).toBe(1);
    expect(m.points(1)).toBe(1);
  });
});

describe('Mastery: chefe (MST-02)', () => {
  it('o primeiro acerto no chefe numa conjuração soma 3; o repetido não soma', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 1, 'boss', true);
    m.registerHit(0, 1, 1, 'boss', true);
    expect(m.points(0)).toBe(3);
  });

  it('o chefe empurra do 12 para o 15 e sobe de nível; do 11 para o 14 não sobe', () => {
    const a = new Mastery();
    a.setPoints(0, 12);
    expect(a.registerHit(0, 1, 1, 'boss', true).levelUp).toBe(true);
    const b = new Mastery();
    b.setPoints(0, 11);
    expect(b.registerHit(0, 1, 1, 'boss', true).levelUp).toBe(false);
    expect(b.points(0)).toBe(14);
  });
});

describe('Mastery: Nv3 não acumula (MST-05)', () => {
  it('no Nv3 os pontos ficam em 0 e nunca sobe', () => {
    const m = new Mastery();
    const r = hitMany(m, 3, 40);
    expect(r.levelUp).toBe(false);
    expect(m.points(0)).toBe(0);
    expect(m.registerHit(0, 3, 99, 'boss', true).levelUp).toBe(false);
    expect(m.points(0)).toBe(0);
  });

  it('threshold: 15 no Nv1, 25 no Nv2, null no Nv3', () => {
    const m = new Mastery();
    expect([m.threshold(1), m.threshold(2), m.threshold(3)]).toEqual([15, 25, null]);
  });
});

describe('Mastery: independe da rodada (MST-06)', () => {
  it('a API não recebe rodada: 15 pontos sobem de nível no mesmo estado, em qualquer rodada', () => {
    const m = new Mastery();
    expect(hitMany(m, 1, 15).levelUp).toBe(true);
  });
});

describe('Mastery: resetSlot, reset e setPoints', () => {
  it('resetSlot zera só o slot e libera a deduplicação dele', () => {
    const m = new Mastery();
    m.registerHit(0, 1, 1, 'a', false);
    m.registerHit(1, 1, 1, 'a', false);
    m.resetSlot(0);
    expect(m.points(0)).toBe(0);
    expect(m.points(1)).toBe(1);
    m.registerHit(0, 1, 1, 'a', false);
    expect(m.points(0)).toBe(1);
  });

  it('reset zera os dois slots', () => {
    const m = new Mastery();
    m.setPoints(0, 9);
    m.setPoints(1, 4);
    m.reset();
    expect([m.points(0), m.points(1)]).toEqual([0, 0]);
  });

  it('setPoints(14) deixa o próximo acerto subir de nível (atalho de debug)', () => {
    const m = new Mastery();
    m.setPoints(0, 14);
    expect(m.registerHit(0, 1, 1, 'a', false).levelUp).toBe(true);
  });
});

describe('Mastery: tuning não padrão', () => {
  it('limiares 3/5 e chefe 2: sobe com 3 comuns no Nv1 e com 4 + chefe no Nv2', () => {
    const t = { thresholds: { 1: 3, 2: 5 }, bossPoints: 2 };
    const a = new Mastery(t);
    expect(hitMany(a, 1, 2).levelUp).toBe(false);
    expect(a.registerHit(0, 1, 1, 'x', false).levelUp).toBe(true);
    const b = new Mastery(t);
    expect(hitMany(b, 2, 3).levelUp).toBe(false);
    expect(b.registerHit(0, 2, 1, 'x', true).levelUp).toBe(true);
  });
});
