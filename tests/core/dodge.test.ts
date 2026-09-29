import { describe, expect, it } from 'vitest';
import { Dodge, type DodgeStart } from '../../src/core/dodge';
import { SlowMo } from '../../src/core/slowMo';

const READY: DodgeStart = { grounded: true, busy: false, held: 0, facing: 1 };

function started(over: Partial<DodgeStart> = {}): Dodge {
  const d = new Dodge();
  expect(d.start({ ...READY, ...over })).toBe(true);
  return d;
}

/** Soma o deslocamento de passos de 10 ms até `ms`. */
function travelled(d: Dodge, ms: number): number {
  let sum = 0;
  for (let t = 0; t < ms; t += 10) sum += d.update(10);
  return sum;
}

describe('DOD-01: dash de 96 px (±4) em 200 ms', () => {
  it('sem direção segurada, foge para trás do lado em que olha (olhando à direita → esquerda)', () => {
    const d = started({ facing: 1 });
    expect(Math.abs(travelled(d, 200) + 96)).toBeLessThanOrEqual(4);
  });

  it('olhando à esquerda sem direção → vai para a direita', () => {
    const d = started({ facing: -1 });
    expect(Math.abs(travelled(d, 200) - 96)).toBeLessThanOrEqual(4);
  });

  it('com direção segurada vai para lá, mesmo para frente', () => {
    const right = started({ held: 1, facing: 1 });
    expect(Math.abs(travelled(right, 200) - 96)).toBeLessThanOrEqual(4);
    const left = started({ held: -1, facing: 1 });
    expect(Math.abs(travelled(left, 200) + 96)).toBeLessThanOrEqual(4);
  });

  it('o dash está ativo em 199 ms e acabou em 200 ms; depois não se move mais', () => {
    const d = started({ held: 1 });
    travelled(d, 190);
    d.update(9);
    expect(d.active).toBe(true);
    d.update(1);
    expect(d.active).toBe(false);
    expect(d.update(50)).toBe(0);
  });
});

describe('DOD-02: invencível de 0 a 180 ms', () => {
  const invulnAt = (ms: number): boolean => {
    const d = started();
    d.update(ms);
    return d.invulnerable;
  };
  it('em 0 ms e 179 ms está invulnerável', () => {
    expect(invulnAt(0)).toBe(true);
    expect(invulnAt(179)).toBe(true);
  });
  it('em 180 ms e 181 ms não está mais', () => {
    expect(invulnAt(180)).toBe(false);
    expect(invulnAt(181)).toBe(false);
  });
  it('sem esquiva nunca está invulnerável', () => {
    expect(new Dodge().invulnerable).toBe(false);
  });
});

describe('DOD-04, DOD-10: recarga de 450 ms', () => {
  const secondStart = (ms: number): boolean => {
    const d = started();
    d.update(ms);
    return d.start(READY);
  };

  it('a recarga começa em 450 ms ao iniciar', () => {
    expect(started().cooldownMs).toBe(450);
  });

  it('Q 449 ms depois não esquiva (recarga acima de 0)', () => {
    expect(secondStart(449)).toBe(false);
  });

  it('Q 450 ms depois esquiva', () => {
    expect(secondStart(450)).toBe(true);
  });

  it('Q durante o dash não reinicia a esquiva', () => {
    expect(secondStart(100)).toBe(false);
  });
});

describe('DOD-05, DOD-01: recusas', () => {
  it('no ar não esquiva', () => {
    expect(new Dodge().start({ ...READY, grounded: false })).toBe(false);
  });
  it('com golpe ou técnica em andamento não esquiva', () => {
    expect(new Dodge().start({ ...READY, busy: true })).toBe(false);
  });
  it('a recusa não gasta a recarga: logo depois uma esquiva válida começa', () => {
    const d = new Dodge();
    d.start({ ...READY, grounded: false });
    expect(d.start(READY)).toBe(true);
  });
});

describe('DOD-03: esquiva perfeita uma vez por esquiva', () => {
  it('golpe que chega em 0..179 ms é perfeito, uma única vez', () => {
    const d = started();
    d.update(100);
    expect(d.registerIncomingHit()).toBe(true);
    expect(d.registerIncomingHit()).toBe(false);
  });

  it('golpe em 179 ms é perfeito; em 180 ms não', () => {
    const at = (ms: number): boolean => {
      const d = started();
      d.update(ms);
      return d.registerIncomingHit();
    };
    expect(at(179)).toBe(true);
    expect(at(180)).toBe(false);
  });

  it('sem esquiva ativa não é perfeito', () => {
    expect(new Dodge().registerIncomingHit()).toBe(false);
  });

  it('a esquiva seguinte pode ter a sua própria perfeita', () => {
    const d = started();
    d.registerIncomingHit();
    d.update(450);
    expect(d.start(READY)).toBe(true);
    expect(d.registerIncomingHit()).toBe(true);
  });
});

describe('DOD-08: bônus de ×1,5 uma vez em até 1000 ms da esquiva perfeita', () => {
  const bonusAfter = (ms: number, damage = 10): number => {
    const d = started();
    d.registerIncomingHit();
    d.update(ms);
    return d.applyCounterBonus(damage);
  };

  it('sem esquiva perfeita não há bônus', () => {
    const d = started();
    d.update(300);
    expect(d.applyCounterBonus(10)).toBe(10);
  });

  it('999 ms e 1000 ms depois: ×1,5', () => {
    expect(bonusAfter(999)).toBe(15);
    expect(bonusAfter(1000)).toBe(15);
  });

  it('1001 ms depois: sem bônus', () => {
    expect(bonusAfter(1001)).toBe(10);
  });

  it('arredonda com a metade para cima (7 → 10,5 → 11)', () => {
    expect(bonusAfter(0, 7)).toBe(11);
    expect(bonusAfter(0, 9)).toBe(14);
  });

  it('só uma vez: o segundo golpe volta ao dano normal', () => {
    const d = started();
    d.registerIncomingHit();
    expect(d.applyCounterBonus(10)).toBe(15);
    expect(d.applyCounterBonus(10)).toBe(10);
  });
});

describe('SlowMo: 0,3 por 400 ms reais (DOD-07)', () => {
  it('sem gatilho o timeScale é 1', () => {
    expect(new SlowMo().timeScale).toBe(1);
  });

  it('logo após o gatilho é 0,3', () => {
    const s = new SlowMo();
    s.trigger();
    expect(s.timeScale).toBe(0.3);
  });

  it('399 ms reais depois ainda é 0,3; 400 ms depois volta a 1', () => {
    const s = new SlowMo();
    s.trigger();
    s.update(399);
    expect(s.timeScale).toBe(0.3);
    s.update(1);
    expect(s.timeScale).toBe(1);
  });

  it('um novo gatilho reinicia os 400 ms', () => {
    const s = new SlowMo();
    s.trigger();
    s.update(300);
    s.trigger();
    s.update(300);
    expect(s.timeScale).toBe(0.3);
  });

  it('reset (nova run) volta a 1', () => {
    const s = new SlowMo();
    s.trigger();
    s.reset();
    expect(s.timeScale).toBe(1);
  });
});
