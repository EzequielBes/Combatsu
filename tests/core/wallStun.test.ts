import { describe, expect, it } from 'vitest';
import { wallStunFrom } from '../../src/core/wallStun';

/** Normal unitária com `x` dado, apontando para cima. */
const n = (x: number) => ({ x, y: -Math.sqrt(1 - x * x) });

describe('VRM-16: parede que atordoa o comum armado', () => {
  it.each([0.7, -0.7, 1, -1])('normal com x = %d é parede: atordoa', (x) => {
    expect(wallStunFrom(n(x), true)).toBe('stun');
  });

  it.each([0.69, -0.69, 0])('normal com x = %d é chão: não atordoa', (x) => {
    expect(wallStunFrom(n(x), true)).toBe('none');
  });

  it('desarmado, nem a parede nem o chão fazem nada', () => {
    expect(wallStunFrom(n(1), false)).toBe('none');
    expect(wallStunFrom(n(0.7), false)).toBe('none');
    expect(wallStunFrom(n(0), false)).toBe('none');
  });
});
