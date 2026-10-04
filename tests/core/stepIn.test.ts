import { describe, expect, it } from 'vitest';
import { StepIn } from '../../src/core/stepIn';

/** Roda passos de `dt` ms até `totalMs` e devolve a soma e os passos. */
function run(s: StepIn, totalMs: number, dt = 10, blockedAt = Infinity): { sum: number; steps: number[] } {
  const steps: number[] = [];
  for (let t = 0; t < totalMs; t += dt) steps.push(s.update(dt, t >= blockedAt));
  return { sum: steps.reduce((a, b) => a + b, 0), steps };
}

describe('POS-07: golpe forte avança 10 px no startup', () => {
  it('soma exatamente 10 px ao fim do startup e nada depois', () => {
    const s = new StepIn();
    s.start('heavy', 200);
    expect(run(s, 200).sum).toBeCloseTo(10, 10);
    expect(run(s, 200).sum).toBe(0);
  });
  it('um pouco antes do fim ainda não completou; no fim sim (os dois lados)', () => {
    const s = new StepIn();
    s.start('heavy', 200);
    expect(run(s, 190).sum).toBeLessThan(10);
    expect(run(s, 10).sum + 0).toBeGreaterThan(0);
  });
  it('passo único maior que o startup também soma 10, sem passar', () => {
    const s = new StepIn();
    s.start('heavy', 200);
    expect(s.update(500, false)).toBeCloseTo(10, 10);
    expect(s.update(500, false)).toBe(0);
  });
});

describe('POS-08: golpe leve avança 4 px no startup', () => {
  it('soma 4 px terminando em startupMs', () => {
    const s = new StepIn();
    s.start('light', 60);
    const r = run(s, 60, 5);
    expect(r.sum).toBeCloseTo(4, 10);
    expect(run(s, 60).sum).toBe(0);
  });
});

describe('POS-09: contato para o avanço', () => {
  it('blocked no meio zera o resto', () => {
    const s = new StepIn();
    s.start('heavy', 200);
    const r = run(s, 200, 10, 100);
    expect(r.sum).toBeCloseTo(5, 10);
    expect(s.update(10, false)).toBe(0);
  });
  it('um novo start reinicia o avanço', () => {
    const s = new StepIn();
    s.start('heavy', 200);
    run(s, 200, 10, 50);
    s.start('light', 100);
    expect(run(s, 100).sum).toBeCloseTo(4, 10);
  });
  it('sem start não anda', () => {
    expect(new StepIn().update(10, false)).toBe(0);
  });
});
