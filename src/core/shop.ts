import type { Rng } from './rng';
import type { Wallet } from './wallet';
import { magnetRangeAtLevel, maxHpAtLevel, healChanceAtLevel, runSpeedAtLevel, type Modifiers } from './modifiers';
import { SHOP } from '../data/tuning';
import type { ModifierId, ShopEntry, ShopEntryId } from '../data/shop';

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

const oneDecimalComma = (n: number): string => n.toFixed(1).replace('.', ',');

/**
 * Texto "antes → depois" de uma oferta, nos formatos exatos das Assumptions (SHOP-21): multiplicador com uma
 * casa decimal para `forca`, valores arredondados para `agilidade`/`ima`, porcentagem inteira para `sorte`, hp
 * atual → curado (recortado no teto) para `cura`.
 */
export function previewText(entry: ShopEntry, modifiers: Modifiers, hp: number, maxHp: number): string {
  if (entry.id === 'cura') {
    const after = Math.min(hp + SHOP.curaHp, maxHp);
    return `Vida ${hp} → ${after}`;
  }
  const level = modifiers.level(entry.id as ModifierId);
  switch (entry.id as ModifierId) {
    case 'vida':
      return `Vida máx. ${maxHpAtLevel(level)} → ${maxHpAtLevel(level + 1)}`;
    case 'forca':
      return `Dano ×${oneDecimalComma(1 + SHOP.forcaPerLevel * level)} → ×${oneDecimalComma(1 + SHOP.forcaPerLevel * (level + 1))}`;
    case 'agilidade':
      return `Velocidade ${Math.round(runSpeedAtLevel(level))} → ${Math.round(runSpeedAtLevel(level + 1))}`;
    case 'ima':
      return `Ímã ${Math.round(magnetRangeAtLevel(level))} → ${Math.round(magnetRangeAtLevel(level + 1))}`;
    case 'sorte':
      return `Cura ${Math.round(healChanceAtLevel(level) * 100)}% → ${Math.round(healChanceAtLevel(level + 1) * 100)}%`;
    default:
      throw new Error(`entrada sem prévia definida: ${entry.id}`);
  }
}

/** Uma oferta viva na loja: `id` é `entry.id` (SHOP-15, cada catálogo entra no máximo uma vez por loja). */
export interface Offer {
  readonly id: ShopEntryId;
  readonly entry: ShopEntry;
}

/** Uma carta pronta para o painel/snapshot (SHOP-21, SHOP-38, SHOP-44); `null` em todo campo = "Esgotado". */
export interface OfferView {
  slot: number;
  id: ShopEntryId | null;
  name: string | null;
  /** `Nv <n+1>/<max>`; vazio para consumível ou slot vazio (SHOP-21). */
  levelText: string;
  preview: string | null;
  cost: number | null;
  sold: boolean;
  affordable: boolean;
  rarity: 'common' | 'rare' | null;
}

export interface ShopView {
  offers: OfferView[];
  rerollCost: number;
  selected: number;
}

export type BuyResult =
  | { ok: true; id: ShopEntryId; cost: number }
  | { ok: false; reason: 'empty' | 'sold' | 'funds' | 'fullHp' };

/** A loja não conhece o `Player`: aplica modificador e cura por callback (design "Error Handling Strategy"). */
export interface BuyContext {
  wallet: Wallet;
  hp: number;
  maxHp: number;
  applyModifier: (id: ModifierId) => void;
  healPlayer: (amount: number) => void;
}

const EMPTY_OFFER_VIEW = (slot: number): OfferView => ({
  slot,
  id: null,
  name: null,
  levelText: '',
  preview: null,
  cost: null,
  sold: false,
  affordable: false,
  rarity: null,
});

/**
 * Uma loja aberta (SHOP-01, SHOP-06): sorteia as ofertas na criação, vende cada carta no máximo uma vez, e
 * reroll (P2) troca as três por outras novas. Recriada a cada abertura; não sobrevive entre rodadas.
 */
export class Shop {
  private offers: (Offer | null)[];
  private readonly sold = new Set<number>();
  private _rerollCost = SHOP.rerollBase;
  private _selected = 0;

  constructor(
    private readonly catalog: readonly ShopEntry[],
    private readonly modifiers: Modifiers,
    private readonly rng: Rng,
    private readonly round: number,
  ) {
    this.offers = this.drawFresh();
  }

  private drawFresh(): (Offer | null)[] {
    const pool = eligible(this.catalog, this.modifiers, this.round);
    const drawn = drawOffers(pool, this.rng, SHOP.offers);
    const slots: (Offer | null)[] = [];
    for (let i = 0; i < SHOP.offers; i++) {
      const drawnEntry = drawn[i];
      slots.push(drawnEntry ? { id: drawnEntry.id, entry: drawnEntry } : null);
    }
    return slots;
  }

  get rerollCost(): number {
    return this._rerollCost;
  }

  get selected(): number {
    return this._selected;
  }

  /**
   * Checar → gastar → aplicar (design "Error Handling Strategy"): carteira e nível só mudam depois de
   * `wallet.spend` devolver `true` (SHOP-10, SHOP-11, SHOP-13, SHOP-14, SHOP-19, SHOP-41, SHOP-42).
   */
  buy(slot: number, ctx: BuyContext): BuyResult {
    const offer = this.offers[slot] ?? null;
    if (!offer) return { ok: false, reason: 'empty' };
    if (this.sold.has(slot)) return { ok: false, reason: 'sold' };
    if (offer.entry.id === 'cura' && ctx.hp >= ctx.maxHp) return { ok: false, reason: 'fullHp' };
    const cost = this.modifiers.cost(offer.entry);
    if (!ctx.wallet.spend(cost)) return { ok: false, reason: 'funds' };
    this.sold.add(slot);
    if (offer.entry.kind === 'modifier') ctx.applyModifier(offer.entry.id as ModifierId);
    else ctx.healPlayer(SHOP.curaHp);
    return { ok: true, id: offer.entry.id, cost };
  }

  /**
   * Sorteia 3 ofertas novas (SHOP-16, SHOP-08); custa `rerollCost`, que sobe SHOP.rerollStep a cada reroll da
   * mesma loja (SHOP-25). Checar → gastar → aplicar: sem saldo, `false` e nada muda (SHOP-26).
   */
  reroll(wallet: Wallet): boolean {
    if (!wallet.spend(this._rerollCost)) return false;
    this._rerollCost += SHOP.rerollStep;
    this.offers = this.drawFresh();
    this.sold.clear();
    return true;
  }

  /** Move a seleção em ciclo entre os 3 slots (SHOP-28, SHOP-29): `+1` avança, `-1` volta. */
  move(delta: 1 | -1): void {
    this._selected = (this._selected + delta + SHOP.offers) % SHOP.offers;
  }

  /** Dados prontos para o painel e o snapshot de debug (SHOP-21, SHOP-38, SHOP-44). */
  view(wallet: Wallet, hp: number, maxHp: number): ShopView {
    const offers = this.offers.map((offer, slot): OfferView => {
      if (!offer) return EMPTY_OFFER_VIEW(slot);
      const cost = this.modifiers.cost(offer.entry);
      const level = offer.entry.kind === 'modifier' ? this.modifiers.level(offer.entry.id as ModifierId) : 0;
      return {
        slot,
        id: offer.entry.id,
        name: offer.entry.name,
        levelText: offer.entry.kind === 'modifier' ? `Nv ${level + 1}/${offer.entry.maxLevel}` : '',
        preview: previewText(offer.entry, this.modifiers, hp, maxHp),
        cost,
        sold: this.sold.has(slot),
        affordable: cost <= wallet.fragments,
        rarity: offer.entry.rarity,
      };
    });
    return { offers, rerollCost: this._rerollCost, selected: this._selected };
  }
}
