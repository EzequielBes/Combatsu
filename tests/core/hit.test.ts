import { describe, expect, it } from 'vitest';
import { canDamage, makeHitGate, normalize } from '../../src/core/hit';

describe('makeHitGate', () => {
  it('nunca deixa o dono se acertar', () => {
    const gate = makeHitGate(1);
    expect(gate(1)).toBe(false);
  });

  it('deixa cada alvo ser acertado uma vez só por ataque', () => {
    const gate = makeHitGate(1);
    expect(gate(2)).toBe(true);
    expect(gate(2)).toBe(false); // outra parte do mesmo ragdoll, por exemplo
    expect(gate(3)).toBe(true);
  });

  it('um gate novo (ataque novo) volta a permitir o mesmo alvo', () => {
    makeHitGate(1)(2);
    expect(makeHitGate(1)(2)).toBe(true);
  });
});

describe('normalize', () => {
  it('devolve vetor de comprimento 1', () => {
    const v = normalize({ x: 3, y: -4 });
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(-0.8);
  });

  it('vetor zero vira "para cima"', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: -1 });
  });
});

describe('canDamage: regra de time (AI-05)', () => {
  it('golpe de inimigo acerta o player', () => {
    expect(canDamage('enemy', 'player')).toBe(true);
  });

  it('golpe de inimigo nunca acerta inimigo (nem outro, nem ele mesmo)', () => {
    expect(canDamage('enemy', 'enemy')).toBe(false);
  });

  it('golpe do player acerta inimigo', () => {
    expect(canDamage('player', 'enemy')).toBe(true);
  });
});
