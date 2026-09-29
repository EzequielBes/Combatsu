import { describe, expect, it } from 'vitest';
import { Guard, resolveIncomingHit, type IncomingHit } from '../../src/core/defense';

const REGULAR: IncomingHit = {
  hit: { damage: 12 },
  attackerInFront: true,
  isBoss: false,
  guard: 'none',
  dodgeInvulnerable: false,
};
const resolve = (over: Partial<IncomingHit>) => resolveIncomingHit({ ...REGULAR, ...over });

describe('Guard: estado (GRD-01)', () => {
  it('segurando no chão sem golpe/esquiva/técnica é `guard`; sem segurar é `none`', () => {
    const g = new Guard();
    g.update(16, false);
    expect(g.state).toBe('none');
    g.update(16, true);
    expect(g.state).toBe('guard');
  });

  it('não defende quando `canGuard` é falso (golpe, esquiva ou técnica em andamento)', () => {
    const g = new Guard();
    g.update(16, true, false);
    expect(g.state).toBe('none');
  });

  it('aperto sem poder guardar não abre janela de parry', () => {
    const g = new Guard();
    g.update(16, true, false);
    g.press(false);
    g.update(16, true, true);
    expect(g.state).toBe('guard');
  });
});

describe('Guard: janela de parry de 150 ms (PAR-01)', () => {
  const stateAfter = (ms: number) => {
    const g = new Guard();
    g.update(1000, false);
    g.press();
    g.update(ms, true);
    return g.state;
  };

  it('logo após o aperto é `parry`', () => {
    const g = new Guard();
    g.update(1000, false);
    g.press();
    expect(g.state).toBe('parry');
  });

  it('149 ms depois ainda é `parry`', () => {
    expect(stateAfter(149)).toBe('parry');
  });

  it('150 ms depois a janela fechou e vira `guard` (segurando)', () => {
    expect(stateAfter(150)).toBe('guard');
  });

  it('a janela fecha para `none` se a tecla foi solta', () => {
    const g = new Guard();
    g.update(1000, false);
    g.press();
    g.update(150, false);
    expect(g.state).toBe('none');
  });
});

describe('Guard: anti-spam de 300 ms (PAR-04)', () => {
  const secondPressState = (gapMs: number) => {
    const g = new Guard();
    g.update(1000, false);
    g.press();
    g.update(gapMs, true);
    g.press();
    return g.state;
  };

  it('segundo aperto 299 ms depois do primeiro não abre janela', () => {
    expect(secondPressState(299)).toBe('guard');
  });

  it('segundo aperto 300 ms depois do primeiro abre janela', () => {
    expect(secondPressState(300)).toBe('parry');
  });

  it('o aperto recusado também conta como "aperto anterior" (não dá para espremer o spam)', () => {
    const g = new Guard();
    g.update(1000, true);
    g.press();
    g.update(200, true);
    g.press();
    g.update(200, true);
    g.press();
    expect(g.state).toBe('guard');
  });
});

describe('resolveIncomingHit: guarda de frente e de costas (GRD-02, GRD-03, GRD-07)', () => {
  it('GRD-02: inimigo comum de frente com guarda: 0 de dano e outcome `block`', () => {
    const r = resolve({ guard: 'guard' });
    expect(r.damage).toBe(0);
    expect(r.outcome).toBe('block');
  });

  it('GRD-03: atacante nas costas: leva exatamente o dano do golpe', () => {
    const r = resolve({ guard: 'guard', attackerInFront: false });
    expect(r.damage).toBe(12);
    expect(r.outcome).toBe('hit');
  });

  it('sem guarda leva o dano cheio', () => {
    expect(resolve({}).damage).toBe(12);
  });
});

describe('resolveIncomingHit: chefe e imbloqueável (GRD-06, GRD-04)', () => {
  it('GRD-06: chefe de frente com guarda: round(dano × 0,25)', () => {
    expect(resolve({ guard: 'guard', isBoss: true, hit: { damage: 20 } }).damage).toBe(5);
    expect(resolve({ guard: 'guard', isBoss: true, hit: { damage: 10 } }).damage).toBe(3);
    expect(resolve({ guard: 'guard', isBoss: true, hit: { damage: 18 } }).damage).toBe(5);
    expect(resolve({ guard: 'guard', isBoss: true, hit: { damage: 20 } }).outcome).toBe('block');
  });

  it('GRD-04: golpe imbloqueável não é reduzido pela guarda (comum e chefe)', () => {
    expect(resolve({ guard: 'guard', hit: { damage: 12, unblockable: true } }).damage).toBe(12);
    expect(resolve({ guard: 'guard', isBoss: true, hit: { damage: 12, unblockable: true } }).damage).toBe(12);
    expect(resolve({ guard: 'guard', hit: { damage: 12, unblockable: true } }).outcome).toBe('hit');
  });
});

describe('resolveIncomingHit: parry (PAR-02, PAR-05, PAR-06, PAR-09)', () => {
  it('PAR-02: golpe de inimigo comum na janela de parry: 0 de dano e outcome `parry`', () => {
    const r = resolve({ guard: 'parry' });
    expect(r.damage).toBe(0);
    expect(r.outcome).toBe('parry');
  });

  it('PAR-02: golpe do chefe na janela de parry: 0 de dano e outcome `parry`', () => {
    const r = resolve({ guard: 'parry', isBoss: true, hit: { damage: 20 } });
    expect(r.damage).toBe(0);
    expect(r.outcome).toBe('parry');
  });

  it('PAR-06: o parry não soma estrutura ao jogador', () => {
    expect(resolve({ guard: 'parry' }).playerStructureGain).toBe(0);
    expect(resolve({ guard: 'parry', isBoss: true }).playerStructureGain).toBe(0);
  });

  it('PAR-05: depois da janela, segurando e de frente, é a guarda normal (0 de dano)', () => {
    const g = new Guard();
    g.update(1000, false);
    g.press();
    g.update(150, true);
    const r = resolve({ guard: g.state });
    expect(r.damage).toBe(0);
    expect(r.outcome).toBe('block');
  });
});

describe('resolveIncomingHit: estrutura do jogador ao bloquear (STR-03)', () => {
  it('bloquear golpe comum soma 15; bloquear golpe do chefe soma 25', () => {
    expect(resolve({ guard: 'guard' }).playerStructureGain).toBe(15);
    expect(resolve({ guard: 'guard', isBoss: true }).playerStructureGain).toBe(25);
  });

  it('golpe que não foi bloqueado não soma estrutura', () => {
    expect(resolve({}).playerStructureGain).toBe(0);
    expect(resolve({ guard: 'guard', attackerInFront: false }).playerStructureGain).toBe(0);
  });
});

describe('resolveIncomingHit: esquiva e ordem (DOD-02, edge case parry × esquiva)', () => {
  it('invulnerável pela esquiva: 0 de dano, outcome `dodged`', () => {
    const r = resolve({ dodgeInvulnerable: true });
    expect(r.damage).toBe(0);
    expect(r.outcome).toBe('dodged');
  });

  it('invulnerável pela esquiva vale até contra imbloqueável e chefe', () => {
    expect(resolve({ dodgeInvulnerable: true, isBoss: true, hit: { damage: 20, unblockable: true } }).damage).toBe(0);
  });

  it('parry e esquiva no mesmo frame: só o parry', () => {
    const r = resolve({ guard: 'parry', dodgeInvulnerable: true });
    expect(r.outcome).toBe('parry');
    expect(r.damage).toBe(0);
  });
});
