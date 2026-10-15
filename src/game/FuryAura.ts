import Phaser from 'phaser';
import type { FxRegistry } from '../core/fxRegistry';
import type { Vec2 } from '../core/hit';
import { PLAYER_MOVE } from '../data/tuning';
import { PALETTE } from './art/palette';

/** Logo atrás do player (profundidade 1), como a aura da força: o corpo fica por cima e o brilho o envolve. */
const AURA_DEPTH = 0.9;
/** Meia largura da elipse com 1 acúmulo e quanto ela cresce por acúmulo (px de mundo). */
const BASE_PX = 14;
const PER_STACK_PX = 2;
/** Acúmulos que ainda fazem a aura crescer (o teto da Fúria 3 é o 7º). */
const MAX_STACKS = 8;
/** A elipse é mais alta que larga, do tamanho do corpo HD (30 × 60). */
const TALL = 1.6;
/** Camadas de fora para dentro: escala do raio e opacidade, para o brilho esmaecer na borda. */
const LAYERS = [
  { scale: 1, alpha: 0.22 },
  { scale: 0.8, alpha: 0.3 },
  { scale: 0.6, alpha: 0.38 },
] as const;
/** Contorno de 2 px na borda de fora, para a silhueta da aura ler em qualquer fundo. */
const RIM = { px: 2, alpha: 0.6 } as const;
/** Grade da arte (AD-009): o raio cai em múltiplos de 2 px. */
const GRID = 2;

/**
 * Quanto o tronco da pose de corrida vai à frente da coluna do corpo (px de mundo, medido nas capturas): a aura anda
 * junto para envolver o tronco, e não ficar para trás dele na corrida.
 */
const RUN_LEAN_PX = 10;

/** Centro da aura: o ponto de desenho do corpo, levado à frente na corrida na proporção da velocidade. */
export function furyAuraCenter(at: Vec2, facing: 1 | -1, vx: number): Vec2 {
  const run = Math.min(1, Math.abs(vx) / PLAYER_MOVE.runSpeed);
  return { x: at.x + facing * RUN_LEAN_PX * run, y: at.y };
}

/** Meia largura da aura com `stacks` acúmulos; 0 sem acúmulo (aura apagada). */
export function furyAuraRadius(stacks: number): number {
  if (stacks <= 0) return 0;
  return BASE_PX + PER_STACK_PX * (Math.min(stacks, MAX_STACKS) - 1);
}

/**
 * Aura laranja da Fúria (CRP-07.11): elipse de brilho na chave `a` da `PALETTE` em volta do player, presa ao ponto de
 * desenho dele (`player.renderPos`, AD-019), com o raio crescendo pelos acúmulos e escondida sem acúmulo. Registrada no
 * `FxRegistry` e destruída no `SHUTDOWN` da cena (o `R` não deixa aura órfã).
 */
export class FuryAura {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private radius = 0;
  private alive = true;

  constructor(scene: Phaser.Scene, registry: FxRegistry) {
    // Soma de luz: o laranja brilha por cima do fundo escuro em vez de só tingi-lo.
    this.gfx = scene.add.graphics().setDepth(AURA_DEPTH).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    registry.add(this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Meia largura desenhada agora; 0 com a aura apagada (o snapshot lê isto). */
  get view(): number {
    return this.alive && this.gfx.visible ? this.radius : 0;
  }

  get destroyed(): boolean {
    return !this.alive;
  }

  /** Redesenha em volta de `at` (centro do corpo como a tela o desenha) com o raio de `stacks` acúmulos. */
  update(at: Vec2, stacks: number): void {
    if (!this.alive) return;
    this.radius = furyAuraRadius(stacks);
    this.gfx.clear().setVisible(this.radius > 0);
    if (this.radius === 0) return;
    const x = Math.round(at.x / GRID) * GRID;
    const y = Math.round(at.y / GRID) * GRID;
    for (const { scale, alpha } of LAYERS) {
      const w = Math.round((this.radius * scale) / GRID) * GRID * 2;
      this.gfx.fillStyle(PALETTE.a!, alpha).fillEllipse(x, y, w, w * TALL);
    }
    const w = this.radius * 2;
    this.gfx.lineStyle(RIM.px, PALETTE.a!, RIM.alpha).strokeEllipse(x, y, w, w * TALL);
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.gfx.destroy();
  }
}
