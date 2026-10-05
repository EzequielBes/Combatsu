import { Rng } from './rng';

/** Estágios de cor de uma língua (0 = núcleo quente) e tamanhos (0 = maior). */
export const FLAME_STAGES = 4;
export const FLAME_SIZES = 4;

/** Como a chama se comporta; os padrões são os da energia amaldiçoada no punho. */
export interface FlameTuning {
  /** Línguas novas por segundo. */
  ratePerS: number;
  /** Vida de uma língua (ms): mínimo e variação. */
  lifeMs: number;
  lifeJitterMs: number;
  /** Subida no nascimento (px/s) e aceleração para cima (px/s²). */
  rise: number;
  riseAccel: number;
  /** Balanço lateral: amplitude (px) e frequência (rad/s). */
  swayPx: number;
  swayHz: number;
  /** Espalhamento do nascimento em volta da fonte (px). */
  spreadX: number;
  spreadY: number;
  /** Fração do movimento da fonte que a língua herda ao nascer: o resto fica para trás, em rastro. */
  inherit: number;
  /** Línguas a mais por px que a fonte anda num quadro: o punho que dispara deixa um rastro contínuo. */
  perPx: number;
  /** Quanto abaixo da fonte as línguas nascem (px): a chama envolve o punho em vez de sair só de cima dele. */
  baseDrop: number;
}

export const FIST_FLAME: FlameTuning = {
  ratePerS: 110,
  lifeMs: 200,
  lifeJitterMs: 200,
  rise: 22,
  riseAccel: 170,
  swayPx: 1.8,
  swayHz: 15,
  spreadX: 5,
  spreadY: 3,
  inherit: 0.15,
  perPx: 0.32,
  baseDrop: 5,
};

/** Uma língua da chama: onde está (px de mundo, a base da labareda) e como desenhá-la. */
export interface Tongue {
  x: number;
  y: number;
  stage: number;
  size: number;
}

interface Particle extends Tongue {
  vx: number;
  vy: number;
  age: number;
  life: number;
  phase: number;
  /** Tamanho com que nasceu: as menores nascem na borda e dão a franja da chama. */
  born: number;
  baseX: number;
}

/**
 * Simulação da chama de energia amaldiçoada, sem `phaser`: línguas nascem na fonte, sobem acelerando e balançando,
 * encolhem e esfriam do núcleo claro à ponta escura. A lista sai da mais velha para a mais nova: desenhando nessa
 * ordem, as novas (claras) ficam por cima e as pontas escuras ficam atrás. Como cada língua fica onde nasceu, a
 * fonte em movimento deixa um rastro.
 */
export class FlameSim {
  private readonly parts: Particle[] = [];
  private readonly rng: Rng;
  private readonly tuning: FlameTuning;
  private debt = 0;
  private last: { x: number; y: number } | null = null;

  constructor(seed = 1, tuning: FlameTuning = FIST_FLAME) {
    this.rng = new Rng(seed);
    this.tuning = tuning;
  }

  /** As línguas vivas, da mais velha para a mais nova. */
  get tongues(): readonly Tongue[] {
    return this.parts;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  /**
   * Avança `dtMs`. Com `at`, a chama está acesa nesse ponto e nascem línguas novas (`power` escala quantas); com
   * `null`, só as que já existem sobem até apagar.
   */
  tick(dtMs: number, at: { x: number; y: number } | null, power = 1): void {
    const dt = dtMs / 1000;
    if (at) this.emit(dt, at, power);
    else this.last = null;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.age += dtMs;
      if (p.age >= p.life) this.parts.splice(i, 1);
      else this.move(p, dt);
    }
  }

  private emit(dt: number, at: { x: number; y: number }, power: number): void {
    const t = this.tuning;
    const from = this.last ?? at;
    const dx = at.x - from.x;
    const dy = at.y - from.y;
    this.last = { x: at.x, y: at.y };
    this.debt += t.ratePerS * power * dt + Math.hypot(dx, dy) * t.perPx;
    const count = Math.floor(this.debt);
    this.debt -= count;
    for (let i = 0; i < count; i++) {
      // As línguas do quadro nascem espalhadas pelo caminho que a fonte andou, não todas no ponto de chegada. As que
      // ficam para trás já nascem frias e menores: o núcleo claro é só o punho, e o rastro é azul.
      const k = count > 1 ? i / (count - 1) : 1;
      const behind = Math.hypot(dx, dy) * (1 - k) > 4;
      this.spawn(from.x + dx * k, from.y + dy * k, dt > 0 ? dx / dt : 0, dt > 0 ? dy / dt : 0, behind);
    }
  }

  private spawn(sx: number, sy: number, vx: number, vy: number, behind: boolean): void {
    const t = this.tuning;
    // Longe do centro a língua nasce menor e vive menos: o miolo fica cheio e a borda vira franja.
    const off = this.rng.next() * 2 - 1;
    const edge = Math.abs(off);
    const x = sx + off * t.spreadX;
    const life = (t.lifeMs + this.rng.next() * t.lifeJitterMs) * (1 - edge * 0.4);
    this.parts.push({
      x,
      baseX: x,
      y: sy + t.baseDrop + (this.rng.next() * 2 - 1) * t.spreadY,
      vx: vx * t.inherit,
      vy: vy * t.inherit - t.rise * (0.6 + this.rng.next() * 0.8),
      age: behind ? life * 0.3 : 0,
      life,
      phase: this.rng.next() * Math.PI * 2,
      born: behind || edge > 0.6 ? 1 : 0,
      stage: 0,
      size: 0,
    });
  }

  private move(p: Particle, dt: number): void {
    const t = this.tuning;
    const f = p.age / p.life;
    p.vy -= t.riseAccel * dt;
    p.vx *= 1 - Math.min(1, dt * 6);
    p.baseX += p.vx * dt;
    p.y += p.vy * dt;
    p.x = p.baseX + Math.sin(p.phase + (p.age / 1000) * t.swayHz) * t.swayPx * f;
    // A língua esfria antes de encolher: o núcleo claro dura pouco e a maior parte da chama é azul.
    p.stage = Math.min(FLAME_STAGES - 1, Math.floor(f ** 0.7 * 1.15 * FLAME_STAGES));
    p.size = Math.min(FLAME_SIZES - 1, p.born + Math.floor(f * f * 1.15 * FLAME_SIZES));
  }
}
