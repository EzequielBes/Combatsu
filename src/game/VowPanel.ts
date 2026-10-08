import type Phaser from 'phaser';
import type { VowDef } from '../data/vows';
import { UI_SIZE } from './art/hd/screen';
import { PALETTE } from './art/palette';

/** Cor da paleta em CSS para o texto do Phaser (ART-01). */
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Cores do painel de votos: só chaves da `PALETTE` (ART-01). */
export const VOW_PANEL_COLORS = {
  bg: 'k',
  cardBg: 'K',
  border: 'u',
  title: 'U',
  text: 'w',
  boon: 'G',
  cost: 'T',
  hint: 'S',
} as const;

const style = (size: string, key: string, bold = false): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'monospace',
  fontSize: size,
  fontStyle: bold ? 'bold' : 'normal',
  color: css(PALETTE[key]),
  align: 'center',
  stroke: css(PALETTE.k),
  strokeThickness: 3,
});

const CARD_W = 170;
const CARD_H = 130;
const CARD_GAP = 18;
const CARD_TOP = 170;
const DEPTH = 210;

interface Card {
  border: Phaser.GameObjects.Rectangle;
  key: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  boon: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

/**
 * Painel dos Votos Vinculativos (VOW-01): aparece na konbini depois de um chefe, antes da loja. Três cartas com o
 * nome do voto, o que ele dá (verde) e o que ele cobra (magenta); teclas 1..3 tomam, Enter recusa. Só desenha: a
 * escolha é do `VowDirector`.
 */
export class VowPanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly cards: Card[];
  private shown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    const w = UI_SIZE.w;
    this.bg = scene.add.rectangle(0, 0, w, UI_SIZE.h, PALETTE[VOW_PANEL_COLORS.bg], 0.78).setOrigin(0, 0);
    this.title = scene.add.text(w / 2, CARD_TOP - 70, 'Voto Vinculativo', style('20px', VOW_PANEL_COLORS.title, true));
    this.subtitle = scene.add.text(
      w / 2,
      CARD_TOP - 40,
      'Troque uma fraqueza por poder até o fim da run',
      style('12px', VOW_PANEL_COLORS.text),
    );
    this.hint = scene.add.text(
      w / 2,
      CARD_TOP + CARD_H + 20,
      '1-3 tomar o voto · Enter recusar',
      style('12px', VOW_PANEL_COLORS.hint),
    );
    for (const t of [this.title, this.subtitle, this.hint]) t.setOrigin(0.5, 0);
    const total = CARD_W * 3 + CARD_GAP * 2;
    const x0 = (w - total) / 2;
    this.cards = [0, 1, 2].map((i) => this.buildCard(x0 + i * (CARD_W + CARD_GAP), i));
    const objs: Phaser.GameObjects.GameObject[] = [this.bg, this.title, this.subtitle, this.hint];
    for (const c of this.cards) objs.push(c.border, c.key, c.name, c.boon, c.cost);
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
      .rectangle(x, CARD_TOP, CARD_W, CARD_H, PALETTE[VOW_PANEL_COLORS.cardBg])
      .setOrigin(0, 0)
      .setStrokeStyle(3, PALETTE[VOW_PANEL_COLORS.border]);
    const key = this.scene.add.text(cx, CARD_TOP + 6, `${i + 1}`, style('14px', VOW_PANEL_COLORS.title, true));
    const name = this.scene.add.text(cx, CARD_TOP + 26, '', style('14px', VOW_PANEL_COLORS.text, true));
    const boon = this.scene.add.text(cx, CARD_TOP + 56, '', style('11px', VOW_PANEL_COLORS.boon));
    const cost = this.scene.add.text(cx, CARD_TOP + 92, '', style('11px', VOW_PANEL_COLORS.cost));
    for (const t of [key, name, boon, cost]) t.setOrigin(0.5, 0).setWordWrapWidth(CARD_W - 14);
    return { border, key, name, boon, cost };
  }

  /** Mostra as ofertas (1 a 3); as cartas a mais ficam escondidas (VOW-06). */
  show(offers: readonly VowDef[]): void {
    this.shown = offers.length;
    for (const o of [this.bg, this.title, this.subtitle, this.hint]) o.setVisible(true);
    this.cards.forEach((c, i) => {
      const vow = offers[i];
      for (const o of [c.border, c.key, c.name, c.boon, c.cost]) o.setVisible(!!vow);
      if (!vow) return;
      c.name.setText(vow.name);
      c.boon.setText(`+ ${vow.boon}`);
      c.cost.setText(`- ${vow.cost}`);
    });
  }

  hide(): void {
    this.shown = 0;
    for (const o of [this.bg, this.title, this.subtitle, this.hint]) o.setVisible(false);
    for (const c of this.cards) for (const o of [c.border, c.key, c.name, c.boon, c.cost]) o.setVisible(false);
  }

  /** Cartas visíveis agora (0 com o painel fechado). */
  get visibleCards(): number {
    return this.shown;
  }
}
