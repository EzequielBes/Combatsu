import type { Rng } from './rng';
import type { Wallet } from './wallet';
import type { Modifiers } from './modifiers';
import type { Loadout } from './loadout';
import type { Arsenal } from './arsenal';
import { buildPoints, buildWeight, type Perks } from './build';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import { BUILD_NAMES, PERKS, type PerkId } from '../data/perks';
import { SHOP } from '../data/tuning';
import type { TechId } from '../data/techniques';
import type { AxisId, AxisItem } from '../data/techAxes';
import { eligible } from './shopEligibility';
import { axisItemOf, drawCards, drawOffers, weightOf, type Offer } from './shopDraw';
import { axisPreview, previewText } from './shopPreview';
import { cardCost } from './shopPricing';
import type { ModifierId, ShopEntry, ShopEntryId } from '../data/shop';

export { drawOffers };
export type { Offer };

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
  /** CRD-05: eixos da carta do Vermelho ou do Corpo, o eixo-foco primeiro; vazio nas outras cartas. */
  axes: readonly AxisId[];
  /** CRD-05: eixo que a compra vai receber; `null` nas cartas sem eixo. */
  selectedAxis: AxisId | null;
}

export interface ShopView {
  offers: OfferView[];
  rerollCost: number;
  selected: number;
}

export type BuyResult =
  { ok: true; id: ShopEntryId; cost: number } | { ok: false; reason: 'empty' | 'sold' | 'funds' | 'fullHp' };

/** A loja não conhece o `Player`: aplica modificador, técnica e cura por callback (design "Error Handling Strategy"). */
export interface BuyContext {
  wallet: Wallet;
  hp: number;
  maxHp: number;
  applyModifier: (id: ModifierId) => void;
  healPlayer: (amount: number) => void;
  /** TSH-06/TSH-07: quem chama decide equipar (não equipada) ou subir de nível (já equipada) no `loadout`. */
  applyTechnique: (id: TechId) => void;
  /** BLD-01: registra a passiva comprada; opcional para quem monta a loja sem builds. */
  applyPerk?: (id: PerkId) => void;
  /** ARS-02: equipa/sobe a relíquia ou a arma, ou reserva a ferramenta; opcional para quem monta a loja sem arsenal. */
  applyArsenal?: (id: ArsenalId) => void;
  /** EVO-03: funde as técnicas da receita que vende `id`; opcional para quem monta a loja sem evolução. */
  applyEvolution?: (id: TechId) => void;
  /** CRD-05: põe um ponto do `item` no `axis` escolhido na carta; opcional para quem monta a loja sem eixos. */
  applyAxis?: (item: AxisItem, axis: AxisId) => void;
}

/** `Nv <n+1>/<max>` para modificador e técnica (SHOP-21, ECN-08); vazio para consumível; a build, para passiva. */
function levelText(entry: ShopEntry, level: number): string {
  if (entry.kind === 'perk') return BUILD_NAMES[PERKS[entry.id as PerkId].build];
  return entry.maxLevel === 0 ? '' : `Nv ${level + 1}/${entry.maxLevel}`;
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
  axes: [],
  selectedAxis: null,
});

/** Aplica a carta comprada pelo callback do tipo dela (design "Error Handling Strategy"). */
function applyEntry(entry: ShopEntry, ctx: BuyContext): void {
  if (entry.kind === 'modifier') ctx.applyModifier(entry.id as ModifierId);
  else if (entry.kind === 'technique') ctx.applyTechnique(entry.id as TechId);
  else if (entry.kind === 'perk') ctx.applyPerk?.(entry.id as PerkId);
  else if (entry.kind === 'evolution') ctx.applyEvolution?.(entry.id as TechId);
  else if (entry.id in ARSENAL) ctx.applyArsenal?.(entry.id as ArsenalId);
  else if (entry.kind === 'consumable') ctx.healPlayer(SHOP.curaHp);
}

/**
 * Uma loja aberta (SHOP-01, SHOP-06): sorteia as ofertas na criação, vende cada carta no máximo uma vez, e
 * reroll (P2) troca as três por outras novas. Recriada a cada abertura; não sobrevive entre rodadas.
 */
export class Shop {
  private offers: (Offer | null)[];
  private readonly sold = new Set<number>();
  private _rerollCost = SHOP.rerollBase;
  private _selected = 0;
  /** CRD-05: índice do eixo escolhido em cada carta de eixo (0 = o eixo-foco). */
  private readonly axisChoice = new Map<number, number>();

  constructor(
    private readonly catalog: readonly ShopEntry[],
    private readonly modifiers: Modifiers,
    private readonly rng: Rng,
    private readonly round: number,
    private readonly loadout?: Loadout,
    private readonly perks?: Perks,
    private readonly arsenal?: Arsenal,
    private readonly axisRng?: Rng,
  ) {
    this.offers = this.drawFresh();
  }

  /** BLD-05: com passivas ligadas, o peso de raridade é multiplicado pela afinidade do jogador com a build da carta. */
  private weightFn(): ((entry: ShopEntry) => number) | undefined {
    if (!this.perks || !this.loadout) return undefined;
    const points = buildPoints(this.modifiers, this.loadout, this.perks, this.arsenal);
    return (entry) => weightOf(entry) * buildWeight(entry.id, points);
  }

  /**
   * As cartas de uma loja nova (CRD-01 a CRD-04, EVO-01): com `loadout`, `drawCards` (evolução, melhoria de item,
   * técnica nova no slot vazio e sorteio por peso); sem ele, o sorteio por peso da F4. O reroll passa por aqui de novo,
   * e a escolha de eixo volta ao eixo-foco.
   */
  private drawFresh(): (Offer | null)[] {
    this.axisChoice.clear();
    const pool = eligible(this.catalog, this.modifiers, this.round, this.loadout, this.perks, this.arsenal);
    const weight = this.weightFn();
    if (!this.loadout) {
      const slots: (Offer | null)[] = drawOffers(pool, this.rng, SHOP.offers, weight).map((e) => ({
        id: e.id,
        entry: e,
      }));
      while (slots.length < SHOP.offers) slots.push(null);
      return slots;
    }
    const axisRng = this.axisRng ?? this.rng;
    return drawCards({ pool, rng: this.rng, axisRng, weight, loadout: this.loadout });
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
    const cost = this.costOf(offer.entry);
    if (!ctx.wallet.spend(cost)) return { ok: false, reason: 'funds' };
    this.sold.add(slot);
    const item = axisItemOf(offer.entry, this.loadout);
    if (item && offer.axes?.length) ctx.applyAxis?.(item, this.axisOf(slot, offer)!);
    else applyEntry(offer.entry, ctx);
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

  /** PRC-03: preço da carta nesta loja, com a inflação da rodada; o reroll não passa por aqui. */
  private costOf(entry: ShopEntry): number {
    return cardCost(entry, {
      modifiers: this.modifiers,
      loadout: this.loadout,
      arsenal: this.arsenal,
      round: this.round,
    });
  }

  /** Eixo escolhido na carta `slot` (CRD-05); `null` se a carta não tem eixo. */
  private axisOf(slot: number, offer: Offer | null): AxisId | null {
    const axes = offer?.axes;
    return axes?.length ? axes[(this.axisChoice.get(slot) ?? 0) % axes.length] : null;
  }

  /** CRD-05: troca o eixo da carta selecionada, em ciclo entre os eixos dela; nas outras cartas, nada. */
  chooseAxis(delta: 1 | -1): void {
    const axes = this.offers[this._selected]?.axes;
    if (!axes || axes.length < 2) return;
    const now = this.axisChoice.get(this._selected) ?? 0;
    this.axisChoice.set(this._selected, (now + delta + axes.length) % axes.length);
  }

  /** Move a seleção em ciclo entre os 3 slots (SHOP-28, SHOP-29): `+1` avança, `-1` volta. */
  move(delta: 1 | -1): void {
    this._selected = (this._selected + delta + SHOP.offers) % SHOP.offers;
  }

  /** Nível atual do que a carta vende: modificador, técnica, relíquia ou arma; 0 para o que não tem nível. */
  levelOf(entry: ShopEntry): number {
    if (entry.kind === 'modifier') return this.modifiers.level(entry.id as ModifierId);
    if (entry.kind === 'technique') return this.loadout?.levelOf(entry.id as TechId) ?? 0;
    if (entry.kind === 'body') return this.loadout?.axes.level('corpo') ?? 0;
    if (entry.id in ARSENAL) return this.arsenal?.levelOf(entry.id as ArsenalId) ?? 0;
    return 0;
  }

  private previewOf(slot: number, offer: Offer, hp: number, maxHp: number): string {
    const item = axisItemOf(offer.entry, this.loadout);
    if (item && this.loadout && offer.axes?.length) {
      return axisPreview(item, offer.axes, this.axisChoice.get(slot) ?? 0, this.loadout);
    }
    return previewText(offer.entry, this.modifiers, hp, maxHp, this.loadout, this.arsenal);
  }

  /** Dados prontos para o painel e o snapshot de debug (SHOP-21, SHOP-38, SHOP-44). */
  view(wallet: Wallet, hp: number, maxHp: number): ShopView {
    const offers = this.offers.map((offer, slot): OfferView => {
      if (!offer) return EMPTY_OFFER_VIEW(slot);
      const cost = this.costOf(offer.entry);
      const level = this.levelOf(offer.entry);
      return {
        slot,
        id: offer.entry.id,
        name: offer.entry.name,
        levelText: levelText(offer.entry, level),
        preview: this.previewOf(slot, offer, hp, maxHp),
        cost,
        sold: this.sold.has(slot),
        affordable: cost <= wallet.fragments,
        rarity: offer.entry.rarity,
        axes: offer.axes ?? [],
        selectedAxis: this.axisOf(slot, offer),
      };
    });
    return { offers, rerollCost: this._rerollCost, selected: this._selected };
  }
}
