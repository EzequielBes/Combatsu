/** Salto desenhado de um golpe: em que fração do `active` começa, em que fração do `recovery` termina, e a altura. */
export interface MoveHop {
  fromActive: number;
  toRecovery: number;
  peakPx: number;
}

/**
 * Altura (px de mundo) do salto desenhado num instante do golpe: uma parábola que sai do chão em `fromActive` do
 * `active`, passa por `peakPx` no meio do caminho e volta ao chão em `toRecovery` do `recovery`. Fora desse trecho, 0.
 * `ms` é o tempo já passado na fase. Só o sprite sobe: o corpo físico e a hitbox ficam onde estão.
 */
export function hopOffset(
  hop: MoveHop,
  phase: string,
  ms: number,
  move: { activeMs: number; recoveryMs: number },
): number {
  if (phase !== 'active' && phase !== 'recovery') return 0;
  const t = phase === 'active' ? ms : move.activeMs + ms;
  const from = hop.fromActive * move.activeMs;
  const to = move.activeMs + hop.toRecovery * move.recoveryMs;
  if (to <= from || t <= from || t >= to) return 0;
  const u = (t - from) / (to - from);
  return hop.peakPx * 4 * u * (1 - u);
}
