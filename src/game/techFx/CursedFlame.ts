import type Phaser from 'phaser';
import { FlameSim, type FlameTuning } from '../../core/flame';
import { ART_SCALE } from '../art/palette';
import { flameFrame, type FlameColor } from '../art/sprites/flame';
import { TEX } from '../textures';

const snap = (v: number): number => Math.round(v / ART_SCALE) * ART_SCALE;

/**
 * Chama de energia amaldiçoada presa a um ponto (o punho, o corpo): a vista da `FlameSim`. É um objeto só para o
 * registro de efeitos (o `Container`); quem usa chama `tick` todo quadro, com a fonte enquanto a chama está acesa e
 * sem ela para as línguas restantes apagarem. As posições caem na grade de 2 px dos efeitos (AD-009).
 */
export class CursedFlame {
  readonly root: Phaser.GameObjects.Container;
  private readonly sim: FlameSim;
  private readonly pool: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly color: FlameColor,
    depth: number,
    seed = 1,
    tuning?: FlameTuning,
  ) {
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.sim = new FlameSim(seed, tuning);
  }

  /** Sem nenhuma língua viva: quem usa pode destruir a chama. */
  get empty(): boolean {
    return this.sim.empty;
  }

  /** Avança `dtMs`; com `at` a chama está acesa nesse ponto do mundo, com `null` só apaga o que resta. */
  tick(dtMs: number, at: { x: number; y: number } | null, power = 1): void {
    this.sim.tick(dtMs, at, power);
    const tongues = this.sim.tongues;
    // A ordem da lista é a de desenho (as novas por cima), então cada imagem do pool assume a língua do seu índice.
    for (let i = 0; i < tongues.length; i++) {
      const t = tongues[i]!;
      let img = this.pool[i];
      if (!img) {
        img = this.scene.add.image(0, 0, TEX.cursedFlame).setOrigin(0.5, 1);
        this.root.add(img);
        this.pool.push(img);
      }
      img
        .setVisible(true)
        .setFrame(flameFrame(this.color, t.stage, t.size))
        .setPosition(snap(t.x), snap(t.y));
    }
    for (let i = tongues.length; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
    this.pool.length = 0;
  }
}
