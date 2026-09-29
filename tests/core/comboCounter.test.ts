import { describe, expect, it } from 'vitest';
import { ComboCounter } from '../../src/core/comboCounter';

const NAMES = ['jab', 'direto', 'gancho', 'cotovelada', 'chuteFrontal', 'chuteAlto', 'joelhada'];

/** Acerta `n` golpes distintos, um por vez. */
function withDistinct(n: number): ComboCounter {
  const c = new ComboCounter();
  for (let i = 0; i < n; i++) c.hit(NAMES[i]);
  return c;
}

describe('CMB-01: cada golpe acertado soma um hit', () => {
  it('começa em 0 com nota null', () => {
    const c = new ComboCounter();
    expect([c.hits, c.grade]).toEqual([0, null]);
  });

  it('cada acerto soma 1, inclusive do mesmo golpe repetido', () => {
    const c = new ComboCounter();
    c.hit('jab');
    expect(c.hits).toBe(1);
    c.hit('jab');
    expect(c.hits).toBe(2);
    c.hit('direto');
    expect(c.hits).toBe(3);
  });
});

describe('CMB-02: expira em 1500 ms sem acerto ou ao levar dano', () => {
  it('1499 ms depois do último acerto o combo continua', () => {
    const c = new ComboCounter();
    c.hit('jab');
    c.hit('direto');
    c.update(1499);
    expect(c.hits).toBe(2);
    expect(c.grade).toBe('D');
  });

  it('1500 ms depois do último acerto zera hits e nota', () => {
    const c = new ComboCounter();
    c.hit('jab');
    c.hit('direto');
    c.update(1500);
    expect([c.hits, c.grade]).toEqual([0, null]);
  });

  it('um novo acerto reinicia os 1500 ms', () => {
    const c = new ComboCounter();
    c.hit('jab');
    c.update(1000);
    c.hit('direto');
    c.update(1000);
    expect(c.hits).toBe(2);
  });

  it('levar dano zera hits, nota e os golpes distintos', () => {
    const c = withDistinct(4);
    c.playerDamaged();
    expect([c.hits, c.grade, c.distinctMoves]).toEqual([0, null, 0]);
  });

  it('depois de zerar, o combo novo não herda os golpes do antigo', () => {
    const c = withDistinct(5);
    c.update(1500);
    c.hit('jab');
    c.hit('jab');
    expect(c.grade).toBe('D');
  });
});

describe('CMB-03: nota pelos golpes distintos com 2 hits ou mais', () => {
  it('1 hit não tem nota, mesmo com 1 golpe', () => {
    expect(withDistinct(1).grade).toBeNull();
  });

  it('2 hits do mesmo golpe = D', () => {
    const c = new ComboCounter();
    c.hit('jab');
    c.hit('jab');
    expect(c.grade).toBe('D');
  });

  it('2 golpes distintos = D', () => {
    expect(withDistinct(2).grade).toBe('D');
  });

  it('3 golpes distintos = C', () => {
    expect(withDistinct(3).grade).toBe('C');
  });

  it('4 golpes distintos = B', () => {
    expect(withDistinct(4).grade).toBe('B');
  });

  it('5 golpes distintos = A', () => {
    expect(withDistinct(5).grade).toBe('A');
  });

  it('6 golpes distintos = S', () => {
    expect(withDistinct(6).grade).toBe('S');
  });

  it('7 golpes distintos = S', () => {
    expect(withDistinct(7).grade).toBe('S');
  });

  it('repetir golpes não sobe a nota (6 hits de 2 golpes = D)', () => {
    const c = new ComboCounter();
    for (let i = 0; i < 3; i++) {
      c.hit('jab');
      c.hit('direto');
    }
    expect([c.hits, c.grade]).toEqual([6, 'D']);
  });
});
