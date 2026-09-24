/**
 * Graça ao nascer (WAVE-09): o inimigo fica parado e sem golpe pelos primeiros `ms` desde o spawn, mas pode
 * apanhar. Puro: a cena lê `active` e segura o `canAct` do inimigo enquanto durar.
 */
export class SpawnGrace {
  private elapsedMs = 0;

  constructor(private readonly ms: number) {}

  get active(): boolean {
    return this.elapsedMs < this.ms;
  }

  update(dtMs: number): void {
    this.elapsedMs += dtMs;
  }
}
