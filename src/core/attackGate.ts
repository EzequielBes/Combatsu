/** Tuning do limitador de atacantes (LIM-01, LIM-02). */
export interface AttackGateTuning {
  /** Máximo de inimigos com permissão de ataque ao mesmo tempo. */
  maxActive: number;
  /** Mínimo entre dois inícios de `windup`, em ms. */
  minWindupGapMs: number;
}

/**
 * Limitador simples de atacantes (LIM-01..06, EDG-03): `maxActive` vagas, fila FIFO de quem quer atacar e um
 * intervalo mínimo entre dois `windup`. Puro e sem estado global do jogo: a cena pede, consulta e libera. A F14
 * troca isto pelo `AttackDirector` sem mexer na IA.
 */
export class AttackGate {
  private readonly active: number[] = [];
  private readonly queue: number[] = [];
  private sinceWindupMs = Infinity;

  constructor(private readonly t: AttackGateTuning) {}

  /** Avança o relógio do intervalo entre windups. */
  update(dtMs: number): void {
    this.sinceWindupMs += dtMs;
  }

  /**
   * Pede permissão de ataque. Idempotente: quem já está na fila ou já tem vaga não entra de novo. Devolve se
   * `id` tem a vaga agora.
   */
  request(id: number): boolean {
    if (!this.active.includes(id) && !this.queue.includes(id)) this.queue.push(id);
    this.promote();
    return this.isGranted(id);
  }

  isGranted(id: number): boolean {
    return this.active.includes(id);
  }

  /** `true` quando já passaram `minWindupGapMs` desde o último `windup` (LIM-02). */
  windupAllowed(): boolean {
    return this.sinceWindupMs >= this.t.minWindupGapMs;
  }

  /** Registra o início de um `windup`: reinicia o intervalo. */
  noteWindup(_id: number): void {
    this.sinceWindupMs = 0;
  }

  /** Libera a vaga de `id` ou tira-o da fila (LIM-06). Idempotente. A vaga aberta vai para o primeiro da fila (LIM-04). */
  release(id: number): void {
    const a = this.active.indexOf(id);
    if (a >= 0) this.active.splice(a, 1);
    const q = this.queue.indexOf(id);
    if (q >= 0) this.queue.splice(q, 1);
    this.promote();
  }

  /** Quem espera permissão, do mais antigo para o mais novo (base do `holdRank`). */
  queueOrder(): readonly number[] {
    return this.queue;
  }

  activeCount(): number {
    return this.active.length;
  }

  /** Zera vagas, fila e intervalo (EDG-03). */
  reset(): void {
    this.active.length = 0;
    this.queue.length = 0;
    this.sinceWindupMs = Infinity;
  }

  private promote(): void {
    while (this.active.length < this.t.maxActive && this.queue.length > 0) {
      this.active.push(this.queue.shift() as number);
    }
  }
}
