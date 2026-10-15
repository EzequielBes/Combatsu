import { BODY_BRANCHES, EMITTER } from '../data/techAxes';
import type { Box } from './axisRule';
import type { Vec2 } from './hit';
import { segmentEntry } from './techKit';

/**
 * Emissor mínimo da Onda do Punho (spec `vermelho-e-corpo`, CRP-10 a CRP-12). Sem Phaser: o `bodyDirector` pede a onda
 * ao acerto do golpe forte e aplica o dano aos ids que `update` devolve. Não gasta energia nem toca a regen dela.
 */

/** Velocidade da onda em px/s (CRP-10). */
export const WAVE_SPEED = BODY_BRANCHES.ondaDoPunho.speed;

/** Opções de uma onda: atravessa todos (Punho que Rasga) e a distância que anda. */
export interface WaveOpts {
  pierce: boolean;
  rangePx: number;
}

/** Alvo visto pela onda: id e a caixa de acerto. */
export interface WaveTarget {
  id: number;
  rect: Box;
}

/** Acerto da onda: o alvo e o dano que ela levava. */
export interface WaveHit {
  waveId: number;
  targetId: number;
  damage: number;
}

/** A onda viva, para a vista. */
export interface Wave {
  readonly id: number;
  /** Posição atual (px de mundo). */
  x: number;
  readonly y: number;
  readonly dir: 1 | -1;
  readonly damage: number;
  readonly pierce: boolean;
  readonly rangePx: number;
  traveled: number;
}

export class StrikeEmitter {
  private live: Wave[] = [];
  private readonly touched = new Map<number, Set<number>>();
  private emittedAt: number[] = [];
  private nextId = 1;

  /** As ondas vivas (a vista lê a cada quadro). */
  get waves(): readonly Wave[] {
    return this.live;
  }

  /**
   * Solta uma onda de `at` para `dir`. No máximo `EMITTER.maxPerWindow` em `EMITTER.windowMs` de tempo de jogo (CRP-12):
   * a que passa do teto não sai e devolve `false`. Uma onda de `nowMs - windowMs` já saiu da janela.
   */
  emit(at: Vec2, dir: 1 | -1, damage: number, opts: WaveOpts, nowMs: number): boolean {
    this.emittedAt = this.emittedAt.filter((t) => nowMs - t < EMITTER.windowMs);
    if (this.emittedAt.length >= EMITTER.maxPerWindow) return false;
    this.emittedAt.push(nowMs);
    const wave: Wave = { id: this.nextId++, x: at.x, y: at.y, dir, damage, ...opts, traveled: 0 };
    this.live.push(wave);
    this.touched.set(wave.id, new Set());
    return true;
  }

  /**
   * Anda as ondas `dtMs` e devolve os acertos. Sem `pierce` a onda para no 1º alvo que toca (o mais perto no passo); com
   * `pierce` toca todos, cada um uma vez por onda. Os `exceptIds` (o alvo do golpe) são ignorados.
   */
  update(dtMs: number, targets: readonly WaveTarget[], exceptIds: readonly number[] = []): WaveHit[] {
    const hits: WaveHit[] = [];
    for (const wave of this.live) {
      const step = Math.min((WAVE_SPEED * dtMs) / 1000, wave.rangePx - wave.traveled);
      const seen = this.touched.get(wave.id) as Set<number>;
      const entered: { id: number; at: number }[] = [];
      for (const t of targets) {
        if (seen.has(t.id) || exceptIds.includes(t.id)) continue;
        const at = segmentEntry({ x: wave.x, y: wave.y }, wave.dir, step, t.rect);
        if (at !== null) entered.push({ id: t.id, at });
      }
      entered.sort((a, b) => a.at - b.at || a.id - b.id);
      const taken = wave.pierce ? entered : entered.slice(0, 1);
      for (const e of taken) {
        seen.add(e.id);
        hits.push({ waveId: wave.id, targetId: e.id, damage: wave.damage });
      }
      wave.x += wave.dir * step;
      wave.traveled += step;
      if (!wave.pierce && taken.length > 0) wave.traveled = wave.rangePx;
    }
    this.live = this.live.filter((w) => w.traveled < w.rangePx);
    for (const id of [...this.touched.keys()]) {
      if (!this.live.some((w) => w.id === id)) this.touched.delete(id);
    }
    return hits;
  }

  /** Limpa ondas e janela (reinício da rodada ou da run). */
  reset(): void {
    this.live = [];
    this.touched.clear();
    this.emittedAt = [];
  }
}
