import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Vec2 } from '../../core/hit';
import { lightningBolts } from '../../core/lightning';
import { KOKUSEN } from '../../data/techniques';
import type { Hittable } from '../bodyTags';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

/** Um frame a 60 fps, para contar "2 frames"/"3 frames"/"4 frames" da Direção de arte em tempo real (L-003). */
const FRAME_MS = 1000 / 60;
/** KOK-21: os raios são redesenhados a cada 2 frames durante o congelamento. */
const BOLT_REGEN_MS = FRAME_MS * 2;
/** "onda de choque branco expande em 3 frames" (Direção de arte, beat 5). */
const SHOCK_MS = FRAME_MS * 3;
/** TFX-04: até 64 partículas vivas por emissor; bem abaixo disso chega ao efeito pedido. */
const SPARK_COUNT = 20;
const SPARK_MS = 260;
/** Tamanho do cartão 黒閃 (Direção de arte: "grande no centro da tela"). */
const KANJI_SIZE = 84;
const CARD_GAP = 4;
const STREAK_GAP = 10;
const CARD_DEPTH = 210;
/** Zona (KOK-27): faíscas discretas ao redor do player, uma emissão curta a cada intervalo. */
const ZONE_SPARK_EVERY_MS = 220;

/** Base preta (`b`) e alvo vermelho (`R`) do duotom (KOK-15, TFX-08): luminância → mistura das duas cores. */
const DUOTONE_BASE = PALETTE.b;
const DUOTONE_TARGET = PALETTE.R;
const LUM_R = 0.213;
const LUM_G = 0.715;
const LUM_B = 0.072;

/**
 * Matriz 5x4 (`ColorMatrix.set`, formato de `src/display/ColorMatrix.js`) que mapeia a luminância de cada pixel
 * para uma mistura linear entre `base` e `target`: como luminância já é uma combinação linear de R/G/B, a mistura
 * também é linear e cabe inteira numa única matriz (sem shader novo, decisão do design.md). As colunas de viés (a
 * 5ª de cada linha) ficam em 0–255 porque é assim que `ColorMatrix.getData` as lê (divide por 255 internamente).
 */
function duotoneMatrix(base: number, target: number): number[] {
  // m0..m2 multiplicam R/G/B já normalizados (0-1): por isso dividem por 255 também (só o viés m4 fica em 0-255,
  // que é como `ColorMatrix.getData` o lê).
  const row = (b: number, t: number): number[] => [
    (LUM_R * (t - b)) / 255,
    (LUM_G * (t - b)) / 255,
    (LUM_B * (t - b)) / 255,
    0,
    b,
  ];
  const channel = (hex: number, shift: number): number => (hex >> shift) & 0xff;
  return [
    ...row(channel(base, 16), channel(target, 16)), // R
    ...row(channel(base, 8), channel(target, 8)), // G
    ...row(channel(base, 0), channel(target, 0)), // B
    0,
    0,
    0,
    1,
    0, // A: identidade
  ];
}

/** Direção (Vec2 inteiro) do soco na hora do Kokusen, para o leque dos raios/faíscas (KOK-18, TFX-02). */
const facingDir = (facing: 1 | -1): Vec2 => ({ x: facing, y: 0 });

/**
 * Cinema do Kokusen (KOK-14..27, TFX-06/10/11): tudo em tempo real (`FxClock: 'real'`), continua durante o
 * hitstop de 220 ms que o próprio Kokusen disparou (design "Dois relógios"). `trigger` dispara uma vez, no frame
 * em que o Kokusen acerta; `update` roda todo frame (mesmo congelado, TFX-05) e avança as fases; `zoneAura` roda
 * só fora do congelamento, junto do resto do jogo (KOK-27, zona liga/desliga como qualquer outra camada `game`).
 */
export class KokusenFx {
  /** TFX-11: sem WebGL, nenhum postFX é criado (TFX-06) e o snapshot reporta isto. */
  readonly degraded: boolean;
  private readonly colorMatrix: Phaser.FX.ColorMatrix | null;

  private phase: 'idle' | 'invert' | 'duotone' = 'idle';
  private phaseElapsedMs = 0;
  private target: Hittable | null = null;

  private boltsGfx: Phaser.GameObjects.Graphics | null = null;
  private boltsActive = false;
  private boltSeed = 0;
  private boltRegenMs = 0;
  private boltOrigin: Vec2 = { x: 0, y: 0 };
  private boltDir: Vec2 = { x: 1, y: 0 };
  private wasFrozen = false;
  private boltsTailMs = 0;

  private shockGfx: Phaser.GameObjects.Graphics | null = null;
  private shockElapsedMs = 0;
  private shockOrigin: Vec2 = { x: 0, y: 0 };

  private readonly cardKuro: Phaser.GameObjects.Sprite;
  private readonly cardSen: Phaser.GameObjects.Sprite;
  private readonly cardCover: Phaser.GameObjects.Rectangle;
  private readonly cardStreakText: Phaser.GameObjects.Text;
  private cardElapsedMs = 0;
  private cardActive = false;
  private cardStreak = 0;

  private zoneSparkMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
  ) {
    this.degraded = scene.game.renderer.type !== Phaser.WEBGL; // TFX-06/11
    this.colorMatrix = this.degraded ? null : scene.cameras.main.postFX.addColorMatrix();

    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    const cardW = KANJI_SIZE * 2 + CARD_GAP;
    const left = cx - cardW / 2;
    this.cardKuro = scene.add
      .sprite(left, cy, TEX.kanji, 'kuro')
      .setOrigin(0, 0.5)
      .setDisplaySize(KANJI_SIZE, KANJI_SIZE)
      .setVisible(false);
    this.cardSen = scene.add
      .sprite(left + KANJI_SIZE + CARD_GAP, cy, TEX.kanji, 'sen')
      .setOrigin(0, 0.5)
      .setDisplaySize(KANJI_SIZE, KANJI_SIZE)
      .setVisible(false);
    // KOK-25: revelado da esquerda para a direita - uma cortina opaca que encolhe por cima do cartão já desenhado.
    this.cardCover = scene.add.rectangle(left + cardW, cy, 0, KANJI_SIZE, PALETTE.b, 1).setOrigin(1, 0.5).setVisible(false);
    this.cardStreakText = scene.add
      .text(left + cardW + STREAK_GAP, cy, '', { fontFamily: 'monospace', fontSize: '28px', color: '#ff3344' })
      .setOrigin(0, 0.5)
      .setVisible(false);
    for (const o of [this.cardKuro, this.cardSen, this.cardCover, this.cardStreakText]) o.setScrollFactor(0).setDepth(CARD_DEPTH);
    uiLayer.add([this.cardKuro, this.cardSen, this.cardCover, this.cardStreakText]);
  }

  /** KOK-06..28: chamado uma vez, no frame em que o Kokusen acerta. */
  trigger(target: Hittable, point: Vec2, facing: 1 | -1, streak: number): void {
    this.teardownBolts();
    this.teardownShock();
    target.fxSprite?.clearTint();

    this.phase = 'invert';
    this.phaseElapsedMs = 0;
    this.target = target;
    this.fx.add('kokusen.invert', KOKUSEN.invertMs, 'real'); // KOK-14
    if (!this.degraded) this.colorMatrix!.negative();
    target.fxSprite?.setTintFill(PALETTE.b); // KOK-16

    this.boltsActive = true;
    this.boltRegenMs = 0;
    this.boltSeed = Math.floor(point.x * 7 + point.y * 13 + streak);
    this.boltOrigin = { x: point.x, y: point.y };
    this.boltDir = facingDir(facing);
    this.wasFrozen = false;
    this.boltsTailMs = 0;
    this.boltsGfx = this.scene.add.graphics().setDepth(6);
    this.registry.add(this.boltsGfx);
    this.redrawBolts();

    this.spawnSparksAndShock(point, facing);

    this.cardActive = true;
    this.cardElapsedMs = 0;
    this.cardStreak = streak;
    this.cardCover.width = KANJI_SIZE * 2 + CARD_GAP;
    for (const o of [this.cardKuro, this.cardSen, this.cardCover]) o.setVisible(true);
    this.cardStreakText.setText(streak >= 2 ? `×${streak}` : '').setVisible(streak >= 2); // KOK-26

    const cam = this.scene.cameras.main;
    cam.zoomTo(KOKUSEN.zoomPeak, KOKUSEN.zoomInMs, 'Linear', true, (_cam, progress) => {
      if (progress >= 1) cam.zoomTo(1.5, KOKUSEN.zoomOutMs, 'Linear', true); // KOK-24
    });
    cam.shake(KOKUSEN.hitstopMs, 0.012); // "tremida forte" (Direção de arte, beat 6)
  }

  /** TFX-05: roda todo frame, inclusive congelado - só estas camadas (mais o cartão) andam durante o hitstop. */
  update(realDtMs: number, frozenNow: boolean): void {
    this.updateInvertDuotone(realDtMs);
    this.updateBolts(realDtMs, frozenNow);
    this.updateShock(realDtMs);
    this.updateCard(realDtMs);
  }

  private updateInvertDuotone(realDtMs: number): void {
    if (this.phase === 'idle') return;
    this.phaseElapsedMs += realDtMs;
    if (this.phase === 'invert' && this.phaseElapsedMs >= KOKUSEN.invertMs) {
      this.phase = 'duotone';
      this.fx.add('kokusen.duotone', KOKUSEN.duotoneMs, 'real'); // KOK-15
      this.target?.fxSprite?.clearTint(); // KOK-16: silhueta só durante o negativo
      if (!this.degraded) this.colorMatrix!.set(duotoneMatrix(DUOTONE_BASE, DUOTONE_TARGET));
    } else if (this.phase === 'duotone' && this.phaseElapsedMs >= KOKUSEN.invertMs + KOKUSEN.duotoneMs) {
      this.phase = 'idle';
      this.target = null;
      if (!this.degraded) this.colorMatrix!.reset();
    }
  }

  private updateBolts(realDtMs: number, frozenNow: boolean): void {
    if (!this.boltsActive) return;
    if (frozenNow) {
      // KOK-21: só regenera com seed nova enquanto o hitstop está ativo.
      this.boltRegenMs += realDtMs;
      if (this.boltRegenMs >= BOLT_REGEN_MS) {
        this.boltRegenMs -= BOLT_REGEN_MS;
        this.boltSeed += 1;
        this.redrawBolts();
      }
    } else if (this.wasFrozen) {
      this.boltsTailMs = KOKUSEN.boltsAfterMs; // KOK-17: hitstop acabou agora - começa a contagem de 150 ms.
    } else {
      this.boltsTailMs -= realDtMs;
      if (this.boltsTailMs <= 0) {
        this.boltsActive = false;
        this.teardownBolts();
        return;
      }
    }
    this.wasFrozen = frozenNow;
    this.fx.add('kokusen.bolts', Math.max(realDtMs, 1), 'real'); // KOK-17
  }

  private redrawBolts(): void {
    if (!this.boltsGfx) return;
    const bolts = lightningBolts(this.boltSeed, this.boltOrigin, this.boltDir); // KOK-18..20, 33
    this.boltsGfx.clear();
    for (const bolt of bolts) this.boltsGfx.lineStyle(6, PALETTE.R, 1).strokePoints(bolt.vertices, false); // KOK-22 borda
    for (const bolt of bolts) this.boltsGfx.lineStyle(2, PALETTE.b, 1).strokePoints(bolt.vertices, false); // KOK-22 traço
  }

  private teardownBolts(): void {
    if (!this.boltsGfx) return;
    this.registry.scheduleDestroy(this.boltsGfx, 0);
    this.boltsGfx = null;
    this.boltsActive = false;
  }

  private spawnSparksAndShock(point: Vec2, facing: 1 | -1): void {
    this.fx.add('kokusen.sparks', SHOCK_MS, 'real'); // KOK-23
    this.fx.add('kokusen.shock', SHOCK_MS, 'real'); // KOK-23
    const baseAngle = facing > 0 ? 0 : 180;
    const emitter = this.scene.add
      .particles(point.x, point.y, TEX.techSpark, {
        frame: 'kokusen',
        angle: { min: baseAngle - 55, max: baseAngle + 55 },
        speed: { min: 90, max: 220 },
        lifespan: SPARK_MS,
        alpha: { start: 1, end: 0 },
        gravityY: 200,
        emitting: false,
      })
      .setDepth(6);
    emitter.explode(SPARK_COUNT); // TFX-04: bem abaixo de 64
    this.registry.add(emitter);
    this.registry.scheduleDestroy(emitter, SPARK_MS + FRAME_MS * 2); // TFX-03

    this.shockElapsedMs = 0;
    this.shockOrigin = point;
    this.shockGfx = this.scene.add.graphics().setDepth(6);
    this.registry.add(this.shockGfx);
    this.registry.scheduleDestroy(this.shockGfx, SHOCK_MS);
  }

  private updateShock(realDtMs: number): void {
    if (!this.shockGfx) return;
    this.shockElapsedMs += realDtMs;
    const t = Math.min(1, this.shockElapsedMs / SHOCK_MS);
    if (t >= 1) {
      this.teardownShock();
      return;
    }
    const radius = 4 + t * 36;
    this.shockGfx.clear().lineStyle(3, PALETTE.W, 1 - t).strokeCircle(this.shockOrigin.x, this.shockOrigin.y, radius);
  }

  private teardownShock(): void {
    if (!this.shockGfx) return;
    this.shockGfx = null;
  }

  private updateCard(realDtMs: number): void {
    if (!this.cardActive) return;
    this.cardElapsedMs += realDtMs;
    const frac = Math.min(1, this.cardElapsedMs / KOKUSEN.cardMs);
    this.cardCover.width = (KANJI_SIZE * 2 + CARD_GAP) * (1 - frac); // KOK-25: cortina encolhendo da direita
    if (frac >= 1) {
      this.cardActive = false;
      for (const o of [this.cardKuro, this.cardSen, this.cardCover, this.cardStreakText]) o.setVisible(false);
    }
  }

  /** KOK-27: aura preta com faíscas vermelhas no player, discreta, enquanto a zona está ativa. */
  zoneAura(dtMs: number, active: boolean, x: number, y: number): void {
    if (!active) {
      this.zoneSparkMs = 0;
      return;
    }
    this.fx.add('kokusen.zoneAura', Math.max(dtMs, 1), 'game');
    this.zoneSparkMs += dtMs;
    if (this.zoneSparkMs < ZONE_SPARK_EVERY_MS) return;
    this.zoneSparkMs -= ZONE_SPARK_EVERY_MS;
    const emitter = this.scene.add
      .particles(x, y - 12, TEX.techSpark, {
        frame: 'kokusen',
        angle: { min: 0, max: 360 },
        speed: { min: 10, max: 30 },
        lifespan: 260,
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(2);
    emitter.explode(4); // discreta (TFX-04 folga ampla)
    this.registry.add(emitter);
    this.registry.scheduleDestroy(emitter, 300);
  }

  /** `hud.kokusenCard` do snapshot (KOK-25/26). */
  cardDebug(): { streak: number } | null {
    return this.cardActive ? { streak: this.cardStreak } : null;
  }
}
