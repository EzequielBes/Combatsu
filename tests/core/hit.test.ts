import { describe, expect, it } from 'vitest';
import { canDamage, makeHitGate, normalize, orderTargets, TargetGate } from '../../src/core/hit';
import type { Hit } from '../../src/core/hit';

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

describe('Hit: campos novos (T1)', () => {
  it('aceita height, knockdown, tech, counter e string como campos opcionais', () => {
    const hit: Hit = {
      ownerId: 1,
      damage: 6,
      strength: 'heavy',
      direction: { x: 1, y: 0 },
      force: 1,
      height: 'low',
      knockdown: true,
      tech: true,
      counter: true,
      string: { id: 7, index: 2, length: 3 },
    };
    expect(hit.height).toBe('low');
    expect(hit.string).toEqual({ id: 7, index: 2, length: 3 });
    const bare: Hit = { ownerId: 1, damage: 1, strength: 'light', direction: { x: 1, y: 0 }, force: 1 };
    expect(bare.height).toBeUndefined();
    expect(bare.knockdown).toBeUndefined();
  });
});

describe('TargetGate (TGT-03, TGT-05, TGT-06)', () => {
  it('nunca quer o dono', () => {
    const gate = new TargetGate(1, 2);
    expect(gate.wants(1)).toBe(false);
  });

  it('quer um alvo novo enquanto sobra vaga', () => {
    const gate = new TargetGate(1, 2);
    expect(gate.slotsLeft).toBe(2);
    expect(gate.wants(2)).toBe(true);
  });

  it('com teto 1: aceitar o 1º alvo recusa o 2º', () => {
    const gate = new TargetGate(1, 1);
    expect(gate.wants(2)).toBe(true);
    gate.note(2, 'accepted');
    expect(gate.slotsLeft).toBe(0);
    expect(gate.wants(3)).toBe(false);
  });

  it('com teto 2: o 2º alvo é aceito e o 3º recusado', () => {
    const gate = new TargetGate(1, 2);
    gate.note(2, 'accepted');
    expect(gate.slotsLeft).toBe(1);
    expect(gate.wants(3)).toBe(true);
    gate.note(3, 'accepted');
    expect(gate.slotsLeft).toBe(0);
    expect(gate.wants(4)).toBe(false);
  });

  it('um alvo já tentado não é querido de novo, qualquer que tenha sido o desfecho', () => {
    const gate = new TargetGate(1, 3);
    gate.note(2, 'accepted');
    gate.note(3, 'blocked');
    gate.note(4, 'refused');
    expect(gate.wants(2)).toBe(false);
    expect(gate.wants(3)).toBe(false);
    expect(gate.wants(4)).toBe(false);
  });

  it('refused não gasta vaga e não impede o alvo seguinte (TGT-05)', () => {
    const gate = new TargetGate(1, 1);
    gate.note(2, 'refused');
    expect(gate.slotsLeft).toBe(1);
    expect(gate.wants(3)).toBe(true);
    gate.note(3, 'accepted');
    expect(gate.wants(4)).toBe(false);
  });

  it('blocked gasta vaga: com teto 1 o alvo seguinte fica de fora (TGT-06)', () => {
    const gate = new TargetGate(1, 1);
    gate.note(2, 'blocked');
    expect(gate.slotsLeft).toBe(0);
    expect(gate.wants(3)).toBe(false);
  });

  it('blocked com teto 2 deixa uma vaga para o seguinte', () => {
    const gate = new TargetGate(1, 2);
    gate.note(2, 'blocked');
    expect(gate.slotsLeft).toBe(1);
    expect(gate.wants(3)).toBe(true);
  });

  it('um gate novo (golpe novo) volta a querer o mesmo alvo', () => {
    const first = new TargetGate(1, 1);
    first.note(2, 'accepted');
    expect(new TargetGate(1, 1).wants(2)).toBe(true);
  });
});

describe('orderTargets (TGT-04)', () => {
  it('ordena por dist crescente, qualquer que seja a ordem de entrada', () => {
    const out = orderTargets([
      { id: 5, dist: 90 },
      { id: 2, dist: 10 },
      { id: 9, dist: 40 },
    ]);
    expect(out.map((t) => t.id)).toEqual([2, 9, 5]);
  });

  it('desempata por id crescente', () => {
    const out = orderTargets([
      { id: 8, dist: 30 },
      { id: 3, dist: 30 },
      { id: 6, dist: 30 },
      { id: 1, dist: 31 },
    ]);
    expect(out.map((t) => t.id)).toEqual([3, 6, 8, 1]);
  });

  it('não muda a lista de entrada e preserva os campos extras', () => {
    const input = [
      { id: 2, dist: 50, tag: 'a' },
      { id: 1, dist: 5, tag: 'b' },
    ];
    const out = orderTargets(input);
    expect(input.map((t) => t.id)).toEqual([2, 1]);
    expect(out[0]).toEqual({ id: 1, dist: 5, tag: 'b' });
  });
});
