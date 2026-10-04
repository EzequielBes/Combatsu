import type { TechId } from './techniques';

/**
 * Catálogo da loja (SHOP-06..09, SHOP-18, MOD-03, MOD-09): dirigido por dados para a F5 acrescentar um `kind`
 * novo (técnicas, upgrades de energia) sem mudar a lógica de elegibilidade, sorteio ou compra.
 */
export type ShopEntryKind = 'modifier' | 'consumable' | 'technique';
/** Os 5 modificadores da F4 (loja-da-run). */
export type CoreModifierId = 'vida' | 'forca' | 'agilidade' | 'ima' | 'sorte';
/** Upgrades de energia amaldiçoada da F5 (TSH-08, TSH-15): rastreados à parte dos 5 da F4 em `Modifiers`. */
export type EnergyModifierId = 'energia' | 'fluxo';
export type ModifierId = CoreModifierId | EnergyModifierId;
export type ShopEntryId = ModifierId | 'cura' | TechId;

export interface ShopEntryCost {
  base: number;
  step: number;
}

export interface ShopEntry {
  id: ShopEntryId;
  kind: ShopEntryKind;
  rarity: 'common' | 'rare';
  name: string;
  /** 0 para consumível (não tem nível). */
  maxLevel: number;
  cost: ShopEntryCost;
  /** Rodada mínima para comprar o nível `nextLevel` (SHOP-18). */
  minRound: (nextLevel: number) => number;
}

/** minRound de quem nunca trava nível nenhum atrás de rodada (SHOP-18, caso "demais"). */
const alwaysOpen = (): number => 1;

/** minRound de um modificador que só libera `nextLevel >= gate` a partir da rodada `round` (SHOP-18). */
const gatedFrom =
  (gate: number, round: number) =>
  (nextLevel: number): number =>
    nextLevel >= gate ? round : 1;

/**
 * Ordem do catálogo — vida, força, agilidade, ímã, sorte, cura — é a ordem que SHOP-08 usa para o sorteio
 * ponderado (primeira entrada, em ordem, cuja soma acumulada de peso ultrapassa o sorteio).
 */
export const SHOP_CATALOG: readonly ShopEntry[] = [
  {
    id: 'vida',
    kind: 'modifier',
    rarity: 'common',
    name: 'Vida',
    maxLevel: 5,
    cost: { base: 12, step: 6 },
    minRound: gatedFrom(4, 6),
  },
  {
    id: 'forca',
    kind: 'modifier',
    rarity: 'rare',
    name: 'Força',
    maxLevel: 5,
    cost: { base: 15, step: 8 },
    minRound: gatedFrom(4, 6),
  },
  {
    id: 'agilidade',
    kind: 'modifier',
    rarity: 'common',
    name: 'Agilidade',
    maxLevel: 3,
    cost: { base: 10, step: 6 },
    minRound: gatedFrom(3, 4),
  },
  {
    id: 'ima',
    kind: 'modifier',
    rarity: 'common',
    name: 'Ímã',
    maxLevel: 3,
    cost: { base: 6, step: 4 },
    minRound: alwaysOpen,
  },
  {
    id: 'sorte',
    kind: 'modifier',
    rarity: 'rare',
    name: 'Sorte',
    maxLevel: 3,
    cost: { base: 10, step: 6 },
    minRound: alwaysOpen,
  },
  {
    id: 'cura',
    kind: 'consumable',
    rarity: 'common',
    name: 'Cura rápida',
    maxLevel: 0,
    cost: { base: 8, step: 0 },
    minRound: alwaysOpen,
  },
];

/**
 * Rodada mínima do próximo nível de uma técnica (TSH-04, AD-005): nível 2 exige rodada ≥ 2 (ECN-02), nível 3 exige
 * rodada ≥ 4 (ECN-09).
 */
const techGate = (nextLevel: number): number => {
  if (nextLevel >= 3) return 4;
  if (nextLevel >= 2) return 2;
  return 1;
};

/**
 * Técnicas na loja (TSH-01, TSH-02): Punho Divergente e Desmantelar comuns, Azul e Vermelho raras; custo
 * `base + step × nível atual` (0 se não equipada).
 */
export const TECHNIQUE_SHOP_ENTRIES: readonly ShopEntry[] = [
  {
    id: 'divergente',
    kind: 'technique',
    rarity: 'common',
    name: 'Punho Divergente',
    maxLevel: 3,
    cost: { base: 15, step: 11 },
    minRound: techGate,
  },
  {
    id: 'corte',
    kind: 'technique',
    rarity: 'common',
    name: 'Desmantelar',
    maxLevel: 3,
    cost: { base: 23, step: 11 },
    minRound: techGate,
  },
  {
    id: 'azul',
    kind: 'technique',
    rarity: 'rare',
    name: 'Azul',
    maxLevel: 3,
    cost: { base: 26, step: 15 },
    minRound: techGate,
  },
  {
    id: 'vermelho',
    kind: 'technique',
    rarity: 'rare',
    name: 'Reversão de Técnica: Vermelho',
    maxLevel: 3,
    cost: { base: 30, step: 15 },
    minRound: techGate,
  },
];

/** Upgrades de energia amaldiçoada na loja (TSH-08, TSH-15): só entram no pool com alguma técnica equipada (TSH-09). */
export const ENERGY_SHOP_ENTRIES: readonly ShopEntry[] = [
  {
    id: 'energia',
    kind: 'modifier',
    rarity: 'common',
    name: 'Energia',
    maxLevel: 5,
    cost: { base: 10, step: 6 },
    minRound: alwaysOpen,
  },
  {
    id: 'fluxo',
    kind: 'modifier',
    rarity: 'common',
    name: 'Fluxo',
    maxLevel: 4,
    cost: { base: 12, step: 6 },
    minRound: alwaysOpen,
  },
];

/**
 * Catálogo completo com técnicas e energia (F5, TSH-01). `SHOP_CATALOG` continua só com os itens da F4 —
 * SPEC_DEVIATION: `tests/data/shop.test.ts` fixa `SHOP_CATALOG.map(e => e.id)` por igualdade exata (F4); acrescentar
 * as técnicas ali quebraria essa asserção sem necessidade, já que `eligible`/`Shop` aceitam qualquer catálogo.
 * `FULL_SHOP_CATALOG` é o catálogo que a loja usa a partir da F5.
 */
export const FULL_SHOP_CATALOG: readonly ShopEntry[] = [
  ...SHOP_CATALOG,
  ...TECHNIQUE_SHOP_ENTRIES,
  ...ENERGY_SHOP_ENTRIES,
];
