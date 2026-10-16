import { DomainState } from '../../core/domain';
import { parseChargeParam, parseDomainParam } from '../../core/domainParam';
import type { DomainSnapshot } from '../../game/domainSnapshot';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';

/**
 * O que o Domínio muda na folha de atributos. Neutro até o Jackpot e a Amplificação (T22 leva o tipo para
 * `core/domainEffects.ts` e a T27 liga o `statMods` ao `domainStatMods`).
 */
export interface DomainStatMods {
  meleeMul: number;
  costMul: number;
  cooldownMul: number;
  techLocked: boolean;
  guardPierce: boolean;
  nullifyProjectiles: boolean;
  energyLock: boolean;
}

const NEUTRAL_MODS: DomainStatMods = {
  meleeMul: 1,
  costMul: 1,
  cooldownMul: 1,
  techLocked: false,
  guardPierce: false,
  nullifyProjectiles: false,
  energyLock: false,
};

/**
 * Liga o `DomainState` (a barra e a posse da Expansão de Domínio, DOM-01 a DOM-05) ao debug e ao snapshot. Campo
 * `domain` do `BuildDirector`; o estado zera no `reset` da run nova.
 */
export class DomainDirector {
  readonly state = new DomainState();

  constructor(readonly s: TestScene) {}

  /** Run nova: nada do Domínio da run anterior sobrevive (DOM-05). */
  reset(): void {
    this.state.reset();
  }

  /**
   * `?debug&domain=<id>[:<nível>]` e `charge=<n>` (DDB-02), lidos depois do `stats.reset()`: o Domínio do parâmetro no
   * nível dele com a carga pedida. Entrada inválida é ignorada; `charge=` sem `domain=` não faz nada.
   */
  applyDebug(): void {
    const owned = parseDomainParam(debugParam('domain'));
    if (owned) this.state.own(owned.id, owned.level);
    const charge = parseChargeParam(debugParam('charge'));
    if (charge !== null) this.state.setCharge(charge);
  }

  statMods(): DomainStatMods {
    return NEUTRAL_MODS;
  }

  /** Campo `domain` do snapshot de debug (DDB-01). */
  snapshot(): DomainSnapshot {
    const { owned, charge, active, ready, veilPending } = this.state;
    return {
      owned: owned ? { ...owned } : null,
      charge,
      ready,
      active: active ? { id: active.id, level: active.level, remainingMs: active.remainingMs } : null,
      jackpot: null,
      triggersLastSecond: 0,
      veilPending: veilPending !== null,
    };
  }
}
