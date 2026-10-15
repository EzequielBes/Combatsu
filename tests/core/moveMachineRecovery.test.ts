import { describe, expect, it } from 'vitest';
import { MoveMachine, type MoveContext } from '../../src/core/moveMachine';
import { MOVES } from '../../src/data/moves';

const GROUND: MoveContext = { grounded: true, down: false, up: false, forward: false };
const AIR: MoveContext = { ...GROUND, grounded: false };

/** Abre o golpe e leva até o 1º instante da `recovery`. */
function toRecovery(button: 'light' | 'heavy', ctx: MoveContext = GROUND): MoveMachine {
  const m = new MoveMachine();
  m.press(button, ctx);
  const move = m.def!;
  m.update(move.startupMs);
  m.update(move.activeMs);
  expect(m.phase).toBe('recovery');
  return m;
}

/** Encadeia jab → direto (pelo aperto guardado) e para no 1º instante da `recovery` do direto. */
function toDiretoRecovery(): MoveMachine {
  const m = toRecovery('light');
  m.press('light', GROUND);
  m.update(MOVES.jab.recoveryMs);
  expect(m.current).toBe('direto');
  m.update(MOVES.direto.startupMs);
  m.update(MOVES.direto.activeMs);
  expect(m.phase).toBe('recovery');
  return m;
}

/** A `recovery` ainda segura o golpe em `ms - 1` e o solta em `ms`? */
function recoversAt(m: MoveMachine, ms: number): boolean {
  m.update(ms - 1);
  const holding = m.phase === 'recovery';
  m.update(1);
  return holding && m.phase !== 'recovery';
}

describe('CRP-04: scaleRecovery', () => {
  it('jab (120 ms): 1, 0,92, 0,85 e 0,78 dão 120, 110, 102 e 94 ms', () => {
    const cases: Array<[number, number]> = [
      [1, 120],
      [0.92, 110],
      [0.85, 102],
      [0.78, 94],
    ];
    for (const [mul, ms] of cases) {
      const m = toRecovery('light');
      m.scaleRecovery(mul);
      expect(recoversAt(m, ms), `mul ${mul}`).toBe(true);
    }
  });

  it('direto (140 ms): arredonda ao ms para os dois lados (128,8 e 109,2)', () => {
    const slow = toDiretoRecovery();
    slow.scaleRecovery(0.92);
    expect(recoversAt(slow, 129)).toBe(true);
    const fast = toDiretoRecovery();
    fast.scaleRecovery(0.78);
    expect(recoversAt(fast, 109)).toBe(true);
  });

  it('mul 1 deixa tudo como hoje', () => {
    const a = toRecovery('light');
    const b = toRecovery('light');
    b.scaleRecovery(1);
    a.update(60);
    b.update(60);
    expect(b.phase).toBe(a.phase);
    a.update(60);
    b.update(60);
    expect(b.phase).toBe(a.phase);
  });

  it('startup e active não mudam: a chamada neles não faz nada', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    m.scaleRecovery(0.5);
    m.update(MOVES.jab.startupMs - 1);
    expect(m.phase).toBe('startup');
    m.update(1);
    expect(m.phase).toBe('active');
    m.scaleRecovery(0.5);
    m.update(MOVES.jab.activeMs - 1);
    expect(m.phase).toBe('active');
    m.update(1);
    expect(m.phase).toBe('recovery');
    expect(recoversAt(m, MOVES.jab.recoveryMs)).toBe(true);
  });

  it('chamada com a recovery já andada não muda nada', () => {
    const m = toRecovery('light');
    m.update(20);
    m.scaleRecovery(0.5);
    expect(recoversAt(m, MOVES.jab.recoveryMs - 20)).toBe(true);
  });

  it('só escala uma vez por recovery', () => {
    const m = toRecovery('light');
    m.scaleRecovery(0.5);
    m.scaleRecovery(0.5);
    expect(recoversAt(m, 60)).toBe(true);
  });

  it('sem golpe, nada acontece', () => {
    const m = new MoveMachine();
    m.scaleRecovery(0.5);
    expect(m.phase).toBe('idle');
  });

  it('a recovery da whiff (voadora sem acerto) não escala', () => {
    const m = toRecovery('heavy', AIR);
    expect(m.current).toBe('voadora');
    m.scaleRecovery(0.5);
    expect(recoversAt(m, MOVES.voadora.whiffRecoveryMs as number)).toBe(true);
  });

  it('endActive (voadora que acertou) abre a recovery cheia e ela escala', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    expect(m.phase).toBe('active');
    m.endActive();
    m.scaleRecovery(0.5);
    expect(recoversAt(m, Math.round(MOVES.voadora.recoveryMs * 0.5))).toBe(true);
  });

  it('a recovery seguinte volta a poder escalar', () => {
    const m = toRecovery('light');
    m.scaleRecovery(0.5);
    m.press('light', GROUND);
    m.update(60);
    expect(m.current).toBe('direto');
    m.update(MOVES.direto.startupMs);
    m.update(MOVES.direto.activeMs);
    m.scaleRecovery(0.5);
    expect(recoversAt(m, MOVES.direto.recoveryMs / 2)).toBe(true);
  });
});
