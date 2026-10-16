import type { Modifiers } from './modifiers';
import type { Loadout } from './loadout';
import { arsenalCost, type Arsenal } from './arsenal';
import { axisItemOf } from './shopDraw';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import { PRICING } from '../data/tuning';
import type { TechId } from '../data/techniques';
import type { ShopEntry } from '../data/shop';

/** PRC-02: preço do próximo ponto de eixo do Vermelho ou do Corpo, 12 mais 4 por ponto já posto no item. */
export function axisPointPrice(points: number): number {
  return PRICING.axisPoint.base + PRICING.axisPoint.step * points;
}

/** PRC-03: preço da carta na rodada `round`, `round(base × (1 + 0,06 × (r − 1)))`; a 1ª rodada não inflaciona. */
export function inflate(base: number, round: number): number {
  return Math.round(base * (1 + PRICING.inflationPerRound * (round - 1)));
}

/** PRC-01: preço da técnica nova, antes da inflação: 20 a comum, 26 a rara. */
export function newTechPrice(rarity: 'common' | 'rare'): number {
  return PRICING.newTech[rarity];
}

/** PRC-04: rodada mínima do próximo ponto de eixo, dado quantos o item já tem; sem ponto livre, nunca. */
export function axisGate(points: number): number {
  return PRICING.axisGate[points] ?? Infinity;
}

/** PRC-04: rodada mínima do próximo nível de uma técnica sem eixos (AD-005): nível 2 na rodada 2, nível 3 na 4. */
export function techLevelGate(nextLevel: number): number {
  if (nextLevel >= 3) return 4;
  if (nextLevel >= 2) return 2;
  return 1;
}

export interface CardCostCtx {
  modifiers: Modifiers;
  loadout?: Loadout;
  arsenal?: Arsenal;
  round: number;
}

/** Preço da carta antes da inflação (ARS-04, PRC-01, PRC-02, PRC-06, EVO-04). */
function baseCost(entry: ShopEntry, ctx: CardCostCtx): number {
  const { modifiers, loadout, arsenal } = ctx;
  if (arsenal && entry.id in ARSENAL) return arsenalCost(entry.id as ArsenalId, arsenal);
  const axisItem = loadout && axisItemOf(entry, loadout);
  if (axisItem) return axisPointPrice(loadout.axes.total(axisItem));
  if (entry.kind === 'evolution') return entry.cost.base;
  if (entry.kind === 'technique') {
    const level = loadout?.levelOf(entry.id as TechId) ?? 0;
    return level === 0 ? newTechPrice(entry.rarity) : entry.cost.base + entry.cost.step * level;
  }
  return modifiers.cost(entry);
}

/** PRC-03, PRC-06: preço final de toda carta da loja, com a inflação da rodada; o reroll não passa por aqui. */
export function cardCost(entry: ShopEntry, ctx: CardCostCtx): number {
  return inflate(baseCost(entry, ctx), ctx.round);
}
