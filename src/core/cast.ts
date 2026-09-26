import type { CursedEnergy } from './energy';
import type { Loadout } from './loadout';
import { TECHNIQUES, type TechDef, type TechId } from '../data/techniques';

export type CastState = 'sign' | 'charge' | 'release' | 'recover';
export type DenyReason = 'energy' | 'cooldown' | 'busy';

/** Fase do golpe corpo a corpo e se o player está impedido de conjurar por outro motivo (segurando objeto, hitstun). */
export interface CastContext {
  meleePhase: 'none' | 'startup' | 'active' | 'recover';
  busy: boolean;
}

export type CastEvent =
  | { type: 'enter'; state: CastState }
  | { type: 'end' }
  | { type: 'denied'; reason: DenyReason }
  | { type: 'cancel' };

export interface ActiveCastView {
  slot: 0 | 1;
  id: TechId;
  state: CastState;
  elapsedMs: number;
}

const STATE_ORDER: readonly CastState[] = ['sign', 'charge', 'release', 'recover'];

function msFor(def: TechDef, state: CastState): number {
  switch (state) {
    case 'sign':
      return def.signMs;
    case 'charge':
      return def.chargeMs;
    case 'release':
      return def.releaseMs;
    case 'recover':
      return def.recoverMs;
  }
}

interface Active {
  slot: 0 | 1;
  id: TechId;
  state: CastState;
  elapsedMs: number;
  timer: number;
}

/**
 * Máquina de conjuração (CAST-01..10, 20, 21): `sign → charge → release → recover`, pulando estados de tempo 0
 * (CUT-01: charge 0). Custo e recarga só na entrada de `release` (CAST-03, CAST-04); cancelar em `sign`/`charge`
 * (por dano, CAST-07) não cobra nem inicia recarga (CAST-21). Não depende de Phaser.
 */
export class CastMachine {
  private active: Active | null = null;

  constructor(
    private readonly energy: CursedEnergy,
    private readonly loadout: Loadout,
  ) {}

  get cast(): ActiveCastView | null {
    if (!this.active) return null;
    const { slot, id, state, elapsedMs } = this.active;
    return { slot, id, state, elapsedMs };
  }

  get inProgress(): boolean {
    return this.active !== null;
  }

  /**
   * Pedido de conjuração no `slot` (CAST-01, CAST-05, CAST-06, CAST-08, CAST-09, CAST-10). Recusado, nada muda
   * (energia, recarga, combo) — só o evento `denied` é emitido.
   */
  request(slot: 0 | 1, ctx: CastContext): CastEvent[] {
    // CAST-08: uma conjuração por vez, uma tecla nova não interrompe nem inicia outra.
    if (this.active) return [];
    const slotDef = this.loadout.slotsView[slot];
    if (!slotDef) return []; // slot vazio: nada a conjurar, sem evento de negação específico.
    // CAST-09: segurando objeto, em hitstun (busy) ou no startup/active do golpe bloqueiam; CAST-10: recover não.
    if (ctx.busy || ctx.meleePhase === 'startup' || ctx.meleePhase === 'active') {
      return [{ type: 'denied', reason: 'busy' }];
    }
    if (this.loadout.cooldownOf(slot) > 0) {
      return [{ type: 'denied', reason: 'cooldown' }];
    }
    const cost = this.loadout.cost(slotDef.id);
    if (this.energy.cur < cost) {
      return [{ type: 'denied', reason: 'energy' }];
    }
    this.active = { slot, id: slotDef.id, state: 'sign', elapsedMs: 0, timer: 0 };
    const events: CastEvent[] = [];
    this.enterState('sign', events, 0);
    return events;
  }

  /**
   * Avança o relógio de jogo (CAST-02). Pula estados de 0 ms sem esperar um frame e carrega o excesso de `dtMs`
   * que passar do fim de um estado para o próximo (senão um `dtMs` grande perderia tempo entre estados).
   */
  update(dtMs: number): CastEvent[] {
    const events: CastEvent[] = [];
    if (!this.active) return events;
    this.active.elapsedMs += dtMs;
    this.active.timer -= dtMs;
    if (this.active.timer <= 0) this.advance(events, -this.active.timer);
    return events;
  }

  /** CAST-07: dano em `sign`/`charge` cancela a conjuração sem cobrar nem iniciar recarga (CAST-20, CAST-21). */
  damageTaken(): CastEvent[] {
    if (this.active && (this.active.state === 'sign' || this.active.state === 'charge')) {
      this.active = null;
      return [{ type: 'cancel' }];
    }
    return [];
  }

  /** `overshoot` é o tempo que já passou do fim do estado anterior e conta já dentro do novo estado. */
  private enterState(state: CastState, events: CastEvent[], overshoot: number): void {
    if (!this.active) return;
    const def = TECHNIQUES[this.active.id];
    this.active.state = state;
    this.active.elapsedMs = 0;
    this.active.timer = msFor(def, state) - overshoot;
    events.push({ type: 'enter', state });
    if (state === 'release') {
      // CAST-03/CAST-04: custo e recarga cobrados exatamente uma vez, só na entrada de `release`.
      this.energy.trySpend(this.loadout.cost(this.active.id));
      this.loadout.startCooldown(this.active.slot);
    }
    if (this.active.timer <= 0) this.advance(events, -this.active.timer);
  }

  private advance(events: CastEvent[], overshoot: number): void {
    if (!this.active) return;
    const idx = STATE_ORDER.indexOf(this.active.state);
    const next = STATE_ORDER[idx + 1];
    if (!next) {
      this.active = null;
      events.push({ type: 'end' });
      return;
    }
    this.enterState(next, events, overshoot);
  }
}
