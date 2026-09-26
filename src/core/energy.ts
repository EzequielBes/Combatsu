import { CE } from '../data/techniques';

/** Teto de energia no nível `n` do upgrade `energia` (CE-07, TSH-10). */
export const cursedEnergyMaxAtLevel = (n: number): number => Math.min(CE.max + CE.maxPerLevel * n, CE.maxCap);

/** Regen por segundo no nível `n` do upgrade `fluxo` (CE-09, TSH-11). */
export const cursedEnergyRegenAtLevel = (n: number): number => Math.min(CE.regen + CE.regenPerLevel * n, CE.regenCap);

/**
 * Energia amaldiçoada do player (CE-01..09): regenera com o tempo de jogo enquanto nenhuma conjuração está em
 * andamento, nunca sai de [0, max] e não regenera durante a conjuração (CE-05).
 */
export class CursedEnergy {
  private _cur: number;
  private _max: number;
  private _regen: number;

  constructor() {
    this._max = CE.max;
    this._regen = CE.regen;
    this._cur = this._max;
  }

  get cur(): number {
    return this._cur;
  }

  get max(): number {
    return this._max;
  }

  get regen(): number {
    return this._regen;
  }

  /** CE-04: `regen × dt / 1000` por frame de jogo, com teto; CE-05: nada regenera durante a conjuração. */
  update(dtMs: number, casting: boolean): void {
    if (casting) return;
    this._cur = Math.min(this._max, this._cur + (this._regen * dtMs) / 1000);
  }

  /** Ganha `n`, com teto e piso (CE-02, CE-03; usado por CE-06 e KOK-09). */
  gain(n: number): void {
    this._cur = Math.min(this._max, Math.max(0, this._cur + n));
  }

  /** Gasta `cost` se houver saldo suficiente; recusa e não muda nada senão (CAST-03/CAST-05). */
  trySpend(cost: number): boolean {
    if (this._cur < cost) return false;
    this._cur = Math.max(0, this._cur - cost);
    return true;
  }

  /** Aplica os níveis de `energia`/`fluxo` da loja (TSH-10, TSH-11); recorta `cur` se o teto baixou. */
  setLevels(energiaLevel: number, fluxoLevel: number): void {
    this._max = cursedEnergyMaxAtLevel(energiaLevel);
    this._regen = cursedEnergyRegenAtLevel(fluxoLevel);
    this._cur = Math.min(this._cur, this._max);
  }

  /** Nova run (CE-01): volta a 100/100/8, sem os upgrades da run anterior. */
  reset(): void {
    this._max = CE.max;
    this._regen = CE.regen;
    this._cur = this._max;
  }
}
