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

/** Cores dos elementos novos do HUD da run (RHUD-04): rodada/restantes, faixa e telas de título/game over. */
export const RUN_TEXT_COLOR = PALETTE.w;
export const RUN_BG_COLOR = PALETTE.k;
const RUN_TEXT_STYLE = { fontFamily: 'monospace', fontSize: '13px', color: css(RUN_TEXT_COLOR) };
const RUN_PANEL_STYLE = { ...RUN_TEXT_STYLE, backgroundColor: css(RUN_BG_COLOR, 0.8), align: 'center' as const };
/** Nome do jogo, mostrado na tela de título (RHUD-05). */
export const GAME_NAME = 'Combatsu';

/**
 * HUD na câmera de UI (AD-003): barra de vida do player com moldura pixel art (HUD-01) e o painel de controles, que
 * aparece por um tempo e alterna no Tab (HUD-03). Todo objeto entra na camada de UI.
 */
export class Hud {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  /** Rodada e restantes da run (RHUD-01), no canto superior direito. */
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly remainingText: Phaser.GameObjects.Text;
  /** Faixa central temporária (RHUD-02) ou até a próxima chamada (RHUD-03). */
  private readonly bannerText: Phaser.GameObjects.Text;
  private bannerMsLeft = 0;
  /** Texto central da tela de título/game over (RHUD-05/06); `null` = escondido. */
  private readonly centerText: Phaser.GameObjects.Text;
  private centerLines: string[] | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
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
    const w2 = scene.scale.width;
    const h2 = scene.scale.height;
    this.roundText = scene.add.text(w2 - MARGIN, MARGIN, '', RUN_TEXT_STYLE).setOrigin(1, 0).setVisible(false);
    this.remainingText = scene.add.text(w2 - MARGIN, MARGIN + 16, '', RUN_TEXT_STYLE).setOrigin(1, 0).setVisible(false);
    this.bannerText = scene.add
      .text(w2 / 2, h2 * 0.25, '', { ...RUN_PANEL_STYLE, padding: { x: 10, y: 6 } })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.centerText = scene.add
      .text(w2 / 2, h2 / 2, '', { ...RUN_PANEL_STYLE, padding: { x: 14, y: 10 } })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    const runObjs = [this.roundText, this.remainingText, this.bannerText, this.centerText];
    for (const obj of [label, frame, this.fill, this.panel, ...runObjs]) obj.setScrollFactor(0).setDepth(100);
    layer.add([label, frame, this.fill, this.panel, ...runObjs]);
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

  /** Rodada e inimigos restantes (RHUD-01); `null` esconde (fora de uma rodada, ex.: `title`). */
  setRun(state: { round: number; remaining: number } | null): void {
    if (state === null) {
      this.roundText.setVisible(false);
      this.remainingText.setVisible(false);
      return;
    }
    this.roundText.setText(`Rodada ${state.round}`).setVisible(true);
    this.remainingText.setText(`Inimigos: ${state.remaining}`).setVisible(true);
  }

  /**
   * Mostra a faixa central por `ms` (RHUD-02); com `Infinity` fica até a próxima chamada de `banner` ou
   * `hideBanner` (RHUD-03: "Rodada N concluída" até a próxima rodada começar).
   */
  banner(text: string, ms: number): void {
    this.bannerText.setText(text).setVisible(true);
    this.bannerMsLeft = ms;
  }

  hideBanner(): void {
    this.bannerText.setVisible(false);
    this.bannerMsLeft = 0;
  }

  /** Texto central da tela de título (RHUD-05) ou de game over (RHUD-06); `null` esconde. */
  setCenter(lines: string[] | null): void {
    this.centerLines = lines;
    if (lines === null) {
      this.centerText.setVisible(false);
      return;
    }
    this.centerText.setText(lines.join('\n')).setVisible(true);
  }

  /** Conta o tempo da faixa central pelo `dt` da cena, que já para durante o hitstop (RHUD-02). */
  update(dtMs: number): void {
    if (!this.bannerText.visible) return;
    this.bannerMsLeft -= dtMs;
    if (this.bannerMsLeft <= 0) this.hideBanner();
  }

  /**
   * `ignoredByMain` é a checagem real de que a `uiLayer` está na lista de ignorados da câmera principal (AD-003),
   * não uma constante fixa: se a rota de câmeras quebrar, este bit some e o smoke pega (RHUD-07).
   */
  debugState(): {
    ignoredByMain: boolean;
    round: string;
    remaining: string;
    banner: string | null;
    center: string[] | null;
    bannerPos: { x: number; y: number };
  } {
    const mainId = this.scene.cameras.main.id;
    return {
      ignoredByMain: (this.layer.cameraFilter & mainId) === mainId,
      round: this.roundText.text,
      remaining: this.remainingText.text,
      banner: this.bannerText.visible ? this.bannerText.text : null,
      center: this.centerLines,
      // Centro visual do texto (RHUD-02): com origem não centralizada, o ponto de âncora (x/y) não discriminaria
      // uma faixa que cresce só para um lado.
      bannerPos: (() => {
        const b = this.bannerText.getBounds();
        return { x: b.centerX, y: b.centerY };
      })(),
    };
  }
}
