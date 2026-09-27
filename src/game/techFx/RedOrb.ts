import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { RedOrbState } from '../../core/redOrb';
import type { Vec2 } from '../../core/hit';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

/** Um frame a 60 fps (mesma convenção de KokusenFx.ts). */
const FRAME_MS = 1000 / 60;

/** Braço esticado, dois dedos apontados (Direção de arte, "Selo"): offset da ponta dos dedos a partir do centro. */
export const RED_FINGERTIP_OFFSET: Vec2 = { x: 20, y: -8 };

/** Textura do orbe por tamanho de carga (RED-02). */
const CHARGE_TEX: Record<4 | 8 | 12, string> = { 4: TEX.techOrbRed4, 8: TEX.techOrbRed8, 12: TEX.techOrbRed12 };

const SPARKS_OUT_MAX = 40; // TFX-04: bem abaixo de 64
const DUST_EVERY_MS = 150;
const TRAIL_EVERY_MS = 35;
const TRAIL_FADE_MS = 180;
const CRACKLE_EVERY_MS = 90;
const FLASH_CORE_MS = 100;
/** "esfera vermelha expandindo em 3 frames" (Direção de arte, beat 6): mesma convenção do SHOCK_MS de KokusenFx. */
const SPHERE_MS = FRAME_MS * 3;
const SHOCK_RING_MS = 220;
const DEBRIS_COUNT = 14;
const DEBRIS_MS = 380;
/** RED-12: a tela pisca vermelho por exatamente 80 ms. */
const SCREEN_FLASH_MS = 80;
/** RED-17: a câmera treme por exatamente 200 ms. */
const SHAKE_MS = 200;
const SHAKE_INTENSITY = 0.02;

/**
 * Vistas do Vermelho (RED-02/03/04/07/11/12/17): carga (orbe crescendo + faíscas expelidas + anel de brilho +
 * poeira empurrada), voo (rastro + estalos) e detonação (flash + esfera + onda de choque + detritos + tela
 * vermelha + tremida). Só desenha; a física do voo e o dano vivem no `TechRunner`, como o Punho Divergente.
 */
export class RedOrbFx {
  private chargeSprite: Phaser.GameObjects.Sprite | null = null;
  private chargeSize: 4 | 8 | 12 | null = null;
  private sparksOut: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private glowRing: Phaser.GameObjects.Graphics | null = null;
  private glowMs = 0;
  private dustMs = 0;
  private trailMs = 0;
  private crackleMs = 0;
  private readonly screenFlash: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
  ) {
    this.screenFlash = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, PALETTE.R, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    uiLayer.add(this.screenFlash);
  }

  /** Ponta dos dedos (Direção de arte, "Selo"/"Carga"): mesmo offset usado para nascer e para lançar o orbe. */
  fingertip(playerX: number, playerY: number, facing: 1 | -1): Vec2 {
    return { x: playerX + RED_FINGERTIP_OFFSET.x * facing, y: playerY + RED_FINGERTIP_OFFSET.y };
  }

  /** RED-02/03/04: orbe crescendo (4→8→12), faíscas expelidas, anel de brilho pulsando e poeira nos pés. */
  chargeUpdate(dtMs: number, playerX: number, playerY: number, facing: 1 | -1, elapsedMs: number, chargeMs: number): void {
    const size = RedOrbState.chargeFrame(elapsedMs, chargeMs);
    const { x, y } = this.fingertip(playerX, playerY, facing);
    this.fx.add('red.orb', Math.max(dtMs, 1), 'game');
    this.fx.add('red.sparksOut', Math.max(dtMs, 1), 'game');
    this.fx.add('red.glowRing', Math.max(dtMs, 1), 'game');
    this.fx.add('red.dustPush', Math.max(dtMs, 1), 'game');

    if (!this.chargeSprite) {
      this.chargeSprite = this.scene.add.sprite(x, y, CHARGE_TEX[size], 'orb').setDepth(2);
      this.registry.add(this.chargeSprite);
    }
    if (this.chargeSize !== size) {
      this.chargeSize = size;
      this.chargeSprite.setTexture(CHARGE_TEX[size], 'orb');
    }
    this.chargeSprite.setPosition(x, y);

    if (!this.sparksOut) {
      // RED-04: nascem no centro e o ângulo cheio (0-360) já as manda radialmente para fora dele.
      this.sparksOut = this.scene.add
        .particles(x, y, TEX.techSpark, {
          frame: 'redOut',
          angle: { min: 0, max: 360 },
          speed: { min: 30, max: 90 },
          lifespan: 320,
          alpha: { start: 1, end: 0 },
          maxAliveParticles: SPARKS_OUT_MAX, // TFX-04
          frequency: 20,
        })
        .setDepth(2);
      this.registry.add(this.sparksOut);
    }
    this.sparksOut.setPosition(x, y);

    if (!this.glowRing) {
      this.glowRing = this.scene.add.graphics().setDepth(1);
      this.registry.add(this.glowRing);
      this.glowMs = 0;
    }
    this.glowMs += dtMs;
    const pulse = 1 + 0.18 * Math.sin(this.glowMs / 90);
    this.glowRing.clear().lineStyle(2, PALETTE.a, 0.7).strokeCircle(x, y, (size / 2 + 5) * pulse);

    this.dustMs += dtMs;
    if (this.dustMs >= DUST_EVERY_MS) {
      this.dustMs -= DUST_EVERY_MS;
      const dust = this.scene.add
        .particles(playerX + 4 * facing, playerY + 16, TEX.fxBit, {
          frame: 'dust',
          angle: { min: 150, max: 210 },
          speed: { min: 20, max: 50 },
          lifespan: 260,
          alpha: { start: 0.8, end: 0 },
          emitting: false,
        })
        .setDepth(1);
      dust.explode(4);
      this.registry.add(dust);
      this.registry.scheduleDestroy(dust, 300);
    }
  }

  /** Fora de sign/charge do Vermelho: some a carga (a técnica foi cancelada ou terminou a soltura). */
  hideCharge(): void {
    if (this.chargeSprite) {
      this.registry.scheduleDestroy(this.chargeSprite, 0);
      this.chargeSprite = null;
      this.chargeSize = null;
    }
    if (this.sparksOut) {
      this.registry.scheduleDestroy(this.sparksOut, 0);
      this.sparksOut = null;
    }
    if (this.glowRing) {
      this.registry.scheduleDestroy(this.glowRing, 0);
      this.glowRing = null;
    }
  }

  /** RED-07: rastro (cópias do orbe some sozinhas) e estalos (faíscas curtas) durante o voo. */
  flightUpdate(dtMs: number, x: number, y: number): void {
    this.fx.add('red.trail', Math.max(dtMs, 1), 'game');
    this.fx.add('red.crackle', Math.max(dtMs, 1), 'game');
    this.trailMs += dtMs;
    if (this.trailMs >= TRAIL_EVERY_MS) {
      this.trailMs -= TRAIL_EVERY_MS;
      const ghost = this.scene.add.sprite(x, y, TEX.techOrbRed12, 'orb').setAlpha(0.5).setDepth(2);
      this.registry.add(ghost);
      this.registry.scheduleDestroy(ghost, TRAIL_FADE_MS);
      this.scene.tweens.add({ targets: ghost, alpha: 0, duration: TRAIL_FADE_MS });
    }
    this.crackleMs += dtMs;
    if (this.crackleMs >= CRACKLE_EVERY_MS) {
      this.crackleMs -= CRACKLE_EVERY_MS;
      const crackle = this.scene.add
        .particles(x, y, TEX.techSpark, {
          frame: 'redOut',
          angle: { min: 0, max: 360 },
          speed: { min: 20, max: 50 },
          lifespan: 180,
          alpha: { start: 1, end: 0 },
          emitting: false,
        })
        .setDepth(2);
      crackle.explode(3);
      this.registry.add(crackle);
      this.registry.scheduleDestroy(crackle, 250);
    }
  }

  /** RED-11/12/17: flash do núcleo, esfera expandindo, onda de choque, detritos, tela vermelha e tremida. */
  detonate(point: Vec2, _facing: 1 | -1): void {
    this.fx.add('red.flashCore', FLASH_CORE_MS, 'game');
    this.fx.add('red.sphere', SPHERE_MS, 'game');
    this.fx.add('red.shockRing', SHOCK_RING_MS, 'game');
    this.fx.add('red.debris', DEBRIS_MS, 'game');
    this.fx.add('red.screenFlash', SCREEN_FLASH_MS, 'game'); // RED-12

    const flash = this.scene.add.sprite(point.x, point.y, TEX.techOrbRed12, 'orb').setTintFill(PALETTE.W).setScale(1.3).setDepth(5);
    this.registry.add(flash);
    this.registry.scheduleDestroy(flash, FLASH_CORE_MS);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 0.5, duration: FLASH_CORE_MS });

    const sphere = this.scene.add.graphics().setDepth(4);
    this.registry.add(sphere);
    this.registry.scheduleDestroy(sphere, SPHERE_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SPHERE_MS,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        sphere.clear().fillStyle(PALETTE.R, 0.7 * (1 - t)).fillCircle(point.x, point.y, 4 + t * 26);
      },
    });

    const shock = this.scene.add.graphics().setDepth(4);
    this.registry.add(shock);
    this.registry.scheduleDestroy(shock, SHOCK_RING_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SHOCK_RING_MS,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        shock.clear().lineStyle(3, PALETTE.W, 1 - t).strokeCircle(point.x, point.y, 6 + t * 90);
      },
    });

    const debris = this.scene.add
      .particles(point.x, point.y, TEX.techSpark, {
        frame: 'redOut',
        angle: { min: 0, max: 360 },
        speed: { min: 60, max: 180 },
        lifespan: DEBRIS_MS,
        alpha: { start: 1, end: 0 },
        gravityY: 240,
        emitting: false,
      })
      .setDepth(4);
    debris.explode(DEBRIS_COUNT); // TFX-04: bem abaixo de 64
    this.registry.add(debris);
    this.registry.scheduleDestroy(debris, DEBRIS_MS);

    this.screenFlash.setFillStyle(PALETTE.R, 0.4).setVisible(true);
    this.scene.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration: SCREEN_FLASH_MS,
      onComplete: () => this.screenFlash.setVisible(false).setAlpha(1),
    });

    this.scene.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY); // RED-17
  }
}
