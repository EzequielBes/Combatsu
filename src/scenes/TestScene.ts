import Phaser from 'phaser';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { TEX, createPlaceholderTextures } from '../game/textures';

export class TestScene extends Phaser.Scene {
  private level!: LevelData;

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.buildTerrain();
    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
      this.matter.add.rectangle(cx, cy, r.width, r.height, { isStatic: true, label: 'terrain' });
    }
  }
}
