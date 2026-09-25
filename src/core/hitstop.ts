/**
 * Congelamento curto quando um golpe conecta (FX-01). Um golpe novo durante o congelamento fica com o maior entre
 * o restante e o novo, nunca a soma (FX-02). Puro: a cena lê `frozen` e pausa física, animações e timers.
 */
export class Hitstop {
  private remainingMs = 0;

  /** Tempo de congelamento que ainda falta (ms); exposto no snapshot de debug (BWIN-02). */
  get remaining(): number {
    return this.remainingMs;
  }

  get frozen(): boolean {
    return this.remainingMs > 0;
  }

  trigger(ms: number): void {
    this.remainingMs = Math.max(this.remainingMs, ms);
  }

  update(dtMs: number): void {
    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
  }

  /** Descongela na hora (reinício da cena no meio do hitstop). */
  reset(): void {
    this.remainingMs = 0;
  }
}
