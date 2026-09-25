/** Carteira de fragmentos da run (ECO-12..14, ECO-20, ECO-26): o saldo nunca fica negativo. */
export class Wallet {
  private _fragments = 0;

  get fragments(): number {
    return this._fragments;
  }

  /** Ignora `n` <= 0 ou não inteiro (sorteio inválido não credita nada). */
  add(n: number): void {
    if (!Number.isInteger(n) || n <= 0) return;
    this._fragments += n;
  }

  /** Recusa e mantém o saldo se `n` > saldo (ECO-13, ECO-26); só desconta com 0 < n <= saldo (ECO-20). */
  spend(n: number): boolean {
    if (!Number.isInteger(n) || n <= 0 || n > this._fragments) return false;
    this._fragments -= n;
    return true;
  }

  /** Zera o saldo (ECO-14, nova run). */
  reset(): void {
    this._fragments = 0;
  }
}
