import type Phaser from 'phaser';
import type { SummaryLine } from '../core/runSummary';
import { UI_SIZE } from './art/hd/screen';
import { PALETTE } from './art/palette';
import { RUN_TEXT_STYLE } from './Hud';
import { RECORD_COLORS } from './RecordMarker';

/** Cor da paleta em CSS para o texto do Phaser, que não aceita número (ART-01). */
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Centro do painel na câmera de UI (END-01). */
export const PANEL_CENTER = { x: UI_SIZE.w / 2, y: UI_SIZE.h / 2 } as const;
/** Altura de cada linha (o texto é o `RUN_TEXT_STYLE`, de 13 px). */
export const PANEL_LINE_H = 16;
/**
 * Largura estimada de um caractere em monospace 13 px: o real fica perto de 7,8 px; 8 é o teto, para a caixa nunca
 * ficar menor que o texto.
 */
export const PANEL_CHAR_W = 8;
/** Margem interna da caixa de fundo. */
const PAD = 16;
/** Opacidade do fundo (END-01). */
const BG_ALPHA = 0.85;
/** Acima do HUD (100) e na faixa dos painéis (`VowPanel` em 210). */
const DEPTH = 220;

export interface PanelBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RunSummaryDebug {
  visible: boolean;
  lines: string[];
  bounds: PanelBounds;
}

/** Caixa do painel para as linhas dadas, centrada em `PANEL_CENTER` (puro, para o Vitest; END-14). */
export function panelBounds(lines: readonly string[]): PanelBounds {
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const w = longest * PANEL_CHAR_W + PAD * 2;
  const h = lines.length * PANEL_LINE_H + PAD * 2;
  return { x: PANEL_CENTER.x - w / 2, y: PANEL_CENTER.y - h / 2, w, h };
}

/**
 * Painel de fim de run (END-01, END-14): caixa escura com uma coluna de `Text`, uma linha por item, centrada na tela
 * de UI. A linha com `highlight` (o `Recorde!`) sai na cor de destaque. Só desenha: as linhas vêm de `summaryLines`.
 */
export class RunSummaryPanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private bounds: PanelBounds = panelBounds([]);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.bg = scene.add
      .rectangle(0, 0, 1, 1, PALETTE[RECORD_COLORS.bg], BG_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    layer.add(this.bg);
  }

  /** Mostra as linhas; os `Text` são criados sob demanda e reaproveitados entre runs. */
  show(lines: readonly SummaryLine[]): void {
    this.bounds = panelBounds(lines.map((line) => line.text));
    const { x, y, w, h } = this.bounds;
    this.bg.setPosition(x, y).setSize(w, h).setVisible(true);
    while (this.texts.length < lines.length) this.texts.push(this.makeText());
    this.texts.forEach((text, i) => {
      const line = lines[i];
      if (!line) {
        text.setVisible(false);
        return;
      }
      const key = line.highlight ? RECORD_COLORS.highlight : RECORD_COLORS.text;
      text.setPosition(PANEL_CENTER.x, y + PAD + i * PANEL_LINE_H);
      text.setText(line.text).setColor(css(PALETTE[key])).setVisible(true);
    });
  }

  hide(): void {
    this.bg.setVisible(false);
    for (const text of this.texts) text.setVisible(false);
  }

  /** Estado lido dos próprios objetos: linhas dos `Text` visíveis e a caixa calculada (END-15). */
  debug(): RunSummaryDebug {
    const visible = this.bg.visible;
    return {
      visible,
      lines: visible ? this.texts.filter((t) => t.visible).map((t) => t.text) : [],
      bounds: { ...this.bounds },
    };
  }

  private makeText(): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(PANEL_CENTER.x, PANEL_CENTER.y, '', RUN_TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);
    this.layer.add(text);
    return text;
  }
}
