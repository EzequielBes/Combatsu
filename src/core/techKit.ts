import { bitePctFor, boxCenter, maxHpBite, type BodyKind, type Box } from './axisRule';
import type { Vec2 } from './hit';

/**
 * Kit comum das técnicas da leva 2 (spec `regras-tecnicas-leva2`, KIT-01 a KIT-03): as contas de geometria e a
 * devolução de recarga que as quatro técnicas repetem. Puro, sem Phaser.
 */

/**
 * Sonda do mundo, fornecida pelo adaptador: distância, ao longo do trecho horizontal a partir de `from`, até o
 * primeiro sólido dentro de `maxDist`, ou `null` se o trecho está livre. Mesmo formato da sonda da Ressonância.
 */
export type WallProbe = (from: Vec2, dir: 1 | -1, maxDist: number) => number | null;

/** KIT-01: duas caixas se tocam (borda encostada conta). */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
}

/** KIT-01: o ponto da caixa mais perto do centro está dentro do raio. */
export function boxInRadius(box: Box, center: Vec2, radius: number): boolean {
  const dx = center.x - Math.max(box.x, Math.min(center.x, box.x + box.width));
  const dy = center.y - Math.max(box.y, Math.min(center.y, box.y + box.height));
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * KIT-01: distância, a partir de `from` e na direção `dir`, até o trecho horizontal de comprimento `length` entrar na
 * caixa; `null` se a altura de `from` fica fora da caixa ou o trecho não chega nela. Já dentro: 0.
 */
export function segmentEntry(from: Vec2, dir: 1 | -1, length: number, box: Box): number | null {
  if (from.y < box.y || from.y > box.y + box.height) return null;
  const x1 = from.x + dir * length;
  if (Math.max(from.x, x1) < box.x || Math.min(from.x, x1) > box.x + box.width) return null;
  return dir === 1 ? Math.max(box.x - from.x, 0) : Math.max(from.x - (box.x + box.width), 0);
}

/** Distância entre dois pontos. */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * KIT-02: o alvo mais perto de `from` (centro da caixa) dentro de `radius` (borda inclusa), fora de `skip`; empate
 * pelo menor id. `null` se ninguém serve.
 */
export function nearestTarget<T extends { id: number; box: Box }>(
  from: Vec2,
  radius: number,
  targets: readonly T[],
  skip: (id: number) => boolean,
): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const t of targets) {
    if (skip(t.id)) continue;
    const d = dist(boxCenter(t.box), from);
    if (d > radius + 1e-9) continue;
    if (d < bestDist || (d === bestDist && best !== null && t.id < best.id)) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

/**
 * KIT-03 (TRL-06): o 1º abate da conjuração devolve `pct` da recarga (0,3 com Recarga no 3). `claim` devolve os ms a
 * cortar da recarga no 1º pedido e 0 nos seguintes, ou sempre 0 com `pct` 0.
 */
export class KillRefund {
  private claimed = false;

  constructor(
    private readonly cooldownMs: number,
    private readonly pct: number,
  ) {}

  claim(): number {
    if (this.claimed || this.pct <= 0) return 0;
    this.claimed = true;
    return Math.round(this.cooldownMs * this.pct);
  }
}

/**
 * Componente proporcional do Despertar, uma vez por alvo por conjuração (decisão comum da leva 1): o 1º pedido de
 * cada alvo devolve 4% do HP máximo (chefe 1%), os seguintes 0.
 */
export class BiteLedger {
  private readonly bitten = new Set<number>();

  bite(target: { id: number; kind: BodyKind; maxHp: number }): number {
    if (this.bitten.has(target.id)) return 0;
    this.bitten.add(target.id);
    return maxHpBite(target.maxHp, target.kind, bitePctFor(target.kind));
  }
}
