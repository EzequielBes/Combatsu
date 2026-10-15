import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import { cutLine, type CutGeometry } from '../../core/cut';
import type { FxTimeline } from '../../core/fxTimeline';
import { PALETTE } from '../art/palette';

/** "linha branca fina... por 1 frame cheia e depois some em 120 ms" (Direção de arte, beat 3). */
const CUT_LINE_MS = 120;
/** "duas metades deslocadas 2 px por 2 frames" (Direção de arte, beat 3; CUT-06: mínimo 33 ms = 2 frames). */
const SPLIT_MS = 140;
const SPLIT_OFFSET = 2;

/**
 * Vistas do Desmantelar (CUT-04/06): uma linha branca de 1 texel cruzando a área do corte no ângulo certo, e o
 * alvo "partido ao meio" por um instante. Só desenha; o dano e a agenda são do `CutSchedule` (core, puro), lidos
 * pelo `TechRunner`.
 */
export class CutFx {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /**
   * CUT-04/05: uma linha no ângulo do corte, centrada no meio do retângulo de dano à frente do player, com o
   * comprimento da `geometry` do stat da conjuração (TST-03).
   */
  cut(playerX: number, playerY: number, facing: 1 | -1, angleDeg: number, geometry: CutGeometry): void {
    this.fx.add('cut.line', CUT_LINE_MS, 'game');
    const rad = (angleDeg * Math.PI) / 180;
    const { midPx, lenPx } = cutLine(geometry);
    const originX = playerX + facing * midPx;
    const dx = (Math.cos(rad) * lenPx) / 2;
    const dy = (Math.sin(rad) * lenPx) / 2;
    const line = this.scene.add.graphics().setDepth(3);
    line.lineStyle(2, PALETTE.W, 1).lineBetween(originX - dx, playerY - dy, originX + dx, playerY + dy);
    this.registry.add(line);
    this.registry.scheduleDestroy(line, CUT_LINE_MS);
    this.scene.tweens.add({ targets: line, alpha: 0, duration: CUT_LINE_MS });
  }

  /** CUT-06: o alvo pisca partido ao meio - duas metades finas se afastando 2 px por um instante. */
  split(x: number, y: number): void {
    this.fx.add('cut.split', SPLIT_MS, 'game');
    const top = this.scene.add.rectangle(x, y - 6, 16, 2, PALETTE.W, 0.9).setDepth(4);
    const bottom = this.scene.add.rectangle(x, y + 6, 16, 2, PALETTE.W, 0.9).setDepth(4);
    this.registry.add(top);
    this.registry.add(bottom);
    this.registry.scheduleDestroy(top, SPLIT_MS);
    this.registry.scheduleDestroy(bottom, SPLIT_MS);
    this.scene.tweens.add({ targets: top, x: x - SPLIT_OFFSET, alpha: 0, duration: SPLIT_MS });
    this.scene.tweens.add({ targets: bottom, x: x + SPLIT_OFFSET, alpha: 0, duration: SPLIT_MS });
  }
}
