/**
 * Estado do Punho Divergente (DIV-03..06, DIV-08): guarda o alvo do 1º impacto e o relógio até o 2º impacto,
 * 200 ms depois; sem 2º impacto se o soco não acertou ninguém (DIV-05, nunca chama `firstImpact`) ou se o
 * alvo morreu antes (DIV-06, `targetDied`). Não decide dano nem física — quem chama aplica os valores de
 * `TECHNIQUES.divergente.damage`. Sem `phaser` aqui.
 */
export class DivergentState {
  private _targetId: number | null = null;
  private elapsedMs = 0;
  private fired = false;
  private dead = false;

  /** Alvo do 1º impacto, `null` se o soco ainda não acertou ninguém (DIV-05). */
  get targetId(): number | null {
    return this._targetId;
  }

  /** DIV-03: registra o alvo do 1º impacto e zera o relógio do 2º; ignora um novo alvo se já há um em curso. */
  firstImpact(targetId: number): void {
    if (this._targetId !== null) return;
    this._targetId = targetId;
    this.elapsedMs = 0;
    this.fired = false;
    this.dead = false;
  }

  /** DIV-06: o alvo do 1º impacto morreu antes do 2º; cancela o 2º impacto. */
  targetDied(): void {
    this.dead = true;
  }

  /** DIV-08: raio do anel de aproximação, de 32 px (t=0) a 0 px (t=200 ms), sem sair desses limites. */
  ringRadius(): number {
    if (this._targetId === null) return 0;
    const t = Math.min(Math.max(this.elapsedMs, 0), 200);
    return 32 * (1 - t / 200);
  }

  /**
   * DIV-04, DIV-05, DIV-06: avança o relógio desde o 1º impacto; devolve o id do alvo no frame exato em que os
   * 200 ms se completam (2º impacto), ou `null` se ainda não é hora, se não há alvo ou se o alvo morreu.
   */
  update(dtMs: number): number | null {
    if (this._targetId === null || this.fired) return null;
    const before = this.elapsedMs;
    this.elapsedMs += dtMs;
    if (before < 200 && this.elapsedMs >= 200) {
      this.fired = true;
      return this.dead ? null : this._targetId;
    }
    return null;
  }
}
