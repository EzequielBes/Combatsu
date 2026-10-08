import { VOW, VOW_IDS, type VowId } from '../data/vows';
import type { Rng } from './rng';

/** Votos tomados na run (VOW-05, VOW-08): cada um no máximo uma vez; `reset` a cada run nova. */
export class Vows {
  private readonly taken = new Set<VowId>();

  has(id: VowId): boolean {
    return this.taken.has(id);
  }

  /** `false` se já tinha. */
  take(id: VowId): boolean {
    if (this.taken.has(id)) return false;
    this.taken.add(id);
    return true;
  }

  /** Na ordem do catálogo (estável para o snapshot e o sorteio). */
  get list(): VowId[] {
    return VOW_IDS.filter((id) => this.taken.has(id));
  }

  reset(): void {
    this.taken.clear();
  }
}

/**
 * Sorteio do painel (VOW-05..07): até `count` votos distintos entre os ainda não tomados, na ordem do sorteio.
 * Com menos restantes que `count`, devolve todos os restantes; sem nenhum, lista vazia. Só consome o `rng` dado.
 */
export function drawVows(rng: Rng, taken: readonly VowId[], count: number = VOW.offers): VowId[] {
  const pool = VOW_IDS.filter((id) => !taken.includes(id));
  const out: VowId[] = [];
  while (out.length < count && pool.length > 0) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}
