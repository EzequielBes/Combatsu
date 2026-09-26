import { normalize, type Vec2 } from './hit';
import { TECHNIQUES } from '../data/techniques';

const AHEAD_PX = 110; // BLU-02
const WALL_MARGIN_PX = 16; // BLU-02
const RADIUS = 130; // BLU-04, BLU-06, BLU-07
const PULL_SPEED = 150; // BLU-04
const TICK_MS = 250; // BLU-06
const LIFE_MS = 1400; // BLU-03

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

/** BLU-02: 110 px à frente do centro do player, ou 16 px antes da 1ª parede se ela estiver mais perto que 110 px. */
export function blueOrbSpawn(playerCenter: Vec2, facing: 1 | -1, wallDistanceAhead: number): Vec2 {
  const dist = wallDistanceAhead < AHEAD_PX ? Math.max(0, wallDistanceAhead - WALL_MARGIN_PX) : AHEAD_PX;
  return { x: playerCenter.x + facing * dist, y: playerCenter.y };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Estado do orbe Azul (BLU-02, 03, 04, 06, 07, 12): fica parado na posição de nascimento por 1400 ms, puxa
 * inimigos comuns a 150 px/s a até 130 px, dá 5 de dano leve a cada 250 ms a todos (inimigo e chefe) nesse raio,
 * e 10 de dano leve, uma vez, na implosão final. A física (aplicar a velocidade por step) fica para a fase 5.
 * Sem `phaser` aqui.
 */
export class BlueOrbState {
  private readonly spawn: Vec2;
  private elapsedMs = 0;
  private ticksDone = 0;
  private _ended = false;

  constructor(spawn: Vec2) {
    this.spawn = spawn;
  }

  /** BLU-12: a posição nunca muda — sempre igual à de nascimento. */
  get position(): Vec2 {
    return this.spawn;
  }

  get ended(): boolean {
    return this._ended;
  }

  /** BLU-04, BLU-05: velocidade de puxão dos inimigos comuns a até 130 px do orbe; o chefe nunca é puxado. */
  pullTargets(targets: readonly BlueOrbTarget[]): BlueOrbPull[] {
    const pulls: BlueOrbPull[] = [];
    for (const t of targets) {
      if (t.kind !== 'enemy') continue;
      if (distance(t.center, this.spawn) > RADIUS) continue;
      const dir = normalize({ x: this.spawn.x - t.center.x, y: this.spawn.y - t.center.y });
      pulls.push({ targetId: t.id, velocity: { x: dir.x * PULL_SPEED, y: dir.y * PULL_SPEED } });
    }
    return pulls;
  }

  /** BLU-06: alvos (inimigo comum e chefe) a até 130 px que recebem 5 de dano leve neste tick de 250 ms. */
  tickTargets(targets: readonly BlueOrbTarget[]): BlueOrbDamage[] {
    return targets
      .filter((t) => distance(t.center, this.spawn) <= RADIUS)
      .map((t) => ({ targetId: t.id, damage: TECHNIQUES.azul.damage.tick }));
  }

  /** BLU-07: alvos (inimigo comum e chefe) a até 130 px do centro que recebem 10 de dano leve na implosão. */
  implosionTargets(targets: readonly BlueOrbTarget[]): BlueOrbDamage[] {
    return targets
      .filter((t) => distance(t.center, this.spawn) <= RADIUS)
      .map((t) => ({ targetId: t.id, damage: TECHNIQUES.azul.damage.end }));
  }

  /**
   * Avança o relógio de vida do orbe. Devolve quantos novos ticks de 250 ms (BLU-06) aconteceram neste passo e
   * se a vida chegou a 1400 ms (BLU-03: fim, com a implosão de BLU-07).
   */
  update(dtMs: number): { ticksCrossed: number; ended: boolean } {
    if (this._ended) return { ticksCrossed: 0, ended: false };
    const before = this.elapsedMs;
    this.elapsedMs += dtMs;
    // 1400 / 250 = 5,6: o `floor` já dá exatamente 5 ticks (250..1250) sem contar um 6º na borda de 1400 ms.
    const cappedElapsed = Math.min(this.elapsedMs, LIFE_MS);
    const ticksNow = Math.floor(cappedElapsed / TICK_MS);
    const ticksCrossed = ticksNow - this.ticksDone;
    this.ticksDone = ticksNow;
    const ended = before < LIFE_MS && this.elapsedMs >= LIFE_MS;
    if (ended) this._ended = true;
    return { ticksCrossed, ended };
  }
}
