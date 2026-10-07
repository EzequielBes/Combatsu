import Phaser from 'phaser';
import { snap2 } from '../core/blueVortex';
import { dashStreaks } from '../core/dashStreaks';
import type { FxRegistry } from '../core/fxRegistry';
import type { FxTimeline } from '../core/fxTimeline';
import { DODGE } from '../data/moves';
import { PALETTE } from './art/palette';

/** Duração das linhas de velocidade e da silhueta de saída do passo-relâmpago (ms de jogo). */
const FLASH_STEP_MS = 240;
const STREAK_COUNT = 6;
/** Duração da imagem residual da esquiva perfeita: acompanha a câmera lenta (DOD-07). */
const ZANZOU_MS = 420;
/** Quanto as cópias ciano e carmim se afastam do original (px). */
const ZANZOU_SPLIT = 10;
const RING_MS = 240;
/**
 * Os tweens andam no tempo de jogo, que cai para `DODGE.slowScale` na câmera lenta da esquiva perfeita; o
 * `FxRegistry` conta tempo real. O prazo de destruição cobre a câmera lenta (o objeto já chegou a alpha 0 antes).
 */
const real = (gameMs: number): number => Math.ceil(gameMs / DODGE.slowScale);

/**
 * Esquiva cinematográfica no estilo de Jujutsu Kaisen (DGA-01..05). No dash, o passo-relâmpago: uma silhueta
 * azul fica no ponto de saída e se desfaz, e linhas de velocidade riscam o caminho. Na esquiva perfeita, a imagem
 * residual (zanzou): uma silhueta branca no ponto onde o golpe passou, que se divide em cópias ciano e carmim
 * afastando-se, com um anel de choque. A câmera (linhas de foco, zoom, câmera lenta) fica com a cena.
 */
export class DodgeFx {
  private seed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /**
   * Passo-relâmpago (DGA-01, DGA-02): `view` é o sprite do player no frame em que o dash começa (origem no pé);
   * `dir` o sentido do dash; `distance` o comprimento do caminho; `height` a altura do corpo desenhado.
   */
  flashStep(view: Phaser.GameObjects.Sprite, dir: 1 | -1, distance: number, height: number): void {
    this.fx.add('dodge.flashStep', FLASH_STEP_MS, 'game');
    const x = view.x;
    const feet = view.y;
    // A silhueta azul-profunda que fica para trás, com um contorno ciano um passo deslocado.
    for (const [color, alpha, dx] of [
      [PALETTE.C, 0.25, -2 * dir],
      [PALETTE.d, 0.45, 0],
    ] as const) {
      const ghost = this.silhouette(view, color, alpha, x + dx, feet);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: ghost.scaleX * 0.85,
        x: ghost.x - 6 * dir,
        duration: FLASH_STEP_MS * 0.7,
        ease: 'Quad.easeOut',
      });
      this.registry.scheduleDestroy(ghost, real(FLASH_STEP_MS));
    }

    const streaks = dashStreaks(++this.seed, { count: STREAK_COUNT, height, distance, dir });
    const g = this.scene.add.graphics().setDepth(view.depth - 0.4);
    this.registry.add(g);
    this.registry.scheduleDestroy(g, real(FLASH_STEP_MS + 60));
    this.scene.tweens.addCounter({
      from: 0,
      to: FLASH_STEP_MS + 60,
      duration: FLASH_STEP_MS + 60,
      onUpdate: (tw) => {
        const ms = tw.getValue() ?? 0;
        g.clear();
        // Rastro: só o trecho já percorrido, entre o ponto de saída e onde o player está agora.
        const lo = Math.min(x, view.x);
        const hi = Math.max(x, view.x);
        for (const s of streaks) {
          const k = (ms - s.delayMs) / FLASH_STEP_MS;
          if (k <= 0 || k >= 1) continue;
          // A cauda corre atrás da cabeça: o risco encolhe na direção do dash enquanto apaga.
          const tail = s.x0 + (s.x1 - s.x0) * k * k;
          const x0 = snap2(Math.max(lo, x + Math.min(tail, s.x1)));
          const x1 = snap2(Math.min(hi, x + Math.max(tail, s.x1)));
          if (x1 - x0 < 4) continue;
          g.fillStyle(k < 0.35 ? PALETTE.W : PALETTE.C, (1 - k) * 0.7).fillRect(x0, feet + s.y, x1 - x0, 2);
        }
      },
    });
  }

  /**
   * Imagem residual da esquiva perfeita (DGA-03, DGA-04): silhueta branca onde o player estava quando o golpe
   * passou, que se divide em duas cópias (ciano para trás, carmim para frente) e some, com um anel de choque branco
   * e ciano no centro do corpo.
   */
  zanzou(view: Phaser.GameObjects.Sprite, dir: 1 | -1, height: number): void {
    this.fx.add('dodge.zanzou', ZANZOU_MS, 'game');
    const x = view.x;
    const feet = view.y;
    const white = this.silhouette(view, PALETTE.W, 0.85, x, feet);
    this.scene.tweens.add({ targets: white, alpha: 0, duration: ZANZOU_MS * 0.6, ease: 'Quad.easeIn' });
    this.registry.scheduleDestroy(white, real(ZANZOU_MS));
    for (const [color, side] of [
      [PALETTE.C, -dir],
      [PALETTE.t, dir],
    ] as const) {
      const copy = this.silhouette(view, color, 0.7, x, feet);
      this.scene.tweens.add({
        targets: copy,
        x: x + side * ZANZOU_SPLIT,
        alpha: 0,
        duration: ZANZOU_MS,
        ease: 'Cubic.easeOut',
      });
      this.registry.scheduleDestroy(copy, real(ZANZOU_MS));
    }

    const cy = feet - height * 0.55;
    const ring = this.scene.add.graphics().setDepth(view.depth + 0.5);
    this.registry.add(ring);
    this.registry.scheduleDestroy(ring, real(RING_MS));
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: RING_MS,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        ring
          .clear()
          .lineStyle(4, PALETTE.W, (1 - k) * 0.9)
          .strokeEllipse(x, cy, 10 + k * 70, 14 + k * 90)
          .lineStyle(2, PALETTE.C, (1 - k) * 0.7)
          .strokeEllipse(x, cy, 6 + k * 46, 10 + k * 60);
      },
    });
  }

  /** Cópia chapada (uma cor só) do frame atual do player, na mesma escala e espelhamento, atrás dele. */
  private silhouette(
    view: Phaser.GameObjects.Sprite,
    color: number,
    alpha: number,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image {
    const img = this.scene.add
      .image(x, y, view.texture.key, view.frame.name)
      .setOrigin(view.originX, view.originY)
      .setScale(view.scaleX, view.scaleY)
      .setFlipX(view.flipX)
      .setDepth(view.depth - 0.5)
      .setTint(color)
      .setTintMode(Phaser.TintModes.FILL)
      .setAlpha(alpha);
    this.registry.add(img);
    return img;
  }
}
