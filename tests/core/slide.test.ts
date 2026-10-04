import { describe, expect, it } from 'vitest';
import { Slide } from '../../src/core/slide';

function run(s: Slide, totalMs: number, dt = 10, blockedAt = Infinity): number {
  let sum = 0;
  for (let t = 0; t < totalMs; t += dt) sum += s.update(dt, t >= blockedAt);
  return sum;
}

describe('RCT-01: heavy desliza 24 px em 180 ms', () => {
  it('soma 24 px na direção dada ao fim de 180 ms', () => {
    const s = new Slide();
    s.start('heavy', 1);
    expect(run(s, 180)).toBeCloseTo(24, 10);
  });
  it('aos 170 ms ainda falta; depois de 180 ms não anda mais', () => {
    const s = new Slide();
    s.start('heavy', 1);
    expect(run(s, 170)).toBeLessThan(24);
    run(s, 10);
    expect(run(s, 100)).toBe(0);
  });
  it('direção -1 desliza para a esquerda', () => {
    const s = new Slide();
    s.start('heavy', -1);
    expect(run(s, 180)).toBeCloseTo(-24, 10);
  });
});

describe('RCT-02: decisive desliza 48 px em 240 ms', () => {
  it('soma 48 px ao fim de 240 ms', () => {
    const s = new Slide();
    s.start('decisive', 1);
    expect(run(s, 240)).toBeCloseTo(48, 10);
    expect(run(s, 100)).toBe(0);
  });
});

describe('light não desliza', () => {
  it('start light não anda e remainingPx fica null', () => {
    const s = new Slide();
    s.start('light', 1);
    expect(s.remainingPx).toBeNull();
    expect(run(s, 300)).toBe(0);
  });
});

describe('RCT-05/06: remainingPx e parada na parede', () => {
  it('remainingPx começa no total, cai e vira null no fim', () => {
    const s = new Slide();
    s.start('heavy', 1);
    expect(s.remainingPx).toBe(24);
    s.update(90, false);
    expect(s.remainingPx).toBeCloseTo(12, 10);
    s.update(89, false);
    expect(s.remainingPx).not.toBeNull();
    s.update(1, false);
    expect(s.remainingPx).toBeNull();
  });
  it('blocked para o resto e remainingPx vira null', () => {
    const s = new Slide();
    s.start('decisive', 1);
    s.update(60, false);
    expect(s.update(10, true)).toBe(0);
    expect(s.remainingPx).toBeNull();
    expect(run(s, 300)).toBe(0);
  });
  it('um novo start reinicia', () => {
    const s = new Slide();
    s.start('heavy', 1);
    run(s, 50, 10, 0);
    s.start('heavy', -1);
    expect(run(s, 180)).toBeCloseTo(-24, 10);
  });
});
