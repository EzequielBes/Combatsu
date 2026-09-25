import type { Rng } from './rng';
import type { EconomyTuning } from '../data/tuning';

export type ToolKey = 'cursedKnife' | 'cursedClub';

/** Overrides de debug (ARM-15, HEAL-06, RAR-05): cada um pula só o sorteio que fixa. */
export interface LootOverrides {
  armed?: ToolKey;
  healChance?: number;
  rare?: boolean;
}

export interface EnemyDropResult {
  heal: boolean;
  fragments: number;
  value: number;
}

export interface RolledArmed {
  tool: ToolKey;
  rare: boolean;
}

export interface CapResult {
  spawn: number;
  extraOnLast: number;
}

export interface BurstVelocity {
  vx: number;
  vy: number;
}

/** Valor de cada fragmento na rodada `r` (ECO-04): cresce a cada `valueEvery` rodadas, sem teto. */
export function fragmentValue(round: number, t: EconomyTuning): number {
  return 1 + Math.floor((round - 1) / t.valueEvery);
}

/** Chance de um inimigo comum nascer armado na rodada `r` (ARM-02): 0 antes de `startRound`, cresce até `cap`. */
export function armedChance(round: number, t: EconomyTuning['armed']): number {
  if (round < t.startRound) return 0;
  return Math.min(t.base + t.perRound * (round - t.startRound), t.cap);
}

/**
 * Corta um drop de `n` pickups para caber no teto de `max` vivos (ECO-15, ECO-28): sempre nasce ao menos 1, e o
 * que não spawna vira valor extra somado no último pickup.
 */
export function capDrop(n: number, live: number, max = 60): CapResult {
  if (live + n <= max) return { spawn: n, extraOnLast: 0 };
  const spawn = Math.max(1, max - live);
  return { spawn, extraOnLast: n - spawn };
}

/** Velocidade inicial de um pickup ao estourar (ECO-06). */
export function burstVelocity(rng: Rng): BurstVelocity {
  return { vx: rng.int(-120, 120), vy: rng.int(-260, -180) };
}

/**
 * Todos os sorteios de um abate, numa ordem fixa (ECO-17, spec "Ordem dos sorteios por abate"), sobre o stream de
 * loot próprio da run. Cada override de debug pula só o sorteio que ele fixa; os demais mantêm a mesma ordem.
 */
export class Loot {
  constructor(
    private readonly rng: Rng,
    private readonly t: EconomyTuning,
    private readonly overrides: LootOverrides = {},
  ) {}

  /** Cura primeiro, depois a quantidade de fragmentos (ECO-02, ECO-03, HEAL-01). */
  enemyDrop(round: number, armed: boolean): EnemyDropResult {
    const healChance = this.overrides.healChance ?? this.t.healChance;
    const heal = this.rng.chance(healChance);
    let fragments = this.rng.int(this.t.fragmentsMin, this.t.fragmentsMax);
    if (armed) fragments += this.t.armedBonus;
    return { heal, fragments, value: fragmentValue(round, this.t) };
  }

  /** O chefe sempre solta o mesmo tanto de fragmentos e nunca solta cura (ECO-05, HEAL-02). */
  bossDrop(round: number): EnemyDropResult {
    return { heal: false, fragments: this.t.bossFragments, value: fragmentValue(round, this.t) };
  }

  /** chance → ferramenta → raro (ARM-02, ARM-03, RAR-01); `overrides.armed` pula os dois primeiros sorteios. */
  rollArmed(round: number): RolledArmed | null {
    let tool: ToolKey;
    if (this.overrides.armed) {
      tool = this.overrides.armed;
    } else {
      if (!this.rng.chance(armedChance(round, this.t.armed))) return null;
      tool = this.rng.int(0, 1) === 0 ? 'cursedKnife' : 'cursedClub';
    }
    const rare = this.overrides.rare ?? this.rng.chance(this.t.armed.rareChance);
    return { tool, rare };
  }
}
