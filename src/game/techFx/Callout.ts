import type Phaser from 'phaser';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** CAST-16: a chamada fica na tela por 900 ms. */
const CALLOUT_MS = 900;
const SLIDE_MS = 200;
const REST_X = 20;
const START_X = -200;
// Abaixo do painel de controles e da barra/ícones de energia (EnergyHud.ts), para não empilhar em cima deles nos
// primeiros `CONTROLS_MS` de cada run (conferido no screenshot de T20).
const Y = 190;
const ICON_SIZE = 28;
const TEXT_GAP = 8;
const DEPTH = 150;

/**
 * Chamada da conjuração (CAST-16): kanji + nome em português por 900 ms, deslizando da esquerda (Direção de
 * arte, spec P1 Conjuração, "Chamada"). Só desenha; quem decide quando chamar é o `techCast:<id>` do `TechCaster`.
 */
export class Callout {
  private readonly icon: Phaser.GameObjects.Sprite;
  private readonly text: Phaser.GameObjects.Text;
  private msLeft = 0;
  private current: TechId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.icon = scene.add.sprite(START_X, Y, TEX.kanji, 'kuro').setOrigin(0, 0.5).setDisplaySize(ICON_SIZE, ICON_SIZE).setVisible(false);
    this.text = scene.add
      .text(START_X + ICON_SIZE + TEXT_GAP, Y, '', { fontFamily: 'monospace', fontSize: '16px', color: css(PALETTE.w) })
      .setOrigin(0, 0.5)
      .setVisible(false);
    for (const o of [this.icon, this.text]) o.setScrollFactor(0).setDepth(DEPTH);
    layer.add([this.icon, this.text]);
  }

  /** Chamado no `techCast:<id>` (soltura, CAST-16). */
  show(id: TechId): void {
    const def = TECHNIQUES[id];
    this.current = id;
    this.msLeft = CALLOUT_MS;
    this.icon.setFrame(def.kanji).setPosition(START_X, Y).setVisible(true);
    this.text.setText(def.name).setPosition(START_X + ICON_SIZE + TEXT_GAP, Y).setVisible(true);
    this.scene.tweens.killTweensOf([this.icon, this.text]);
    this.scene.tweens.add({ targets: this.icon, x: REST_X, duration: SLIDE_MS, ease: 'Cubic.Out' });
    this.scene.tweens.add({ targets: this.text, x: REST_X + ICON_SIZE + TEXT_GAP, duration: SLIDE_MS, ease: 'Cubic.Out' });
  }

  update(dtMs: number): void {
    if (this.msLeft <= 0) return;
    this.msLeft -= dtMs;
    if (this.msLeft <= 0) {
      this.icon.setVisible(false);
      this.text.setVisible(false);
      this.current = null;
    }
  }

  /** `hud.callout` do snapshot (CAST-16); `null` fora da janela de 900 ms. */
  debug(): { id: TechId; name: string } | null {
    return this.current ? { id: this.current, name: this.text.text } : null;
  }
}
