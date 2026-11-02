import type Phaser from 'phaser';
import type { DomainBarView } from '../core/domain';
import { DOMAIN_BAR, DOMAIN_COLORS } from '../data/domains';
import { PALETTE } from './art/palette';
import type { DomainBarSnapshot } from './domainSnapshot';
import { HUD_TEXT_STYLE } from './Hud';

const DEPTH = 101;
/** Rótulo da tecla (DHD-02) à direita da faixa, com o mesmo texto e contorno do rótulo `CE`. */
const KEY_GAP = 4;
const HIDDEN: DomainBarView = { visible: false, fill: 0, blinking: false, active: false };

/**
 * A barra do Domínio (DHD-01 a DHD-03): faixa de 3 px logo abaixo da moldura da energia, no `x` e na largura do poço
 * dela. Cor `U` carregando, `T` com o Domínio ativo (o tempo restante encolhe a faixa) e, com a carga cheia, pisca
 * `U`/`W` e mostra o rótulo `P`. Só desenha; a regra é do `domainBarView` (core).
 */
export class DomainBar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly key: Phaser.GameObjects.Text;
  private source: () => DomainBarView = () => HIDDEN;
  private blinkMs = 0;
  private blinking = false;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    x: number,
    private readonly width: number,
  ) {
    const { y, h, keyLabel } = DOMAIN_BAR;
    this.bg = scene.add.rectangle(x, y, width, h, PALETTE[DOMAIN_COLORS.barBg]).setOrigin(0, 0);
    this.fill = scene.add.rectangle(x, y, 0, h, PALETTE[DOMAIN_COLORS.barFill]).setOrigin(0, 0);
    this.key = scene.add
      .text(x + width + KEY_GAP, y + h / 2, keyLabel, HUD_TEXT_STYLE)
      .setOrigin(0, 0.5)
      .setVisible(false);
    const objs = [this.bg, this.fill, this.key];
    for (const o of objs) o.setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    layer.add(objs);
  }

  /** A vista que a barra lê a cada quadro (o `UiSetup` liga o `domainDirector.barView`). */
  bind(source: () => DomainBarView): void {
    this.source = source;
  }

  update(dtMs: number): void {
    const view = this.source();
    this.blinking = view.visible && view.blinking;
    this.blinkMs = this.blinking ? this.blinkMs + dtMs : 0;
    this.bg.setVisible(view.visible);
    this.fill.setVisible(view.visible);
    this.key.setVisible(this.blinking);
    if (!view.visible) return;
    this.fill.width = Math.round(this.width * Math.max(0, Math.min(1, view.fill)));
    const lit = Math.floor(this.blinkMs / DOMAIN_BAR.blinkMs) % 2 === 1;
    const color = view.active ? DOMAIN_COLORS.barActive : lit ? DOMAIN_COLORS.barReady : DOMAIN_COLORS.barFill;
    this.fill.setFillStyle(PALETTE[color]);
  }

  /** `hud.domainBar` do snapshot (DDB-01): o `fill` é a largura medida no retângulo vivo sobre a largura da barra. */
  debug(): DomainBarSnapshot {
    return {
      visible: this.bg.visible,
      fill: this.fill.visible ? this.fill.width / this.width : 0,
      blinking: this.blinking,
    };
  }
}
