import { describe, expect, it } from 'vitest';
import { Hitstop } from '../../src/core/hitstop';
import { HITSTOP_MS } from '../../src/data/fx';

/** Números do spec ("Duração do hitstop"): 50 ms golpe leve, 90 ms golpe forte. */
const LIGHT = 50;
const HEAVY = 90;

describe('tuning real do hitstop (números do spec)', () => {
  it('HITSTOP_MS = { light: 50, heavy: 90 }', () => {
    expect(HITSTOP_MS).toEqual({ light: LIGHT, heavy: HEAVY });
  });
});

describe('Hitstop: congelamento por golpe (FX-01)', () => {
  it('começa descongelado', () => {
    expect(new Hitstop().frozen).toBe(false);
  });

  it('golpe leve congela por exatamente 50 ms', () => {
    const h = new Hitstop();
    h.trigger(HITSTOP_MS.light);
    expect(h.frozen).toBe(true);
    h.update(49);
    expect(h.frozen).toBe(true);
    h.update(1);
    expect(h.frozen).toBe(false);
  });

  it('golpe forte congela por exatamente 90 ms', () => {
    const h = new Hitstop();
    h.trigger(HITSTOP_MS.heavy);
    h.update(89);
    expect(h.frozen).toBe(true);
    h.update(1);
    expect(h.frozen).toBe(false);
  });

  it('um frame longo que passa do fim descongela e não deixa saldo negativo para o próximo golpe', () => {
    const h = new Hitstop();
    h.trigger(LIGHT);
    h.update(200);
    expect(h.frozen).toBe(false);
    h.trigger(LIGHT);
    h.update(49);
    expect(h.frozen).toBe(true);
  });

  it('update sem congelamento ativo não faz nada', () => {
    const h = new Hitstop();
    h.update(1000);
    expect(h.frozen).toBe(false);
  });

  it('trigger com 0 ms não congela', () => {
    const h = new Hitstop();
    h.trigger(0);
    expect(h.frozen).toBe(false);
  });
});

describe('Hitstop: sobreposição fica com o maior, nunca a soma (FX-02)', () => {
  it('forte durante um leve: vale o forte a partir de agora (90 ms), não 50 + 90', () => {
    const h = new Hitstop();
    h.trigger(LIGHT);
    h.update(20); // restam 30
    h.trigger(HEAVY);
    h.update(89);
    expect(h.frozen).toBe(true);
    h.update(1);
    expect(h.frozen).toBe(false);
  });

  it('leve durante um forte com mais tempo restante: continua o restante do forte', () => {
    const h = new Hitstop();
    h.trigger(HEAVY);
    h.update(10); // restam 80
    h.trigger(LIGHT);
    h.update(79);
    expect(h.frozen).toBe(true);
    h.update(1);
    expect(h.frozen).toBe(false);
  });

  it('dois leves no mesmo instante duram 50 ms, não 100', () => {
    const h = new Hitstop();
    h.trigger(LIGHT);
    h.trigger(LIGHT);
    h.update(50);
    expect(h.frozen).toBe(false);
  });

  it('leve quando o restante é menor: vale o novo leve inteiro', () => {
    const h = new Hitstop();
    h.trigger(HEAVY);
    h.update(80); // restam 10
    h.trigger(LIGHT);
    h.update(49);
    expect(h.frozen).toBe(true);
    h.update(1);
    expect(h.frozen).toBe(false);
  });
});

describe('Hitstop: reset (reinício durante o hitstop)', () => {
  it('reset() descongela na hora', () => {
    const h = new Hitstop();
    h.trigger(HEAVY);
    h.reset();
    expect(h.frozen).toBe(false);
  });

  it('depois do reset um golpe novo congela pelo tempo dele, sem sobra do anterior', () => {
    const h = new Hitstop();
    h.trigger(HEAVY);
    h.reset();
    h.trigger(LIGHT);
    h.update(50);
    expect(h.frozen).toBe(false);
  });
});
