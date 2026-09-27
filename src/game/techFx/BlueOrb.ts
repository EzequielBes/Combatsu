import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

const SPIRAL_RADIUS = 46;
const SPIRAL_MAX = 50; // TFX-04
const DISTORT_CYCLE_MS = 700;
const DEBRIS_EVERY_MS = 260;
const IMPLODE_MS = 220;

/**
 * Vistas do Azul (BLU-08): núcleo parado, partículas em espiral entrando, anel de distorção contraindo e
 * pedrinhas do chão sugadas; termina numa implosão branca curta. Só desenha; o puxão/dano é do `TechRunner`, a
 * partir do `BlueOrbState` (core, puro) — não há corpo Matter próprio (a posição nunca muda, BLU-12).
 */
export class BlueOrbFx {
  private core: Phaser.GameObjects.Sprite | null = null;
  private spiral: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private distortRing: Phaser.GameObjects.Graphics | null = null;
  private distortMs = 0;
  private debrisMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /** BLU-08/09: chamado todo frame em que o orbe existe. */
  update(dtMs: number, x: number, y: number): void {
    this.fx.add('blue.core', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.spiralIn', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.distortRing', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.debrisIn', Math.max(dtMs, 1), 'game');

    if (!this.core) {
      this.core = this.scene.add.sprite(x, y, TEX.techOrbBlue, 'orb').setDepth(2);
      this.registry.add(this.core);
    }

    if (!this.spiral) {
      // BLU-09: nascem na borda de um círculo em volta do orbe e são mandadas para o próprio centro (moveTo).
      this.spiral = this.scene.add
        .particles(x, y, TEX.techSpark, {
          frame: 'blueIn',
          emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, SPIRAL_RADIUS), quantity: 48 },
          moveToX: x,
          moveToY: y,
          lifespan: 500,
          alpha: { start: 1, end: 0 },
          maxAliveParticles: SPIRAL_MAX, // TFX-04
          frequency: 30,
        })
        .setDepth(2);
      this.registry.add(this.spiral);
    }

    if (!this.distortRing) {
      this.distortRing = this.scene.add.graphics().setDepth(1);
      this.registry.add(this.distortRing);
      this.distortMs = 0;
    }
    this.distortMs = (this.distortMs + dtMs) % DISTORT_CYCLE_MS;
    const t = this.distortMs / DISTORT_CYCLE_MS; // 0 (borda) -> 1 (centro): anel contraindo
    this.distortRing.clear().lineStyle(2, PALETTE.C, 0.6 * (1 - t)).strokeCircle(x, y, SPIRAL_RADIUS * (1 - t) + 8);

    this.debrisMs += dtMs;
    if (this.debrisMs >= DEBRIS_EVERY_MS) {
      this.debrisMs -= DEBRIS_EVERY_MS;
      const gx = x + (Math.random() * 2 - 1) * 40;
      const gy = y + 36;
      const burst = this.scene.add
        .particles(gx, gy, TEX.techSpark, { frame: 'blueIn', moveToX: x, moveToY: y, lifespan: 320, alpha: { start: 1, end: 0 }, emitting: false })
        .setDepth(2);
      burst.explode(3);
      this.registry.add(burst);
      this.registry.scheduleDestroy(burst, 380);
    }
  }

  /** BLU-11: implosão num ponto branco (Direção de arte, "Implosão") - some com o orbe todo. */
  implode(x: number, y: number): void {
    const flash = this.scene.add.sprite(x, y, TEX.techOrbBlue, 'orb').setTintFill(PALETTE.W).setDepth(3);
    this.registry.add(flash);
    this.registry.scheduleDestroy(flash, IMPLODE_MS);
    this.scene.tweens.add({ targets: flash, scale: 0.1, alpha: 0, duration: IMPLODE_MS });
    this.hide();
  }

  /** Remove as vistas persistentes (implosão ou cancelamento); TFX-03/09 via `FxRegistry` (prazo 0). */
  hide(): void {
    if (this.core) {
      this.registry.scheduleDestroy(this.core, 0);
      this.core = null;
    }
    if (this.spiral) {
      this.registry.scheduleDestroy(this.spiral, 0);
      this.spiral = null;
    }
    if (this.distortRing) {
      this.registry.scheduleDestroy(this.distortRing, 0);
      this.distortRing = null;
    }
  }
}
