import { describe, expect, it } from 'vitest';
import { CursedEnergy, cursedEnergyMaxAtLevel, cursedEnergyRegenAtLevel } from '../../src/core/energy';

describe('CE-01: energia de uma run nova é 100/100, regen 8/s', () => {
  it('cur = 100, max = 100, regen = 8 na criação', () => {
    const e = new CursedEnergy();
    expect(e.cur).toBe(100);
    expect(e.max).toBe(100);
    expect(e.regen).toBe(8);
  });
});

describe('CE-02, CE-03: energia nunca sai de [0, max]', () => {
  it('gain além do max recorta em max', () => {
    const e = new CursedEnergy();
    e.gain(1000);
    expect(e.cur).toBe(100);
  });

  it('trySpend não deixa a energia abaixo de 0 e recusa quando falta saldo', () => {
    const e = new CursedEnergy();
    expect(e.trySpend(150)).toBe(false);
    expect(e.cur).toBe(100); // recusado: nada muda
    expect(e.trySpend(100)).toBe(true);
    expect(e.cur).toBe(0);
  });
});

describe('CE-04: regen por frame de jogo quando não há conjuração em andamento', () => {
  it('1000 ms sem conjurar regenera exatamente `regen` (8) a partir de 0', () => {
    const e = new CursedEnergy();
    e.trySpend(100);
    e.update(1000, false);
    expect(e.cur).toBeCloseTo(8, 6);
  });

  it('regen é proporcional a dt (500 ms → metade do regen) e tem teto no max', () => {
    const e = new CursedEnergy();
    e.trySpend(5);
    expect(e.cur).toBe(95);
    e.update(500, false);
    expect(e.cur).toBeCloseTo(95 + 4, 6);
    e.update(100000, false);
    expect(e.cur).toBe(100); // teto
  });
});

describe('CE-05: nenhuma regeneração enquanto uma conjuração está em andamento', () => {
  it('update(dt, true) não muda cur mesmo com dt grande', () => {
    const e = new CursedEnergy();
    e.trySpend(20);
    expect(e.cur).toBe(80);
    e.update(5000, true);
    expect(e.cur).toBe(80);
  });
});

describe('CE-07: teto de energia por nível de `energia`, min(100 + 20n, 200), dos dois lados do teto (L-010)', () => {
  it('nível 4 → 180 (abaixo do teto)', () => {
    expect(cursedEnergyMaxAtLevel(4)).toBe(180);
  });

  it('nível 5 → 200 (exatamente no teto)', () => {
    expect(cursedEnergyMaxAtLevel(5)).toBe(200);
  });

  it('nível 6 → 200 (fórmula daria 220, recortada no teto)', () => {
    expect(cursedEnergyMaxAtLevel(6)).toBe(200);
  });

  it('nível 0 → 100 (energia base, sem upgrade)', () => {
    expect(cursedEnergyMaxAtLevel(0)).toBe(100);
  });
});

describe('CE-09: regen por nível de `fluxo`, min(8 + 2n, 16), dos dois lados do teto (L-010)', () => {
  it('nível 3 → 14 (abaixo do teto)', () => {
    expect(cursedEnergyRegenAtLevel(3)).toBe(14);
  });

  it('nível 4 → 16 (exatamente no teto)', () => {
    expect(cursedEnergyRegenAtLevel(4)).toBe(16);
  });

  it('nível 5 → 16 (fórmula daria 18, recortada no teto)', () => {
    expect(cursedEnergyRegenAtLevel(5)).toBe(16);
  });

  it('nível 0 → 8 (regen base, sem upgrade)', () => {
    expect(cursedEnergyRegenAtLevel(0)).toBe(8);
  });
});

describe('CursedEnergy.setLevels: aplica os tetos de energia/fluxo (TSH-10, TSH-11)', () => {
  it('setLevels(5, 4) sobe max para 200 e regen para 16, mantendo cur recortado no novo max', () => {
    const e = new CursedEnergy();
    e.setLevels(5, 4);
    expect(e.max).toBe(200);
    expect(e.regen).toBe(16);
    expect(e.cur).toBe(100); // cur não sobe sozinho, só o teto
  });
});

describe('CursedEnergy.reset: volta a 100/100/8 (CE-01, nova run)', () => {
  it('depois de gastar e subir upgrades, reset volta ao estado inicial', () => {
    const e = new CursedEnergy();
    e.trySpend(50);
    e.setLevels(5, 4);
    e.reset();
    expect(e.cur).toBe(100);
    expect(e.max).toBe(100);
    expect(e.regen).toBe(8);
  });
});
