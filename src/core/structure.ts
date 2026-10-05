import { MOVES, STRUCTURE, STRUCTURE_HEAVY, STRUCTURE_LIGHT } from '../data/moves';
import type { Hit } from './hit';

export interface StructureTuning {
  max: number;
  decayDelayMs: number;
  decayPerSec: number;
  stunMs: number;
}

/** Números da estrutura do inimigo comum (STR-04, STR-05). */
export const ENEMY_STRUCTURE: StructureTuning = {
  max: STRUCTURE.max,
  decayDelayMs: STRUCTURE.enemy.decayDelayMs,
  decayPerSec: STRUCTURE.enemy.decayPerSec,
  stunMs: STRUCTURE.enemy.stunMs,
};

/** Números da estrutura do jogador (STR-06, STR-07). */
export const PLAYER_STRUCTURE: StructureTuning = {
  max: STRUCTURE.max,
  decayDelayMs: STRUCTURE.player.decayDelayMs,
  decayPerSec: STRUCTURE.player.decayPerSec,
  stunMs: STRUCTURE.player.stunMs,
};

/**
 * Estrutura que um golpe soma no inimigo comum (STR-02): o valor do golpe do grafo, ou 4/10 por força para o que
 * não vem do grafo (objeto na mão, golpe de teste).
 */
export function enemyStructureGain(hit: Pick<Hit, 'moveName' | 'strength'>): number {
  const def = hit.moveName ? MOVES[hit.moveName] : undefined;
  if (def) return def.structureGain;
  return hit.strength === 'heavy' ? STRUCTURE_HEAVY : STRUCTURE_LIGHT;
}

/**
 * Barra de estrutura (postura) de 0 a 100 (STR-01): sobe com `add` até o teto, cai depois de `decayDelayMs` sem
 * subir, e ao chegar em 100 quebra e atordoa por `stunMs`; ao fim do atordoamento volta a 0 (STR-08).
 * O tempo é o de jogo, passado em `update`.
 */
export class Structure {
  private _cur = 0;
  private _broken = false;
  private sinceGainMs = 0;
  private stunLeftMs = 0;

  constructor(private readonly tuning: StructureTuning) {}

  get cur(): number {
    return this._cur;
  }

  get max(): number {
    return this.tuning.max;
  }

  get broken(): boolean {
    return this._broken;
  }

  /** Tempo de atordoamento que falta (0 fora da quebra). */
  get stunRemainingMs(): number {
    return this._broken ? this.stunLeftMs : 0;
  }

  /** Soma estrutura com teto. `true` se este ganho quebrou a barra (um `guardBreak` por quebra); ignora se já quebrada. */
  add(amount: number): boolean {
    if (this._broken || amount <= 0) return false;
    this._cur = Math.min(this._cur + amount, this.tuning.max);
    this.sinceGainMs = 0;
    if (this._cur >= this.tuning.max) {
      this._broken = true;
      this.stunLeftMs = this.tuning.stunMs;
      return true;
    }
    return false;
  }

  /**
   * Tira estrutura, parando em 0 (DEF-13, DEF-19). Quebrada, não muda; não conta como ganho, então o atraso da
   * queda segue de onde estava.
   */
  reduce(amount: number): void {
    if (this._broken) return;
    this._cur = Math.max(0, this._cur - amount);
  }

  /**
   * Avança o tempo de jogo. `decayPerSec` troca a taxa de queda do tuning neste passo (PST-14: fora do foco).
   * `true` no passo em que o atordoamento acaba e a barra volta a 0.
   */
  update(dtMs: number, decayPerSec: number = this.tuning.decayPerSec): boolean {
    if (this._broken) {
      this.stunLeftMs -= dtMs;
      if (this.stunLeftMs > 0) return false;
      this._broken = false;
      this._cur = 0;
      this.stunLeftMs = 0;
      this.sinceGainMs = 0;
      return true;
    }
    if (this._cur <= 0) {
      this.sinceGainMs += dtMs;
      return false;
    }
    const before = Math.max(0, this.sinceGainMs - this.tuning.decayDelayMs);
    this.sinceGainMs += dtMs;
    const after = Math.max(0, this.sinceGainMs - this.tuning.decayDelayMs);
    this._cur = Math.max(0, this._cur - (decayPerSec * (after - before)) / 1000);
    return false;
  }

  /** Nova run ou morte: zera. */
  reset(): void {
    this._cur = 0;
    this._broken = false;
    this.sinceGainMs = 0;
    this.stunLeftMs = 0;
  }
}
