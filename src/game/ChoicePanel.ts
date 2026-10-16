import type Phaser from 'phaser';
import { AWAKENING_NAMES, BRANCH_AWAKENING, ITEM_BRANCHES, type AxisItem } from '../data/techAxes';
import { UI_SIZE } from './art/hd/screen';
import { PALETTE } from './art/palette';
import { SHOP_PANEL_COLORS } from './art/shopPanel';
import type { ChoicePage, ChoiceSnapshot } from './axisSnapshot';

/** Cor da paleta em CSS para o texto do Phaser (ART-01). */
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Cores do painel de ramo: só chaves da `PALETTE` (ART-01). */
export const CHOICE_PANEL_COLORS = {
  bg: 'k',
  cardBg: 'K',
  border: 'u',
  borderSelected: SHOP_PANEL_COLORS.borderSelected,
  title: 'U',
  text: 'w',
  awakening: 'G',
  hint: 'S',
} as const;

/** Nome do item no título da página. */
const ITEM_TITLES: Record<AxisItem, string> = { vermelho: 'Vermelho', corpo: 'Corpo Amaldiçoado' };

const style = (size: string, key: string, bold = false): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'monospace',
  fontSize: size,
  fontStyle: bold ? 'bold' : 'normal',
  color: css(PALETTE[key]),
  align: 'center',
  stroke: css(PALETTE.k),
  strokeThickness: 3,
});

const CARD_W = 200;
const CARD_H = 120;
const CARD_GAP = 24;
const CARD_TOP = 190;
const DEPTH = 210;

interface Card {
  border: Phaser.GameObjects.Rectangle;
  key: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  awakening: Phaser.GameObjects.Text;
}

/**
 * Painel do ramo (CRD-08, CRD-09): abre na konbini, antes da loja, quando o Vermelho ou o Corpo chegou ao Nv 2. Duas
 * cartas, A e B, com o nome do ramo e a linha do Despertar que ele abre no Nv 5; `A`/`D` escolhem, `Enter` confirma.
 * Só desenha: quem decide é o `shopDirector` (e o `axisDirector.confirmBranch`).
 */
export class ChoicePanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly cards: Card[];
  private page: ChoicePage | null = null;
  private option: 0 | 1 = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    const w = UI_SIZE.w;
    this.bg = scene.add.rectangle(0, 0, w, UI_SIZE.h, PALETTE[CHOICE_PANEL_COLORS.bg], 0.78).setOrigin(0, 0);
    this.title = scene.add.text(w / 2, CARD_TOP - 70, '', style('20px', CHOICE_PANEL_COLORS.title, true));
    this.subtitle = scene.add.text(
      w / 2,
      CARD_TOP - 40,
      'Escolha o ramo (uma vez por run)',
      style('12px', CHOICE_PANEL_COLORS.text),
    );
    this.hint = scene.add.text(
      w / 2,
      CARD_TOP + CARD_H + 20,
      'A/D escolher · Enter confirmar',
      style('12px', CHOICE_PANEL_COLORS.hint),
    );
    for (const t of [this.title, this.subtitle, this.hint]) t.setOrigin(0.5, 0);
    const x0 = (w - (CARD_W * 2 + CARD_GAP)) / 2;
    this.cards = [0, 1].map((i) => this.buildCard(x0 + i * (CARD_W + CARD_GAP), i));
    const objs: Phaser.GameObjects.GameObject[] = [this.bg, this.title, this.subtitle, this.hint];
    for (const c of this.cards) objs.push(c.border, c.key, c.name, c.awakening);
    for (const o of objs as (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth)[]) {
      o.setDepth(DEPTH);
      (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    }
    layer.add(objs);
    this.hide();
  }

  private buildCard(x: number, i: number): Card {
    const cx = x + CARD_W / 2;
    const border = this.scene.add
      .rectangle(x, CARD_TOP, CARD_W, CARD_H, PALETTE[CHOICE_PANEL_COLORS.cardBg])
      .setOrigin(0, 0)
      .setStrokeStyle(3, PALETTE[CHOICE_PANEL_COLORS.border]);
    const key = this.scene.add.text(
      cx,
      CARD_TOP + 8,
      i === 0 ? 'A' : 'B',
      style('14px', CHOICE_PANEL_COLORS.title, true),
    );
    const name = this.scene.add.text(cx, CARD_TOP + 34, '', style('16px', CHOICE_PANEL_COLORS.text, true));
    const awakening = this.scene.add.text(cx, CARD_TOP + 74, '', style('11px', CHOICE_PANEL_COLORS.awakening));
    for (const t of [key, name, awakening]) t.setOrigin(0.5, 0).setWordWrapWidth(CARD_W - 14);
    return { border, key, name, awakening };
  }

  /** Abre a página do item com a opção A realçada (CRD-08). */
  show(page: ChoicePage): void {
    this.page = page;
    this.option = 0;
    for (const o of [this.bg, this.title, this.subtitle, this.hint]) o.setVisible(true);
    this.title.setText(`Ramo do ${ITEM_TITLES[page.item]}`);
    this.cards.forEach((c, i) => {
      for (const o of [c.border, c.key, c.name, c.awakening]) o.setVisible(true);
      c.name.setText(page.options[i]);
      c.awakening.setText(`Despertar: ${AWAKENING_NAMES[BRANCH_AWAKENING[ITEM_BRANCHES[page.item][i]]]}`);
    });
    this.select(0);
  }

  /** Move o realce para a opção A (`0`) ou B (`1`). */
  select(option: 0 | 1): void {
    this.option = option;
    this.cards.forEach((c, i) => {
      const key = i === option ? CHOICE_PANEL_COLORS.borderSelected : CHOICE_PANEL_COLORS.border;
      c.border.setStrokeStyle(3, PALETTE[key]);
    });
  }

  hide(): void {
    this.page = null;
    for (const o of [this.bg, this.title, this.subtitle, this.hint]) o.setVisible(false);
    for (const c of this.cards) for (const o of [c.border, c.key, c.name, c.awakening]) o.setVisible(false);
  }

  /** Painel aberto agora. */
  get open(): boolean {
    return this.page !== null;
  }

  /** Opção realçada (`0` = A, `1` = B). */
  get selected(): 0 | 1 {
    return this.option;
  }

  /** Estado para o snapshot de debug (CRD-09): `page` é `{ item, options }` ou `null` com o painel fechado. */
  debug(): ChoiceSnapshot {
    return {
      open: this.open,
      page: this.page ? { item: this.page.item, options: [...this.page.options] } : null,
    };
  }
}
