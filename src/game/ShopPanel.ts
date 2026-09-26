import type Phaser from 'phaser';
import { PALETTE } from './art/palette';
import { SHOP_PANEL_COLORS } from './art/shopPanel';
import type { OfferView, ShopView } from '../core/shop';

/** Cor da paleta em CSS (`#rrggbb` ou `#rrggbbaa`), para o texto do Phaser, que não aceita número (ART-01). */
const css = (color: number, alpha = 1): string =>
  `#${color.toString(16).padStart(6, '0')}${alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0') : ''}`;

/** Mesma fonte/estilo do `Hud` (design "Components"). */
const FONT_FAMILY = 'monospace';
const textStyle = (size: string, colorKey: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_FAMILY,
  fontSize: size,
  color: css(PALETTE[colorKey]),
  align: 'center',
});

/** Geometria das cartas (design.md: "3 cartas 150×120"). */
const CARD_W = 150;
const CARD_H = 120;
const CARD_GAP = 20;
const CARD_COUNT = 3;
const CARD_TOP = 200;
const BORDER_W = 3;
const DEPTH = 200;

interface CardObjs {
  border: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  level: Phaser.GameObjects.Text;
  preview: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  /** "Esgotado" (slot vazio) ou "Comprado" (carta vendida), sobre o resto do conteúdo (SHOP-38/42). */
  status: Phaser.GameObjects.Text;
}

/**
 * Painel da loja na câmera de UI (AD-003, SHOP-01): fundo escurecendo a arena, 3 cartas lado a lado e a linha de
 * dica de teclas. Todo texto usa a mesma fonte/estilo do `Hud`; toda cor vem de `SHOP_PANEL_COLORS` (SHOP-24).
 */
export class ShopPanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly cards: CardObjs[];
  private readonly hint: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.bg = scene.add.rectangle(0, 0, w, h, PALETTE[SHOP_PANEL_COLORS.bg], 0.7).setOrigin(0, 0).setVisible(false);

    const totalW = CARD_W * CARD_COUNT + CARD_GAP * (CARD_COUNT - 1);
    const startX = (w - totalW) / 2;
    this.cards = Array.from({ length: CARD_COUNT }, (_, i) => this.buildCard(startX + i * (CARD_W + CARD_GAP)));

    this.hint = scene.add
      .text(w / 2, CARD_TOP + CARD_H + 16, '', textStyle('12px', SHOP_PANEL_COLORS.text))
      .setOrigin(0.5, 0)
      .setVisible(false);

    const objs: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [this.bg, this.hint];
    for (const c of this.cards) objs.push(c.border, c.name, c.level, c.preview, c.cost, c.status);
    for (const o of objs) o.setScrollFactor(0).setDepth(DEPTH);
    layer.add(objs);
  }

  private buildCard(x: number): CardObjs {
    const cx = x + CARD_W / 2;
    const border = this.scene.add
      .rectangle(x, CARD_TOP, CARD_W, CARD_H, PALETTE[SHOP_PANEL_COLORS.cardBg])
      .setOrigin(0, 0)
      .setStrokeStyle(BORDER_W, PALETTE[SHOP_PANEL_COLORS.borderCommon])
      .setVisible(false);
    const name = this.scene.add.text(cx, CARD_TOP + 8, '', textStyle('13px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const level = this.scene.add.text(cx, CARD_TOP + 26, '', textStyle('11px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const preview = this.scene.add
      .text(cx, CARD_TOP + 42, '', textStyle('11px', SHOP_PANEL_COLORS.text))
      .setOrigin(0.5, 0)
      .setWordWrapWidth(CARD_W - 16)
      .setVisible(false);
    const cost = this.scene.add.text(cx, CARD_TOP + 96, '', textStyle('13px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const status = this.scene.add
      .text(cx, CARD_TOP + CARD_H / 2, '', textStyle('14px', SHOP_PANEL_COLORS.text))
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    return { border, name, level, preview, cost, status };
  }

  /** Abre a loja: mostra o painel já com a primeira `view` (SHOP-01). */
  show(view: ShopView): void {
    this.bg.setVisible(true);
    this.hint.setVisible(true);
    for (const c of this.cards) c.border.setVisible(true);
    this.update(view);
  }

  /** Atualiza as 3 cartas e a dica a cada compra/reroll/movimento (SHOP-21, SHOP-38, SHOP-31, SHOP-46 em T11). */
  update(view: ShopView): void {
    view.offers.forEach((offer, i) => this.updateCard(this.cards[i], offer, i === view.selected));
    this.hint.setText(`1-3 comprar · R rerolar (${view.rerollCost}) · Enter continuar`);
  }

  private updateCard(c: CardObjs, offer: OfferView, selected: boolean): void {
    const empty = offer.id === null;
    // SHOP-38: slot vazio mostra só "Esgotado"; SHOP-42: carta vendida mostra só "Comprado".
    const showStatus = empty || offer.sold;
    c.status.setText(empty ? 'Esgotado' : 'Comprado').setVisible(showStatus);
    const showContent = !showStatus;
    c.name.setText(offer.name ?? '').setVisible(showContent);
    c.level.setText(offer.levelText).setVisible(showContent && offer.levelText !== '');
    c.preview.setText(offer.preview ?? '').setVisible(showContent);
    c.cost.setText(offer.cost !== null ? String(offer.cost) : '').setVisible(showContent);
    // SHOP-31: borda realçada só no slot selecionado; senão, a cor de raridade (comum `g`, raro `U`).
    const borderKey = selected
      ? SHOP_PANEL_COLORS.borderSelected
      : offer.rarity === 'rare'
        ? SHOP_PANEL_COLORS.borderRare
        : SHOP_PANEL_COLORS.borderCommon;
    c.border.setStrokeStyle(BORDER_W, PALETTE[borderKey]);
  }

  /** Fecha a loja (SHOP-03/35): some com tudo. */
  hide(): void {
    this.bg.setVisible(false);
    this.hint.setVisible(false);
    for (const c of this.cards) for (const o of [c.border, c.name, c.level, c.preview, c.cost, c.status]) o.setVisible(false);
  }
}
