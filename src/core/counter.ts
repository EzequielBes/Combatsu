export type CounterKind = 'contra' | 'contraGancho';

/**
 * Janela de Contra (CNT-01..07, CNT-13, CNT-20): aberta por uma defesa bem feita, dura `ms` de tempo de jogo e deixa
 * `J` ou `K` iniciar o Contra do `kind` dela. O tempo só anda em `update(dt)`, então o hitstop a congela. Um aperto
 * que chega com a esquiva ou o abaixar ainda ativos fica guardado (`buffer`) e sai no primeiro `take(true)` livre.
 */
export class CounterWindow {
  private _kind: CounterKind | null = null;
  private remaining = 0;
  private pressed = false;

  get isOpen(): boolean {
    return this._kind !== null;
  }

  /** Tipo do Contra da janela aberta; `null` com a janela fechada. */
  get kind(): CounterKind | null {
    return this._kind;
  }

  get remainingMs(): number {
    return this.remaining;
  }

  /** Abre a janela por `ms`. Com a janela já aberta, troca o `kind` e o tempo pelos novos (CNT-13). */
  open(kind: CounterKind, ms: number): void {
    this._kind = kind;
    this.remaining = ms;
  }

  /** Avança o tempo de jogo; a janela fecha exatamente quando o tempo acaba (449 ms aberta, 450 ms fechada). */
  update(dtMs: number): void {
    if (this._kind === null) return;
    this.remaining -= dtMs;
    if (this.remaining <= 0) this.close();
  }

  /** `J` ou `K` apertada com a janela aberta: o aperto fica guardado até ser consumido ou a janela fechar. */
  buffer(): void {
    if (this._kind !== null) this.pressed = true;
  }

  /**
   * Consome o aperto guardado: com a janela aberta, um aperto e `free` (esquiva e abaixar já não estão ativos),
   * devolve o `kind` e fecha a janela (CNT-06). Sem `free`, devolve `null` e mantém o aperto.
   */
  take(free: boolean): CounterKind | null {
    if (this._kind === null || !this.pressed || !free) return null;
    const kind = this._kind;
    this.close();
    return kind;
  }

  /** Fecha a janela e descarta o aperto guardado. */
  close(): void {
    this._kind = null;
    this.remaining = 0;
    this.pressed = false;
  }
}
