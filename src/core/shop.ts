import type { Rng } from './rng';
import type { Wallet } from './wallet';
import { magnetRangeAtLevel, maxHpAtLevel, healChanceAtLevel, runSpeedAtLevel, type Modifiers } from './modifiers';
import { cursedEnergyMaxAtLevel, cursedEnergyRegenAtLevel } from './energy';
import type { Loadout } from './loadout';
import { SHOP } from '../data/tuning';
import { LEVEL_FACTOR, type TechId } from '../data/techniques';
import type { ModifierId, ShopEntry, ShopEntryId } from '../data/shop';

/** Peso de sorteio de `entry` pela raridade (SHOP-08): comum 3, raro 1. */
function weightOf(entry: ShopEntry): number {
  return entry.rarity === 'common' ? SHOP.weights.common : SHOP.weights.rare;
}

/**
 * Entradas elegíveis para a loja na rodada `round` (SHOP-07, SHOP-18, SHOP-39, TSH-03, TSH-04, TSH-09): o
 * consumível está sempre no pool; um modificador comum (F4) entra se e só se estiver abaixo do teto e a rodada
 * mínima do próximo nível já tiver passado; `loadout` é opcional (sem ele, técnicas e `energia`/`fluxo` nunca
 * entram no pool — é o comportamento antigo da F4, usado pelos testes que não conhecem loadout).
 */
export function eligible(
  catalog: readonly ShopEntry[],
  modifiers: Modifiers,
  round: number,
  loadout?: Loadout,
): ShopEntry[] {
  return catalog.filter((entry) => {
    if (entry.kind === 'consumable') return true;
    if (entry.kind === 'technique') {
      if (!loadout) return false;
      const level = loadout.levelOf(entry.id as TechId);
      // TSH-04: equipada entra se abaixo do nível máximo e a rodada mínima do próximo nível já passou.
      if (level > 0) return level < entry.maxLevel && entry.minRound(level + 1) <= round;
      // TSH-03: não equipada entra se e só se houver slot vazio.
      return loadout.firstEmpty() !== null;
    }
    if (entry.id === 'energia' || entry.id === 'fluxo') {
      // TSH-09: energia/fluxo só entram no pool com ao menos uma técnica equipada.
      if (!loadout || !loadout.hasAny()) return false;
    }
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

/** Fator de dano (TEC-06) com vírgula, sem casas fixas: 1 → "1,0", 1.25 → "1,25", 1.5 → "1,5" (TSH-16). */
const factorText = (k: number): string => (Number.isInteger(k) ? `${k},0` : String(k).replace('.', ','));

/**
 * Texto "antes → depois" de uma oferta, nos formatos exatos das Assumptions (SHOP-21, TSH-12, TSH-13, TSH-16,
 * TSH-17): multiplicador com uma casa decimal para `forca`, valores arredondados para `agilidade`/`ima`,
 * porcentagem inteira para `sorte`, hp atual → curado (recortado no teto) para `cura`; técnica não equipada
 * mostra o slot de destino, equipada mostra os fatores de dano do nível atual e do seguinte.
 */
export function previewText(entry: ShopEntry, modifiers: Modifiers, hp: number, maxHp: number, loadout?: Loadout): string {
  if (entry.id === 'cura') {
    const after = Math.min(hp + SHOP.curaHp, maxHp);
    return `Vida ${hp} → ${after}`;
  }
  if (entry.kind === 'technique') {
    const id = entry.id as TechId;
    const level = loadout?.levelOf(id) ?? 0;
    if (level === 0) {
      const slot = loadout?.firstEmpty() === 0 ? 1 : 2; // TSH-12: slot 1 vazio → 1, senão → 2
      return `Nova · slot ${slot}`;
    }
    return `Dano ×${factorText(LEVEL_FACTOR[level - 1])} → ×${factorText(LEVEL_FACTOR[level])}`; // TSH-16 (level < 3 aqui)
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
    case 'energia':
      return `Energia máx. ${cursedEnergyMaxAtLevel(level)} → ${cursedEnergyMaxAtLevel(level + 1)}`;
    case 'fluxo':
      return `Regen ${cursedEnergyRegenAtLevel(level)}/s → ${cursedEnergyRegenAtLevel(level + 1)}/s`;
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

/** A loja não conhece o `Player`: aplica modificador, técnica e cura por callback (design "Error Handling Strategy"). */
export interface BuyContext {
  wallet: Wallet;
  hp: number;
  maxHp: number;
  applyModifier: (id: ModifierId) => void;
  healPlayer: (amount: number) => void;
  /** TSH-06/TSH-07: quem chama decide equipar (não equipada) ou subir de nível (já equipada) no `loadout`. */
  applyTechnique: (id: TechId) => void;
}

/** Custo de `entry`, unificando modificadores (F4, por `Modifiers`) e técnicas (F5, por nível no `loadout`). */
function costOf(entry: ShopEntry, modifiers: Modifiers, loadout?: Loadout): number {
  if (entry.kind === 'technique') {
    const level = loadout?.levelOf(entry.id as TechId) ?? 0;
    return entry.cost.base + entry.cost.step * level; // TSH-02
  }
  return modifiers.cost(entry);
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
    private readonly loadout?: Loadout,
  ) {
    this.offers = this.drawFresh();
  }

  /**
   * TSH-05: enquanto os dois slots estão vazios, o slot 0 de toda loja (também no reroll, já que `reroll` chama
   * este método de novo) é garantido como uma técnica, sorteada entre as elegíveis pelo peso de SHOP-08 antes
   * dos outros slots. Sem `loadout`, comportamento antigo da F4 (sem garantia).
   */
  private drawFresh(): (Offer | null)[] {
    const pool = eligible(this.catalog, this.modifiers, this.round, this.loadout);
    const slots: (Offer | null)[] = [];
    let rest = pool;
    if (this.loadout && !this.loadout.hasAny()) {
      const techPool = pool.filter((e) => e.kind === 'technique');
      const [guaranteed] = drawOffers(techPool, this.rng, 1);
      if (guaranteed) {
        slots.push({ id: guaranteed.id, entry: guaranteed });
        rest = pool.filter((e) => e.id !== guaranteed.id);
      }
    }
    const drawn = drawOffers(rest, this.rng, SHOP.offers - slots.length);
    for (const entry of drawn) slots.push({ id: entry.id, entry });
    while (slots.length < SHOP.offers) slots.push(null);
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
    const cost = costOf(offer.entry, this.modifiers, this.loadout);
    if (!ctx.wallet.spend(cost)) return { ok: false, reason: 'funds' };
    this.sold.add(slot);
    if (offer.entry.kind === 'modifier') ctx.applyModifier(offer.entry.id as ModifierId);
    else if (offer.entry.kind === 'technique') ctx.applyTechnique(offer.entry.id as TechId);
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
      const cost = costOf(offer.entry, this.modifiers, this.loadout);
      const level = offer.entry.kind === 'modifier' ? this.modifiers.level(offer.entry.id as ModifierId) : 0;
      return {
        slot,
        id: offer.entry.id,
        name: offer.entry.name,
        levelText: offer.entry.kind === 'modifier' ? `Nv ${level + 1}/${offer.entry.maxLevel}` : '',
        preview: previewText(offer.entry, this.modifiers, hp, maxHp, this.loadout),
        cost,
        sold: this.sold.has(slot),
        affordable: cost <= wallet.fragments,
        rarity: offer.entry.rarity,
      };
    });
    return { offers, rerollCost: this._rerollCost, selected: this._selected };
  }
}
