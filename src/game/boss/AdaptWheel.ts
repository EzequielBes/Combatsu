import type Phaser from 'phaser';
import type { AdaptSource } from '../../core/bossAdapt';
import { BOSS_AFFIX } from '../../data/bossAffixes';
import { PALETTE } from '../art/palette';

/** Leitura da roda para o snapshot de debug: se aparece, os rótulos mostrados e o centro dela no mundo. */
export interface AdaptWheelView {
  visible: boolean;
  /** Rótulo curto de cada fonte adaptada, na ordem em que adaptaram (ADP-06). */
  labels: string[];
  x: number;
  y: number;
}

/** Cor dos raios e do aro (BRD-07: a mesma chave do glifo do Adaptativo). */
const WHEEL_KEY = 'A';
/** Raios da roda (ADP-06). */
const RAYS = 8;
/** Raio do aro e ponta dos raios (px de mundo). */
const RING_R = 3;
const RAY_R = 7;
/** Lado do quadradinho na ponta de cada raio. */
const TIP = 2;
/** Folga entre o topo do corpo do chefe e a base dos rótulos. */
const HEAD_GAP = 3;
/** Altura reservada para a linha dos rótulos (fonte de 8 px com borda). */
const LABEL_H = 10;
/** Giro de um raio (45°) a cada fonte que adapta, como a roda do Mahoraga; dura `TURN_MS`. */
const TURN_MS = 300;
/** Logo à frente do feixe e dos fios, atrás do HUD. */
const DEPTH = 2.6;
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
const TEXT_STYLE = {
  fontFamily: 'monospace',
  fontSize: '8px',
  color: css(PALETTE.w),
  stroke: css(PALETTE.k),
  strokeThickness: 2,
} as const;

/**
 * Roda do Adaptativo (ADP-06, BRD-07): 8 raios na cor `A` sobre a cabeça do chefe e, sob ela, o rótulo curto de cada
 * fonte adaptada ("Leve", "Forte" ou o nome curto da técnica). Só aparece enquanto houver fonte adaptada; a cada fonte
 * nova a roda gira um raio. O `BossDirector` cria uma por chefe com Adaptativo e chama `update` depois do `boss.update`.
 */
export class AdaptWheel {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private labels: string[] = [];
  private turnMs = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(DEPTH).setVisible(false);
    this.text = scene.add.text(0, 0, '', TEXT_STYLE).setOrigin(0.5, 1).setResolution(4).setDepth(DEPTH);
    this.text.setVisible(false);
    this.draw();
  }

  /**
   * Por quadro: `adapted` são as fontes adaptadas do chefe agora; `x` e `topY`, o centro e o topo do corpo dele. Sem
   * adaptação (ou com o chefe fora de cena) a roda e os rótulos somem.
   */
  update(dtMs: number, adapted: readonly AdaptSource[], x: number, topY: number, alive: boolean): void {
    const labels = alive ? adapted.map((s) => BOSS_AFFIX.adaptLabels[s]) : [];
    if (labels.length > this.labels.length) this.turnMs = TURN_MS;
    else this.turnMs = Math.max(0, this.turnMs - dtMs);
    if (labels.join() !== this.labels.join()) this.text.setText(labels.join(' · '));
    this.labels = labels;
    const visible = labels.length > 0;
    const labelBottom = Math.round(topY - HEAD_GAP);
    this.text.setPosition(Math.round(x), labelBottom).setVisible(visible);
    const turn = (1 - this.turnMs / TURN_MS) * ((2 * Math.PI) / RAYS);
    this.gfx
      .setPosition(Math.round(x), labelBottom - LABEL_H - RAY_R)
      .setRotation(this.turnMs > 0 ? turn : 0)
      .setVisible(visible);
  }

  view(): AdaptWheelView {
    return { visible: this.gfx.visible, labels: [...this.labels], x: this.gfx.x, y: this.gfx.y };
  }

  /** Remove a roda e os rótulos (chefe morto, chefe novo ou run nova). */
  destroy(): void {
    this.gfx.destroy();
    this.text.destroy();
  }

  /** Aro de raio `RING_R` e 8 raios até `RAY_R`, cada um com um quadradinho na ponta, centrados em (0, 0). */
  private draw(): void {
    const color = PALETTE[WHEEL_KEY];
    this.gfx.lineStyle(1, color, 1).strokeCircle(0, 0, RING_R);
    this.gfx.fillStyle(color, 1);
    for (let i = 0; i < RAYS; i++) {
      const a = (i * 2 * Math.PI) / RAYS;
      const [cx, cy] = [Math.cos(a), Math.sin(a)];
      this.gfx.lineBetween(cx * RING_R, cy * RING_R, cx * RAY_R, cy * RAY_R);
      this.gfx.fillRect(cx * RAY_R - TIP / 2, cy * RAY_R - TIP / 2, TIP, TIP);
    }
  }
}
