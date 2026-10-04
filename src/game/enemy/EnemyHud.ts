import type Phaser from 'phaser';
import { ENEMY_BAR_WELL } from '../art/hud';
import { ART_SCALE, PALETTE } from '../art/palette';
import { STRUCTURE_BAR_BG_COLOR, STRUCTURE_BAR_BREAK_COLOR, STRUCTURE_BAR_FILL_COLOR } from '../art/combatColors';
import { TEX } from '../textures';
import type { EnemyCtx } from './context';

/** Barra de vida (HUD-02): altura do topo acima do centro do corpo (px) e profundidade, acima de todos. */
export const BAR_RISE = 44;
export const BAR_DEPTH = 3;
/** Barra de estrutura (STR-01): fina, logo abaixo da barra de vida (px de mundo). */
const STRUCTURE_BAR_H = 4;
const STRUCTURE_BAR_GAP = 1;
/** Ícone de estrela girando sobre a cabeça do inimigo quebrado (STR-05): altura acima do centro e giro (°/s). */
const BREAK_STAR_RISE = 34;
const BREAK_STAR_SPIN = 360;

/** Barras de vida e de estrutura e a estrela da quebra, sobre a cabeça do inimigo, na câmera do mundo. */
export class EnemyHud {
  /** Barra de vida acima da cabeça, na câmera do mundo: aparece no primeiro dano e some ao morrer (HUD-02). */
  private readonly barFrame: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private readonly structBg: Phaser.GameObjects.Rectangle;
  private readonly structFill: Phaser.GameObjects.Rectangle;
  private readonly breakStar: Phaser.GameObjects.Image;

  constructor(private readonly c: EnemyCtx) {
    const scene = c.scene;
    this.barFrame = scene.add.image(0, 0, TEX.enemyBar).setOrigin(0, 0).setDepth(BAR_DEPTH).setVisible(false);
    const well = ENEMY_BAR_WELL;
    this.barFill = scene.add
      .rectangle(0, 0, well.w * ART_SCALE, well.h * ART_SCALE, PALETTE.r)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    const barW = this.barFrame.width;
    this.structBg = scene.add
      .rectangle(0, 0, barW, STRUCTURE_BAR_H, STRUCTURE_BAR_BG_COLOR)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    this.structFill = scene.add
      .rectangle(0, 0, 0, STRUCTURE_BAR_H - 2, STRUCTURE_BAR_FILL_COLOR)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    this.breakStar = scene.add.image(0, 0, TEX.fxStar, 'heavy').setDepth(BAR_DEPTH).setVisible(false);
  }

  /** Mostra a barra depois do primeiro dano e até morrer, cheia na proporção da vida, em passos de 1 texel. */
  updateBar(): void {
    const { brain, tuning, drawPos } = this.c;
    const show = !brain.isDead && brain.hp < tuning.brain.maxHp;
    this.barFrame.setVisible(show);
    const well = ENEMY_BAR_WELL;
    const texels = Math.round((well.w * brain.hp) / tuning.brain.maxHp);
    this.barFill.setVisible(show && texels > 0).setSize(texels * ART_SCALE, well.h * ART_SCALE);
    this.updateStructureBar();
    if (!show) return;
    const { x, y } = drawPos.get();
    const left = Math.round(x - this.barFrame.width / 2);
    const top = Math.round(y - BAR_RISE);
    this.barFrame.setPosition(left, top);
    this.barFill.setPosition(left + well.x * ART_SCALE, top + well.y * ART_SCALE);
  }

  /** Barra de estrutura amarela sob a de vida; a quebra estoura em branco e a estrela gira sobre a cabeça (STR-05). */
  private updateStructureBar(): void {
    const s = this.c.structure;
    const show = !this.c.brain.isDead && (s.cur > 0 || s.broken);
    this.structBg.setVisible(show);
    this.structFill.setVisible(show && s.cur > 0);
    this.breakStar.setVisible(show && s.broken);
    if (!show) return;
    const { x, y } = this.c.drawPos.get();
    const left = Math.round(x - this.barFrame.width / 2);
    const top = Math.round(y - BAR_RISE) + this.barFrame.height + STRUCTURE_BAR_GAP;
    this.structBg.setPosition(left, top);
    const inner = Math.max(0, this.barFrame.width - 2);
    this.structFill
      .setPosition(left + 1, top + 1)
      .setSize(Math.round((inner * s.cur) / s.max), STRUCTURE_BAR_H - 2)
      .setFillStyle(s.broken ? STRUCTURE_BAR_BREAK_COLOR : STRUCTURE_BAR_FILL_COLOR);
    this.breakStar.setPosition(x, y - BREAK_STAR_RISE).setAngle((this.c.scene.time.now * BREAK_STAR_SPIN) / 1000);
  }

  destroy(): void {
    this.barFrame.destroy();
    this.barFill.destroy();
    this.structBg.destroy();
    this.structFill.destroy();
    this.breakStar.destroy();
  }
}
