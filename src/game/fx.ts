import type Phaser from 'phaser';
import { parseSheet } from '../core/pixelGrid';
import { PALETTE, PALETTE_KEYS } from './art/palette';
import { registerSheet } from './art/render';
import { TEX } from './textures';

/** Tipo da faísca (FX-03): branca no leve, âmbar no forte, roxa no golpe de objeto. */
export type SparkKind = 'light' | 'heavy' | 'prop';

/**
 * Estrela do ponto de contato (9x9 texels): raios no tom base, miolo no tom claro de cada tipo e contorno escuro,
 * para a faísca branca aparecer até sobre o flash branco do inimigo.
 */
const star = (ray: string, core: string): string[] =>
  [
    '....k....',
    '...kxk...',
    '...kxk...',
    '.kkxoxkk.',
    'kxxoooxxk',
    '.kkxoxkk.',
    '...kxk...',
    '...kxk...',
    '....k....',
  ].map((row) => row.replace(/x/g, ray).replace(/o/g, core));
const STAR_FRAMES: Record<SparkKind, readonly string[]> = {
  light: star('w', 'w'),
  heavy: star('a', 'A'),
  prop: star('u', 'U'),
};
/** Pedacinhos que voam da faísca e da poeira (2x2 texels). */
const BIT_FRAMES: Record<SparkKind | 'dust', readonly string[]> = {
  light: ['ww', 'ww'],
  heavy: ['AA', 'Aa'],
  prop: ['UU', 'Uu'],
  dust: ['SS', 'Ss'],
};

/** Acima de personagens (0..2) e objetos: o efeito aparece por cima de quem ele toca. */
const FX_DEPTH = 3;
/** Quanto tempo (ms) a estrela fica na tela depois do congelamento. */
const STAR_MS = 110;
/** Rastro (FX-05): cor, alpha inicial, tempo para sumir e intervalo mínimo entre cópias (ms). */
const AFTERIMAGE_COLOR = PALETTE.c;
const AFTERIMAGE_ALPHA = 0.5;
const AFTERIMAGE_FADE_MS = 180;
const AFTERIMAGE_EVERY_MS = 30;
/** Quanto (px) a cópia recua enquanto some: sem isso, no chute parado ela fica escondida atrás do player. */
const AFTERIMAGE_DRIFT = 10;
/** Tremida da câmera só no golpe forte: duração (ms) e intensidade. */
const SHAKE_MS = 90;
const SHAKE_INTENSITY = 0.004;
/** Fumaça amaldiçoada do spawn (RHUD-08): duração (ms) e número de partículas da rajada. */
const CURSE_SMOKE_MS = 500;
const CURSE_SMOKE_COUNT = 16;

/**
 * Efeitos visuais de impacto e movimento (FX-03..05). Toda cor sai da PALETTE e nada é escalado: cada texel
 * continua com 2 px de mundo. Os objetos criados entram na câmera do mundo (a de UI ignora tudo que não está na
 * camada de UI).
 */
export class Fx {
  private lastAfterimage = -Infinity;

  constructor(private readonly scene: Phaser.Scene) {
    registerSheet(scene, TEX.fxStar, parseSheet('fx-star', STAR_FRAMES, PALETTE_KEYS));
    registerSheet(scene, TEX.fxBit, parseSheet('fx-bit', BIT_FRAMES, PALETTE_KEYS));
  }

  /** Faísca no ponto de contato: estrela parada + pedacinhos voando, na cor do tipo do golpe (FX-03). */
  spark(x: number, y: number, kind: SparkKind): void {
    const s = this.scene;
    const img = s.add.image(x, y, TEX.fxStar, kind).setDepth(FX_DEPTH);
    // Tween pausa junto com o hitstop: a estrela fica acesa durante todo o congelamento e só depois apaga.
    s.tweens.add({ targets: img, alpha: 0, duration: STAR_MS, onComplete: () => img.destroy() });
    this.burst(x, y, kind, {
      speed: { min: 70, max: kind === 'light' ? 150 : 210 },
      lifespan: 220,
      gravityY: 300,
      count: kind === 'light' ? 6 : 10,
    });
  }

  /** Poeira nos pés: ao pular, ao pousar e ao virar correndo (FX-04). */
  dust(x: number, y: number): void {
    this.burst(x, y - 2, 'dust', {
      speed: { min: 40, max: 90 },
      angle: { min: 180, max: 360 },
      lifespan: 320,
      gravityY: -20,
      count: 8,
    });
  }

  /** Cópia do sprite que some aos poucos; chamar todo frame enquanto o chute ou o arremesso está ativo (FX-05). */
  afterimage(sprite: Phaser.GameObjects.Sprite): void {
    const now = this.scene.time.now;
    if (now - this.lastAfterimage < AFTERIMAGE_EVERY_MS) return;
    this.lastAfterimage = now;
    const ghost = this.scene.add
      .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setDepth(sprite.depth - 0.5)
      .setTintFill(AFTERIMAGE_COLOR)
      .setAlpha(AFTERIMAGE_ALPHA);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      x: sprite.x - AFTERIMAGE_DRIFT * Math.sign(sprite.scaleX || 1),
      duration: AFTERIMAGE_FADE_MS,
      onComplete: () => ghost.destroy(),
    });
  }

  /** Tremida curta da câmera do mundo; a cena chama só no golpe forte. */
  shake(): void {
    this.scene.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY);
  }

  /**
   * Fumaça amaldiçoada no ponto de spawn (RHUD-08): rajada curta com a textura `smokeCurse`, cor de origem
   * vinda do frame (sem tint multiplicativo, AD-002), como em `Ragdoll.dissolve`.
   */
  curseSmoke(x: number, y: number): void {
    const emitter = this.scene.add
      .particles(x, y, TEX.smokeCurse, {
        frame: ['u', 'v', 'U'],
        speed: { min: 15, max: 60 },
        angle: { min: 200, max: 340 },
        lifespan: CURSE_SMOKE_MS,
        scale: { start: 1, end: 0 },
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(FX_DEPTH);
    emitter.explode(CURSE_SMOKE_COUNT);
    this.scene.time.delayedCall(CURSE_SMOKE_MS + 100, () => emitter.destroy());
  }

  private burst(
    x: number,
    y: number,
    frame: SparkKind | 'dust',
    cfg: {
      speed: { min: number; max: number };
      angle?: { min: number; max: number };
      lifespan: number;
      gravityY: number;
      count: number;
    },
  ): void {
    const emitter = this.scene.add
      .particles(x, y, TEX.fxBit, {
        frame,
        speed: cfg.speed,
        angle: cfg.angle ?? { min: 0, max: 360 },
        lifespan: cfg.lifespan,
        alpha: { start: 1, end: 0 },
        gravityY: cfg.gravityY,
        emitting: false,
      })
      .setDepth(FX_DEPTH);
    emitter.explode(cfg.count);
    // Timer da cena: durante o hitstop ele também pausa, então o emissor nunca some antes das partículas.
    this.scene.time.delayedCall(cfg.lifespan + 100, () => emitter.destroy());
  }
}
