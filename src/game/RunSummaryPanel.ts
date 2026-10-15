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
/** Folga antes de uma linha que abre bloco (`gap`): meia linha. */
export const PANEL_GAP_H = 8;
/** Recuo das linhas `indent` (fontes de dano, continuação de lista). */
export const PANEL_INDENT = 16;
/** Margem interna da caixa de fundo. */
export const PANEL_PAD = 16;
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

/** Topo de cada linha, medido do topo do texto: 16 px por linha e meia linha a mais antes de cada `gap`. */
export function lineTops(lines: readonly SummaryLine[]): number[] {
  let y = 0;
  return lines.map((line, i) => {
    if (line.gap && i > 0) y += PANEL_GAP_H;
    const top = y;
    y += PANEL_LINE_H;
    return top;
  });
}

/** Largura estimada de uma linha, com o recuo. */
const lineWidth = (line: SummaryLine): number => line.text.length * PANEL_CHAR_W + (line.indent ? PANEL_INDENT : 0);

/** Caixa do painel para as linhas dadas, centrada em `PANEL_CENTER` (puro, para o Vitest; END-14). */
export function panelBounds(lines: readonly SummaryLine[]): PanelBounds {
  const w = lines.reduce((max, line) => Math.max(max, lineWidth(line)), 0) + PANEL_PAD * 2;
  const tops = lineTops(lines);
  const h = (lines.length ? (tops.at(-1) ?? 0) + PANEL_LINE_H : 0) + PANEL_PAD * 2;
  return { x: PANEL_CENTER.x - w / 2, y: PANEL_CENTER.y - h / 2, w, h };
}

/**
 * Painel de fim de run (END-01, END-14, END-16): caixa escura centrada na tela de UI com uma coluna de `Text`, uma
 * linha por item, alinhada à esquerda dentro da caixa; título e instrução centrados, fontes de dano recuadas e meia
 * linha de folga entre os blocos. A linha com `highlight` (título e `Recorde!`) sai na cor de destaque. Só desenha:
 * as linhas vêm de `summaryLines`.
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
    this.bounds = panelBounds(lines);
    const { x, y, w, h } = this.bounds;
    const tops = lineTops(lines);
    this.bg.setPosition(x, y).setSize(w, h).setVisible(true);
    while (this.texts.length < lines.length) this.texts.push(this.makeText());
    this.texts.forEach((text, i) => {
      const line = lines[i];
      if (!line) {
        text.setVisible(false);
        return;
      }
      const key = line.highlight ? RECORD_COLORS.highlight : RECORD_COLORS.text;
      const left = x + PANEL_PAD + (line.indent ? PANEL_INDENT : 0);
      text.setOrigin(line.center ? 0.5 : 0, 0);
      text.setPosition(line.center ? PANEL_CENTER.x : left, y + PANEL_PAD + tops[i]);
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
