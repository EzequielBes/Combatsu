import { DomainState } from '../../core/domain';
import { ActiveDomain, activationDenial, type DomainEnd } from '../../core/domainActivation';
import { parseChargeParam, parseDomainParam } from '../../core/domainParam';
import type { Hit, HitBand } from '../../core/hit';
import { FINISHER_MOVE } from '../../data/moves';
import type { DomainSnapshot } from '../../game/domainSnapshot';
import type { DefenseKind } from '../../game/player/types';
import { acceptsPlayerInput } from '../../core/run';
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
  /** Último golpe do moveset que carregou: vários alvos do mesmo golpe carregam uma vez (DOM-02.3). */
  private lastSwingId: number | null = null;
  /** Relógio de jogo do último acerto de objeto que carregou: um por quadro. */
  private lastPropAtMs: number | null = null;
  /** Banda do último acerto de técnica que chegou pelo `onTechHit` (o `onCastHit` vem logo depois dele). */
  private lastTechBand: HitBand | undefined;
  /** Conjurações que já carregaram (uma vez por `castId`, DOM-02). */
  private readonly chargedCasts = new Set<number>();

  constructor(readonly s: TestScene) {}

  private event(name: string): void {
    this.s.snapshot.debugEvents.push(name);
  }

  /**
   * Um quadro de jogo (fora do hitstop e da loja), antes das técnicas: a tecla `P`/`N`, o relógio do Domínio e o
   * esvaziamento. Fora de `roundActive`/`intermission`/`traverse` e no laboratório nada anda (o input já chega neutro
   * nesses estados e na transição de área, `StatsDirector.inputFor`).
   */
  update(dtMs: number, pressed: boolean): void {
    if (this.s.fxLab || !acceptsPlayerInput(this.s.run.state)) return;
    if (pressed) this.tryActivate();
    // DOM-10: o tempo do Domínio cai com o tempo de jogo; no hitstop a cena não chama este `update`.
    if (this.state.active?.update(dtMs)) this.end('timer');
    this.state.tick(dtMs, this.s.run.state === 'roundActive');
  }

  /**
   * A tecla (DOM-06, DOM-07): a recusa empurra um `domainDenied:<motivo>` e não mexe na carga; aceita, termina o golpe
   * em curso, zera a carga, liga o Domínio no nível possuído e empurra `domain:<id>`.
   */
  private tryActivate(): void {
    const denial = activationDenial(this.state, this.busy());
    if (denial) {
      this.event(`domainDenied:${denial}`);
      return;
    }
    const owned = this.state.owned!;
    if (this.s.player.moveName !== null) this.s.player.cancelMelee();
    this.state.setCharge(0);
    this.state.active = new ActiveDomain(owned.id, owned.level);
    this.event(`domain:${owned.id}`);
    this.s.stats.sync();
  }

  /** Ocupado para a tecla: o mesmo de conjurar, mais conjuração ativa, Reversa canalizando e player morto (DOM-07). */
  private busy(): boolean {
    const { player } = this.s;
    return player.isBusyForCast() || this.s.techCaster.cast !== null || this.s.recovery.reverse.active || player.dead;
  }

  /** Fim do Domínio ativo: `domainEnd:<id>`. Só o fim pelo tempo roda o efeito de fim (DOM-10.10). */
  end(_reason: DomainEnd): void {
    const active = this.state.active;
    if (!active) return;
    this.event(`domainEnd:${active.id}`);
    this.state.active = null;
    this.s.stats.sync();
  }

  /** Run nova: nada do Domínio da run anterior sobrevive (DOM-05). */
  reset(): void {
    this.state.reset();
    this.lastSwingId = null;
    this.lastPropAtMs = null;
    this.lastTechBand = undefined;
    this.chargedCasts.clear();
  }

  /**
   * Golpe corpo a corpo do player que acertou (DOM-02): o do moveset carrega pela força (`light` +1, `heavy` +2) uma
   * vez por `swingId`; o objeto na mão, arremessado ou a arma vinculada (sem `moveName`) carrega +2 uma vez por quadro.
   * O finalizador carrega pelo `onFinisher`, não aqui.
   */
  onMeleeHit(hit: Hit): void {
    if (hit.moveName === FINISHER_MOVE) return;
    if (hit.moveName === undefined) {
      if (this.lastPropAtMs === this.s.clockMs) return;
      this.lastPropAtMs = this.s.clockMs;
      this.state.addCharge('prop');
      return;
    }
    if (hit.swingId !== undefined) {
      if (hit.swingId === this.lastSwingId) return;
      this.lastSwingId = hit.swingId;
    }
    this.state.addCharge(hit.strength === 'heavy' ? 'heavy' : 'light');
  }

  /** Parry, Deflexão e esquiva perfeita carregam +5 (DOM-02). */
  onDefense(kind: DefenseKind): void {
    if (kind === 'parry' || kind === 'deflect' || kind === 'perfectDodge') this.state.addCharge('defense');
  }

  /** Finalizador do comum ou do chefe: +5 (DOM-02.3). */
  onFinisher(): void {
    this.state.addCharge('finisher');
  }

  /** Acerto de técnica (antes do `onCastHit` do mesmo acerto): só guarda a banda. */
  onTechHit(hit: Hit): void {
    this.lastTechBand = hit.band;
  }

  /**
   * O alvo aceitou um acerto da conjuração `castId` (DOM-02.4): carrega +1 uma vez por conjuração, no primeiro acerto
   * que não é chip. Acertos sem conjuração (a Onda do Punho, o corte do Santuário) nunca chegam aqui.
   */
  onCastHit(castId: number): void {
    if (this.lastTechBand === 'chip' || this.chargedCasts.has(castId)) return;
    this.chargedCasts.add(castId);
    this.state.addCharge('techCast');
  }

  /** Kokusen: +15 (DOM-02). */
  onKokusen(): void {
    this.state.addCharge('kokusen');
  }

  /** Abate de inimigo comum: +1 (DOM-02). */
  onKill(): void {
    this.state.addCharge('kill');
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
