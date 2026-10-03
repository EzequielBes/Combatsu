import type { Vec2 } from './hit';

/**
 * Margem do acumulador de tempo do Matter no Phaser 3.90 (`Runner._timeBufferMargin`): a física só dá um passo
 * quando há 1,5 passo acumulado, então depois do passo sobram de 0,5 a 1,5 passo no acumulador.
 */
export const STEP_BUFFER_MARGIN = 1.5;

/** Um salto maior que isto num passo é teleporte (renascer, reposicionar) e não interpola. */
const SNAP_PX = 48;

/**
 * Fração (0 a 1) do caminho entre o penúltimo e o último passo de física que a tela mostra neste quadro (ITP-01):
 * `buffer / passo` menos a sobra fixa da margem. Com passo inválido não há o que interpolar: vale o último passo.
 */
export function stepAlpha(timeBufferMs: number, stepMs: number, margin = STEP_BUFFER_MARGIN): number {
  if (!(stepMs > 0)) return 1;
  return Math.min(1, Math.max(0, timeBufferMs / stepMs - (margin - 1)));
}

/**
 * Guarda as duas últimas posições de um corpo, uma por passo de física, e devolve a posição entre elas (ITP-02).
 * A física roda em passo fixo de 60 Hz; sem isto, num monitor mais rápido o sprite anda em degraus.
 */
export class StepLerp {
  private prev: Vec2;
  private curr: Vec2;

  constructor(pos: Vec2) {
    this.prev = { x: pos.x, y: pos.y };
    this.curr = { x: pos.x, y: pos.y };
  }

  /** Chamado depois de cada passo de física, com a posição nova do corpo. */
  push(pos: Vec2): void {
    const next = { x: pos.x, y: pos.y };
    const teleport = Math.hypot(next.x - this.curr.x, next.y - this.curr.y) > SNAP_PX;
    this.prev = teleport ? next : this.curr;
    this.curr = next;
  }

  /** Posição a desenhar para a fração `alpha` (de `stepAlpha`). */
  at(alpha: number): Vec2 {
    return {
      x: this.prev.x + (this.curr.x - this.prev.x) * alpha,
      y: this.prev.y + (this.curr.y - this.prev.y) * alpha,
    };
  }
}
