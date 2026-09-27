import type Phaser from 'phaser';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** CAST-16: a chamada fica na tela por 900 ms. */
const CALLOUT_MS = 900;
/** Polimento (feat(hud)): entra/sai deslizando em ~150 ms (era 200 ms). */
const SLIDE_MS = 150;
const REST_X = 0;
/** Faixa (Direção de arte, "faixa anime"): fundo preto translúcido, bordas na cor da técnica, kanji 3x + nome grande. */
const BAND_W = 360;
const BAND_H = 100;
const START_X = -BAND_W;
/** Centro vertical da faixa, dentro do terço superior da tela (viewport 540 px de altura -> terço = 180 px). */
const Y = 130;
const BORDER_H = 4;
const PAD_X = 14;
/** Kanji 3x maior que o antigo ícone de 28 px (mesmo tamanho do cartão do Kokusen, KANJI_SIZE). */
const ICON_SIZE = 84;
const TEXT_GAP = 16;
const DEPTH = 150;

/**
 * Chamada da conjuração (CAST-16): faixa horizontal (Direção de arte) que desliza da esquerda em 150 ms, fica
 * 900 ms e sai deslizando: fundo preto translúcido, bordas na cor da técnica (`TECHNIQUES[id].aura`), kanji 3x à
 * esquerda e nome em fonte maior e bold. Só desenha; quem decide quando chamar é o `techCast:<id>` do `TechCaster`.
 */
export class Callout {
  private readonly container: Phaser.GameObjects.Container;
  private readonly borderTop: Phaser.GameObjects.Rectangle;
  private readonly borderBottom: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Sprite;
  private readonly text: Phaser.GameObjects.Text;
  private msLeft = 0;
  private current: TechId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    const bg = scene.add.rectangle(0, 0, BAND_W, BAND_H, PALETTE.b, 0.72).setOrigin(0, 0);
    this.borderTop = scene.add.rectangle(0, 0, BAND_W, BORDER_H, PALETTE.w).setOrigin(0, 0);
    this.borderBottom = scene.add.rectangle(0, BAND_H - BORDER_H, BAND_W, BORDER_H, PALETTE.w).setOrigin(0, 0);
    this.icon = scene.add.sprite(PAD_X, BAND_H / 2, TEX.kanji, 'kuro').setOrigin(0, 0.5).setDisplaySize(ICON_SIZE, ICON_SIZE);
    this.text = scene.add
      .text(PAD_X + ICON_SIZE + TEXT_GAP, BAND_H / 2, '', { fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: css(PALETTE.w) })
      .setOrigin(0, 0.5);
    this.container = scene.add
      .container(START_X, Y - BAND_H / 2, [bg, this.borderTop, this.borderBottom, this.icon, this.text])
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    layer.add(this.container);
  }

  /** Chamado no `techCast:<id>` (soltura, CAST-16). */
  show(id: TechId): void {
    const def = TECHNIQUES[id];
    const auraColor = (PALETTE[def.aura] ?? PALETTE.w) as number;
    this.current = id;
    this.msLeft = CALLOUT_MS;
    this.icon.setFrame(def.kanji);
    this.text.setText(def.name);
    this.borderTop.setFillStyle(auraColor);
    this.borderBottom.setFillStyle(auraColor);
    this.container.setPosition(START_X, Y - BAND_H / 2).setVisible(true);
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({ targets: this.container, x: REST_X, duration: SLIDE_MS, ease: 'Cubic.Out' });
  }

  update(dtMs: number): void {
    if (this.msLeft <= 0) return;
    this.msLeft -= dtMs;
    if (this.msLeft <= 0) {
      this.current = null;
      this.scene.tweens.killTweensOf(this.container);
      this.scene.tweens.add({
        targets: this.container,
        x: START_X,
        duration: SLIDE_MS,
        ease: 'Cubic.In',
        onComplete: () => this.container.setVisible(false),
      });
    }
  }

  /** `hud.callout` do snapshot (CAST-16); `null` fora da janela de 900 ms. */
  debug(): { id: TechId; name: string } | null {
    return this.current ? { id: this.current, name: this.text.text } : null;
  }
}
