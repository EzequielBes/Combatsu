import { describe, expect, it } from 'vitest';
import { Mover } from '../../src/core/mover';

describe('Mover: 260 px/s, alcance 1200 px (BAT-12)', () => {
  it('1199 px percorridos: continua moving', () => {
    const m = new Mover(0, 1, 260, 1200);
    const status = m.update((1199 / 260) * 1000);
    expect(status).toBe('moving');
    expect(m.traveled).toBeCloseTo(1199, 6);
  });

  it('chega a 1200 px: expired, sem passar do alcance', () => {
    const m = new Mover(0, 1, 260, 1200);
    m.update((1199 / 260) * 1000);
    const status = m.update((1 / 260) * 1000);
    expect(status).toBe('expired');
    expect(m.traveled).toBeCloseTo(1200, 6);
  });

  it('update depois de expired continua expired e não avança mais', () => {
    const m = new Mover(0, 1, 260, 1200);
    m.update((1200 / 260) * 1000);
    const before = m.traveled;
    const status = m.update(1000);
    expect(status).toBe('expired');
    expect(m.traveled).toBe(before);
  });

  it('x anda na direção dir: dir 1 soma, dir -1 subtrai', () => {
    const right = new Mover(100, 1, 260, 1200);
    right.update(1000);
    expect(right.x).toBeCloseTo(360, 6);

    const left = new Mover(100, -1, 260, 1200);
    left.update(1000);
    expect(left.x).toBeCloseTo(-160, 6);
  });
});

describe('Mover: 240 px/s, alcance 600 px (BAT-12)', () => {
  it('expira exatamente em 600 px', () => {
    const m = new Mover(0, 1, 240, 600);
    const status = m.update((600 / 240) * 1000);
    expect(status).toBe('expired');
    expect(m.traveled).toBeCloseTo(600, 6);
  });
});

describe('Mover: vários updates pequenos equivalem a um grande', () => {
  it('10 passos de 100 ms == 1 passo de 1000 ms (mesmo x e traveled)', () => {
    const small = new Mover(0, 1, 260, 1200);
    for (let i = 0; i < 10; i++) small.update(100);

    const big = new Mover(0, 1, 260, 1200);
    big.update(1000);

    expect(small.x).toBeCloseTo(big.x, 6);
    expect(small.traveled).toBeCloseTo(big.traveled, 6);
  });

  it('vale também quando o alcance é atingido no meio dos passos pequenos', () => {
    const small = new Mover(0, 1, 240, 600);
    for (let i = 0; i < 30; i++) small.update(100); // 3000 ms >> tempo pra 600px

    const big = new Mover(0, 1, 240, 600);
    big.update(3000);

    expect(small.traveled).toBeCloseTo(big.traveled, 6);
    expect(small.traveled).toBeCloseTo(600, 6);
  });
});
