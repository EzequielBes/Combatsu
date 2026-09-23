import type { MoveTuning } from '../core/movement';

/** Pulo máximo ≈ 130 px (4 tiles); toque ≈ 30 px. Ajustar jogando. */
export const PLAYER_MOVE: MoveTuning = {
  runSpeed: 220,
  accelGround: 2400,
  accelAir: 1400,
  gravity: 1800,
  maxFallSpeed: 900,
  jumpSpeed: 420,
  maxJumpHoldMs: 180,
  jumpCutFactor: 0.45,
  coyoteMs: 90,
  jumpBufferMs: 110,
};
