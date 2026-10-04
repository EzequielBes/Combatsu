import { pts } from '../points';
import { UI_SIZE, zoom } from '../art/hd/screen';
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
/** Folga da faixa de pincelada além do próprio cartão (polimento do KOK-25). */
const INK_PAD = 14;
/** Zona (KOK-27): faíscas discretas ao redor do player, uma emissão curta a cada intervalo. */
const ZONE_SPARK_EVERY_MS = 220;

/**
 * Polígono de uma faixa retangular com bordas onduladas (tipo pincelada), centrada em `(cx, cy)`: em vez de um
 * retângulo limpo, o topo e a base ondulam com uma soma de dois senos (determinístico, sem `Math.random`).
 */
function brushBandPoints(cx: number, cy: number, w: number, h: number): { x: number; y: number }[] {
  const halfW = w / 2;
  const halfH = h / 2;
  const steps = 10;
  const wobble = (i: number): number => Math.sin(i * 2.7 + 1) * 6 + Math.sin(i * 5.3) * 3;
  const top: { x: number; y: number }[] = [];
  const bottom: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = -halfW + (i / steps) * w;
    top.push({ x: cx + x, y: cy - halfH + wobble(i) });
    bottom.push({ x: cx + x, y: cy + halfH - wobble(steps - i) });
  }
  return [...top, ...bottom.reverse()];
}

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
export function duotoneMatrix(base: number, target: number): number[] {
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
  private readonly colorMatrix: Phaser.Filters.ColorMatrix | null;

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

  /** KOK-24: ms reais restantes até a câmera voltar a 1,5 de zoom; `null` fora do zoom-punch. */
  private zoomBackMs: number | null = null;

  private readonly cardKuro: Phaser.GameObjects.Sprite;
  private readonly cardSen: Phaser.GameObjects.Sprite;
  /** Faixa de tinta preta translúcida, bordas irregulares tipo pincelada, atrás do kanji (polimento do KOK-25). */
  private readonly cardInk: Phaser.GameObjects.Graphics;
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
    // Desligado fora do cinema: um filtro ativo, mesmo com a matriz identidade, faz a câmera do mundo compor por
    // framebuffer em todo quadro.
    this.colorMatrix = this.degraded ? null : scene.cameras.main.filters.internal.addColorMatrix().setActive(false);

    const cx = UI_SIZE.w / 2;
    const cy = UI_SIZE.h / 2;
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
    // Polimento (fix(fx)): faixa de pincelada atrás do kanji, bordas irregulares - não mais um retângulo limpo.
    this.cardInk = scene.add
      .graphics()
      .fillStyle(PALETTE.b, 0.55)
      .fillPoints(pts(brushBandPoints(cx, cy, cardW + INK_PAD * 2, KANJI_SIZE + INK_PAD * 2)), true)
      .setVisible(false);
    this.cardStreakText = scene.add
      .text(left + cardW + STREAK_GAP, cy, '', { fontFamily: 'monospace', fontSize: '28px', color: '#ff3344' })
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.cardInk.setScrollFactor(0).setDepth(CARD_DEPTH - 1);
    for (const o of [this.cardKuro, this.cardSen, this.cardStreakText]) o.setScrollFactor(0).setDepth(CARD_DEPTH);
    uiLayer.add([this.cardInk, this.cardKuro, this.cardSen, this.cardStreakText]);
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
    if (!this.degraded) this.colorMatrix!.setActive(true).colorMatrix.negative();
    target.fxSprite?.setTint(PALETTE.b).setTintMode(Phaser.TintModes.FILL); // KOK-16

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
    this.cardInk.setVisible(true);
    this.revealCard(0); // KOK-25: começa sem nada revelado - o crop cresce a cada `updateCard`.
    this.cardStreakText.setText(streak >= 2 ? `×${streak}` : '').setVisible(streak >= 2); // KOK-26

    const cam = this.scene.cameras.main;
    // KOK-24: zoom-punch até 1,68 em 60 ms e de volta a 1,5 em 300 ms. O retorno é agendado pelo relógio real do
    // próprio `update` (`zoomBackMs`), não pelo callback do `zoomTo` - `Zoom.update()` chama esse callback e, na
    // MESMA passada, roda `effectComplete()` por `progress` já ter chegado a 1: um `zoomTo` novo armado dentro do
    // callback (mesmo efeito, reaproveitado) era cancelado ali mesmo, e a câmera ficava presa em 1,68.
    cam.zoomTo(zoom(KOKUSEN.zoomPeak), KOKUSEN.zoomInMs, 'Linear', true);
    this.zoomBackMs = KOKUSEN.zoomInMs;
    cam.shake(KOKUSEN.hitstopMs, 0.012); // "tremida forte" (Direção de arte, beat 6)
  }

  /** TFX-05: roda todo frame, inclusive congelado - só estas camadas (mais o cartão) andam durante o hitstop. */
  update(realDtMs: number, frozenNow: boolean): void {
    this.updateInvertDuotone(realDtMs);
    this.updateBolts(realDtMs, frozenNow);
    this.updateShock(realDtMs);
    this.updateCard(realDtMs);
    this.updateZoomBack(realDtMs);
  }

  /** KOK-24: volta a câmera a 1,5 quando o zoom-punch (`zoomBackMs`) termina - fora do callback do `zoomTo`. */
  private updateZoomBack(realDtMs: number): void {
    if (this.zoomBackMs === null) return;
    this.zoomBackMs -= realDtMs;
    if (this.zoomBackMs > 0) return;
    this.zoomBackMs = null;
    this.scene.cameras.main.zoomTo(zoom(1.5), KOKUSEN.zoomOutMs, 'Linear', true);
  }

  private updateInvertDuotone(realDtMs: number): void {
    if (this.phase === 'idle') return;
    this.phaseElapsedMs += realDtMs;
    if (this.phase === 'invert' && this.phaseElapsedMs >= KOKUSEN.invertMs) {
      this.phase = 'duotone';
      this.fx.add('kokusen.duotone', KOKUSEN.duotoneMs, 'real'); // KOK-15
      this.target?.fxSprite?.clearTint(); // KOK-16: silhueta só durante o negativo
      if (!this.degraded) this.colorMatrix!.colorMatrix.set(duotoneMatrix(DUOTONE_BASE, DUOTONE_TARGET));
    } else if (this.phase === 'duotone' && this.phaseElapsedMs >= KOKUSEN.invertMs + KOKUSEN.duotoneMs) {
      this.phase = 'idle';
      this.target = null;
      if (!this.degraded) this.colorMatrix!.setActive(false).colorMatrix.reset();
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
    // Polimento (fix(fx)): raios pretos (núcleo 4 px) com borda vermelha de 2 px de cada lado (largura total 8 px),
    // legíveis sobre o cenário - o núcleo preto é o que domina, a borda R só contorna.
    for (const bolt of bolts) this.boltsGfx.lineStyle(8, PALETTE.R, 1).strokePoints(pts(bolt.vertices), false); // KOK-22 borda
    for (const bolt of bolts) this.boltsGfx.lineStyle(4, PALETTE.b, 1).strokePoints(pts(bolt.vertices), false); // KOK-22 núcleo
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
    this.shockGfx
      .clear()
      .lineStyle(3, PALETTE.W, 1 - t)
      .strokeCircle(this.shockOrigin.x, this.shockOrigin.y, radius);
  }

  private teardownShock(): void {
    if (!this.shockGfx) return;
    this.shockGfx = null;
  }

  private updateCard(realDtMs: number): void {
    if (!this.cardActive) return;
    this.cardElapsedMs += realDtMs;
    const frac = Math.min(1, this.cardElapsedMs / KOKUSEN.cardMs);
    this.revealCard(frac); // KOK-25: crop revelando da esquerda para a direita (sem cortina opaca)
    if (frac >= 1) {
      this.cardActive = false;
      for (const o of [this.cardKuro, this.cardSen, this.cardInk, this.cardStreakText]) o.setVisible(false);
    }
  }

  /** Revela `cardKuro`/`cardSen` da esquerda para a direita por crop de textura, `frac` de 0 (nada) a 1 (tudo). */
  private revealCard(frac: number): void {
    const totalW = KANJI_SIZE * 2 + CARD_GAP;
    const revealedW = totalW * frac;
    this.cropReveal(this.cardKuro, Phaser.Math.Clamp(revealedW, 0, KANJI_SIZE));
    this.cropReveal(this.cardSen, Phaser.Math.Clamp(revealedW - KANJI_SIZE - CARD_GAP, 0, KANJI_SIZE));
  }

  private cropReveal(sprite: Phaser.GameObjects.Sprite, revealedDisplayPx: number): void {
    if (revealedDisplayPx <= 0) {
      sprite.setVisible(false);
      return;
    }
    sprite.setVisible(true);
    const cropW = sprite.frame.width * (revealedDisplayPx / KANJI_SIZE);
    sprite.setCrop(0, 0, cropW, sprite.frame.height);
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
