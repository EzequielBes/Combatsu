import { normalize, type Vec2 } from './hit';
import { TECH_GEOMETRY } from '../data/techniques';
import type { TechStats } from './techStats';

/**
 * O que o orbe precisa da conjuração (TST-02): raio da puxada, do tique e da implosão (BLU-04/06/07), velocidade da
 * puxada (BLU-04), intervalo dos tiques (BLU-06), vida (BLU-03) e os danos já escalados do tique e da implosão,
 * tirados do `TechStats` do nascimento.
 */
export interface BlueOrbConfig {
  radius: number;
  pullSpeed: number;
  tickMs: number;
  lifeMs: number;
  tick: number;
  end: number;
}

/** Geometria do Azul resolvida no `TechStats` (nascimento, raio, puxada, tique, vida, consulta de parede). */
export type BlueGeometry = NonNullable<TechStats['blue']>;

/** A geometria de um `TechStats` do Azul; sem `blue` (não é o Azul) cai na da tabela. */
export function blueGeometry(stats: TechStats): BlueGeometry {
  return stats.blue ?? TECH_GEOMETRY.azul;
}

/** O `BlueOrbConfig` de um `TechStats` do Azul. */
export function blueOrbConfig(stats: TechStats): BlueOrbConfig {
  const blue = blueGeometry(stats);
  return {
    radius: blue.radius,
    pullSpeed: blue.pullSpeed,
    tickMs: blue.tickMs,
    lifeMs: blue.lifeMs,
    tick: stats.damage.tick,
    end: stats.damage.end,
  };
}

export interface BlueOrbTarget {
  id: number;
  center: Vec2;
  /** BLU-04/BLU-05: só o inimigo comum é puxado; o chefe recebe dano do tick e da implosão, mas não se move. */
  kind: 'enemy' | 'boss';
}

export interface BlueOrbPull {
  targetId: number;
  /** Velocidade (px/s) apontando para o centro do orbe, a 150 px/s (BLU-04). */
  velocity: Vec2;
}

export interface BlueOrbDamage {
  targetId: number;
  damage: number;
}

/**
 * BLU-02: `aheadPx` (110 px) à frente do centro do player, ou `wallMarginPx` (16 px) antes da 1ª parede se ela
 * estiver mais perto que isso. A geometria vem do stat; sem ela, a da tabela.
 */
export function blueOrbSpawn(
  playerCenter: Vec2,
  facing: 1 | -1,
  wallDistanceAhead: number,
  geometry: { aheadPx: number; wallMarginPx: number } = TECH_GEOMETRY.azul,
): Vec2 {
  const { aheadPx, wallMarginPx } = geometry;
  const dist = wallDistanceAhead < aheadPx ? Math.max(0, wallDistanceAhead - wallMarginPx) : aheadPx;
  return { x: playerCenter.x + facing * dist, y: playerCenter.y };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Estado do orbe Azul (BLU-02, 03, 04, 06, 07, 12): fica parado na posição de nascimento pela vida do `config`
 * (1400 ms), puxa inimigos comuns na velocidade dele (150 px/s) até o raio dele (130 px), dá o dano do tique (5) a
 * cada intervalo (250 ms) a todos (inimigo e chefe) nesse raio, e o da implosão (10), uma vez, no fim. A física
 * (aplicar a velocidade por step) fica no adaptador. Sem `phaser` aqui.
 */
export class BlueOrbState {
  private readonly spawn: Vec2;
  private elapsedMs = 0;
  private ticksDone = 0;
  private _ended = false;

  constructor(
    spawn: Vec2,
    private readonly config: BlueOrbConfig,
  ) {
    this.spawn = spawn;
  }

  /** BLU-12: a posição nunca muda — sempre igual à de nascimento. */
  get position(): Vec2 {
    return this.spawn;
  }

  get ended(): boolean {
    return this._ended;
  }

  /** BLU-04, BLU-05: velocidade de puxão dos inimigos comuns a até `config.radius` do orbe; o chefe nunca é puxado. */
  pullTargets(targets: readonly BlueOrbTarget[]): BlueOrbPull[] {
    const { pullSpeed } = this.config;
    const pulls: BlueOrbPull[] = [];
    for (const t of this.inRadius(targets)) {
      if (t.kind !== 'enemy') continue;
      const dir = normalize({ x: this.spawn.x - t.center.x, y: this.spawn.y - t.center.y });
      pulls.push({ targetId: t.id, velocity: { x: dir.x * pullSpeed, y: dir.y * pullSpeed } });
    }
    return pulls;
  }

  /** BLU-06: alvos (inimigo comum e chefe) a até `config.radius` que recebem o dano leve do tique neste intervalo. */
  tickTargets(targets: readonly BlueOrbTarget[]): BlueOrbDamage[] {
    return this.inRadius(targets).map((t) => ({ targetId: t.id, damage: this.config.tick }));
  }

  /** BLU-07: alvos (inimigo comum e chefe) a até `config.radius` do centro que recebem o dano leve da implosão. */
  implosionTargets(targets: readonly BlueOrbTarget[]): BlueOrbDamage[] {
    return this.inRadius(targets).map((t) => ({ targetId: t.id, damage: this.config.end }));
  }

  /** Alvos a até `config.radius` do orbe (raio inclusivo, L-010). */
  private inRadius(targets: readonly BlueOrbTarget[]): BlueOrbTarget[] {
    return targets.filter((t) => distance(t.center, this.spawn) <= this.config.radius);
  }

  /**
   * Avança o relógio de vida do orbe. Devolve quantos novos ticks (BLU-06, a cada `tickMs`) aconteceram neste passo
   * e se a vida chegou a `lifeMs` (BLU-03: fim, com a implosão de BLU-07).
   */
  update(dtMs: number): { ticksCrossed: number; ended: boolean } {
    if (this._ended) return { ticksCrossed: 0, ended: false };
    const { tickMs, lifeMs } = this.config;
    const before = this.elapsedMs;
    this.elapsedMs += dtMs;
    // 1400 / 250 = 5,6: o `floor` já dá exatamente 5 ticks (250..1250) sem contar um 6º na borda de 1400 ms.
    const cappedElapsed = Math.min(this.elapsedMs, lifeMs);
    const ticksNow = Math.floor(cappedElapsed / tickMs);
    const ticksCrossed = ticksNow - this.ticksDone;
    this.ticksDone = ticksNow;
    const ended = before < lifeMs && this.elapsedMs >= lifeMs;
    if (ended) this._ended = true;
    return { ticksCrossed, ended };
  }
}
