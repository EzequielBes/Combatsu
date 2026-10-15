import type Phaser from 'phaser';
import type { MarkerView } from '../core/recordBook';
import { PALETTE } from './art/palette';
import { RUN_TEXT_STYLE } from './Hud';

/** Cor da paleta em CSS para o texto do Phaser, que não aceita número (ART-01). */
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Cores do recorde (marcador e painel de fim de run): só chaves da `PALETTE` (RMK-08, END-14). */
export const RECORD_COLORS = { text: 'w', highlight: 'A', bg: 'k' } as const;

/** Canto do marcador na câmera de UI (960x540): alinhado à direita, abaixo de `Inimigos` (RMK-02). */
const MARKER_X = 948;
const MARKER_Y = 44;
/** Mesma profundidade dos textos do HUD. */
const DEPTH = 100;

/**
 * Marcador `Recorde: rN` no HUD (RMK-02, RMK-07): só desenha o que o `recordBook` decide. Na cor normal do HUD ou,
 * quando a run atual já passou do recorde, na cor de destaque.
 */
export class RecordMarker {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.text = scene.add
      .text(MARKER_X, MARKER_Y, '', RUN_TEXT_STYLE)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    layer.add(this.text);
  }

  set(view: MarkerView): void {
    const key = view.highlight ? RECORD_COLORS.highlight : RECORD_COLORS.text;
    this.text.setText(view.text).setColor(css(PALETTE[key])).setVisible(view.visible);
  }

  hide(): void {
    this.text.setVisible(false);
  }

  /** Estado lido do próprio `Text` (RMK-09): o destaque é a cor que chegou ao motor, não a pedida. */
  debug(): MarkerView {
    return {
      visible: this.text.visible,
      text: this.text.text,
      highlight: this.text.style.color === css(PALETTE[RECORD_COLORS.highlight]),
    };
  }
}
