import type Phaser from 'phaser';
import { TILE } from '../core/level';
import { FLOOR_ROWS } from '../core/module';
import { Sleeper } from '../core/sleeper';
import type { AreaSpan } from '../core/stage';
import { SLEEPER } from '../data/npc';
import { SLEEPER_HEIGHT, SLEEPER_ORIGIN, SLEEPER_SCALE } from './art/hd/atlas/sleeperSheet';
import { PALETTE } from './art/palette';
import { TEX } from './textures';

/** Atrás dos atores e do terreno (0) e na frente da decoração (−5). */
const DEPTH = -4;
/** A fala e os "z" ficam por cima dos atores, como os textos flutuantes. */
const TEXT_DEPTH = 4;
const Z_RISE_PX = 14;
const Z_LIFE_MS = 1300;

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Letra branca com contorno escuro, nítida no zoom do mundo. */
const TEXT_STYLE = {
  fontFamily: 'monospace',
  fontSize: '8px',
  color: css(PALETTE.w),
  stroke: css(PALETTE.k),
  strokeThickness: 2,
} as const;

/**
 * O dorminhoco no mundo: o sprite na poltrona, os "z" que sobem enquanto dorme e a fala em cima da cabeça. Só existe
 * na área que tem um módulo do tema de `SLEEPER.theme`; não tem corpo do Matter nem leva dano. A regra da fala é a
 * `Sleeper` do `core`.
 */
export class SleeperNpc {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private speech: Phaser.GameObjects.Text | null = null;
  private zs: Phaser.GameObjects.Text[] = [];
  private brain = new Sleeper(SLEEPER);
  private zMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Cria o NPC no primeiro trecho do tema dele; sem esse tema na área, não cria nada. */
  build(spans: readonly AreaSpan[]): void {
    this.reset();
    const span = spans.find((sp) => sp.theme === SLEEPER.theme);
    if (!span || !this.scene.textures.exists(TEX.sleeper)) return;
    const x = (span.col0 + SLEEPER.col) * TILE + TILE / 2;
    const y = FLOOR_ROWS[0] * TILE;
    this.sprite = this.scene.add
      .sprite(x, y, TEX.sleeper, 'sleep')
      .setOrigin(SLEEPER_ORIGIN.x, SLEEPER_ORIGIN.y)
      .setScale(SLEEPER_SCALE)
      .setDepth(DEPTH);
    this.speech = this.scene.add
      .text(x, y - SLEEPER_HEIGHT - 4, '', { ...TEXT_STYLE, align: 'center', wordWrap: { width: 132 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(TEXT_DEPTH)
      .setVisible(false);
  }

  /** Golpe do player com a hitbox ligada, dado em `playerX`: perto do NPC, ele começa a falar dormindo. */
  onPlayerStrike(playerX: number): void {
    if (this.sprite) this.brain.poke(playerX - this.sprite.x);
  }

  update(dtMs: number): void {
    const sprite = this.sprite;
    const speech = this.speech;
    if (!sprite || !speech) return;
    this.brain.update(dtMs);
    sprite.setFrame(this.brain.frame);
    speech.setVisible(this.brain.talking);
    if (this.brain.talking) {
      if (speech.text !== this.brain.text) speech.setText(this.brain.text);
      this.zMs = 0;
      return;
    }
    this.zMs += dtMs;
    if (this.zMs >= SLEEPER.zEveryMs) {
      this.zMs = 0;
      this.spawnZ(sprite.x + 12, sprite.y - SLEEPER_HEIGHT + 6);
    }
  }

  /** Destrói tudo do NPC (troca de área). */
  teardown(): void {
    this.sprite?.destroy();
    this.speech?.destroy();
    for (const z of this.zs) {
      this.scene.tweens.killTweensOf(z);
      z.destroy();
    }
    this.reset();
  }

  /** Estado para o snapshot de debug; `null` na área sem o NPC. */
  get view(): { x: number; y: number; talking: boolean; text: string; frame: string; depth: number } | null {
    const sprite = this.sprite;
    if (!sprite) return null;
    return {
      x: sprite.x,
      y: sprite.y,
      talking: this.brain.talking,
      text: this.brain.text,
      frame: String(sprite.frame.name),
      depth: sprite.depth,
    };
  }

  /** Esquece os objetos sem destruir: numa cena reiniciada eles já morreram com ela. */
  private reset(): void {
    this.sprite = null;
    this.speech = null;
    this.zs = [];
    this.brain = new Sleeper(SLEEPER);
    this.zMs = 0;
  }

  private spawnZ(x: number, y: number): void {
    const z = this.scene.add.text(x, y, 'z', TEXT_STYLE).setOrigin(0.5, 1).setResolution(4).setDepth(TEXT_DEPTH);
    this.zs.push(z);
    this.scene.tweens.add({
      targets: z,
      y: y - Z_RISE_PX,
      x: x + 6,
      alpha: 0,
      duration: Z_LIFE_MS,
      onComplete: () => {
        this.zs = this.zs.filter((o) => o !== z);
        z.destroy();
      },
    });
  }
}
