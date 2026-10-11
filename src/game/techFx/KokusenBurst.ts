import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { burstFrameAt, burstTotalMs } from '../../core/kokusenBurst';
import type { Vec2 } from '../../core/hit';
import { KOKUSEN } from '../../data/techniques';
import { BURST_FRAMES } from '../art/hd/atlas/burstSheet';
import { TEX } from '../textures';

/** Acima dos raios e das faíscas do Kokusen (6). */
const DEPTH = 7;

/**
 * Estouro desenhado do Kokusen no ponto do impacto: 5 quadros de raios pretos e vermelhos, do núcleo aos estilhaços.
 * Anda em tempo real, como o resto do cinema do Kokusen, então toca por inteiro durante o hitstop do próprio golpe.
 */
export class KokusenBurst {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private elapsedMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /** Um Kokusen acertou em `point`: recomeça o estouro ali (o anterior, se ainda estiver na tela, some). */
  trigger(point: Vec2, facing: 1 | -1): void {
    this.clear();
    if (!this.scene.textures.exists(TEX.kokusenBurst)) return;
    this.elapsedMs = 0;
    this.sprite = this.scene.add
      .sprite(point.x, point.y, TEX.kokusenBurst, BURST_FRAMES[0])
      .setFlipX(facing < 0)
      .setDepth(DEPTH);
    this.registry.add(this.sprite);
    this.fx.add('kokusen.burst', burstTotalMs(KOKUSEN.burstFrameMs), 'real');
  }

  update(realDtMs: number): void {
    const sprite = this.sprite;
    if (!sprite) return;
    this.elapsedMs += realDtMs;
    const frame = burstFrameAt(KOKUSEN.burstFrameMs, this.elapsedMs);
    if (frame === null) this.clear();
    else sprite.setFrame(BURST_FRAMES[frame]);
  }

  private clear(): void {
    if (!this.sprite) return;
    this.registry.scheduleDestroy(this.sprite, 0);
    this.sprite = null;
  }
}
