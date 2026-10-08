import { Shop, type BuyContext } from '../../core/shop';
import { GAME_SHOP_CATALOG } from '../../data/shop';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { VOWS } from '../../data/vows';
import { RECIPES } from '../../data/evolutions';
import { evolve } from '../../core/evolution';
import { isBossRound } from '../../core/waves';
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
    if (this.updateVowPanel(input)) return;
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
        if (bothEmptyBefore) this.s.snapshot.debugEvents.push(`techUnlock:${id}`);
      },
      applyPerk: (id) => this.s.build.perks.add(id),
      applyArsenal: (id) => this.s.arsenal.buy(id),
      // EVO-03: funde as técnicas da receita; o slot da técnica nova recomeça a maestria.
      applyEvolution: (id) => {
        const recipe = RECIPES.find((r) => r.into === id);
        if (!recipe || !evolve(recipe, this.s.loadout)) return;
        const slot = this.s.loadout.slotsView[0]?.id === id ? 0 : 1;
        this.s.mastery.resetSlot(slot);
        this.s.mastery.resetSlot(slot === 0 ? 1 : 0);
        this.s.snapshot.debugEvents.push(`evolve:${id}`);
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
      this.s.snapshot.debugEvents.push(`buy:${result.id}:${result.cost}`);
      // T11: carta pisca branco e o custo pago sobe em "−N".
      this.s.shopPanel.flashBuy(slot, result.cost);
      // Direção de feel (T21): 1ª técnica equipada faz o ícone voar da carta ao slot do HUD em 300 ms.
      if (equipped) {
        const kanji = TECHNIQUES[equipped.id].kanji;
        this.s.shopPanel.flyToSlot(slot, kanji, this.s.energyHud.slotIconPosition(equipped.slot));
      }
    } else if (result.reason === 'funds' && offerId) this.s.snapshot.debugEvents.push(`buyRefused:${offerId}:funds`);
    else if (result.reason === 'fullHp') this.s.snapshot.debugEvents.push('buyRefused:cura:fullHp');
  }

  /** Reroll (SHOP-16/25/26): paga pelo custo atual antes de sortear, para o "−N" da animação (T11). */
  resolveReroll(shop: Shop): void {
    const cost = shop.rerollCost;
    if (shop.reroll(this.s.wallet)) this.s.shopPanel.flipReroll(cost);
    else this.s.snapshot.debugEvents.push('rerollRefused');
  }

  /**
   * Abre a loja (SHOP-01): varre os fragmentos vivos para a carteira e pausa o Matter (SHOP-05/33/36/37).
   * `GAME_SHOP_CATALOG` inclui as técnicas, `energia`/`fluxo`, as passivas de build (BLD-07) e o arsenal (ARS-03); o `loadout` decide elegibilidade e a
   * garantia do espaço 0 (TSH-05).
   */
  openShop(round: number): void {
    this.s.wallet.add(this.s.pickups.collectFragments());
    this.s.matter.world.pause();
    this.shop = new Shop(
      GAME_SHOP_CATALOG,
      this.s.modifiers,
      this.s.run.shopRng!,
      round,
      this.s.loadout,
      this.s.build.perks,
      this.s.arsenal.arsenal,
    );
    this.s.snapshot.debugEvents.push(`shopOpen:${round}`);
    // VOW-01/02/06: depois de uma rodada de chefe o painel de votos vem antes da loja (sem voto restante, não abre).
    if (isBossRound(round) && this.s.vows.openPanel()) {
      // A faixa "Rodada N concluída" sai: o painel tem título próprio.
      this.s.hud.hideBanner();
      this.s.vowPanel.show(this.s.vows.offers!.map((id) => VOWS[id]));
      this.s.snapshot.debugEvents.push('vowPanel');
      return;
    }
    this.s.shopPanel.show(this.shop.view(this.s.wallet, this.s.player.hp, this.s.player.maxHp));
  }

  /**
   * Painel de votos aberto (VOW-03, VOW-04): 1..3 toma o voto, Enter recusa; os dois fecham o painel e abrem a loja.
   * Devolve `true` enquanto o painel consumiu o quadro (a loja não lê input nesse quadro).
   */
  private updateVowPanel(input: { buySlot: 0 | 1 | 2 | null; confirm: boolean }): boolean {
    if (!this.s.vows.panelOpen) return false;
    if (input.buySlot === null && !input.confirm) return true;
    if (input.buySlot !== null && this.s.vows.offers![input.buySlot] === undefined) return true;
    const taken = this.s.vows.choose(input.buySlot);
    this.s.snapshot.debugEvents.push(taken ? `vowTaken:${taken}` : 'vowRefused');
    this.s.vowPanel.hide();
    this.s.shopPanel.show(this.shop!.view(this.s.wallet, this.s.player.hp, this.s.player.maxHp));
    return true;
  }

  /**
   * Fecha a loja (SHOP-03/35). No mundo modular (KON-02, TRV-10) escurece a câmera em `AREA.fadeMs` e só então fecha de
   * verdade; na sala fecha na hora, como sempre.
   */
  closeShop(): void {
    if (this.s.area.mode === 'modular') this.s.area.closeShopWithFade(() => this.finishClose());
    else this.finishClose();
  }

  /** Fechamento de verdade (SHOP-03/35): arma o pedido na `Run`, retoma o Matter (antes do fade de entrada da área nova, KON-03) e limpa a loja. */
  private finishClose(): void {
    this.s.run.closeShop();
    this.s.matter.world.resume();
    this.shop = null;
    this.s.shopPanel.hide();
    this.s.snapshot.debugEvents.push('shopClose');
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
          const entry = GAME_SHOP_CATALOG.find((e) => e.id === o.id)!;
          const level = this.shop!.levelOf(entry);
          return { id: o.id!, level, maxLevel: entry.maxLevel, cost: o.cost!, sold: o.sold, affordable: o.affordable };
        }),
      rerollCost: view?.rerollCost ?? 0,
      selected: view?.selected ?? 0,
      panel: this.shop ? this.s.shopPanel.debug() : null,
    };
  }
}
