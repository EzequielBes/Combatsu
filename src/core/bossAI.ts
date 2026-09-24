import { BOSS } from '../data/tuning';
import type { BossSpec } from './bossTier';

export type BossAttack = 'charge' | 'leap' | 'volley';
export type BossAIState = 'rest' | 'windup' | 'charge' | 'leap' | 'volley';

export interface BossAITuning {
  phases: readonly { windupMult: number; restMs: number }[];
  charge: { windupMs: number; speed: number; maxDist: number };
  leap: { windupMs: number; durationMs: number };
  volley: { windupMs: number; intervalMs: number };
}

export interface BossAIObservation {
  selfX: number;
  playerX: number;
  /** A investida bateu numa parede (encerra o movimento, BAT-01). */
  blocked: boolean;
  /** `false` na intro, no rugido, no atordoamento ou morto: sem mover, sem atacar (BAI-05). */
  canAct: boolean;
  phase: 1 | 2 | 3;
  /** `volleyCount` e `projectileSpeed` do arquétipo (BTIER-05, BTIER-07). */
  spec: Pick<BossSpec, 'volleyCount' | 'projectileSpeed'>;
}

export type BossAIEvent =
  | { type: 'hitboxOn' }
  | { type: 'hitboxOff' }
  | { type: 'fire'; dir: 1 | -1; speed: number }
  | { type: 'landed' };

export interface BossAIOutput {
  /** px/s, só horizontal; só != 0 durante a investida. */
  vx: number;
  leap: { fromX: number; toX: number; progress: number } | null;
  state: BossAIState;
  attack: BossAttack | null;
  events: BossAIEvent[];
}

/** Ciclo de ataques por fase (BAI-02): recomeça do primeiro ao trocar de fase. */
const CYCLES: Readonly<Record<1 | 2 | 3, readonly BossAttack[]>> = {
  1: ['charge', 'leap'],
  2: ['charge', 'volley', 'leap'],
  3: ['volley', 'charge', 'leap', 'charge'],
};

/**
 * Ciclo de ataques do chefe (BAI-02/03/11, BAT-01/02/04/05/09/10/11): puro, sem `phaser` (AD-001). `update`
 * recebe as observações do frame e devolve velocidade, progresso do salto, estado/ataque atual e eventos.
 * Sem `canAct` fecha a hitbox da investida se estava aberta, zera `vx` e cancela o ataque em andamento -
 * ele não retoma de onde parou (BAI-05); ao trocar de fase, o ciclo recomeça do primeiro ataque.
 */
export class BossAI {
  private _state: BossAIState = 'rest';
  private timer = 0;
  private facing: 1 | -1 = 1;
  private currentPhase: 1 | 2 | 3 = 1;
  private cycleIndex = 0;
  private currentAttack: BossAttack | null = null;

  private chargeDir: 1 | -1 = 1;
  private chargeTraveled = 0;

  private leapFromX = 0;
  private leapToX = 0;
  private leapProgress = 0;

  private volleyDir: 1 | -1 = 1;
  private volleyFired = 0;

  private currentVx = 0;

  constructor(private readonly t: BossAITuning = BOSS) {}

  get state(): BossAIState {
    return this._state;
  }

  get attack(): BossAttack | null {
    return this.currentAttack;
  }

  update(dtMs: number, obs: BossAIObservation): BossAIOutput {
    if (obs.phase !== this.currentPhase) {
      this.currentPhase = obs.phase;
      this.cycleIndex = 0;
    }

    if (!obs.canAct) return this.interrupt();

    const events: BossAIEvent[] = [];
    this.step(dtMs, obs, events);

    const leap =
      this._state === 'leap'
        ? { fromX: this.leapFromX, toX: this.leapToX, progress: this.leapProgress }
        : events.some((e) => e.type === 'landed')
          ? { fromX: this.leapFromX, toX: this.leapToX, progress: 1 }
          : null;

    return { vx: this.currentVx, leap, state: this._state, attack: this.currentAttack, events };
  }

  /** Avança o estado atual; qualquer sobra de tempo de uma transição é repassada ao próximo estado no mesmo frame. */
  private step(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    switch (this._state) {
      case 'rest': {
        this.currentVx = 0;
        this.timer -= dtMs;
        if (this.timer > 0) return;
        const overrun = -this.timer;
        this.currentAttack = CYCLES[this.currentPhase][this.cycleIndex];
        this._state = 'windup';
        this.timer = this.windupDurationFor(this.currentAttack);
        this.step(overrun, obs, events);
        return;
      }
      case 'windup': {
        this.currentVx = 0;
        this.timer -= dtMs;
        if (this.timer > 0) return;
        const overrun = -this.timer;
        this.beginAttackBody(obs, events);
        this.step(overrun, obs, events);
        return;
      }
      case 'charge':
        this.stepCharge(dtMs, obs, events);
        return;
      case 'leap':
        this.stepLeap(dtMs, obs, events);
        return;
      case 'volley':
        this.stepVolley(dtMs, obs, events);
        return;
      default:
        return;
    }
  }

  /** Fixa a direção para o player e entra no corpo do ataque escolhido (BAT-01, BAT-02, BAT-04). */
  private beginAttackBody(obs: BossAIObservation, events: BossAIEvent[]): void {
    const dx = obs.playerX - obs.selfX;
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;

    switch (this.currentAttack) {
      case 'charge':
        this._state = 'charge';
        this.chargeDir = this.facing;
        this.chargeTraveled = 0;
        events.push({ type: 'hitboxOn' });
        return;
      case 'leap':
        this._state = 'leap';
        this.leapFromX = obs.selfX;
        this.leapToX = obs.playerX;
        this.leapProgress = 0;
        this.timer = this.t.leap.durationMs;
        return;
      case 'volley':
        this._state = 'volley';
        this.volleyDir = this.facing;
        this.volleyFired = 0;
        this.timer = 0;
        return;
      default:
        return;
    }
  }

  /** Investida (BAT-01/09): anda até `maxDist` ou até `blocked`, com a hitbox aberta durante o movimento. */
  private stepCharge(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    const remainingDist = this.t.charge.maxDist - this.chargeTraveled;
    const wantDist = this.t.charge.speed * (dtMs / 1000);
    const stepDist = Math.min(wantDist, remainingDist);
    this.chargeTraveled += stepDist;
    this.currentVx = this.chargeDir * this.t.charge.speed;

    const reachedMax = this.chargeTraveled >= this.t.charge.maxDist;
    if (reachedMax || obs.blocked) {
      events.push({ type: 'hitboxOff' });
      this.currentVx = 0;
      const overrun = reachedMax ? dtMs - (stepDist / this.t.charge.speed) * 1000 : 0;
      this.enterRestAfterAttack();
      if (overrun > 0) this.step(overrun, obs, events);
    }
  }

  /** Salto (BAT-02/10): `progress` de 0 a 1 em `leap.durationMs`; ao chegar a 1, emite `landed` uma vez. */
  private stepLeap(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    this.currentVx = 0;
    this.timer -= dtMs;
    this.leapProgress = Math.min(1, Math.max(0, (this.t.leap.durationMs - this.timer) / this.t.leap.durationMs));
    if (this.timer <= 0) {
      this.leapProgress = 1;
      events.push({ type: 'landed' });
      const overrun = -this.timer;
      this.enterRestAfterAttack();
      if (overrun > 0) this.step(overrun, obs, events);
    }
  }

  /** Rajada (BAT-04, BTIER-05/07): `spec.volleyCount` disparos a `intervalMs` de intervalo, o primeiro imediato. */
  private stepVolley(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    this.currentVx = 0;
    this.timer -= dtMs;
    while (this.volleyFired < obs.spec.volleyCount && this.timer <= 0) {
      events.push({ type: 'fire', dir: this.volleyDir, speed: obs.spec.projectileSpeed });
      this.volleyFired++;
      if (this.volleyFired < obs.spec.volleyCount) this.timer += this.t.volley.intervalMs;
    }
    if (this.volleyFired >= obs.spec.volleyCount) {
      const overrun = -this.timer;
      this.enterRestAfterAttack();
      if (overrun > 0) this.step(overrun, obs, events);
    }
  }

  /** Fim de um ataque (BAI-11): descansa pelo tempo da fase e avança o ciclo para o próximo ataque. */
  private enterRestAfterAttack(): void {
    this._state = 'rest';
    this.timer = this.t.phases[this.currentPhase - 1].restMs;
    this.currentAttack = null;
    this.cycleIndex = (this.cycleIndex + 1) % CYCLES[this.currentPhase].length;
  }

  private windupDurationFor(attack: BossAttack): number {
    const m = this.t.phases[this.currentPhase - 1].windupMult;
    const base =
      attack === 'charge' ? this.t.charge.windupMs : attack === 'leap' ? this.t.leap.windupMs : this.t.volley.windupMs;
    return base * m;
  }

  /** Sem `canAct`: fecha a hitbox da investida se estava aberta, zera `vx` e cancela o ataque (BAI-05). */
  private interrupt(): BossAIOutput {
    const events: BossAIEvent[] = [];
    if (this._state === 'charge') events.push({ type: 'hitboxOff' });
    this._state = 'rest';
    this.timer = 0;
    this.currentAttack = null;
    this.currentVx = 0;
    return { vx: 0, leap: null, state: 'rest', attack: null, events };
  }
}
