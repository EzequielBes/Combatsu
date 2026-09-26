import type { Rng } from './rng';
import type { Modifiers } from './modifiers';
import { SHOP } from '../data/tuning';
import type { ModifierId, ShopEntry } from '../data/shop';

/** Peso de sorteio de `entry` pela raridade (SHOP-08): comum 3, raro 1. */
function weightOf(entry: ShopEntry): number {
  return entry.rarity === 'common' ? SHOP.weights.common : SHOP.weights.rare;
}

/**
 * Entradas elegíveis para a loja na rodada `round` (SHOP-07, SHOP-18, SHOP-39): o consumível está sempre no
 * pool; um modificador entra se e só se estiver abaixo do teto e a rodada mínima do próximo nível já tiver
 * passado.
 */
export function eligible(catalog: readonly ShopEntry[], modifiers: Modifiers, round: number): ShopEntry[] {
  return catalog.filter((entry) => {
    if (entry.kind === 'consumable') return true;
    const level = modifiers.level(entry.id as ModifierId);
    if (level >= entry.maxLevel) return false;
    return entry.minRound(level + 1) <= round;
  });
}

/**
 * Sorteia até `n` entradas de `pool` sem reposição, por peso de raridade (SHOP-06, SHOP-08): a cada slot, tira
 * `x = rng.next() * W` (`W` = peso total do que resta) e pega a primeira entrada, na ordem do catálogo, cuja
 * soma acumulada de peso ultrapassa `x`.
 */
export function drawOffers(pool: readonly ShopEntry[], rng: Rng, n: number): ShopEntry[] {
  const remaining = [...pool];
  const drawn: ShopEntry[] = [];
  const count = Math.min(n, remaining.length);
  for (let i = 0; i < count; i++) {
    const total = remaining.reduce((sum, e) => sum + weightOf(e), 0);
    const x = rng.next() * total;
    let acc = 0;
    let pick = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      acc += weightOf(remaining[j]);
      if (acc > x) {
        pick = j;
        break;
      }
    }
    drawn.push(remaining[pick]);
    remaining.splice(pick, 1);
  }
  return drawn;
}
