import type { PropState } from './props';
import type { DroppedToolsTuning } from '../data/tuning';

/**
 * Tempo de vida e teto das ferramentas largadas no chão (ARM-13, ARM-14, ARM-18, ARM-28): uma ferramenta em
 * `rest` some depois de `restMs` sem ser pega, e nunca mais de `max` ficam registradas ao mesmo tempo. Puro: só
 * guarda o relógio de cada id; quem lê o `PropState` de fora avisa `update` a cada frame.
 */
export class DroppedTools {
  private readonly restTimers = new Map<number, number>();

  constructor(private readonly t: DroppedToolsTuning) {}

  /** Ids registrados no momento (para inspeção/teste). */
  get ids(): number[] {
    return [...this.restTimers.keys()];
  }

  /**
   * Registra uma ferramenta nova (com o relógio de repouso zerado) e devolve o id a remover para caber no teto de
   * `max` (ARM-14): a mais antiga que está em `rest` agora, ou `null` se já cabe ou nenhuma está em `rest`.
   */
  admit(id: number, states: ReadonlyMap<number, PropState>): number | null {
    let evict: number | null = null;
    if (this.restTimers.size >= this.t.max) {
      let oldestMs = -Infinity;
      for (const [otherId, ms] of this.restTimers) {
        if (states.get(otherId) !== 'rest') continue;
        if (ms > oldestMs) {
          oldestMs = ms;
          evict = otherId;
        }
      }
    }
    this.restTimers.set(id, 0);
    return evict;
  }

  /**
   * Avança o relógio de cada ferramenta em `rest` (reinicia ao sair de `rest`, ARM-28) e devolve os ids que
   * passaram `restMs` sem serem pegos (ARM-13), já removidos do registro.
   */
  update(dtMs: number, states: ReadonlyMap<number, PropState>): number[] {
    const expired: number[] = [];
    for (const [id, ms] of this.restTimers) {
      const state = states.get(id);
      if (state !== 'rest') {
        this.restTimers.set(id, 0);
        continue;
      }
      const next = ms + dtMs;
      if (next >= this.t.restMs) {
        expired.push(id);
        this.restTimers.delete(id);
      } else {
        this.restTimers.set(id, next);
      }
    }
    return expired;
  }

  /** A ferramenta quebrou ou foi removida por outro motivo: para de contar (não conta para o teto). */
  forget(id: number): void {
    this.restTimers.delete(id);
  }

  clear(): void {
    this.restTimers.clear();
  }
}
