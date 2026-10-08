import type { Recipe } from '../data/evolutions';
import type { Loadout } from './loadout';

/** Nível que as duas técnicas da receita precisam ter (EVO-01). */
export const EVOLUTION_LEVEL = 3;

/** A receita está pronta: as duas técnicas equipadas no nível máximo (EVO-01, EVO-02). */
export function recipeReady(recipe: Recipe, loadout: Loadout): boolean {
  return recipe.from.every((id) => loadout.levelOf(id) >= EVOLUTION_LEVEL);
}

/**
 * Funde as técnicas da receita (EVO-03): a técnica nova entra no nível 1 no slot da primeira técnica da receita, e o
 * slot da segunda fica vazio. Recusa e não muda nada (`false`) se a receita não estiver pronta.
 */
export function evolve(recipe: Recipe, loadout: Loadout): boolean {
  if (!recipeReady(recipe, loadout)) return false;
  const slots = loadout.slotsView;
  const keep: 0 | 1 = slots[0]?.id === recipe.from[0] ? 0 : 1;
  const drop: 0 | 1 = keep === 0 ? 1 : 0;
  loadout.clear(drop);
  loadout.equip(keep, recipe.into, 1);
  loadout.clearCooldown(keep);
  return true;
}
