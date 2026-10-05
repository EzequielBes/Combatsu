import { describe, expect, it } from 'vitest';
import { MotionInput } from '../../src/core/motionInput';
import { MoveMachine, type MoveContext } from '../../src/core/moveMachine';

const NONE = { down: false, forward: false };
const GROUND: MoveContext = { grounded: true, down: false, up: false, forward: false };

/** ↓ em t=0 e frente em `forwardAt`; devolve o resultado do aperto do leve em `pressAt`. */
function motion(forwardAt: number, pressAt: number): boolean {
  const m = new MotionInput();
  m.sample(0, { down: true, forward: false });
  m.sample(forwardAt, { down: true, forward: true });
  return m.matches(pressAt);
}

describe('SPC-01: ↓, frente e leve em até 300 ms, nessa ordem', () => {
  it('press 299 ms depois do ↓ casa', () => {
    expect(motion(100, 299)).toBe(true);
  });

  it('press 300 ms depois do ↓ casa', () => {
    expect(motion(100, 300)).toBe(true);
  });

  it('press 301 ms depois do ↓ não casa', () => {
    expect(motion(100, 301)).toBe(false);
  });

  it('ordem trocada (frente antes do ↓) não casa', () => {
    const m = new MotionInput();
    m.sample(0, { down: false, forward: true });
    m.sample(100, { down: true, forward: true });
    expect(m.matches(200)).toBe(false);
  });

  it('só ↓ sem frente não casa; só frente sem ↓ não casa', () => {
    const a = new MotionInput();
    a.sample(0, { down: true, forward: false });
    expect(a.matches(100)).toBe(false);
    const b = new MotionInput();
    b.sample(0, { down: false, forward: true });
    expect(b.matches(100)).toBe(false);
  });

  it('↓ e frente no mesmo frame não são "nessa ordem"', () => {
    const m = new MotionInput();
    m.sample(0, { down: true, forward: true });
    expect(m.matches(100)).toBe(false);
  });

  it('soltar o ↓ antes da frente ainda casa (↓ → é uma sequência, não um acorde)', () => {
    const m = new MotionInput();
    m.sample(0, { down: true, forward: false });
    m.sample(50, NONE);
    m.sample(100, { down: false, forward: true });
    expect(m.matches(200)).toBe(true);
  });

  it('uma meia-lua casada não vale para o aperto seguinte', () => {
    const m = new MotionInput();
    m.sample(0, { down: true, forward: false });
    m.sample(100, { down: true, forward: true });
    expect(m.matches(150)).toBe(true);
    expect(m.matches(160)).toBe(false);
  });
});

describe('SPC-01: palmaExplosiva no lugar do golpe que o leve iniciaria', () => {
  it('parado: leve com meia-lua inicia palmaExplosiva (20 heavy) em vez de jab', () => {
    const machine = new MoveMachine();
    const evs = machine.press('light', { ...GROUND, motion: true });
    expect(evs).toEqual([
      { type: 'moveStart', move: expect.objectContaining({ name: 'palmaExplosiva', damage: 20, strength: 'heavy' }) },
    ]);
    expect(machine.current).toBe('palmaExplosiva');
  });

  it('na janela de um follow-up, a meia-lua ainda vence o follow-up', () => {
    const machine = new MoveMachine();
    machine.press('light', GROUND);
    machine.update(machine.def!.startupMs);
    machine.update(machine.def!.activeMs);
    machine.update(machine.def!.recoveryMs);
    machine.press('light', { ...GROUND, motion: true });
    expect(machine.current).toBe('palmaExplosiva');
  });

  it('sem meia-lua o mesmo aperto inicia jab', () => {
    const machine = new MoveMachine();
    machine.press('light', GROUND);
    expect(machine.current).toBe('jab');
  });
});
