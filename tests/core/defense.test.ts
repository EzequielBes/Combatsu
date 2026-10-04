import { describe, expect, it } from 'vitest';
import { DeflectTracker, Guard, resolveIncomingHit, type IncomingHit } from '../../src/core/defense';

const REGULAR: IncomingHit = {
  hit: { damage: 12 },
  attackerInFront: true,
  isBoss: false,
  guard: 'none',
  dodgeInvulnerable: false,
  counterInvulnerable: false,
  ducking: false,
  airborne: false,
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

describe('resolveIncomingHit: parry só de frente e contra golpe bloqueável (DEF-01, DEF-02, substitui PAR-02)', () => {
  it('DEF-01: janela de parry com o atacante de costas: o jogador perde o dano inteiro', () => {
    const r = resolve({ guard: 'parry', attackerInFront: false });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });

  it('DEF-01: de costas também no golpe do chefe: dano inteiro, sem estrutura', () => {
    const r = resolve({ guard: 'parry', attackerInFront: false, isBoss: true, hit: { damage: 20 } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(20);
    expect(r.playerStructureGain).toBe(0);
  });

  it('DEF-02: golpe `red` (alto e imbloqueável) de frente na janela de parry: dano inteiro', () => {
    const r = resolve({ guard: 'parry', hit: { damage: 12, height: 'high', unblockable: true } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });

  it('DEF-02: golpe `low` (baixo e imbloqueável) de frente na janela de parry: dano inteiro', () => {
    const r = resolve({ guard: 'parry', hit: { damage: 12, height: 'low', unblockable: true } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });

  it('o golpe `white` (alto, bloqueável) de frente na janela de parry continua aparado', () => {
    const r = resolve({ guard: 'parry', hit: { damage: 12, height: 'high' } });
    expect(r.outcome).toBe('parry');
    expect(r.damage).toBe(0);
  });
});

describe('resolveIncomingHit: abaixar evita golpe alto (DEF-11, DEF-14, EDG-06)', () => {
  it('DEF-11: abaixado com golpe `high` bloqueável: 0 de dano e outcome `ducked`', () => {
    const r = resolve({ ducking: true, hit: { damage: 12, height: 'high' } });
    expect(r.outcome).toBe('ducked');
    expect(r.damage).toBe(0);
    expect(r.playerStructureGain).toBe(0);
  });

  it('DEF-11: abaixado com golpe `high` imbloqueável (`red`): 0 de dano e outcome `ducked`', () => {
    const r = resolve({ ducking: true, hit: { damage: 12, height: 'high', unblockable: true } });
    expect(r.outcome).toBe('ducked');
    expect(r.damage).toBe(0);
  });

  it('DEF-14: abaixado com golpe `low`: dano inteiro', () => {
    const r = resolve({ ducking: true, hit: { damage: 12, height: 'low', unblockable: true } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });

  it('DEF-14: abaixado com golpe sem `height` (investida do chefe): dano inteiro', () => {
    const r = resolve({ ducking: true, isBoss: true, hit: { damage: 18 } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(18);
  });

  it('EDG-06: sem `ducking` (o abaixar já acabou) o golpe `high` leva o dano inteiro', () => {
    const r = resolve({ ducking: false, hit: { damage: 12, height: 'high' } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });
});

describe('resolveIncomingHit: pular evita golpe baixo (DEF-03, DEF-17)', () => {
  it('DEF-17: fora do chão com golpe `low`: 0 de dano e outcome `jumped`', () => {
    const r = resolve({ airborne: true, hit: { damage: 12, height: 'low', unblockable: true } });
    expect(r.outcome).toBe('jumped');
    expect(r.damage).toBe(0);
    expect(r.playerStructureGain).toBe(0);
  });

  it('DEF-03: no chão com a guarda de pé e o atacante à frente, o golpe `low` leva o dano inteiro', () => {
    const r = resolve({ guard: 'guard', airborne: false, hit: { damage: 12, height: 'low', unblockable: true } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
    expect(r.playerStructureGain).toBe(0);
  });

  it('fora do chão com golpe `high`: dano inteiro (pular não evita golpe alto)', () => {
    const r = resolve({ airborne: true, hit: { damage: 12, height: 'high' } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });

  it('fora do chão com golpe sem `height`: dano inteiro', () => {
    const r = resolve({ airborne: true, hit: { damage: 12 } });
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });
});

describe('resolveIncomingHit: Contra em startup ou active (CNT-11)', () => {
  it('counterInvulnerable: 0 de dano e outcome `countered`, mesmo contra golpe imbloqueável do chefe', () => {
    const r = resolve({ counterInvulnerable: true, isBoss: true, hit: { damage: 20, unblockable: true } });
    expect(r.outcome).toBe('countered');
    expect(r.damage).toBe(0);
    expect(r.playerStructureGain).toBe(0);
  });
});

describe('resolveIncomingHit: ordem da decisão, um teste por par vizinho (DEF-20)', () => {
  const HIGH = { damage: 12, height: 'high' } as const;
  const LOW = { damage: 12, height: 'low' } as const;

  it('parry antes da esquiva: parry válido + esquiva invencível dá `parry`', () => {
    expect(resolve({ guard: 'parry', dodgeInvulnerable: true, hit: HIGH }).outcome).toBe('parry');
  });

  it('parry que não vale (de costas) deixa a esquiva decidir: `dodged`', () => {
    expect(resolve({ guard: 'parry', attackerInFront: false, dodgeInvulnerable: true, hit: HIGH }).outcome).toBe('dodged');
  });

  it('esquiva antes do Contra: esquiva invencível + Contra em startup dá `dodged`', () => {
    expect(resolve({ dodgeInvulnerable: true, counterInvulnerable: true, hit: HIGH }).outcome).toBe('dodged');
  });

  it('Contra antes do abaixar: Contra em startup + abaixado com golpe `high` dá `countered`', () => {
    expect(resolve({ counterInvulnerable: true, ducking: true, hit: HIGH }).outcome).toBe('countered');
  });

  it('abaixar antes do pulo: abaixado e no ar, o `high` dá `ducked` e o `low` dá `jumped`, cada um pela sua defesa', () => {
    expect(resolve({ ducking: true, airborne: true, hit: HIGH }).outcome).toBe('ducked');
    expect(resolve({ ducking: true, airborne: true, hit: LOW }).outcome).toBe('jumped');
  });

  it('pulo antes da guarda: no ar com a guarda de pé e o atacante à frente, o `low` bloqueável dá `jumped`', () => {
    expect(resolve({ airborne: true, guard: 'guard', hit: LOW }).outcome).toBe('jumped');
  });

  it('abaixar antes da guarda: abaixado com a guarda de pé e o atacante à frente, o `high` bloqueável dá `ducked`', () => {
    expect(resolve({ ducking: true, guard: 'guard', hit: HIGH }).outcome).toBe('ducked');
  });

  it('guarda antes do golpe cheio: guarda de pé, à frente e golpe bloqueável dá `block`; sem a guarda dá `hit`', () => {
    expect(resolve({ guard: 'guard', hit: HIGH }).outcome).toBe('block');
    expect(resolve({ guard: 'none', hit: HIGH }).outcome).toBe('hit');
  });
});

describe('DeflectTracker: Deflexão por sequência aparada (DFL-10, DFL-12, DFL-16)', () => {
  const s = (id: number, index: number, length: number) => ({ id, index, length });

  it('2 de 2 aparados: só o parry do último golpe dá `true`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 1, 2))).toBe(false);
    expect(t.onParry(s(1, 2, 2))).toBe(true);
  });

  it('3 de 3 aparados: só o parry do último golpe dá `true`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 1, 3))).toBe(false);
    expect(t.onParry(s(1, 2, 3))).toBe(false);
    expect(t.onParry(s(1, 3, 3))).toBe(true);
  });

  it('DFL-12: falta o parry do 1º golpe de 2: o parry do último dá `false`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 2, 2))).toBe(false);
  });

  it('DFL-12: falta o parry do golpe do meio de 3: o parry do último dá `false`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 1, 3))).toBe(false);
    expect(t.onParry(s(1, 3, 3))).toBe(false);
  });

  it('DFL-16: sequência de 1 golpe nunca dá `true`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 1, 1))).toBe(false);
  });

  it('golpe sem sequência (`undefined`, como o do chefe) dá `false`', () => {
    const t = new DeflectTracker();
    expect(t.onParry(undefined)).toBe(false);
  });

  it('duas sequências intercaladas não se misturam: o parry de uma não completa a outra', () => {
    const t = new DeflectTracker();
    expect(t.onParry(s(1, 1, 2))).toBe(false);
    expect(t.onParry(s(2, 2, 2))).toBe(false);
    expect(t.onParry(s(1, 2, 2))).toBe(true);
  });

  it('a sequência que deu `true` não dá de novo no mesmo id, e `reset` esquece os parries anteriores', () => {
    const t = new DeflectTracker();
    t.onParry(s(1, 1, 2));
    expect(t.onParry(s(1, 2, 2))).toBe(true);
    expect(t.onParry(s(1, 2, 2))).toBe(false);
    t.onParry(s(2, 1, 2));
    t.reset();
    expect(t.onParry(s(2, 2, 2))).toBe(false);
  });
});
