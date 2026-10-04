import { describe, expect, it } from 'vitest';
import { resolveIncomingHit } from '../../src/core/defense';
import { Duck } from '../../src/core/duck';

/** Abaixar já começado e avançado `ms` de jogo. */
function after(ms: number, duck = new Duck()): Duck {
  duck.start();
  duck.update(ms);
  return duck;
}

describe('DEF-07: o abaixar fica ativo por 320 ms de jogo', () => {
  it('antes do primeiro start não está ativo', () => {
    expect(new Duck().active).toBe(false);
  });

  it('logo depois do start está ativo', () => {
    const d = new Duck();
    d.start();
    expect(d.active).toBe(true);
  });

  it('em 319 ms ainda está ativo', () => {
    expect(after(319).active).toBe(true);
  });

  it('em 320 ms já não está ativo (EDG-06)', () => {
    expect(after(320).active).toBe(false);
  });

  it('com a duração do tuning trocada (100 ms) o limiar muda junto', () => {
    const tuning = { durationMs: 100, cooldownMs: 250 };
    expect(after(99, new Duck(tuning)).active).toBe(true);
    expect(after(100, new Duck(tuning)).active).toBe(false);
  });
});

describe('DEF-15: a recarga de 450 ms conta do início do abaixar', () => {
  it('sem abaixar não há recarga', () => {
    expect(new Duck().cooldownMs).toBe(0);
  });

  it('no início a recarga vale 450', () => {
    const d = new Duck();
    d.start();
    expect(d.cooldownMs).toBe(450);
  });

  it('em 449 ms falta 1 ms', () => {
    expect(after(449).cooldownMs).toBe(1);
  });

  it('em 450 ms a recarga zerou', () => {
    expect(after(450).cooldownMs).toBe(0);
  });

  it('depois de 450 ms continua em 0 (não fica negativa)', () => {
    expect(after(900).cooldownMs).toBe(0);
  });

  it('a recarga conta do início, não do fim do abaixar: em 320 ms ainda faltam 130', () => {
    expect(after(320).cooldownMs).toBe(130);
  });

  it('com a recarga do tuning trocada (250 ms) o limiar muda junto', () => {
    const tuning = { durationMs: 100, cooldownMs: 250 };
    expect(after(249, new Duck(tuning)).cooldownMs).toBe(1);
    expect(after(250, new Duck(tuning)).cooldownMs).toBe(0);
  });
});

describe('DEF-12: um registerEvade por abaixar', () => {
  it('devolve true na primeira vez durante o abaixar e false nas seguintes', () => {
    const d = after(100);
    expect(d.registerEvade()).toBe(true);
    expect(d.registerEvade()).toBe(false);
    expect(d.registerEvade()).toBe(false);
  });

  it('fora do abaixar devolve false: antes do start e depois dos 320 ms', () => {
    expect(new Duck().registerEvade()).toBe(false);
    expect(after(320).registerEvade()).toBe(false);
  });

  it('o limiar vale dos dois lados: true em 319 ms e false em 320 ms', () => {
    expect(after(319).registerEvade()).toBe(true);
    expect(after(320).registerEvade()).toBe(false);
  });

  it('um novo start libera um novo registerEvade', () => {
    const d = after(100);
    expect(d.registerEvade()).toBe(true);
    d.update(400);
    d.start();
    expect(d.registerEvade()).toBe(true);
    expect(d.registerEvade()).toBe(false);
  });

  it('a primeira chamada fora do abaixar não gasta o direito do abaixar seguinte', () => {
    const d = after(320);
    expect(d.registerEvade()).toBe(false);
    d.update(200);
    d.start();
    expect(d.registerEvade()).toBe(true);
  });
});

describe('reset', () => {
  it('deixa o abaixar inativo e sem recarga', () => {
    const d = after(100);
    d.reset();
    expect(d.active).toBe(false);
    expect(d.cooldownMs).toBe(0);
  });

  it('depois do reset o registerEvade devolve false até o próximo start', () => {
    const d = after(100);
    d.reset();
    expect(d.registerEvade()).toBe(false);
    d.start();
    expect(d.registerEvade()).toBe(true);
  });
});

describe('EDG-06: golpe `high` depois dos 320 ms leva o dano inteiro', () => {
  const HIGH = { damage: 12, height: 'high' } as const;
  const resolveAt = (ms: number) =>
    resolveIncomingHit({
      hit: HIGH,
      attackerInFront: true,
      isBoss: false,
      guard: 'none',
      dodgeInvulnerable: false,
      counterInvulnerable: false,
      ducking: after(ms).active,
      airborne: false,
    });

  it('em 319 ms o abaixar evita o golpe (0 de dano)', () => {
    const r = resolveAt(319);
    expect(r.outcome).toBe('ducked');
    expect(r.damage).toBe(0);
  });

  it('em 320 ms o golpe acerta com o dano inteiro', () => {
    const r = resolveAt(320);
    expect(r.outcome).toBe('hit');
    expect(r.damage).toBe(12);
  });
});
