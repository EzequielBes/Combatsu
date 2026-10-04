import { Shop, type BuyContext } from '../../core/shop';
import { FULL_SHOP_CATALOG, type ModifierId } from '../../data/shop';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { SHOP } from '../../data/tuning';
import { type GameSnapshot } from '../../game/debugApi';
import type { TestScene } from '../TestScene';

/** Loja entre rodadas: teclas, compra, reroll, abertura/fechamento e o campo `shop` do snapshot. */
export class ShopDirector {
  constructor(readonly s: TestScene) {}

  /** Loja aberta (SHOP-01), recriada a cada `shopOpen`; `null` fora da loja. */
  shop: Shop | null = null;

  /** 1ª técnica equipada nesta compra (TSH-06), para o ícone voar da carta ao slot (T21); `null` fora disso. */
  pendingTechEquip: { id: TechId; slot: 0 | 1 } | null = null;

  /**
   * Loja aberta (SHOP-45, SHOP-28..30, SHOP-16/26, SHOP-03): traduz `ShopInput` em ações do `Shop` e eventos de
   * debug. `run.closeShop()` só arma o pedido; o `run.update` logo depois, no chamador, resolve a troca de rodada.
   */
  updateShop(): void {
    const shop = this.shop;
    if (!shop) return;
    const input = this.s.shopInput.read();
    const ctx: BuyContext = {
      wallet: this.s.wallet,
      hp: this.s.player.hp,
      maxHp: this.s.player.maxHp,
      applyModifier: (id) => {
        const applied = this.s.modifiers.apply(id);
        // MOD-04/MOD-11: `vida` sobe o teto real do player e cura os mesmos 15.
        if (applied && id === 'vida') {
          this.s.player.setMaxHp(this.s.modifiers.maxHp);
          this.s.player.heal(SHOP.vidaPerLevel);
        }
        return applied;
      },
      // SHOP-12/MOD-11: cura (consumível) e o +15 de HP da compra de `vida` passam pelo mesmo `heal` com teto.
      healPlayer: (amount) => this.s.player.heal(amount),
      // TSH-06/07: equipa no primeiro slot vazio (não equipada) ou sobe 1 nível (já equipada); TSH-14: exatamente
      // um `techUnlock:<id>` quando os dois slots estavam vazios antes desta compra.
      applyTechnique: (id) => {
        const bothEmptyBefore = !this.s.loadout.hasAny();
        if (this.s.loadout.levelOf(id) > 0) {
          this.s.loadout.upgrade(id);
        } else {
          const slot = this.s.loadout.firstEmpty();
          if (slot !== null && this.s.loadout.equip(slot, id, 1)) {
            this.pendingTechEquip = { id, slot };
            this.s.mastery.resetSlot(slot); // PRG-04 / reequipar: técnica nova no slot começa sem pontos
          }
        }
        if (bothEmptyBefore) this.s.debugEvents.push(`techUnlock:${id}`);
      },
    };
    if (input.buySlot !== null) this.resolveBuy(shop, input.buySlot, ctx);
    else if (input.buySelected) this.resolveBuy(shop, shop.selected, ctx);
    if (input.moveRight) shop.move(1);
    if (input.moveLeft) shop.move(-1);
    if (input.reroll) this.resolveReroll(shop);
    if (input.confirm) this.closeShop();
    // T10: o painel acompanha a `view` a cada frame (compra/reroll/movimento mudam custo, seleção, sold...).
    this.s.shopPanel.update(shop.view(this.s.wallet, this.s.player.hp, this.s.player.maxHp));
    // T11: o contador de fragmentos do HUD pulsa sozinho quando o valor muda (compra, reroll, varredura ao abrir).
    this.s.hud.setFragments(this.s.wallet.fragments);
  }

  /** Traduz o `BuyResult` tipado do `Shop` num evento de debug (design "Error Handling Strategy"). */
  resolveBuy(shop: Shop, slot: number, ctx: BuyContext): void {
    const offerId = shop.view(ctx.wallet, ctx.hp, ctx.maxHp).offers[slot]?.id ?? null;
    this.pendingTechEquip = null;
    const result = shop.buy(slot, ctx);
    // `shop.buy` pode ter escrito em `pendingTechEquip` de dentro de `ctx.applyTechnique` (outro método): o TS não
    // enxerga essa escrita através da chamada e estreitaria a leitura para o `null` de cima sem este cast.
    const equipped = this.pendingTechEquip as { id: TechId; slot: 0 | 1 } | null;
    if (result.ok) {
      this.s.debugEvents.push(`buy:${result.id}:${result.cost}`);
      // T11: carta pisca branco e o custo pago sobe em "−N".
      this.s.shopPanel.flashBuy(slot, result.cost);
      // Direção de feel (T21): 1ª técnica equipada faz o ícone voar da carta ao slot do HUD em 300 ms.
      if (equipped) {
        const kanji = TECHNIQUES[equipped.id].kanji;
        this.s.shopPanel.flyToSlot(slot, kanji, this.s.energyHud.slotIconPosition(equipped.slot));
      }
    } else if (result.reason === 'funds' && offerId) this.s.debugEvents.push(`buyRefused:${offerId}:funds`);
    else if (result.reason === 'fullHp') this.s.debugEvents.push('buyRefused:cura:fullHp');
  }

  /** Reroll (SHOP-16/25/26): paga pelo custo atual antes de sortear, para o "−N" da animação (T11). */
  resolveReroll(shop: Shop): void {
    const cost = shop.rerollCost;
    if (shop.reroll(this.s.wallet)) this.s.shopPanel.flipReroll(cost);
    else this.s.debugEvents.push('rerollRefused');
  }

  /**
   * Abre a loja (SHOP-01): varre os fragmentos vivos para a carteira e pausa o Matter (SHOP-05/33/36/37).
   * `FULL_SHOP_CATALOG` (F5) inclui as técnicas e `energia`/`fluxo`; o `loadout` decide elegibilidade e a
   * garantia do espaço 0 (TSH-05).
   */
  openShop(round: number): void {
    this.s.wallet.add(this.s.pickups.collectFragments());
    this.s.matter.world.pause();
    this.shop = new Shop(FULL_SHOP_CATALOG, this.s.modifiers, this.s.run.shopRng!, round, this.s.loadout);
    this.s.shopPanel.show(this.shop.view(this.s.wallet, this.s.player.hp, this.s.player.maxHp));
    this.s.debugEvents.push(`shopOpen:${round}`);
  }

  /** Fecha a loja (SHOP-03/35): arma o pedido na `Run`, retoma o Matter e limpa a loja. */
  closeShop(): void {
    this.s.run.closeShop();
    this.s.matter.world.resume();
    this.shop = null;
    this.s.shopPanel.hide();
    this.s.debugEvents.push('shopClose');
  }

  /**
   * Campo `shop` do snapshot (SHOP-22): `open` só no estado `shop`; nível vem dos modificadores ou do `loadout`
   * (técnica, F5) conforme o `kind` da entrada.
   */
  shopSnapshot(): GameSnapshot['shop'] {
    const view = this.shop?.view(this.s.wallet, this.s.player.hp, this.s.player.maxHp);
    return {
      open: this.s.run.state === 'shop',
      offers: (view?.offers ?? [])
        .filter((o) => o.id !== null)
        .map((o) => {
          const entry = FULL_SHOP_CATALOG.find((e) => e.id === o.id)!;
          const level =
            entry.kind === 'modifier'
              ? this.s.modifiers.level(entry.id as ModifierId)
              : entry.kind === 'technique'
                ? this.s.loadout.levelOf(entry.id as TechId)
                : 0;
          return { id: o.id!, level, maxLevel: entry.maxLevel, cost: o.cost!, sold: o.sold, affordable: o.affordable };
        }),
      rerollCost: view?.rerollCost ?? 0,
      selected: view?.selected ?? 0,
      panel: this.shop ? this.s.shopPanel.debug() : null,
    };
  }
}
