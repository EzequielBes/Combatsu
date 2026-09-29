import { describe, expect, it } from 'vitest';
import { combineStrikePresses } from '../../src/core/fightInput';

describe('combineStrikePresses (CTL-01, CTL-02, CTL-04)', () => {
  it('CTL-01: só o leve aperta o leve', () => {
    expect(combineStrikePresses(true, false)).toEqual({ lightPressed: true, heavyPressed: false, bothPressed: false });
  });

  it('CTL-02: só o forte aperta o forte', () => {
    expect(combineStrikePresses(false, true)).toEqual({ lightPressed: false, heavyPressed: true, bothPressed: false });
  });

  it('CTL-04: leve e forte no mesmo frame viram um both, sem leve nem forte separados', () => {
    expect(combineStrikePresses(true, true)).toEqual({ lightPressed: false, heavyPressed: false, bothPressed: true });
  });

  it('nenhum aperto não reporta nada', () => {
    expect(combineStrikePresses(false, false)).toEqual({ lightPressed: false, heavyPressed: false, bothPressed: false });
  });
});
