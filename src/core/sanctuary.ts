import { SANCTUARY } from '../data/domains';
import { inRadius } from './domainActivation';
import type { Vec2 } from './hit';

/**
 * Santuário Malevolente, regra pura (SAN-02, SAN-03, SAN-05): o teto de gatilhos por segundo, os alvos de cada corte,
 * o dano do corte e o Corte do Mundo do fim do Nv 3.
 */

/**
 * Janela deslizante de gatilhos no tempo de jogo (SAN-02): um gatilho conta enquanto `now − t < windowMs`; com
 * `triggersPerWindow` na janela, o próximo é recusado. Gatilho sem alvo também conta.
 */
export class SanctuaryTriggers {
  private times: number[] = [];

  private prune(nowMs: number): void {
    this.times = this.times.filter((t) => nowMs - t < SANCTUARY.windowMs);
  }

  /** Solta o gatilho se a janela tem vaga; devolve se soltou. */
  tryRelease(nowMs: number): boolean {
    this.prune(nowMs);
    if (this.times.length >= SANCTUARY.triggersPerWindow) return false;
    this.times.push(nowMs);
    return true;
  }

  /** Gatilhos soltos na janela que termina em `nowMs`. */
  countAt(nowMs: number): number {
    return this.times.filter((t) => nowMs - t < SANCTUARY.windowMs).length;
  }

  reset(): void {
    this.times = [];
  }
}

/** Alvo do Santuário: comum ou chefe, com o centro do corpo e o HP. */
export interface SanctuaryTarget {
  id: number;
  center: Vec2;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

/** Vivos a até `radiusPx` (borda inclusa), do mais perto ao mais longe, empate pelo id, no máximo `max` (SAN-03). */
export const sanctuaryTargets = <T extends SanctuaryTarget>(
  center: Vec2,
  targets: readonly T[],
  max: number,
  radiusPx: number = SANCTUARY.radiusPx,
): T[] => {
  const dist = (t: T): number => Math.hypot(t.center.x - center.x, t.center.y - center.y);
  return targets
    .filter((t) => t.hp > 0 && inRadius(center, t.center, radiusPx))
    .sort((a, b) => dist(a) - dist(b) || a.id - b.id)
    .slice(0, max);
};

/** Dano de um corte: a base escalada pelo multiplicador de HP da rodada (SAN-03). */
export const sanctuaryCutDamage = (hpMul: number): number => Math.round(SANCTUARY.cutBase * hpMul);

/**
 * Corte do Mundo (SAN-05): cada comum vivo a até 320 px com HP de 35% do máximo ou menos leva o HP restante; o chefe
 * vivo a até 320 px leva `round(0,08 × maxHp)`; comum acima de 35% fica de fora.
 */
export const worldCutHits = <T extends SanctuaryTarget>(
  center: Vec2,
  targets: readonly T[],
): { target: T; damage: number }[] => {
  const { threshold, bossFraction } = SANCTUARY.worldCut;
  const hits: { target: T; damage: number }[] = [];
  for (const target of targets) {
    if (target.hp <= 0 || !inRadius(center, target.center, SANCTUARY.radiusPx)) continue;
    if (target.isBoss) hits.push({ target, damage: Math.round(bossFraction * target.maxHp) });
    else if (target.hp <= threshold * target.maxHp) hits.push({ target, damage: target.hp });
  }
  return hits;
};
