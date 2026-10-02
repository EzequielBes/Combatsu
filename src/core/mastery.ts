import { MASTERY, type MasteryTuning } from '../data/tuning';

export type MasterySlot = 0 | 1;

/**
 * Maestria das técnicas equipadas (MST-01..06): cada slot acumula pontos por acerto e sobe de nível ao chegar
 * no limiar do nível atual. Lógica pura (AD-001); quem chama sobe o nível no `Loadout` quando `levelUp` é true.
 */
export class Mastery {
  private readonly pts: [number, number] = [0, 0];
  /** Trios `(slot, castId, targetId)` já contados: um alvo só pontua uma vez por conjuração (MST-01, MST-02). */
  private readonly seen = new Set<string>();

  constructor(private readonly t: MasteryTuning = MASTERY) {}

  points(slot: MasterySlot): number {
    return this.pts[slot];
  }

  /** Pontos necessários para sair do `level`; `null` no Nv3, que não acumula (MST-05). */
  threshold(level: 1 | 2 | 3): number | null {
    return level === 3 ? null : this.t.thresholds[level];
  }

  /**
   * Registra um acerto da conjuração `castId` em `targetId` (MST-01, MST-02): comum vale 1 ponto, chefe vale
   * `bossPoints`; o mesmo alvo na mesma conjuração conta uma vez. Ao atingir o limiar do `level` os pontos
   * voltam a 0 e devolve `levelUp: true` (MST-03, MST-04), sem olhar a rodada (MST-06). No Nv3 não acumula.
   */
  registerHit(
    slot: MasterySlot,
    level: 1 | 2 | 3,
    castId: number,
    targetId: number | string,
    isBoss: boolean,
  ): { levelUp: boolean } {
    const limit = this.threshold(level);
    if (limit === null) return { levelUp: false };
    const key = `${slot}:${castId}:${targetId}`;
    if (this.seen.has(key)) return { levelUp: false };
    this.seen.add(key);
    this.pts[slot] += isBoss ? this.t.bossPoints : 1;
    if (this.pts[slot] >= limit) {
      this.pts[slot] = 0;
      return { levelUp: true };
    }
    return { levelUp: false };
  }

  /** Zera os pontos do slot, ao equipar técnica nova nele (PRG-04). */
  resetSlot(slot: MasterySlot): void {
    this.pts[slot] = 0;
    const prefix = `${slot}:`;
    for (const key of [...this.seen]) if (key.startsWith(prefix)) this.seen.delete(key);
  }

  /** Zera tudo, no início de uma run. */
  reset(): void {
    this.pts[0] = 0;
    this.pts[1] = 0;
    this.seen.clear();
  }

  /** Define os pontos do slot (atalho `?debug&mastery=N`). */
  setPoints(slot: MasterySlot, n: number): void {
    this.pts[slot] = Math.max(0, n);
  }
}
