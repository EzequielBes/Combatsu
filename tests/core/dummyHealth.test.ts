import { describe, expect, it } from 'vitest';
import { DummyHealth } from '../../src/core/dummyHealth';

describe('DummyHealth (FXL-06)', () => {
  it('começa cheio e desce com o dano, sem passar de 0', () => {
    const h = new DummyHealth(1000, 1000);
    expect(h.hp).toBe(1000);
    h.receive(300);
    expect(h.hp).toBe(700);
    h.receive(5000);
    expect(h.hp).toBe(0);
  });

  it('zerado, ainda está em 0 aos 999 ms e volta a 1000 aos 1000 ms', () => {
    const h = new DummyHealth(1000, 1000);
    h.receive(1000);
    h.update(999);
    expect(h.hp).toBe(0);
    h.update(1);
    expect(h.hp).toBe(1000);
  });

  it('com vida sobrando, o tempo não faz nada', () => {
    const h = new DummyHealth(1000, 1000);
    h.receive(1);
    h.update(5000);
    expect(h.hp).toBe(999);
  });

  it('dano extra enquanto zerado não reinicia o relógio', () => {
    const h = new DummyHealth(1000, 1000);
    h.receive(1000);
    h.update(600);
    h.receive(50);
    h.update(400);
    expect(h.hp).toBe(1000);
  });
});
