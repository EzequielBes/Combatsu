import type Phaser from 'phaser';
import { HUD_BAR_WELL } from './art/hud';
import { ART_SCALE, PALETTE } from './art/palette';
import { TEX } from './textures';

/** Canto da barra de vida e do painel na tela (px da câmera de UI, zoom 1). */
const MARGIN = 12;
/** Espaço reservado para o rótulo "HP" à esquerda da barra. */
const LABEL_W = 26;
/** O painel de controles começa abaixo da barra. */
const PANEL_Y = 36;
/** Cor da paleta em CSS (`#rrggbb` ou `#rrggbbaa`), para o texto do Phaser, que não aceita número (ART-01). */
const css = (color: number, alpha = 1): string =>
  `#${color.toString(16).padStart(6, '0')}${alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0') : ''}`;
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '12px', color: css(PALETTE.w) };

/**
 * HUD na câmera de UI (AD-003): barra de vida do player com moldura pixel art (HUD-01) e o painel de controles, que
 * aparece por um tempo e alterna no Tab (HUD-03). Todo objeto entra na camada de UI.
 */
export class Hud {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    controlsText: string,
  ) {
    const barX = MARGIN + LABEL_W;
    const label = scene.add.text(MARGIN, MARGIN + 1, 'HP', TEXT_STYLE);
    const frame = scene.add.image(barX, MARGIN, TEX.hudBar).setOrigin(0, 0);
    const w = HUD_BAR_WELL;
    this.fill = scene.add
      .rectangle(barX + w.x * ART_SCALE, MARGIN + w.y * ART_SCALE, w.w * ART_SCALE, w.h * ART_SCALE, PALETTE.r)
      .setOrigin(0, 0);
    this.panel = scene.add.text(MARGIN, PANEL_Y, controlsText, {
      ...TEXT_STYLE,
      backgroundColor: css(PALETTE.k, 0.8),
      padding: { x: 6, y: 4 },
    });
    for (const obj of [label, frame, this.fill, this.panel]) obj.setScrollFactor(0).setDepth(100);
    layer.add([label, frame, this.fill, this.panel]);
  }

  /** Enche a barra na proporção da vida, em passos de 1 texel (2 px). */
  setPlayerHp(hp: number, max: number): void {
    const texels = Math.round(HUD_BAR_WELL.w * Math.min(1, Math.max(0, hp / max)));
    this.fill.setSize(texels * ART_SCALE, HUD_BAR_WELL.h * ART_SCALE).setVisible(texels > 0);
  }

  setControlsText(text: string): void {
    this.panel.setText(text);
  }

  /** Mostra o painel e esconde sozinho depois de `ms` (no início e a cada reinício). */
  showControls(ms: number): void {
    this.panel.setVisible(true);
    this.hideTimer?.remove();
    this.hideTimer = this.scene.time.delayedCall(ms, () => {
      this.panel.setVisible(false);
      this.hideTimer = null;
    });
  }

  /** Tab: alterna o painel; quem pediu manda, então o esconder automático é cancelado. */
  toggleControls(): void {
    this.hideTimer?.remove();
    this.hideTimer = null;
    this.panel.setVisible(!this.panel.visible);
  }

  get controlsVisible(): boolean {
    return this.panel.visible;
  }
}
