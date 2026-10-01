import { MOTION } from '../data/moves';

interface DirEdge {
  dir: 'down' | 'forward';
  at: number;
}

/**
 * Entrada de meia-lua (SPC-01): guarda as bordas de subida de ↓ e de frente com o tempo e diz se, no aperto do
 * leve, ↓ e depois frente aconteceram dentro de `windowMs` (contados do ↓ até o aperto), nessa ordem.
 */
export class MotionInput {
  private edges: DirEdge[] = [];
  private prevDown = false;
  private prevForward = false;

  constructor(private readonly windowMs: number = MOTION.windowMs) {}

  /** Chamar uma vez por frame com o tempo em ms e as direções seguradas (`forward` = para onde o jogador olha). */
  sample(nowMs: number, held: { down: boolean; forward: boolean }): void {
    if (held.down && !this.prevDown) this.edges.push({ dir: 'down', at: nowMs });
    if (held.forward && !this.prevForward) this.edges.push({ dir: 'forward', at: nowMs });
    this.prevDown = held.down;
    this.prevForward = held.forward;
    this.edges = this.edges.filter((e) => nowMs - e.at <= this.windowMs);
  }

  /** No aperto do leve: ↓ e depois frente, o ↓ a no máximo `windowMs` atrás. Consome o histórico ao casar. */
  matches(nowMs: number): boolean {
    const recent = this.edges.filter((e) => nowMs - e.at <= this.windowMs);
    for (const down of recent) {
      if (down.dir !== 'down') continue;
      if (recent.some((f) => f.dir === 'forward' && f.at > down.at)) {
        this.edges = [];
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.edges = [];
    this.prevDown = false;
    this.prevForward = false;
  }
}
