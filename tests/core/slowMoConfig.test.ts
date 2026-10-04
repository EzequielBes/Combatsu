import { describe, expect, it } from 'vitest';
import { SlowMo } from '../../src/core/slowMo';

describe('CAM-03/07/08: trigger(0.4, 350)', () => {
  it('escala 0.4 até 350 ms reais e 1 depois (os dois lados da borda)', () => {
    const s = new SlowMo();
    s.trigger(0.4, 350);
    expect(s.timeScale).toBe(0.4);
    s.update(349);
    expect(s.active).toBe(true);
    expect(s.timeScale).toBe(0.4);
    s.update(1);
    expect(s.active).toBe(false);
    expect(s.timeScale).toBe(1);
  });
});

describe('CAM-04: novo trigger reinicia sem empilhar', () => {
  it('um segundo trigger aos 200 ms vai até 550 ms, com escala 0.4', () => {
    const s = new SlowMo();
    s.trigger(0.4, 350);
    s.update(200);
    s.trigger(0.4, 350);
    s.update(349);
    expect(s.timeScale).toBe(0.4);
    s.update(1);
    expect(s.timeScale).toBe(1);
  });
  it('a escala não empilha (0.4 e não 0.16)', () => {
    const s = new SlowMo();
    s.trigger(0.4, 350);
    s.update(100);
    s.trigger(0.4, 350);
    expect(s.timeScale).toBe(0.4);
  });
});

describe('o padrão continua o da esquiva perfeita', () => {
  it('trigger() sem argumentos usa 0,3 por 400 ms, mesmo depois de um trigger configurado', () => {
    const s = new SlowMo();
    s.trigger(0.4, 350);
    s.trigger();
    expect(s.timeScale).toBe(0.3);
    s.update(399);
    expect(s.active).toBe(true);
    s.update(1);
    expect(s.active).toBe(false);
  });
});
