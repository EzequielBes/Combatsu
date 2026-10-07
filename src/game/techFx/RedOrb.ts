import { UI_SIZE } from '../art/hd/screen';
import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { RedOrbState } from '../../core/redOrb';
import type { Vec2 } from '../../core/hit';
import { fingertipOffsetPx } from '../art/sprites/playerTech';
import { HD_ON } from '../art/hd/flag';
import { hdAnchors } from '../art/hd/sheet';
import {
  DEBRIS_MS,
  FLASH_CORE_MS,
  RED_COLORS as C,
  SHOCK_RING_MS,
  SPHERE_MS,
  evenPx,
  redDetonationBurst,
} from './redDetonation';
import { DISTORT_PERIOD_MS, REPULSE_MS, TRAIL_EVERY_MS, TRAIL_FADE_MS } from './redTiming';
import { TEX } from '../textures';

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
/** RED-12 / RDA-15: a tela pisca carmim por exatamente 80 ms. */
const SCREEN_FLASH_MS = 80;
/** RED-17: a câmera treme por exatamente 200 ms. */
const SHAKE_MS = 200;
const SHAKE_INTENSITY = 0.02;
/** RDA-10: o cone da repulsão alcança 80 px à frente (duração em `redTiming`). */
const REPULSE_REACH_PX = 80;

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
    this.chargeOrb(x, y, size);
    this.chargeSparks(x, y);
    this.chargeGlowRing(dtMs, x, y, size);
    this.chargeDistortRing(dtMs, x, y, size);
    this.chargeDust(dtMs, playerX, playerY, facing);
  }

  private chargeOrb(x: number, y: number, size: 4 | 8 | 12): void {
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
  }

  private chargeSparks(x: number, y: number): void {
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
  }

  private chargeGlowRing(dtMs: number, x: number, y: number, size: number): void {
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
  }

  /** RDA-07: dois arcos `T` opostos girando em volta do orbe (2π a cada 400 ms). */
  private chargeDistortRing(dtMs: number, x: number, y: number, size: number): void {
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
  }

  private chargeDust(dtMs: number, playerX: number, playerY: number, facing: 1 | -1): void {
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
    redDetonationBurst(this.scene, this.registry, point);
    this.detonateScreen();
  }

  /** Tela vermelha por 80 ms (RED-12) e tremida de 200 ms (RED-17). */
  private detonateScreen(): void {
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
