import type { Rng } from './rng';

/** Tuning da onda de inimigos por rodada (WAVE-01, WAVE-03, WAVE-04). */
export interface WaveTuning {
  base: number;
  max: number;
  maxAlive: number;
  pointGapMs: number;
}

export type SpawnKind = 'enemy' | 'boss';

export interface SpawnOrder {
  /** Índice do inimigo na rodada (0-based, ordem de spawn). */
  k: number;
  /** Índice do ponto de spawn `E` do level. */
  point: number;
  /** Relógio interno da onda no momento do spawn. */
  atMs: number;
  /** `'boss'` numa rodada de chefe (BOSS-01/02), `'enemy'` nas demais. */
  kind: SpawnKind;
}

/** Tamanho da onda da rodada `r` (WAVE-01): cresce linearmente até o teto `t.max`. */
export function waveSize(round: number, t: WaveTuning): number {
  return Math.min(t.base + (round - 1), t.max);
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
 * Onda de uma rodada (WAVE-01..04, 06..08): sorteia um ponto inicial `s` no `Rng` e distribui os inimigos em
 * rodízio pelos pontos `(s + k) mod P`, respeitando o teto de vivos e o intervalo mínimo entre dois spawns no
 * mesmo ponto. Puro: `update(dtMs)` avança o relógio interno e devolve os spawns liberados nesse passo.
 */
export class WaveSpawner {
  private readonly size: number;
  private readonly s: number;
  private readonly bossRound: boolean;
  private elapsedMs = 0;
  private nextK = 0;
  private readonly lastSpawnAtPoint = new Map<number, number>();
  private readonly deadIds = new Set<number>();

  constructor(
    round: number,
    private readonly pointCount: number,
    rng: Rng,
    private readonly t: WaveTuning,
  ) {
    this.bossRound = isBossRound(round);
    this.size = this.bossRound ? 1 : waveSize(round, t);
    this.s = rng.int(0, pointCount - 1);
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

  /**
   * Avança o relógio da onda em `dtMs` e libera os spawns cujo ponto está livre há pelo menos `pointGapMs`
   * (ou nunca spawnou), enquanto houver menos de `maxAlive` vivos e fila não vazia (WAVE-03, WAVE-04).
   */
  update(dtMs: number): SpawnOrder[] {
    this.elapsedMs += dtMs;
    const orders: SpawnOrder[] = [];
    while (this.nextK < this.size && this.alive < this.t.maxAlive) {
      const point = (this.s + this.nextK) % this.pointCount;
      const lastAtPoint = this.lastSpawnAtPoint.get(point);
      if (lastAtPoint !== undefined && this.elapsedMs - lastAtPoint < this.t.pointGapMs) break;
      orders.push({ k: this.nextK, point, atMs: this.elapsedMs, kind: this.bossRound ? 'boss' : 'enemy' });
      this.lastSpawnAtPoint.set(point, this.elapsedMs);
      this.nextK++;
    }
    return orders;
  }
}
