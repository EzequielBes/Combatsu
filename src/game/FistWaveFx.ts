import Phaser from 'phaser';
import type { FxRegistry } from '../core/fxRegistry';
import type { Wave } from '../core/strikeEmitter';
import { PALETTE } from './art/palette';

/** Profundidade dos efeitos de golpe (a mesma do rastro e da faísca). */
const FX_DEPTH = 3;
/** Meia altura do risco da onda (px de mundo): da altura do tronco do comum. */
const HALF_H = 10;
/** Quanto o meio do risco vai à frente das pontas, em arco aberto para onde a onda anda. */
const BOW_PX = 4;
/** Distância do risco claro de trás ao da frente e do rastro curto atrás deles. */
const BACK_PX = 2;
const TAIL_PX = 10;
/** Pontos que amostram o arco. */
const SAMPLES = 6;

/** Pontos do arco do risco em `x` (o meio vai `bow` à frente, para o lado `dir`). */
function arc(x: number, y: number, dir: 1 | -1, bow: number): Phaser.Math.Vector2[] {
  const out: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const dy = (t * 2 - 1) * HALF_H;
    out.push(new Phaser.Math.Vector2(Math.round(x + dir * bow * Math.sin(Math.PI * t)), Math.round(y + dy)));
  }
  return out;
}

/**
 * Vista da Onda do Punho (CRP-10): um risco por onda viva, redesenhado a cada quadro a partir de `StrikeEmitter.waves`:
 * o arco claro (`C`) na frente, o roxo (`c`) logo atrás e um traço curto de rastro na altura do golpe, tudo com 1 px de
 * espessura. Registrada no `FxRegistry` e destruída no `SHUTDOWN` da cena.
 */
export class FistWaveFx {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private alive = true;
  private shown = 0;

  constructor(scene: Phaser.Scene, registry: FxRegistry) {
    this.gfx = scene.add.graphics().setDepth(FX_DEPTH);
    registry.add(this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Riscos desenhados no último quadro (o snapshot lê isto). */
  get view(): number {
    return this.alive ? this.shown : 0;
  }

  get destroyed(): boolean {
    return !this.alive;
  }

  draw(waves: readonly Wave[]): void {
    if (!this.alive) return;
    this.gfx.clear();
    for (const w of waves) {
      const fade = 1 - (0.5 * w.traveled) / w.rangePx;
      this.gfx.lineStyle(1, PALETTE.c!, 0.9 * fade).strokePoints(arc(w.x - w.dir * BACK_PX, w.y, w.dir, BOW_PX), false);
      this.gfx.lineStyle(1, PALETTE.C!, fade).strokePoints(arc(w.x, w.y, w.dir, BOW_PX), false);
      const tail = Math.min(TAIL_PX, w.traveled);
      this.gfx.lineStyle(1, PALETTE.c!, 0.6 * fade).lineBetween(w.x - w.dir * tail, w.y, w.x - w.dir * BACK_PX, w.y);
    }
    this.shown = waves.length;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.gfx.destroy();
  }
}
