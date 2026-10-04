import { ENEMY_GUARD, READING } from '../data/moves';
import type { GuardRoll, GuardTrigger } from './enemyGuard';
import type { Strength } from './hit';

/**
 * Histórico dos golpes do jogador nos últimos `windowMs`, para o inimigo ler a repetição (RDG-01). O tempo é o de
 * jogo, passado em `note`.
 */
export class MoveReading {
  private readonly starts = new Map<string, number[]>();
  private _last: { move: string | null; repeats: number } = { move: null, repeats: 0 };

  constructor(private readonly t: { windowMs: number } = READING) {}

  /** Último golpe iniciado e as repetições dele, para o snapshot (`reading`). */
  get last(): { move: string | null; repeats: number } {
    return this._last;
  }

  /** Registra o início de `move` em `nowMs` e devolve quantos inícios dele houve nos `windowMs` anteriores. */
  note(move: string, nowMs: number): number {
    const recent = (this.starts.get(move) ?? []).filter((at) => nowMs - at <= this.t.windowMs);
    recent.push(nowMs);
    this.starts.set(move, recent);
    const repeats = recent.length - 1;
    this._last = { move, repeats };
    return repeats;
  }

  reset(): void {
    this.starts.clear();
    this._last = { move: null, repeats: 0 };
  }
}

/** Bônus de guarda pela repetição: `min(perRepeat × repeats, 1)` (RDG-02). */
export function readingBonus(repeats: number, t: { perRepeat: number } = READING): number {
  return Math.min(t.perRepeat * repeats, 1);
}

/**
 * Condições do EBL-01 para a chance base de guarda: golpe leve, inimigo em `idle`, jogador virado para ele e a no
 * máximo `ENEMY_GUARD.triggerRangePx` na horizontal.
 */
export function baseConditionsHold(t: GuardTrigger, strength: Strength): boolean {
  return strength === 'light' && t.idle && t.playerFacingEnemy && t.distancePx <= ENEMY_GUARD.triggerRangePx;
}

/**
 * Probabilidade de o inimigo levantar a guarda (RDG-03, RDG-10). Sem `override`: `min(base + reading, 1)`, com a
 * `base` valendo só se as condições do EBL-01 valem. Com `override`: o override se elas valem e 0 se não, sem somar
 * a leitura. `reading` é o `readingBonus`.
 */
export function guardChance(i: { base: number; reading: number; override?: number; baseConditions: boolean }): number {
  if (i.override !== undefined) return i.baseConditions ? i.override : 0;
  return Math.min((i.baseConditions ? i.base : 0) + i.reading, 1);
}

/** Leves seguidos no mesmo inimigo, até `streakGapMs` entre eles e sem golpe forte no meio (RDG-13..15). */
export class LightStreak {
  private _count = 0;
  private lastAt = 0;

  constructor(private readonly t: { streakGapMs: number } = READING) {}

  get count(): number {
    return this._count;
  }

  /** Um leve foi aceito em `nowMs`: soma se veio dentro do intervalo, senão recomeça em 1. Devolve a contagem. */
  onLight(nowMs: number): number {
    this._count = this._count > 0 && nowMs - this.lastAt <= this.t.streakGapMs ? this._count + 1 : 1;
    this.lastAt = nowMs;
    return this._count;
  }

  /** Um golpe forte foi aceito: zera (RDG-15). */
  onHeavy(): void {
    this._count = 0;
  }

  reset(): void {
    this._count = 0;
  }
}

/** Sorteio do empurrão (RDG-16): só com `streakMin` leves seguidos ou mais, e devolve o resultado do sorteio. */
export function shoveRoll(
  i: { streak: number; chance: number; roll: GuardRoll },
  t: { streakMin: number } = READING,
): boolean {
  return i.streak >= t.streakMin && i.roll.chance(i.chance);
}
