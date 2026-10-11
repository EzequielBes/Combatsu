/** Duração total (ms) do estouro do Kokusen: a soma do tempo de cada quadro. */
export function burstTotalMs(frameMs: readonly number[]): number {
  return frameMs.reduce((a, b) => a + b, 0);
}

/**
 * Opacidade do estouro em `elapsedMs`: cheia até o último quadro, que apaga em linha reta até sumir (os estilhaços
 * se desfazem em vez de desaparecer de uma vez).
 */
export function burstAlphaAt(frameMs: readonly number[], elapsedMs: number): number {
  const total = burstTotalMs(frameMs);
  const last = frameMs[frameMs.length - 1] ?? 0;
  if (last <= 0 || elapsedMs <= total - last) return 1;
  return Math.max(0, (total - elapsedMs) / last);
}

/**
 * Quadro do estouro do Kokusen em `elapsedMs` (tempo real desde o acerto): cada quadro fica `frameMs[i]` na tela, em
 * ordem; `null` depois do último. Puro, sem `phaser`.
 */
export function burstFrameAt(frameMs: readonly number[], elapsedMs: number): number | null {
  let end = 0;
  for (let i = 0; i < frameMs.length; i++) {
    end += frameMs[i];
    if (elapsedMs < end) return i;
  }
  return null;
}
