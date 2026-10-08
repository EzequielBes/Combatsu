/** Números da esfera do Vazio Roxo (EVO-05, EVO-06). */
export const PURPLE = {
  /** Velocidade da esfera (px/s). */
  speed: 180,
  /** Duração do voo (ms); depois disso a esfera some. */
  lifeMs: 1600,
  /** Raio da esfera (px de mundo): toca quem tiver a caixa de acerto a esta distância do centro. */
  radius: 36,
  /** A esfera nasce à frente do player, a esta distância do centro dele. */
  spawnAhead: 40,
} as const;

/** Alvo visto pela esfera: id e a caixa de acerto (centro e meia largura/altura, px de mundo). */
export interface PurpleTarget {
  id: number;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/**
 * Esfera do Vazio Roxo (EVO-05, EVO-06): avança em linha reta a `PURPLE.speed` por `PURPLE.lifeMs` e toca cada alvo no
 * máximo uma vez por conjuração. Pura: a cena aplica o dano aos ids que `update` devolve.
 */
export class PurpleSphere {
  private elapsedMs = 0;
  private readonly hitIds = new Set<number>();

  constructor(
    private readonly startX: number,
    readonly y: number,
    readonly facing: 1 | -1,
  ) {}

  get x(): number {
    return this.startX + this.facing * PURPLE.speed * (Math.min(this.elapsedMs, PURPLE.lifeMs) / 1000);
  }

  /** A esfera ainda voa (EVO-05): some ao completar `PURPLE.lifeMs`. */
  get alive(): boolean {
    return this.elapsedMs < PURPLE.lifeMs;
  }

  get ageMs(): number {
    return this.elapsedMs;
  }

  /** Ids já tocados nesta conjuração. */
  get hits(): readonly number[] {
    return [...this.hitIds];
  }

  /** Avança `dtMs` e devolve os ids tocados pela primeira vez neste passo (EVO-06). */
  update(dtMs: number, targets: readonly PurpleTarget[]): number[] {
    if (!this.alive) return [];
    this.elapsedMs += dtMs;
    const cx = this.x;
    const fresh: number[] = [];
    for (const t of targets) {
      if (this.hitIds.has(t.id)) continue;
      // Círculo contra caixa: o ponto da caixa mais perto do centro está dentro do raio.
      const dx = cx - Math.max(t.x - t.halfW, Math.min(cx, t.x + t.halfW));
      const dy = this.y - Math.max(t.y - t.halfH, Math.min(this.y, t.y + t.halfH));
      if (dx * dx + dy * dy <= PURPLE.radius * PURPLE.radius) {
        this.hitIds.add(t.id);
        fresh.push(t.id);
      }
    }
    return fresh;
  }
}
