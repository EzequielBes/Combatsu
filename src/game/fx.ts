import Phaser from 'phaser';
import { parseSheet } from '../core/pixelGrid';
import { Rng } from '../core/rng';
import { HD_ON } from './art/hd/flag';
import { PALETTE, PALETTE_KEYS } from './art/palette';
import { drawSpark, type ImpactTone } from './cursedImpact';
import { registerSheet } from './art/render';
import { TEX } from './textures';

/**
 * Tipo da faísca (FX-03): branca no leve, âmbar no forte, roxa no golpe de objeto; azul na guarda e estrela branca
 * com miolo dourado no parry.
 */
export type SparkKind = 'light' | 'heavy' | 'prop' | 'guard' | 'parry';

/**
 * Estrela de 9x9 texels (hoje só o marcador de postura quebrada do inimigo a usa, no quadro `heavy`): raios no tom base, miolo no tom claro de cada tipo e contorno escuro,
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
  guard: star('c', 'w'),
  parry: star('w', 'A'),
};
/** Pedacinhos que voam da faísca e da poeira (2x2 texels). */
const BIT_FRAMES: Record<SparkKind | 'dust', readonly string[]> = {
  light: ['ww', 'ww'],
  heavy: ['AA', 'Aa'],
  prop: ['UU', 'Uu'],
  guard: ['cc', 'cw'],
  parry: ['ww', 'wA'],
  dust: ['SS', 'Ss'],
};

/** Acima de personagens (0..2) e objetos: o efeito aparece por cima de quem ele toca. */
const FX_DEPTH = 3;
/** Quanto tempo (ms) o lampejo leva para abrir e apagar depois do congelamento. */
const STAR_MS = 150;
/** Passo da grade de arte em px de mundo: 2 px no corpo antigo, 1 px com o corpo HD (`?hd=1`). */
const GRID = HD_ON ? 1 : 2;
const snap = (v: number): number => Math.round(v / GRID) * GRID;
const tone = (shadow: string, body: string, core: string, alt: string): ImpactTone => ({
  shadow: PALETTE[shadow]!,
  body: PALETTE[body]!,
  core: PALETTE[core]!,
  altBody: PALETTE[alt]!,
  altCore: PALETTE[core]!,
});
/**
 * Cores do lampejo por tipo (FX-03), no mesmo desenho do impacto amaldiçoado: sombra escura por baixo para a faísca
 * branca aparecer até sobre o flash branco do inimigo.
 */
const SPARK_TONE: Record<SparkKind, ImpactTone> = {
  light: tone('k', 'S', 'w', 'w'),
  heavy: tone('k', 'a', 'A', 'A'),
  prop: tone('k', 'u', 'U', 'c'),
  guard: tone('d', 'c', 'w', 'C'),
  parry: tone('k', 'A', 'w', 'w'),
};
/** Meio eixo do lampejo e número de agulhas por tipo: o leve e a guarda são menores. */
const sparkSize = (kind: SparkKind): { size: number; rays: number } =>
  kind === 'light' || kind === 'guard' ? { size: 10, rays: 5 } : { size: 15, rays: 7 };
/** Duração (ms) do anel dourado do parry. */
const RING_MS = 200;
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

  /**
   * Faísca no ponto de contato, na cor do tipo do golpe (FX-03): lampejo em estrela com agulhas em volta (o mesmo
   * desenho do impacto amaldiçoado) e pedacinhos voando.
   */
  spark(x: number, y: number, kind: SparkKind): void {
    const s = this.scene;
    const { size, rays } = sparkSize(kind);
    const rng = new Rng(Math.floor(x * 7 + y * 13));
    const list = Array.from({ length: rays }, (_, i) => ({
      angle: ((i + rng.next() * 0.6) / rays) * Math.PI * 2,
      dist: 14 + rng.next() * 16,
    }));
    // Eixo longo de pé: sem direção de golpe, o lampejo lê como um corte vertical no ponto de contato.
    const shape = { cx: snap(x), cy: snap(y), dirAngle: 0, snap, grid: GRID, tone: SPARK_TONE[kind] };
    const gfx = s.add.graphics().setDepth(FX_DEPTH);
    drawSpark(gfx, shape, list, size, 0);
    // Tween pausa junto com o hitstop: o lampejo fica aceso durante todo o congelamento e só depois abre e apaga.
    s.tweens.addCounter({
      from: 0,
      to: 1,
      duration: STAR_MS,
      onUpdate: (t) => {
        if (gfx.active) drawSpark(gfx, shape, list, size, t.getValue() ?? 1);
      },
      onComplete: () => gfx.destroy(),
    });
    this.burst(x, y, kind, {
      speed: { min: 70, max: kind === 'light' || kind === 'guard' ? 150 : 210 },
      lifespan: 220,
      gravityY: 300,
      count: kind === 'light' || kind === 'guard' ? 6 : 10,
    });
  }

  /** Anel dourado curto que confirma o parry (PAR-11): cresce e some em 200 ms. */
  parryRing(x: number, y: number): void {
    const s = this.scene;
    const ring = s.add.circle(x, y, 6).setStrokeStyle(2, PALETTE.A).setDepth(FX_DEPTH);
    s.tweens.add({ targets: ring, scale: 3.5, alpha: 0, duration: RING_MS, onComplete: () => ring.destroy() });
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
      .setTint(AFTERIMAGE_COLOR)
      .setTintMode(Phaser.TintModes.FILL)
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
        // Com o corpo HD o pedacinho de 4 px lia como um quadrado solto: metade do tamanho.
        scale: HD_ON ? 0.5 : 1,
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
