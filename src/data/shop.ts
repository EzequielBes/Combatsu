/**
 * Catálogo da loja (SHOP-06..09, SHOP-18, MOD-03, MOD-09): dirigido por dados para a F5 acrescentar um `kind`
 * novo (técnicas, upgrades de energia) sem mudar a lógica de elegibilidade, sorteio ou compra.
 */
export type ShopEntryKind = 'modifier' | 'consumable';
export type ModifierId = 'vida' | 'forca' | 'agilidade' | 'ima' | 'sorte';
export type ShopEntryId = ModifierId | 'cura';

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
