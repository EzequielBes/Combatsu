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
/** Card apagada quando sem saldo (T11 "carta levemente apagada"). */
const DIM_ALPHA = 0.55;

/** Posição Y (sem o deslocamento da descida) de cada linha da carta, de cima para baixo (SHOP-21). */
const ROW_Y = {
  border: CARD_TOP,
  name: CARD_TOP + 8,
  level: CARD_TOP + 26,
  preview: CARD_TOP + 42,
  cost: CARD_TOP + 96,
  status: CARD_TOP + CARD_H / 2,
} as const;
const HINT_Y = CARD_TOP + CARD_H + 16;
/** Distância (px) de onde o painel começa, acima da tela, na descida de 200 ms (T11 "desce do topo"). */
const SLIDE_DIST = CARD_TOP + CARD_H;
const SLIDE_MS = 200;
const FLASH_MS = 120;
const FLIP_MS = 75; // + 75 de volta (yoyo) = 150 ms (T11)
const FLOAT_MS = 400;
const FLOAT_RISE = 16;

interface CardObjs {
  border: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  level: Phaser.GameObjects.Text;
  preview: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  /** "Esgotado" (slot vazio) ou "Comprado" (carta vendida), sobre o resto do conteúdo (SHOP-38/42). */
  status: Phaser.GameObjects.Text;
  /** Pisca branco na compra (T11), sobre a carta inteira. */
  flash: Phaser.GameObjects.Rectangle;
  /** "−N" que sobe do custo e some (T11). */
  costFloat: Phaser.GameObjects.Text;
}

/**
 * Painel da loja na câmera de UI (AD-003, SHOP-01): fundo escurecendo a arena, 3 cartas lado a lado e a linha de
 * dica de teclas. Todo texto usa a mesma fonte/estilo do `Hud`; toda cor vem de `SHOP_PANEL_COLORS` (SHOP-24).
 * Cada elemento entra direto na `uiLayer` (nunca num Container): o roteamento de câmera do AD-003 (`TestScene`)
 * marca cada objeto individualmente quando ele é movido para a camada, e um Container filho quebraria isso.
 */
export class ShopPanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly cards: CardObjs[];
  private readonly hint: Phaser.GameObjects.Text;
  /** "−N" que sobe da dica quando o reroll é pago (T11). */
  private readonly rerollFloat: Phaser.GameObjects.Text;
  /** Deslocamento vertical atual da descida (T11): 0 = posição final. */
  private offset = 0;

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

    this.hint = scene.add.text(w / 2, HINT_Y, '', textStyle('12px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    this.rerollFloat = scene.add
      .text(w / 2, HINT_Y, '', textStyle('12px', SHOP_PANEL_COLORS.textDanger))
      .setOrigin(0.5, 1)
      .setVisible(false);

    const objs: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [this.bg, this.hint, this.rerollFloat];
    for (const c of this.cards) objs.push(c.border, c.name, c.level, c.preview, c.cost, c.status, c.flash, c.costFloat);
    for (const o of objs) o.setScrollFactor(0).setDepth(DEPTH);
    layer.add(objs);
  }

  private buildCard(x: number): CardObjs {
    const cx = x + CARD_W / 2;
    const border = this.scene.add
      .rectangle(x, ROW_Y.border, CARD_W, CARD_H, PALETTE[SHOP_PANEL_COLORS.cardBg])
      .setOrigin(0, 0)
      .setStrokeStyle(BORDER_W, PALETTE[SHOP_PANEL_COLORS.borderCommon])
      .setVisible(false);
    const name = this.scene.add.text(cx, ROW_Y.name, '', textStyle('13px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const level = this.scene.add.text(cx, ROW_Y.level, '', textStyle('11px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const preview = this.scene.add
      .text(cx, ROW_Y.preview, '', textStyle('11px', SHOP_PANEL_COLORS.text))
      .setOrigin(0.5, 0)
      .setWordWrapWidth(CARD_W - 16)
      .setVisible(false);
    const cost = this.scene.add.text(cx, ROW_Y.cost, '', textStyle('13px', SHOP_PANEL_COLORS.text)).setOrigin(0.5, 0).setVisible(false);
    const status = this.scene.add
      .text(cx, ROW_Y.status, '', textStyle('14px', SHOP_PANEL_COLORS.text))
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    const flash = this.scene.add
      .rectangle(x, ROW_Y.border, CARD_W, CARD_H, PALETTE[SHOP_PANEL_COLORS.flash], 0)
      .setOrigin(0, 0)
      .setVisible(false);
    const costFloat = this.scene.add
      .text(cx, ROW_Y.cost, '', textStyle('12px', SHOP_PANEL_COLORS.textDanger))
      .setOrigin(0.5, 1)
      .setVisible(false);
    return { border, name, level, preview, cost, status, flash, costFloat };
  }

  /** Abre a loja: desce em 200 ms (T11) e mostra o painel já com a primeira `view` (SHOP-01). */
  show(view: ShopView): void {
    this.bg.setVisible(true);
    this.hint.setVisible(true);
    for (const c of this.cards) c.border.setVisible(true);
    this.update(view);
    const state = { v: -SLIDE_DIST };
    this.applyOffset(state.v);
    this.scene.tweens.add({
      targets: state,
      v: 0,
      duration: SLIDE_MS,
      ease: 'Cubic.Out',
      onUpdate: () => this.applyOffset(state.v),
    });
  }

  /** Move todo o painel (cartas + dica) para o deslocamento vertical `v` (T11: descida de 200 ms). */
  private applyOffset(v: number): void {
    this.offset = v;
    for (const c of this.cards) {
      c.border.y = ROW_Y.border + v;
      c.name.y = ROW_Y.name + v;
      c.level.y = ROW_Y.level + v;
      c.preview.y = ROW_Y.preview + v;
      c.cost.y = ROW_Y.cost + v;
      c.status.y = ROW_Y.status + v;
      c.flash.y = ROW_Y.border + v;
    }
    this.hint.y = HINT_Y + v;
  }

  /** Atualiza as 3 cartas e a dica a cada compra/reroll/movimento (SHOP-21, SHOP-38, SHOP-31, SHOP-46). */
  update(view: ShopView): void {
    view.offers.forEach((offer, i) => this.updateCard(this.cards[i], offer, i === view.selected));
    // SHOP-46: a dica sempre mostra o `rerollCost` atual, inclusive o novo custo logo após um reroll.
    this.hint.setText(`1-3 comprar · R rerolar (${view.rerollCost}) · Enter continuar`);
  }

  /** Textos e realce visíveis de cada carta e a dica, lidos dos objetos vivos (SHOP-22 estendido para o painel). */
  debug(): { cards: { lines: string[]; highlighted: boolean }[]; hint: string } {
    const visible = (t: Phaser.GameObjects.Text): string[] => (t.visible && t.text !== '' ? [t.text] : []);
    return {
      cards: this.cards.map((c) => ({
        lines: [c.status, c.name, c.level, c.preview, c.cost].flatMap(visible),
        highlighted: c.border.strokeColor === PALETTE[SHOP_PANEL_COLORS.borderSelected],
      })),
      hint: this.hint.text,
    };
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
    // T11: sem saldo, o custo fica na cor de perigo e a carta um pouco apagada.
    const dim = showContent && offer.cost !== null && !offer.affordable;
    c.cost
      .setText(offer.cost !== null ? String(offer.cost) : '')
      .setVisible(showContent)
      .setColor(css(PALETTE[dim ? SHOP_PANEL_COLORS.textDanger : SHOP_PANEL_COLORS.text]));
    const alpha = dim ? DIM_ALPHA : 1;
    for (const o of [c.border, c.name, c.level, c.preview, c.cost]) o.setAlpha(alpha);
    // SHOP-31: borda realçada só no slot selecionado; senão, a cor de raridade (comum `g`, raro `U`).
    const borderKey = selected
      ? SHOP_PANEL_COLORS.borderSelected
      : offer.rarity === 'rare'
        ? SHOP_PANEL_COLORS.borderRare
        : SHOP_PANEL_COLORS.borderCommon;
    c.border.setStrokeStyle(BORDER_W, PALETTE[borderKey]);
  }

  /** Carta comprada (T11): pisca branco (~120 ms) e o custo pago sobe em "−N" e some. */
  flashBuy(slot: number, cost: number): void {
    const c = this.cards[slot];
    if (!c) return;
    c.flash.setAlpha(0.85).setVisible(true);
    this.scene.tweens.add({
      targets: c.flash,
      alpha: 0,
      duration: FLASH_MS,
      onComplete: () => c.flash.setVisible(false),
    });
    this.riseAndFade(c.costFloat, `−${cost}`, c.cost.x, ROW_Y.cost + this.offset);
  }

  /** Reroll pago (T11): as 3 cartas viram de costas e voltam em 150 ms; o custo pago sobe da dica. */
  flipReroll(cost: number): void {
    for (const c of this.cards) {
      this.scene.tweens.add({
        targets: [c.border, c.name, c.level, c.preview, c.cost, c.status],
        scaleX: 0,
        duration: FLIP_MS,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }
    this.riseAndFade(this.rerollFloat, `−${cost}`, this.hint.x, this.hint.y);
  }

  /** "−N" comum à compra e ao reroll: sobe `FLOAT_RISE` px e some em `FLOAT_MS` (T11). */
  private riseAndFade(text: Phaser.GameObjects.Text, str: string, x: number, y: number): void {
    text.setText(str).setPosition(x, y).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: text,
      y: y - FLOAT_RISE,
      alpha: 0,
      duration: FLOAT_MS,
      onComplete: () => text.setVisible(false),
    });
  }

  /** Fecha a loja (SHOP-03/35): some com tudo e cancela qualquer animação pendente. */
  hide(): void {
    this.bg.setVisible(false);
    this.hint.setVisible(false);
    for (const c of this.cards) {
      const objs = [c.border, c.name, c.level, c.preview, c.cost, c.status, c.flash, c.costFloat];
      this.scene.tweens.killTweensOf(objs);
      for (const o of objs) o.setVisible(false);
      for (const o of [c.border, c.name, c.level, c.preview, c.cost]) o.setAlpha(1).setScale(1);
    }
    this.scene.tweens.killTweensOf(this.rerollFloat);
    this.rerollFloat.setVisible(false);
  }
}
