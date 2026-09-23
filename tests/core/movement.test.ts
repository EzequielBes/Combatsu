import { describe, expect, it } from 'vitest';
import {
  initialMoveState,
  stepMovement,
  type MoveInput,
  type MoveSensors,
  type MoveState,
  type MoveTuning,
} from '../../src/core/movement';

const T: MoveTuning = {
  runSpeed: 200,
  accelGround: 2000,
  accelAir: 1000,
  gravity: 1800,
  maxFallSpeed: 900,
  jumpSpeed: 400,
  maxJumpHoldMs: 150,
  jumpCutFactor: 0.5,
  coyoteMs: 100,
  jumpBufferMs: 100,
};
const DT = 1000 / 60;
const NONE: MoveInput = { left: false, right: false, jumpPressed: false, jumpHeld: false };
const JUMP: MoveInput = { ...NONE, jumpPressed: true, jumpHeld: true };
const GROUND: MoveSensors = { grounded: true, ceiling: false };
const AIR: MoveSensors = { grounded: false, ceiling: false };

function run(s: MoveState, frames: number, input: MoveInput, sensors: MoveSensors): MoveState {
  for (let i = 0; i < frames; i++) s = stepMovement(s, input, sensors, DT, T);
  return s;
}

/** Simula um pulo num chão plano em y = 0 e devolve a altura máxima atingida (px). */
function peakHeight(holdFrames: number): number {
  let s = initialMoveState();
  let y = 0;
  let peak = 0;
  for (let f = 0; f < 120; f++) {
    const input = { ...NONE, jumpPressed: f === 0, jumpHeld: f < holdFrames };
    s = stepMovement(s, input, { grounded: y >= 0, ceiling: false }, DT, T);
    y = Math.min(0, y + (s.vy * DT) / 1000);
    peak = Math.min(peak, y);
  }
  return -peak;
}

describe('stepMovement — horizontal', () => {
  it('acelera no chão até a velocidade de corrida e para nela', () => {
    const one = stepMovement(initialMoveState(), { ...NONE, right: true }, GROUND, DT, T);
    expect(one.vx).toBeCloseTo((2000 * DT) / 1000);
    const many = run(initialMoveState(), 20, { ...NONE, right: true }, GROUND);
    expect(many.vx).toBe(200);
    expect(many.facing).toBe(1);
  });

  it('vira para a esquerda e desacelera até parar sem input', () => {
    const left = run(initialMoveState(), 20, { ...NONE, left: true }, GROUND);
    expect(left.facing).toBe(-1);
    expect(left.vx).toBe(-200);
    const stopped = run(left, 20, NONE, GROUND);
    expect(stopped.vx).toBe(0);
    expect(stopped.facing).toBe(-1);
  });

  it('travado (atacando) não acelera nem pula', () => {
    const s = stepMovement(initialMoveState(), { ...JUMP, right: true }, GROUND, DT, T, true);
    expect(s.vx).toBe(0);
    expect(s.vy).toBe(0);
    expect(s.jumping).toBe(false);
  });
});

describe('stepMovement — pulo', () => {
  it('parado no chão fica com vy = 0', () => {
    expect(run(initialMoveState(), 10, NONE, GROUND).vy).toBe(0);
  });

  it('pula quando está no chão e aperta pulo', () => {
    const s = stepMovement(initialMoveState(), JUMP, GROUND, DT, T);
    expect(s.vy).toBe(-400);
    expect(s.jumping).toBe(true);
  });

  it('não pula no ar sem coyote time', () => {
    const s = stepMovement(initialMoveState(), JUMP, AIR, DT, T);
    expect(s.jumping).toBe(false);
    expect(s.vy).toBeGreaterThan(0);
  });

  it('coyote time: ainda pula logo depois de sair da plataforma', () => {
    let s = run(initialMoveState(), 1, NONE, GROUND);
    s = run(s, 3, NONE, AIR); // 50 ms no ar
    s = stepMovement(s, JUMP, AIR, DT, T);
    expect(s.jumping).toBe(true);
    expect(s.vy).toBe(-400);
  });

  it('coyote time expira', () => {
    let s = run(initialMoveState(), 1, NONE, GROUND);
    s = run(s, 7, NONE, AIR); // ~117 ms no ar
    s = stepMovement(s, JUMP, AIR, DT, T);
    expect(s.jumping).toBe(false);
  });

  it('jump buffer: apertar pulo um pouco antes de pousar ainda pula', () => {
    let s: MoveState = { ...initialMoveState(), vy: 200 };
    s = stepMovement(s, JUMP, AIR, DT, T);
    s = run(s, 3, { ...NONE, jumpHeld: true }, AIR);
    s = stepMovement(s, { ...NONE, jumpHeld: true }, GROUND, DT, T);
    expect(s.jumping).toBe(true);
    expect(s.vy).toBe(-400);
  });

  it('segurar o botão pula bem mais alto que um toque', () => {
    const tap = peakHeight(1);
    const full = peakHeight(60);
    expect(tap).toBeLessThan(30);
    expect(full).toBeGreaterThan(90);
    expect(full).toBeLessThan(130);
    expect(full).toBeGreaterThan(tap * 3);
  });

  it('bater a cabeça no teto corta a subida', () => {
    let s = stepMovement(initialMoveState(), JUMP, GROUND, DT, T);
    s = stepMovement(s, { ...NONE, jumpHeld: true }, { grounded: false, ceiling: true }, DT, T);
    expect(s.vy).toBeGreaterThanOrEqual(0);
    expect(s.jumping).toBe(false);
  });

  it('a velocidade de queda tem limite', () => {
    expect(run(initialMoveState(), 120, NONE, AIR).vy).toBe(900);
  });

  it('frames longos (dt = 50 ms) não estouram a velocidade', () => {
    let s = initialMoveState();
    for (let i = 0; i < 40; i++) s = stepMovement(s, { ...NONE, right: true }, AIR, 50, T);
    expect(s.vy).toBe(900);
    expect(s.vx).toBe(200);
    expect(stepMovement(initialMoveState(), JUMP, GROUND, 50, T).vy).toBe(-400);
  });
});
