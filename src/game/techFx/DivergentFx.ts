import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { PALETTE } from '../art/palette';
import { HD_ON } from '../art/hd/flag';
import { HD_ORIGIN, hdHasFrame } from '../art/hd/sheet';
import { TEX } from '../textures';

/** Offset do punho (Direção de arte, spec P1 Punho Divergente): mesmo offset da hitbox do `direto` (DIV-02). */
const FIST_OFFSET = { x: 22, y: -4 };
const FIST_FLICKER_MS = 120;
const FIST_FADE_MS = 150;
/** "cópia translúcida do punho... deslocada 8 px à frente" (spec, "2º impacto"). */
const GHOST_OFFSET = 8;
const GHOST_MS = 180;
const BURST_MS = 220;
/** Eco de pontinhos azuis no alvo (spec "o eco da energia chispa no alvo"): posições fixas em grade de 2 px (TFX-02). */
const ECHO_DOTS: ReadonlyArray<readonly [number, number]> = [
  [-8, -6],
  [8, -4],
  [-4, 8],
  [6, 6],
];
const ECHO_BLINK_MS = 90;

/**
 * Vistas do Punho Divergente (DIV-07..10): aura do punho no preparo, eco + anel de aproximação na espera do 2º
 * impacto, e o estouro + punho fantasma quando o 2º impacto acontece sem Kokusen (DIV-09). Só desenha; quem decide
 * o que mostrar e quando é o `TechRunner`, a partir do `DivergentState` (core, puro).
 */
export class DivergentFx {
  private fistSprite: Phaser.GameObjects.Sprite | null = null;
  private fistFlickerMs = 0;
  private fistFrameB = false;
  private ring: Phaser.GameObjects.Graphics | null = null;
  private echo: Phaser.GameObjects.Graphics | null = null;
  private echoBlinkMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /**
   * DIV-10: aura tremulando em volta do punho, durante `sign`/`charge`. `at` é onde o punho está em relação ao centro
   * do corpo (com o corpo HD, o punho do quadro: armado atrás na antecipação); sem ele, o ponto fixo `FIST_OFFSET`.
   */
  fistAura(dtMs: number, x: number, y: number, facing: 1 | -1, at: { x: number; y: number } = FIST_OFFSET): void {
    this.fx.add('divergente.fistAura', Math.max(dtMs, 1), 'game');
    if (!this.fistSprite) {
      this.fistSprite = this.scene.add.sprite(0, 0, TEX.techAura, 'blue-a').setScale(0.9).setAlpha(0.9).setDepth(2);
      this.registry.add(this.fistSprite);
      this.fistFlickerMs = 0;
      this.fistFrameB = false;
    }
    this.fistSprite.setPosition(x + at.x * facing, y + at.y).setFlipX(facing < 0);
    this.fistFlickerMs += dtMs;
    if (this.fistFlickerMs >= FIST_FLICKER_MS) {
      this.fistFlickerMs -= FIST_FLICKER_MS;
      this.fistFrameB = !this.fistFrameB;
      this.fistSprite.setFrame(`blue-${this.fistFrameB ? 'b' : 'a'}`);
    }
  }

  /** Fora de `sign`/`charge`: a aura do punho some em 150 ms (mesmo ritmo da aura geral, CAST-14). */
  hideFistAura(): void {
    if (!this.fistSprite) return;
    const sprite = this.fistSprite;
    this.fistSprite = null;
    this.scene.tweens.add({ targets: sprite, alpha: 0, duration: FIST_FADE_MS });
    this.registry.scheduleDestroy(sprite, FIST_FADE_MS);
  }

  /**
   * DIV-07/08: eco de energia + anel de aproximação branco sobre o alvo do 1º impacto, encolhendo de 32 a 0 px
   * (`ringRadiusPx`, já calculado pelo `DivergentState.ringRadius`). Raio arredondado ao par mais próximo (nitidez
   * de pixel art, sem quebrar DIV-08 - a tolerância da AC é ±2 px).
   */
  waiting(dtMs: number, x: number, y: number, ringRadiusPx: number): void {
    this.fx.add('divergente.echo', Math.max(dtMs, 1), 'game');
    this.fx.add('divergente.ring', Math.max(dtMs, 1), 'game');
    if (!this.ring) {
      this.ring = this.scene.add.graphics().setDepth(3);
      this.registry.add(this.ring);
    }
    if (!this.echo) {
      this.echo = this.scene.add.graphics().setDepth(3);
      this.registry.add(this.echo);
      this.echoBlinkMs = 0;
    }
    const r = Math.max(0, Math.round(ringRadiusPx / 2) * 2);
    this.ring.clear().lineStyle(2, PALETTE.W, 1).strokeCircle(x, y, r);
    this.echoBlinkMs += dtMs;
    this.echo.clear();
    if (Math.floor(this.echoBlinkMs / ECHO_BLINK_MS) % 2 === 0) {
      this.echo.fillStyle(PALETTE.c, 0.9);
      for (const [dx, dy] of ECHO_DOTS) this.echo.fillRect(x + dx - 1, y + dy - 1, 2, 2);
    }
  }

  /** Fim da espera (2º impacto resolvido ou alvo perdido antes disso): o eco/anel somem no frame seguinte. */
  hideWaiting(): void {
    if (this.ring) {
      this.registry.scheduleDestroy(this.ring, 0);
      this.ring = null;
    }
    if (this.echo) {
      this.registry.scheduleDestroy(this.echo, 0);
      this.echo = null;
    }
  }

  /** DIV-09: estouro azul-branco + punho fantasma no centro do alvo, deslocado à frente (2º impacto sem Kokusen). */
  burst(x: number, y: number, facing: 1 | -1): void {
    this.fx.add('divergente.burst', BURST_MS, 'game');
    this.fx.add('divergente.fistGhost', GHOST_MS, 'game');
    const ring = this.scene.add.graphics().setDepth(4);
    ring.lineStyle(3, PALETTE.W, 1).strokeCircle(x, y, 4);
    ring.lineStyle(2, PALETTE.c, 0.85).strokeCircle(x, y, 10);
    this.registry.add(ring);
    this.registry.scheduleDestroy(ring, BURST_MS);
    this.scene.tweens.add({ targets: ring, alpha: 0, scaleX: 2.4, scaleY: 2.4, duration: BURST_MS });
    // `?hd=1`: o punho fantasma é o quadro do corpo HD (folha própria, origem no pé).
    const hd = HD_ON && hdHasFrame('divergente-release');
    const ghost = this.scene.add
      .sprite(x + GHOST_OFFSET * facing, y, hd ? TEX.playerHd : TEX.playerArt, 'divergente-release')
      .setAlpha(0.55)
      .setScale(facing, 1)
      .setDepth(4);
    // O ponto é o centro do alvo: o quadro HD (origem no pé) fica centrado nele pela altura do peito.
    if (hd) ghost.setOrigin(HD_ORIGIN.x, 0.62);
    this.registry.add(ghost);
    this.registry.scheduleDestroy(ghost, GHOST_MS);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: GHOST_MS });
  }
}
