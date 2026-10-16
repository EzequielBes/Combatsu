import { DOMAIN_CHARGE, type DomainId, type DomainLevel } from '../data/domains';

/**
 * Barra e posse da Expansão de Domínio (DOM-01 a DOM-05, DNV-01, VEU-03/04): carga inteira de 0 a 100 que só enche com o
 * que o jogador acerta e esvazia 10 a cada 8 s sem carga na rodada. Regra pura, sem o motor.
 */
export type ChargeEvent = 'light' | 'heavy' | 'prop' | 'kill' | 'defense' | 'techCast' | 'finisher' | 'kokusen';

/** O mínimo do Domínio ativo que a barra lê (o `ActiveDomain` de `domainActivation.ts` cumpre). */
export interface ActiveClock {
  remainingMs: number;
  totalMs: number;
}

export interface OwnedDomain {
  id: DomainId;
  level: DomainLevel;
}

export interface DomainBarView {
  visible: boolean;
  fill: number;
  blinking: boolean;
  active: boolean;
}

const clamp = (n: number): number => Math.min(DOMAIN_CHARGE.max, Math.max(0, Math.round(n)));

export class DomainState {
  owned: OwnedDomain | null = null;
  charge = 0;
  active: ActiveClock | null = null;
  veilPending: readonly [DomainId, DomainId] | null = null;
  bossChestPending = false;
  /** Tempo de `roundActive` seguido sem evento de carga (DOM-03). */
  private idleMs = 0;

  /** Passa a ter o Domínio `id` (o Baú do Véu entrega com `DOMAIN_CHARGE.veilStart`, VEU-03). */
  own(id: DomainId, level: DomainLevel = 1, charge = 0): void {
    this.owned = { id, level };
    this.charge = clamp(charge);
    this.idleMs = 0;
  }

  /** Sobe um nível sem mexer na carga; recusa sem Domínio e no Nv 3 (DNV-01). */
  raise(): boolean {
    if (!this.owned || this.owned.level >= 3) return false;
    this.owned = { ...this.owned, level: (this.owned.level + 1) as DomainLevel };
    return true;
  }

  /** Soma a carga do evento, só com Domínio e sem Domínio ativo (DOM-02.5); zera o relógio do esvaziamento. */
  addCharge(ev: ChargeEvent): void {
    if (!this.owned || this.active) return;
    this.charge = clamp(this.charge + DOMAIN_CHARGE[ev]);
    this.idleMs = 0;
  }

  /** Esvaziamento (DOM-03): o relógio só anda em `roundActive` com a carga entre 1 e 99. */
  tick(dtMs: number, roundActive: boolean): void {
    if (!roundActive || this.charge <= 0 || this.charge >= DOMAIN_CHARGE.max) return;
    this.idleMs += dtMs;
    while (this.idleMs >= DOMAIN_CHARGE.drainAfterMs && this.charge > 0) {
      this.idleMs -= DOMAIN_CHARGE.drainAfterMs;
      this.charge = clamp(this.charge - DOMAIN_CHARGE.drainStep);
    }
  }

  /** Carga do debug (`charge=`); sem dono não faz nada. */
  setCharge(n: number): void {
    if (!this.owned) return;
    this.charge = clamp(n);
    this.idleMs = 0;
  }

  markVeil(pair: readonly [DomainId, DomainId]): void {
    this.veilPending = pair;
  }

  /** Tira o par do Baú do Véu da fila (uma vez). */
  takeVeil(): readonly [DomainId, DomainId] | null {
    const pair = this.veilPending;
    this.veilPending = null;
    return pair;
  }

  /** Run nova: posse, carga, ativo e pendências (DOM-05, VEU-04.8). */
  reset(): void {
    this.owned = null;
    this.charge = 0;
    this.active = null;
    this.veilPending = null;
    this.bossChestPending = false;
    this.idleMs = 0;
  }

  get ready(): boolean {
    return this.owned !== null && this.charge >= DOMAIN_CHARGE.max && this.active === null;
  }
}

/** O que a barra mostra (DHD-01 a DHD-03): carga carregando, tempo restante com o Domínio ativo. */
export const domainBarView = (state: DomainState): DomainBarView => {
  const active = state.active !== null;
  const fill = state.active
    ? state.active.totalMs > 0
      ? state.active.remainingMs / state.active.totalMs
      : 0
    : state.charge / DOMAIN_CHARGE.max;
  return { visible: state.owned !== null, fill, blinking: state.ready, active };
};
