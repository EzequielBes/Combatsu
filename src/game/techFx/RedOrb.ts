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
/** Polimento (feat(fx)): "flash branco no núcleo (1-2 frames)" - era 100 ms (6 frames), tempo demais para um flash. */
const FLASH_CORE_MS = FRAME_MS * 2;
/** "esfera vermelha expandindo em 3 frames" (Direção de arte, beat 6): mesma convenção do SHOCK_MS de KokusenFx. */
const SPHERE_MS = FRAME_MS * 3;
/** Polimento: a esfera cresce até o raio real do dano (RED-10, redOrb.ts DETONATION_RADIUS) - antes parava em 30 px. */
const SPHERE_MAX_RADIUS = 96;
/** Polimento: onda de choque GROSSA (Direção de arte) e mais demorada, passando bem além do raio de dano. */
const SHOCK_RING_MS = 280;
const SHOCK_RING_MAX_RADIUS = 160;
const SHOCK_RING_THICK_OUT = 6;
const SHOCK_RING_THICK_IN = 4;
const EMBER_DEBRIS_COUNT = 22; // TFX-04: bem abaixo de 64
const DEBRIS_MS = 420;
/** Polimento: detritos do chão (pedaços `k`/`s`), simulados à mão (sem body Matter) num único Graphics. */
const CHUNK_DEBRIS_COUNT = 9;
const CHUNK_GRAVITY = 500; // px/s^2
const SMOKE_COUNT = 10;
const SMOKE_MS = 560;
/** RED-12: a tela pisca vermelho por exatamente 80 ms. */
const SCREEN_FLASH_MS = 80;
/** RED-17: a câmera treme por exatamente 200 ms. */
const SHAKE_MS = 200;
const SHAKE_INTENSITY = 0.02;

/** Snap para a grade de 2 px (AD-009/TFX-02): geometria procedural sempre em texels pares. */
const evenPx = (v: number): number => Math.round(v / 2) * 2;

interface ChunkDebris {
  readonly vx: number;
  readonly vy: number;
  readonly size: number;
  readonly color: number;
}

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
      // Polimento (feat(fx)): mais rápidas e maiores ("bem visíveis", Direção de arte) - eram quase invisíveis.
      this.sparksOut = this.scene.add
        .particles(x, y, TEX.techSpark, {
          frame: 'redOut',
          angle: { min: 0, max: 360 },
          speed: { min: 60, max: 160 },
          lifespan: 260,
          scale: { start: 1.6, end: 0.6 },
          alpha: { start: 1, end: 0 },
          maxAliveParticles: SPARKS_OUT_MAX, // TFX-04
          frequency: 12,
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
      // Polimento (feat(fx)): riscos esticados no eixo do voo (Direção de arte "rastro de riscos vermelhos"),
      // não só cópias redondas do orbe - `scaleX` maior estica a mesma textura num risco horizontal.
      const ghost = this.scene.add.sprite(x, y, TEX.techOrbRed12, 'orb').setAlpha(0.55).setScale(1.6, 0.8).setDepth(2);
      this.registry.add(ghost);
      this.registry.scheduleDestroy(ghost, TRAIL_FADE_MS);
      this.scene.tweens.add({ targets: ghost, alpha: 0, scaleX: 0.6, duration: TRAIL_FADE_MS });
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

  /**
   * RED-11/12/17: flash do núcleo → esfera (núcleo branco, corpo vermelho, borda escura) expandindo até o raio
   * real do dano (96 px, RED-10) → onda de choque grossa (branca por dentro do vermelho) indo além → detritos do
   * chão (`k`/`s`) mais fumaça → tela vermelha por 80 ms → tremida de 200 ms (Direção de arte, beat 6).
   */
  detonate(point: Vec2, _facing: 1 | -1): void {
    this.fx.add('red.flashCore', FLASH_CORE_MS, 'game');
    this.fx.add('red.sphere', SPHERE_MS, 'game');
    this.fx.add('red.shockRing', SHOCK_RING_MS, 'game');
    this.fx.add('red.debris', DEBRIS_MS, 'game');
    this.fx.add('red.screenFlash', SCREEN_FLASH_MS, 'game'); // RED-12

    const flash = this.scene.add.sprite(point.x, point.y, TEX.techOrbRed12, 'orb').setTintFill(PALETTE.W).setScale(1.6).setDepth(6);
    this.registry.add(flash);
    this.registry.scheduleDestroy(flash, FLASH_CORE_MS);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 0.8, duration: FLASH_CORE_MS });

    // Esfera: 3 camadas concêntricas (fora -> dentro) - borda escura `k`, corpo `R`, núcleo `W` encolhendo (o
    // flash inicial que "vira" o corpo vermelho conforme a esfera cresce até os 96 px do dano real, RED-10).
    const sphere = this.scene.add.graphics().setDepth(4);
    this.registry.add(sphere);
    this.registry.scheduleDestroy(sphere, SPHERE_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SPHERE_MS,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const r = evenPx(8 + t * (SPHERE_MAX_RADIUS - 8));
        const coreR = evenPx(Math.max(0, r * 0.5 * (1 - t)));
        sphere
          .clear()
          .fillStyle(PALETTE.k, 0.85 * (1 - t))
          .fillCircle(point.x, point.y, r + 4)
          .fillStyle(PALETTE.R, 0.9 - t * 0.2)
          .fillCircle(point.x, point.y, r)
          .fillStyle(PALETTE.W, Math.max(0, 1 - t * 1.6))
          .fillCircle(point.x, point.y, coreR);
      },
    });

    // Onda de choque: anel GROSSO (4-6 px, Direção de arte) - branco por baixo, vermelho por cima e mais fino,
    // deixando 1-2 px de borda branca visível nos dois lados (mesma técnica de "contorno" das outras vistas).
    const shock = this.scene.add.graphics().setDepth(4);
    this.registry.add(shock);
    this.registry.scheduleDestroy(shock, SHOCK_RING_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SHOCK_RING_MS,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const r = evenPx(20 + t * (SHOCK_RING_MAX_RADIUS - 20));
        const a = 1 - t;
        shock
          .clear()
          .lineStyle(SHOCK_RING_THICK_OUT, PALETTE.W, a)
          .strokeCircle(point.x, point.y, r)
          .lineStyle(SHOCK_RING_THICK_IN, PALETTE.R, a)
          .strokeCircle(point.x, point.y, r);
      },
    });

    // Detritos-faísca (embers): a mesma faísca `redOut`, em mais quantidade e maior, para o "estouro" ficar denso.
    const embers = this.scene.add
      .particles(point.x, point.y, TEX.techSpark, {
        frame: 'redOut',
        angle: { min: 0, max: 360 },
        speed: { min: 80, max: 220 },
        lifespan: DEBRIS_MS,
        scale: { start: 1.4, end: 0.4 },
        alpha: { start: 1, end: 0 },
        gravityY: 260,
        emitting: false,
      })
      .setDepth(4);
    embers.explode(EMBER_DEBRIS_COUNT); // TFX-04: bem abaixo de 64
    this.registry.add(embers);
    this.registry.scheduleDestroy(embers, DEBRIS_MS);

    // Detritos do chão (pedaços `k`/`s`, Direção de arte): sem particle system (só 2 cores fixas por peça, cada
    // uma com seu próprio tamanho) - um único Graphics simula a queda de cada pedaço à mão (sem body Matter).
    const chunks: ChunkDebris[] = Array.from({ length: CHUNK_DEBRIS_COUNT }, (_, i) => {
      const angle = (Math.PI * (i / CHUNK_DEBRIS_COUNT) * 2) + Math.random() * 0.6 - 0.9; // espalhado, tendendo para cima
      const speed = 70 + Math.random() * 110;
      return {
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 40,
        size: evenPx(2 + Math.round(Math.random())) || 2,
        color: i % 2 === 0 ? PALETTE.k : PALETTE.s,
      };
    });
    const debris = this.scene.add.graphics().setDepth(4);
    this.registry.add(debris);
    this.registry.scheduleDestroy(debris, DEBRIS_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: DEBRIS_MS,
      duration: DEBRIS_MS,
      onUpdate: (tw) => {
        const elapsedMs = tw.getValue() ?? 0;
        const tSec = elapsedMs / 1000;
        const a = 1 - elapsedMs / DEBRIS_MS;
        debris.clear();
        for (const c of chunks) {
          const px = evenPx(point.x + c.vx * tSec);
          const py = evenPx(point.y + c.vy * tSec + 0.5 * CHUNK_GRAVITY * tSec * tSec);
          debris.fillStyle(c.color, a).fillRect(px - c.size / 2, py - c.size / 2, c.size, c.size);
        }
      },
    });

    // Fumaça (Direção de arte, beat 6): rajada curta com a textura genérica `smoke`, sem tint (ART-01).
    const smoke = this.scene.add
      .particles(point.x, point.y, TEX.smoke, {
        frame: 'smoke',
        speed: { min: 20, max: 70 },
        angle: { min: 200, max: 340 },
        lifespan: SMOKE_MS,
        scale: { start: 1.6, end: 0.4 },
        alpha: { start: 0.55, end: 0 },
        emitting: false,
      })
      .setDepth(3);
    smoke.explode(SMOKE_COUNT);
    this.registry.add(smoke);
    this.registry.scheduleDestroy(smoke, SMOKE_MS);

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
