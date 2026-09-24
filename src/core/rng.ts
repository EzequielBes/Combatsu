/**
 * Gerador pseudoaleatório com seed (mulberry32, AD-006): a mesma seed dá sempre a mesma sequência (FND-01), para
 * testar ondas, drops e loja em Node e reproduzir uma run. Puro: nada de `Math.random` no núcleo.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Valor em [0, 1) (FND-02). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max], inclusive (FND-20). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** `false` com p <= 0 (FND-03), `true` com p >= 1 (FND-21); senão sorteia. */
  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }
}
