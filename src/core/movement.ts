export interface MoveTuning {
  runSpeed: number; // px/s
  accelGround: number; // px/s²
  accelAir: number; // px/s²
  gravity: number; // px/s²
  maxFallSpeed: number; // px/s
  jumpSpeed: number; // px/s
  maxJumpHoldMs: number; // quanto tempo segurar o botão ainda sustenta a subida
  jumpCutFactor: number; // multiplica vy ao soltar o botão no meio da subida
  coyoteMs: number; // tolerância para pular depois de sair do chão
  jumpBufferMs: number; // tolerância para apertar pulo antes de pousar
}

export interface MoveInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean; // borda: apertou neste frame
  jumpHeld: boolean;
}

export interface MoveSensors {
  grounded: boolean;
  ceiling: boolean;
}

export interface MoveState {
  vx: number;
  vy: number;
  facing: 1 | -1;
  jumping: boolean;
  jumpHoldMs: number;
  coyoteMs: number;
  jumpBufferMs: number;
}

export function initialMoveState(): MoveState {
  return { vx: 0, vy: 0, facing: 1, jumping: false, jumpHoldMs: 0, coyoteMs: 0, jumpBufferMs: 0 };
}

function approach(value: number, target: number, delta: number): number {
  return value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
}

/**
 * Um frame de movimentação do player. A velocidade resultante é aplicada
 * diretamente no corpo do Matter (sem física livre), para o pulo ser
 * determinístico. `locked` = atacando: sem acelerar nem iniciar pulo.
 */
export function stepMovement(
  prev: MoveState,
  input: MoveInput,
  sensors: MoveSensors,
  dtMs: number,
  t: MoveTuning,
  locked = false,
): MoveState {
  const dt = dtMs / 1000;
  const s = { ...prev };
  // Subindo não conta como chão, mesmo se o sensor ainda enxerga o piso.
  const onGround = sensors.grounded && s.vy >= 0;

  const dir = locked ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) s.facing = dir > 0 ? 1 : -1;
  s.vx = approach(s.vx, dir * t.runSpeed, (onGround ? t.accelGround : t.accelAir) * dt);

  s.coyoteMs = onGround ? t.coyoteMs : Math.max(0, s.coyoteMs - dtMs);
  s.jumpBufferMs = input.jumpPressed ? t.jumpBufferMs : Math.max(0, s.jumpBufferMs - dtMs);

  if (!locked && s.jumpBufferMs > 0 && s.coyoteMs > 0) {
    s.vy = -t.jumpSpeed;
    s.jumping = true;
    s.jumpHoldMs = 0;
    s.jumpBufferMs = 0;
    s.coyoteMs = 0;
  } else if (s.jumping && input.jumpHeld && s.jumpHoldMs < t.maxJumpHoldMs) {
    s.vy = -t.jumpSpeed;
    s.jumpHoldMs += dtMs;
  } else {
    if (s.jumping && !input.jumpHeld && s.vy < 0) s.vy *= t.jumpCutFactor;
    s.jumping = false;
    s.vy = Math.min(s.vy + t.gravity * dt, t.maxFallSpeed);
  }

  if (sensors.ceiling && s.vy < 0) {
    s.vy = 0;
    s.jumping = false;
  }
  if (onGround && !s.jumping && s.vy > 0) s.vy = 0;
  return s;
}
