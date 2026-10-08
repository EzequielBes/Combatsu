import type { Rng } from './rng';
import type { Wallet } from './wallet';
import { magnetRangeAtLevel, maxHpAtLevel, healChanceAtLevel, runSpeedAtLevel, type Modifiers } from './modifiers';
import { cursedEnergyMaxAtLevel, cursedEnergyRegenAtLevel } from './energy';
import type { Loadout } from './loadout';
import { arsenalCost, arsenalEligible, arsenalPreview, type Arsenal } from './arsenal';
import { buildPoints, buildWeight, type Perks } from './build';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import { BUILD_NAMES, PERKS, type PerkId } from '../data/perks';
import { SHOP } from '../data/tuning';
import { LEVEL_FACTOR, type TechId } from '../data/techniques';
import { RECIPES, type Recipe } from '../data/evolutions';
import { recipeReady } from './evolution';
import type { ModifierId, ShopEntry, ShopEntryId } from '../data/shop';

/** Peso de sorteio de `entry` pela raridade (SHOP-08): comum 3, raro 1. */
function weightOf(entry: ShopEntry): number {
  return entry.rarity === 'common' ? SHOP.weights.common : SHOP.weights.rare;
}

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

const oneDecimalComma = (n: number): string => n.toFixed(1).replace('.', ',');

/** Fator de dano (TEC-06) com vírgula, sem casas fixas: 1 → "1,0", 1.25 → "1,25", 1.5 → "1,5" (TSH-16). */
const factorText = (k: number): string => (Number.isInteger(k) ? `${k},0` : String(k).replace('.', ','));

/** Prévia de uma técnica (TSH-12, TSH-16): o slot de destino se nova, senão os fatores de dano do nível atual e do seguinte. */
function techniquePreview(id: TechId, loadout?: Loadout): string {
  const level = loadout?.levelOf(id) ?? 0;
  if (level === 0) {
    const slot = loadout?.firstEmpty() === 0 ? 1 : 2; // TSH-12: slot 1 vazio → 1, senão → 2
    return `Nova · slot ${slot}`;
  }
  return `Dano ×${factorText(LEVEL_FACTOR[level - 1])} → ×${factorText(LEVEL_FACTOR[level])}`; // TSH-16 (level < 3 aqui)
}

/**
 * Texto "antes → depois" de uma oferta, nos formatos exatos das Assumptions (SHOP-21, TSH-12, TSH-13, TSH-16,
 * TSH-17): multiplicador com uma casa decimal para `forca`, valores arredondados para `agilidade`/`ima`,
 * porcentagem inteira para `sorte`, hp atual → curado (recortado no teto) para `cura`; técnica não equipada
 * mostra o slot de destino, equipada mostra os fatores de dano do nível atual e do seguinte.
 */
export function previewText(
  entry: ShopEntry,
  modifiers: Modifiers,
  hp: number,
  maxHp: number,
  loadout?: Loadout,
  arsenal?: Arsenal,
): string {
  if (entry.id in ARSENAL) return arsenal ? arsenalPreview(entry.id as ArsenalId, arsenal) : '';
  if (entry.id === 'cura') {
    const after = Math.min(hp + SHOP.curaHp, maxHp);
    return `Vida ${hp} → ${after}`;
  }
  if (entry.kind === 'perk') return PERKS[entry.id as PerkId].effect;
  if (entry.kind === 'evolution') return 'Funde as duas técnicas (Nv 3) numa só';
  if (entry.kind === 'technique') return techniquePreview(entry.id as TechId, loadout);
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
}

/** Custo de `entry`, unificando modificadores (F4, por `Modifiers`) e técnicas (F5, por nível no `loadout`). */
function costOf(entry: ShopEntry, modifiers: Modifiers, loadout?: Loadout, arsenal?: Arsenal): number {
  if (arsenal && entry.id in ARSENAL) return arsenalCost(entry.id as ArsenalId, arsenal); // ARS-04
  if (entry.kind === 'evolution') return entry.cost.base; // EVO-04
  if (entry.kind === 'technique') {
    const level = loadout?.levelOf(entry.id as TechId) ?? 0;
    return entry.cost.base + entry.cost.step * level; // TSH-02
  }
  return modifiers.cost(entry);
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

  constructor(
    private readonly catalog: readonly ShopEntry[],
    private readonly modifiers: Modifiers,
    private readonly rng: Rng,
    private readonly round: number,
    private readonly loadout?: Loadout,
    private readonly perks?: Perks,
    private readonly arsenal?: Arsenal,
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
   * TSH-05: enquanto os dois slots estão vazios, o slot 0 de toda loja (também no reroll, já que `reroll` chama
   * este método de novo) é garantido como uma técnica, sorteada entre as elegíveis pelo peso de SHOP-08 antes
   * dos outros slots. Sem `loadout`, comportamento antigo da F4 (sem garantia). Com técnica equipada, o slot 0
   * é reservado para aprimorá-la (ECN-05, ECN-06; o reroll passa por aqui de novo).
   */
  private drawFresh(): (Offer | null)[] {
    const pool = eligible(this.catalog, this.modifiers, this.round, this.loadout, this.perks, this.arsenal);
    const weight = this.weightFn();
    const slots: (Offer | null)[] = [];
    let rest = pool;
    // EVO-01: a evolução pronta sempre aparece (slot 0), antes de qualquer outra regra de reserva.
    const evolution = pool.find((e) => e.kind === 'evolution');
    if (evolution) {
      // Com a evolução no slot 0, os outros dois slots vêm do sorteio normal.
      slots.push({ id: evolution.id, entry: evolution });
      rest = pool.filter((e) => e !== evolution);
    } else if (this.loadout && !this.loadout.hasAny()) {
      const techPool = pool.filter((e) => e.kind === 'technique');
      const [guaranteed] = drawOffers(techPool, this.rng, 1, weight);
      if (guaranteed) {
        slots.push({ id: guaranteed.id, entry: guaranteed });
        rest = pool.filter((e) => e.id !== guaranteed.id);
      }
    } else if (this.loadout) {
      // ECN-05..07: reserva o slot 0 para aprimorar uma técnica equipada (nível < 3 e rodada mínima já passada;
      // o `eligible` já filtra isso). Sem candidata, os 3 slots vêm do sorteio por peso (ECN-07, EDG-04).
      const upgrades = pool.filter((e) => e.kind === 'technique' && this.loadout!.levelOf(e.id as TechId) > 0);
      if (upgrades.length > 0) {
        // Com uma só candidata não consome o rng; com várias escolhe uma (mesma conta de `Rng.int(0, n - 1)`).
        const idx = upgrades.length > 1 ? Math.floor(this.rng.next() * upgrades.length) : 0;
        const chosen = upgrades[idx];
        slots.push({ id: chosen.id, entry: chosen });
        rest = pool.filter((e) => e.id !== chosen.id);
      }
    }
    const drawn = drawOffers(rest, this.rng, SHOP.offers - slots.length, weight);
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
    const cost = costOf(offer.entry, this.modifiers, this.loadout, this.arsenal);
    if (!ctx.wallet.spend(cost)) return { ok: false, reason: 'funds' };
    this.sold.add(slot);
    applyEntry(offer.entry, ctx);
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

  /** Nível atual do que a carta vende: modificador, técnica, relíquia ou arma; 0 para o que não tem nível. */
  levelOf(entry: ShopEntry): number {
    if (entry.kind === 'modifier') return this.modifiers.level(entry.id as ModifierId);
    if (entry.kind === 'technique') return this.loadout?.levelOf(entry.id as TechId) ?? 0;
    if (entry.id in ARSENAL) return this.arsenal?.levelOf(entry.id as ArsenalId) ?? 0;
    return 0;
  }

  /** Dados prontos para o painel e o snapshot de debug (SHOP-21, SHOP-38, SHOP-44). */
  view(wallet: Wallet, hp: number, maxHp: number): ShopView {
    const offers = this.offers.map((offer, slot): OfferView => {
      if (!offer) return EMPTY_OFFER_VIEW(slot);
      const cost = costOf(offer.entry, this.modifiers, this.loadout, this.arsenal);
      const level = this.levelOf(offer.entry);
      return {
        slot,
        id: offer.entry.id,
        name: offer.entry.name,
        levelText: levelText(offer.entry, level),
        preview: previewText(offer.entry, this.modifiers, hp, maxHp, this.loadout, this.arsenal),
        cost,
        sold: this.sold.has(slot),
        affordable: cost <= wallet.fragments,
        rarity: offer.entry.rarity,
      };
    });
    return { offers, rerollCost: this._rerollCost, selected: this._selected };
  }
}
