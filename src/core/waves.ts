/** Tuning da onda de inimigos por rodada (WAVE-01, WAVE-03, WAVE-04). */
export interface WaveTuning {
  base: number;
  perRound: number;
  max: number;
  maxAliveBase: number;
  maxAliveEvery: number;
  maxAliveCap: number;
  initialBurst: number;
  trickleMs: number;
  /** Intervalo mínimo entre dois usos do mesmo ponto; consumido por `pickSpawnPoint` (SPN-07). */
  pointGapMs: number;
}

export type SpawnKind = 'enemy' | 'boss';

export interface SpawnOrder {
  /** Índice do inimigo na rodada (0-based, ordem de spawn). */
  k: number;
  /** Relógio interno da onda no momento do spawn. */
  atMs: number;
  /** `'boss'` numa rodada de chefe (BOSS-01/02), `'enemy'` nas demais. */
  kind: SpawnKind;
}

/** Tamanho da onda da rodada `r` (SPN-01): `base + perRound·(r − 1)`, limitado a `t.max`. */
export function waveSize(round: number, t: WaveTuning): number {
  return Math.min(t.base + t.perRound * (round - 1), t.max);
}

/** Teto de inimigos vivos da rodada `r` (SPN-02): `maxAliveBase + floor((r − 1) / maxAliveEvery)`, limitado a `maxAliveCap`. */
export function maxAliveFor(round: number, t: WaveTuning): number {
  return Math.min(t.maxAliveBase + Math.floor((round - 1) / t.maxAliveEvery), t.maxAliveCap);
}

/** Rodada de chefe (BOSS-01): múltiplo de 5. */
export function isBossRound(round: number): boolean {
  return round % 5 === 0;
}

/**
 * Ponto de spawn do chefe (BOSS-03): o de maior distância absoluta até o player; empate escolhe o menor
 * índice. Um único ponto sempre devolve 0.
 */
export function farthestPoint(points: { x: number }[], playerX: number): number {
  let bestIdx = 0;
  let bestDist = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs(points[i].x - playerX);
    if (dist > bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Level sem ponto `E`: falha de dado de mapa, não deveria acontecer em produção (edge case). */
export function requireSpawnPoints(level: { enemies: unknown[] }, name: string): void {
  if (level.enemies.length === 0) {
    throw new Error(`Level "${name}" sem ponto de spawn E`);
  }
}

/**
 * Onda de uma rodada (SPN-02..05, EDG-01/02): no primeiro `update` libera um burst de até `initialBurst`
 * inimigos; depois goteja 1 a cada `trickleMs` desde o último spawn, enquanto houver vaga (`maxAliveFor`) e fila.
 * Não escolhe ponto (`pickSpawnPoint`). Puro: `update(dtMs)` avança o relógio e devolve os spawns do passo.
 */
export class WaveSpawner {
  private readonly size: number;
  private readonly maxAlive: number;
  private readonly bossRound: boolean;
  private elapsedMs = 0;
  private lastSpawnAtMs = 0;
  private started = false;
  private nextK = 0;
  private readonly deadIds = new Set<number>();

  constructor(
    round: number,
    private readonly t: WaveTuning,
    maxAliveOverride?: number,
  ) {
    this.bossRound = isBossRound(round);
    this.size = this.bossRound ? 1 : waveSize(round, t);
    this.maxAlive = maxAliveOverride ?? maxAliveFor(round, t);
  }

  /** Spawnados menos mortos contados (WAVE-06). */
  get alive(): number {
    return this.nextK - this.deadIds.size;
  }

  /** Ainda não spawnados. */
  get queued(): number {
    return this.size - this.nextK;
  }

  /** Abates contados uma vez por id (WAVE-06, WAVE-08). */
  get kills(): number {
    return this.deadIds.size;
  }

  /** Inimigos da rodada ainda não abatidos (spawnados ou não). */
  get remaining(): number {
    return this.size - this.deadIds.size;
  }

  get cleared(): boolean {
    return this.deadIds.size >= this.size;
  }

  /**
   * Marca o abate de `enemyId`; devolve `true` só na primeira vez desse id (WAVE-06). Duas mortes diferentes
   * antes do mesmo `update` já contam nos getters imediatamente (WAVE-08).
   */
  enemyDied(enemyId: number): boolean {
    if (this.deadIds.has(enemyId)) return false;
    this.deadIds.add(enemyId);
    return true;
  }

  /** Avança o relógio em `dtMs` e libera o burst inicial (SPN-03) ou o gotejamento (SPN-04), sem passar do teto de vivos (SPN-05). */
  update(dtMs: number): SpawnOrder[] {
    this.elapsedMs += dtMs;
    const kind: SpawnKind = this.bossRound ? 'boss' : 'enemy';
    const orders: SpawnOrder[] = [];
    if (!this.started) {
      this.started = true;
      const burst = Math.min(this.t.initialBurst, this.maxAlive, this.size);
      for (let i = 0; i < burst; i++) orders.push({ k: this.nextK++, atMs: this.elapsedMs, kind });
      this.lastSpawnAtMs = this.elapsedMs;
      return orders;
    }
    if (
      this.nextK < this.size &&
      this.alive < this.maxAlive &&
      this.elapsedMs - this.lastSpawnAtMs >= this.t.trickleMs
    ) {
      orders.push({ k: this.nextK++, atMs: this.elapsedMs, kind });
      this.lastSpawnAtMs = this.elapsedMs;
    }
    return orders;
  }
}
