/**
 * Vida do boneco de treino do laboratório (FXL-06): nunca morre de verdade - ao zerar, espera `regenMs` de tempo
 * de jogo e volta ao máximo, ficando no lugar o tempo todo.
 */
export class DummyHealth {
  private _hp: number;
  private regenMsLeft = 0;

  constructor(
    readonly max: number,
    private readonly regenMs: number,
  ) {
    this._hp = max;
  }

  get hp(): number {
    return this._hp;
  }

  /** Aplica dano com piso 0; ao zerar a partir de vivo, arma o relógio de `regenMs` (FXL-06). */
  receive(damage: number): void {
    const wasAlive = this._hp > 0;
    this._hp = Math.max(0, this._hp - damage);
    if (wasAlive && this._hp === 0) this.regenMsLeft = this.regenMs;
  }

  /** Conta o relógio só enquanto zerado; ao completar `regenMs`, volta ao máximo (FXL-06). */
  update(dtMs: number): void {
    if (this._hp > 0) return;
    this.regenMsLeft -= dtMs;
    if (this.regenMsLeft <= 0) {
      this._hp = this.max;
      this.regenMsLeft = 0;
    }
  }
}
