import type { Modifiers } from './modifiers';
import type { Loadout } from './loadout';
import { arsenalEligible, type Arsenal } from './arsenal';
import type { Perks } from './build';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import type { PerkId } from '../data/perks';
import type { TechId } from '../data/techniques';
import { RECIPES, type Recipe } from '../data/evolutions';
import { recipeReady } from './evolution';
import type { ModifierId, ShopEntry, ShopEntryId } from '../data/shop';

/** Receita da evolução que vende `id` (EVO-01). */
const recipeOf = (id: ShopEntryId): Recipe | undefined => RECIPES.find((r) => r.into === id);

/** EVO-01/02/04: a evolução entra com a receita pronta e ainda não feita (equipada, ela já saiu da receita). */
function evolutionEligible(entry: ShopEntry, loadout: Loadout): boolean {
  const recipe = recipeOf(entry.id);
  return !!recipe && loadout.levelOf(recipe.into) === 0 && recipeReady(recipe, loadout);
}

/** Técnica no pool (TSH-03, TSH-04). */
function techniqueEligible(entry: ShopEntry, loadout: Loadout, round: number): boolean {
  // Edge case da F24: com a evolução equipada, as técnicas da receita não voltam à loja.
  if (RECIPES.some((r) => r.from.includes(entry.id as TechId) && loadout.levelOf(r.into) > 0)) return false;
  const level = loadout.levelOf(entry.id as TechId);
  // TSH-04: equipada entra se abaixo do nível máximo e a rodada mínima do próximo nível já passou.
  if (level > 0) return level < entry.maxLevel && entry.minRound(level + 1) <= round;
  // TSH-03: não equipada entra se e só se houver slot vazio.
  return loadout.firstEmpty() !== null;
}

/**
 * Entradas elegíveis para a loja na rodada `round` (SHOP-07, SHOP-18, SHOP-39, TSH-03, TSH-04, TSH-09): o
 * consumível está sempre no pool; um modificador comum (F4) entra se e só se estiver abaixo do teto e a rodada
 * mínima do próximo nível já tiver passado; `loadout` é opcional (sem ele, técnicas e `energia`/`fluxo` nunca
 * entram no pool — é o comportamento antigo da F4, usado pelos testes que não conhecem loadout). Passiva (BLD-07)
 * entra se ainda não foi comprada e a rodada mínima já passou; sem `perks`, nunca entra. Arsenal (ARS-03) segue
 * `arsenalEligible`; sem `arsenal`, nunca entra.
 */
export function eligible(
  catalog: readonly ShopEntry[],
  modifiers: Modifiers,
  round: number,
  loadout?: Loadout,
  perks?: Perks,
  arsenal?: Arsenal,
): ShopEntry[] {
  return catalog.filter((entry) => {
    if (entry.kind === 'consumable') return true;
    if (entry.kind === 'body') return false; // CRP-01: o Corpo só entra na loja de eixos (T52)
    if (entry.id in ARSENAL) return !!arsenal && arsenalEligible(entry.id as ArsenalId, arsenal, round);
    if (entry.kind === 'perk') return !!perks && !perks.has(entry.id as PerkId) && entry.minRound(1) <= round;
    if (entry.kind === 'technique') return !!loadout && techniqueEligible(entry, loadout, round);
    if (entry.kind === 'evolution') return !!loadout && evolutionEligible(entry, loadout);
    return modifierEligible(entry, modifiers, round, loadout);
  });
}

/** Modificador no pool (SHOP-07, SHOP-18, TSH-09): abaixo do teto e com a rodada mínima do próximo nível já passada. */
function modifierEligible(entry: ShopEntry, modifiers: Modifiers, round: number, loadout?: Loadout): boolean {
  // TSH-09: energia/fluxo só entram no pool com ao menos uma técnica equipada.
  if ((entry.id === 'energia' || entry.id === 'fluxo') && (!loadout || !loadout.hasAny())) return false;
  const level = modifiers.level(entry.id as ModifierId);
  if (level >= entry.maxLevel) return false;
  return entry.minRound(level + 1) <= round;
}
