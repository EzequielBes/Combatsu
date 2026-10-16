import type { Rng } from './rng';
import type { Loadout } from './loadout';
import type { AxisBuild, ItemAxis } from './axisBuild';
import { SHOP } from '../data/tuning';
import { TECH_RULE } from '../data/techRule';
import { ITEM_AXES, type AxisId, type AxisItem } from '../data/techAxes';
import type { TechId } from '../data/techniques';
import type { ShopEntry, ShopEntryId } from '../data/shop';

/** Uma oferta viva na loja: `id` é `entry.id` (SHOP-15, cada catálogo entra no máximo uma vez por loja). */
export interface Offer {
  readonly id: ShopEntryId;
  readonly entry: ShopEntry;
  /** CRD-04: eixos da carta do Vermelho ou do Corpo, o eixo-foco primeiro; ausente nas outras cartas. */
  readonly axes?: readonly AxisId[];
}

/** Peso de sorteio de `entry` pela raridade (SHOP-08): comum 3, raro 1. */
export function weightOf(entry: ShopEntry): number {
  return entry.rarity === 'common' ? SHOP.weights.common : SHOP.weights.rare;
}

/**
 * Sorteia até `n` entradas de `pool` sem reposição, por peso de raridade (SHOP-06, SHOP-08): a cada slot, tira
 * `x = rng.next() * W` (`W` = peso total do que resta) e pega a primeira entrada, na ordem do catálogo, cuja
 * soma acumulada de peso ultrapassa `x`. `weight` troca o peso de raridade (BLD-05: a loja puxa a build do jogador).
 */
export function drawOffers(
  pool: readonly ShopEntry[],
  rng: Rng,
  n: number,
  weight: (entry: ShopEntry) => number = weightOf,
): ShopEntry[] {
  const remaining = [...pool];
  const drawn: ShopEntry[] = [];
  const count = Math.min(n, remaining.length);
  for (let i = 0; i < count; i++) {
    const total = remaining.reduce((sum, e) => sum + weight(e), 0);
    const x = rng.next() * total;
    let acc = 0;
    let pick = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      acc += weight(remaining[j]);
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

/** Fração das lojas em que a carta 0 é a melhoria do item-foco (CRD-02). */
const FOCUS_CHANCE = 0.6;

/**
 * Item-foco da loja (CRD-02): o de maior nível entre os dois slots de técnica e o Corpo; no empate vale a ordem
 * slot 0, slot 1, Corpo. O Corpo é sempre dono, então sempre há foco.
 */
export function focusItem(loadout: Loadout): ShopEntryId {
  const [a, b] = loadout.slotsView;
  const candidates: { id: ShopEntryId; level: number }[] = [];
  if (a) candidates.push({ id: a.id, level: a.level });
  if (b) candidates.push({ id: b.id, level: b.level });
  candidates.push({ id: 'corpo', level: loadout.axes.level('corpo') });
  let best = candidates[0];
  for (const c of candidates) if (c.level > best.level) best = c;
  return best.id;
}

/**
 * Eixos da carta de `item` (CRD-04): o eixo-foco e um outro abaixo do teto sorteado pelo `axisRng`; um só se só
 * esse couber; nenhum se o item está no teto.
 */
export function axesFor(item: AxisItem, axes: AxisBuild, axisRng: Rng): readonly AxisId[] {
  const focus = axes.focusAxis(item) as AxisId | null;
  if (focus === null) return [];
  const others = (ITEM_AXES[item] as readonly AxisId[]).filter(
    (axis) => axis !== focus && axes.points(item, axis as ItemAxis<AxisItem>) < TECH_RULE.axisCap,
  );
  if (others.length === 0) return [focus];
  const other = others.length > 1 ? others[Math.floor(axisRng.next() * others.length)] : others[0];
  return [focus, other];
}

/** Ingredientes do sorteio das cartas: o pool elegível, os dois streams, o peso e o loadout. */
export interface DrawContext {
  pool: readonly ShopEntry[];
  /** Sorteio por peso (`shopRng`). */
  rng: Rng;
  /** Carta de eixo (`axisRng`, CRD-06). */
  axisRng: Rng;
  weight?: (entry: ShopEntry) => number;
  loadout: Loadout;
  /** Número de cartas; o padrão é `SHOP.offers`. */
  count?: number;
}

/** Carta de eixo: o Corpo, ou o Vermelho já equipado (fora do slot ele é técnica nova). */
const isAxisItem = (entry: ShopEntry, loadout: Loadout): boolean =>
  entry.kind === 'body' || (entry.id === 'vermelho' && loadout.levelOf('vermelho') > 0);

/** Dono do item: técnica equipada ou o Corpo (relíquia e arma não contam). */
const isOwned = (entry: ShopEntry, loadout: Loadout): boolean =>
  entry.kind === 'body' || (entry.kind === 'technique' && loadout.levelOf(entry.id as TechId) > 0);

/**
 * Carta 0 sem evolução (CRD-02): a melhoria do foco quando o `axisRng` sorteia abaixo de 0,6 e o foco pode subir; senão
 * a de outro dono sorteado pelo `axisRng`; sem nenhum, `undefined` (cai no sorteio por peso).
 */
function pickUpgrade(ctx: DrawContext): ShopEntry | undefined {
  const owned = ctx.pool.filter((e) => isOwned(e, ctx.loadout));
  if (owned.length === 0) return undefined;
  const focusId = focusItem(ctx.loadout);
  const focus = owned.find((e) => e.id === focusId);
  if (ctx.axisRng.next() < FOCUS_CHANCE && focus) return focus;
  const others = owned.filter((e) => e !== focus);
  if (others.length === 0) return undefined;
  return others.length > 1 ? others[Math.floor(ctx.axisRng.next() * others.length)] : others[0];
}

/**
 * As cartas de uma loja (CRD-01 a CRD-04, EVO-01): carta 0 = a evolução pronta, ou a melhoria de um item dono
 * (`pickUpgrade`), ou o sorteio por peso; carta 1 = técnica nova enquanto houver slot vazio (CRD-03); as outras, por
 * `drawOffers`, no máximo uma por item. Carta do Vermelho ou do Corpo sai com `axes`. `null` onde faltar entrada.
 */
export function drawCards(ctx: DrawContext): (Offer | null)[] {
  const count = ctx.count ?? SHOP.offers;
  const cards: Offer[] = [];
  let rest = [...ctx.pool];
  const take = (entry: ShopEntry): void => {
    const axes = isAxisItem(entry, ctx.loadout)
      ? axesFor(entry.id as AxisItem, ctx.loadout.axes, ctx.axisRng)
      : undefined;
    cards.push(axes ? { id: entry.id, entry, axes } : { id: entry.id, entry });
    rest = rest.filter((e) => e.id !== entry.id);
  };
  const evolution = rest.find((e) => e.kind === 'evolution');
  const first = evolution ?? pickUpgrade(ctx) ?? drawOffers(rest, ctx.rng, 1, ctx.weight)[0];
  if (first && count > 0) take(first);
  if (ctx.loadout.firstEmpty() !== null && count > 1) {
    const fresh = rest.filter((e) => e.kind === 'technique' && ctx.loadout.levelOf(e.id as TechId) === 0);
    const [tech] = drawOffers(fresh, ctx.rng, 1, ctx.weight);
    if (tech) take(tech);
  }
  for (const entry of drawOffers(rest, ctx.rng, count - cards.length, ctx.weight)) take(entry);
  const slots: (Offer | null)[] = [...cards];
  while (slots.length < count) slots.push(null);
  return slots;
}
