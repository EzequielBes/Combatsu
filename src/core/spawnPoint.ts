import type { Rng } from './rng';
import { farthestPoint } from './waves';

export interface PickSpawnPointInput {
  points: readonly { x: number }[];
  viewLeft: number;
  viewRight: number;
  /** Folga além da borda da câmera (SPN-07), em px. */
  margin: number;
  playerX: number;
  playerFacing: 1 | -1;
  /** Instante (ms) do último uso de cada índice de ponto. */
  lastUsedAt: ReadonlyMap<number, number>;
  nowMs: number;
  /** Intervalo mínimo entre dois usos do mesmo ponto, em ms. */
  gapMs: number;
  rng: Rng;
  /** Chance de preferir os pontos do lado das costas do jogador (SPN-08). */
  preferBackChance: number;
  /** Alcance horizontal máximo ao player, em px (RCH-01); ausente = sem limite. */
  maxReach?: number;
}

/**
 * Escolhe o índice do ponto de spawn de um inimigo comum (SPN-07..09). Candidatos: pontos com
 * `x < viewLeft − margin` ou `x > viewRight + margin`, sem uso nos últimos `gapMs` (se todos foram usados, o gap
 * é ignorado). O `rng.chance` é consumido sempre, para o stream não depender da geometria (AD-006). Sem ponto
 * fora da câmera, devolve o mais distante do jogador (`farthestPoint`).
 *
 * Com `maxReach` (RCH-01, RCH-02) os candidatos também precisam de `|x - playerX| <= maxReach`; a preferência pelas
 * costas e o gap valem só sobre eles (RCH-05). Sem nenhum no alcance, devolve o ponto fora da câmera mais perto
 * do jogador, sem consumir `rng.int` (RCH-03).
 */
export function pickSpawnPoint(o: PickSpawnPointInput): number {
  const preferBack = o.rng.chance(o.preferBackChance);
  const outside: number[] = [];
  for (let i = 0; i < o.points.length; i++) {
    const x = o.points[i].x;
    if (x < o.viewLeft - o.margin || x > o.viewRight + o.margin) outside.push(i);
  }
  if (outside.length === 0) return farthestPoint(o.points as { x: number }[], o.playerX);

  const reach = o.maxReach ?? Infinity;
  const inReach = outside.filter((i) => Math.abs(o.points[i].x - o.playerX) <= reach);
  if (inReach.length === 0) return nearestPoint(o.points, outside, o.playerX);

  const free = inReach.filter((i) => {
    const last = o.lastUsedAt.get(i);
    return last === undefined || o.nowMs - last >= o.gapMs;
  });
  let pool = free.length > 0 ? free : inReach;
  if (preferBack) {
    const behind = pool.filter((i) => (o.playerFacing === 1 ? o.points[i].x < o.playerX : o.points[i].x > o.playerX));
    if (behind.length > 0) pool = behind;
  }
  return pool[o.rng.int(0, pool.length - 1)];
}

/** Dos índices `candidates`, o ponto mais perto do jogador; empate fica com o menor índice (RCH-03). */
function nearestPoint(points: readonly { x: number }[], candidates: readonly number[], playerX: number): number {
  return candidates.reduce((best, i) =>
    Math.abs(points[i].x - playerX) < Math.abs(points[best].x - playerX) ? i : best,
  );
}
