import { UI_SIZE } from '../art/hd/screen';
import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { RedOrbState } from '../../core/redOrb';
import type { Vec2 } from '../../core/hit';
import { PALETTE } from '../art/palette';
import { fingertipOffsetPx } from '../art/sprites/playerTech';
import { HD_ON } from '../art/hd/flag';
import { hdAnchors } from '../art/hd/sheet';
import { RED_FX_COLORS } from './redPalette';
import { DISTORT_PERIOD_MS, FRAME_MS, REPULSE_MS, TRAIL_EVERY_MS, TRAIL_FADE_MS } from './redTiming';
import { TEX } from '../textures';

/** Cores do efeito, sempre lidas de `RED_FX_COLORS` (RDA-03/14): nunca `a`/`A`. */
const C = {
  core: PALETTE[RED_FX_COLORS.core],
  glow: PALETTE[RED_FX_COLORS.glow],
  ring: PALETTE[RED_FX_COLORS.ring],
  edge: PALETTE[RED_FX_COLORS.edge],
  shadow: PALETTE[RED_FX_COLORS.shadow],
  flash: PALETTE[RED_FX_COLORS.flash],
};

/**
 * Frame usado para achar a ponta dos dedos quando o player não está num frame sign/charge/release do Vermelho
 * (ex.: o frame de transição, um tick antes da pose trocar): o `vermelho-charge`, o do braço esticado mais comum.
 */
const FALLBACK_FINGERTIP_FRAME = 'vermelho-charge';

/** Textura do orbe por tamanho de carga (RED-02). */
const CHARGE_TEX: Record<4 | 8 | 12, string> = { 4: TEX.techOrbRed4, 8: TEX.techOrbRed8, 12: TEX.techOrbRed12 };

const SPARKS_OUT_MAX = 40; // TFX-04: bem abaixo de 64
const DUST_EVERY_MS = 150;
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
/** RED-12 / RDA-15: a tela pisca carmim por exatamente 80 ms. */
const SCREEN_FLASH_MS = 80;
/** RED-17: a câmera treme por exatamente 200 ms. */
const SHAKE_MS = 200;
const SHAKE_INTENSITY = 0.02;
/** RDA-10: o cone da repulsão alcança 80 px à frente (duração em `redTiming`). */
const REPULSE_REACH_PX = 80;

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
  /** RDA-06 / EDG-01 / AD-009: sem WebGL, nenhum filtro (Glow) é criado e o resto do efeito toca igual. */
  private readonly degraded: boolean;
  private glowFx: Phaser.Filters.Glow | null = null;
  private distortRing: Phaser.GameObjects.Graphics | null = null;
  private distortMs = 0;
  private screenFlashColor: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
  ) {
    this.degraded = scene.game.renderer.type !== Phaser.WEBGL;
    this.screenFlash = scene.add
      .rectangle(0, 0, UI_SIZE.w, UI_SIZE.h, C.flash, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    uiLayer.add(this.screenFlash);
  }

  /**
   * Ponta dos dedos do frame atual do player (RDA-04): mesma âncora para nascer, carregar e lançar o orbe. Fora de
   * um frame sign/charge/release do Vermelho (transição), usa o do `vermelho-charge`.
   */
  fingertip(playerX: number, playerY: number, facing: 1 | -1, frameName: string = FALLBACK_FINGERTIP_FRAME): Vec2 {
    // `?hd=1`: a ponta dos dedos sai do quadro HD (o braço do corpo novo fica mais alto que o da arte antiga).
    const hd = HD_ON ? (hdAnchors(frameName) ?? hdAnchors(FALLBACK_FINGERTIP_FRAME)) : undefined;
    if (hd) return { x: playerX + hd.tip.x * facing, y: playerY + hd.tip.y };
    let offset: { x: number; y: number };
    try {
      offset = fingertipOffsetPx(frameName, facing);
    } catch {
      offset = fingertipOffsetPx(FALLBACK_FINGERTIP_FRAME, facing);
    }
    return { x: playerX + offset.x, y: playerY + offset.y };
  }

  /**
   * RED-02/03/04, RDA-04..07: orbe crescendo (4→8→12) na ponta dos dedos do frame atual, faíscas expelidas, anel
   * de brilho `t` pulsando, Glow `t` (só WebGL), dois arcos `T` girando e poeira nos pés.
   */
  chargeUpdate(
    dtMs: number,
    playerX: number,
    playerY: number,
    facing: 1 | -1,
    elapsedMs: number,
    chargeMs: number,
    frameName: string = FALLBACK_FINGERTIP_FRAME,
  ): void {
    const size = RedOrbState.chargeFrame(elapsedMs, chargeMs);
    const { x, y } = this.fingertip(playerX, playerY, facing, frameName);
    this.fx.add('red.orb', Math.max(dtMs, 1), 'game');
    this.fx.add('red.sparksOut', Math.max(dtMs, 1), 'game');
    this.fx.add('red.glowRing', Math.max(dtMs, 1), 'game');
    this.fx.add('red.distortRing', Math.max(dtMs, 1), 'game'); // RDA-07
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
    if (!this.degraded && !this.glowFx) {
      // Phaser 4: o objeto liga os filtros antes de usar. O Glow vai na lista `external` (espaço de tela, como o postFX do
      // Phaser 3): na `internal` o halo é cortado na borda do sprite e medido em texels, ampliado pelo zoom do mundo.
      // Parâmetros: força 4, sem brilho interno, escala 1, qualidade 20 (acertada a olho contra o Phaser 3), 12 px.
      this.chargeSprite.enableFilters();
      this.glowFx = this.chargeSprite.filters!.external.addGlow(C.glow, 4, 0, 1, false, 20, 12); // RDA-06
    }

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
    this.glowRing
      .clear()
      .lineStyle(2, C.glow, 0.7)
      .strokeCircle(x, y, (size / 2 + 5) * pulse);

    // RDA-07: dois arcos `T` opostos girando em volta do orbe (2π a cada 400 ms).
    if (!this.distortRing) {
      this.distortRing = this.scene.add.graphics().setDepth(3);
      this.registry.add(this.distortRing);
      this.distortMs = 0;
    }
    this.distortMs += dtMs;
    const spin = ((this.distortMs % DISTORT_PERIOD_MS) / DISTORT_PERIOD_MS) * Math.PI * 2;
    const ringR = size / 2 + 9;
    this.distortRing
      .clear()
      .lineStyle(2, C.ring, 0.9)
      .beginPath()
      .arc(x, y, ringR, spin, spin + Math.PI * 0.6)
      .strokePath()
      .beginPath()
      .arc(x, y, ringR, spin + Math.PI, spin + Math.PI * 1.6)
      .strokePath();

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
      this.glowFx = null;
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
    if (this.distortRing) {
      this.registry.scheduleDestroy(this.distortRing, 0);
      this.distortRing = null;
    }
  }

  /**
   * RDA-10: cone da repulsão `T`/`t`, 80 px à frente do player, por 120 ms. Só desenha; o dano é de
   * `repulseTargets` (núcleo) aplicado pelo `TechRunner`.
   */
  repulse(origin: Vec2, facing: 1 | -1): void {
    this.fx.add('red.repulse', REPULSE_MS, 'game');
    const cone = this.scene.add.graphics().setDepth(5);
    this.registry.add(cone);
    this.registry.scheduleDestroy(cone, REPULSE_MS);
    const half = 0.55; // meia abertura do cone (rad)
    const tip = { x: origin.x + 4 * facing, y: origin.y };
    const edge = (a: number): Vec2 => ({
      x: evenPx(tip.x + Math.cos(a) * REPULSE_REACH_PX * facing),
      y: evenPx(tip.y + Math.sin(a) * REPULSE_REACH_PX),
    });
    const a = edge(-half);
    const b = edge(half);
    cone
      .fillStyle(C.glow, 0.45)
      .fillTriangle(tip.x, tip.y, a.x, a.y, b.x, b.y)
      .lineStyle(2, C.ring, 0.9)
      .beginPath()
      .moveTo(a.x, a.y)
      .lineTo(tip.x, tip.y)
      .lineTo(b.x, b.y)
      .strokePath();
    this.scene.tweens.add({ targets: cone, alpha: 0, duration: REPULSE_MS });
  }

  /** Estado vivo para o snapshot de debug (RDA-04/05/06/13, EDG-01). */
  debugState(): {
    glowColor: number | null;
    glow: { active: boolean; color: number | null };
    screenFlashColor: number | null;
    orb: { x: number; y: number } | null;
  } {
    return {
      glowColor: this.glowRing ? C.glow : null,
      glow: { active: this.glowFx !== null, color: this.glowFx ? C.glow : null },
      screenFlashColor: this.screenFlashColor,
      orb: this.chargeSprite ? { x: this.chargeSprite.x, y: this.chargeSprite.y } : null,
    };
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
      const ghost = this.scene.add
        .sprite(x, y, TEX.techOrbRed12, 'orb')
        .setTint(C.glow)
        .setTintMode(Phaser.TintModes.FILL)
        .setAlpha(0.55)
        .setScale(1.6, 0.8)
        .setDepth(2);
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

    const flash = this.scene.add
      .sprite(point.x, point.y, TEX.techOrbRed12, 'orb')
      .setTint(C.core)
      .setTintMode(Phaser.TintModes.FILL)
      .setScale(1.6)
      .setDepth(6);
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
          .fillStyle(C.shadow, 0.85 * (1 - t))
          .fillCircle(point.x, point.y, r + 4)
          .fillStyle(C.glow, 0.9 - t * 0.2)
          .fillCircle(point.x, point.y, r)
          .fillStyle(C.core, Math.max(0, 1 - t * 1.6))
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
          .lineStyle(SHOCK_RING_THICK_OUT, C.ring, a)
          .strokeCircle(point.x, point.y, r)
          .lineStyle(SHOCK_RING_THICK_IN, C.glow, a)
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
      const angle = Math.PI * (i / CHUNK_DEBRIS_COUNT) * 2 + Math.random() * 0.6 - 0.9; // espalhado, tendendo para cima
      const speed = 70 + Math.random() * 110;
      return {
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 40,
        size: evenPx(2 + Math.round(Math.random())) || 2,
        color: i % 2 === 0 ? C.shadow : C.glow,
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

    this.screenFlashColor = C.flash; // RDA-13
    this.screenFlash.setFillStyle(C.flash, 0.4).setVisible(true);
    this.scene.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration: SCREEN_FLASH_MS,
      onComplete: () => this.screenFlash.setVisible(false).setAlpha(1),
    });

    this.scene.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY); // RED-17
  }
}
