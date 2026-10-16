import { DOMAIN_CHARGE, DOMAINS, type DomainDef, type DomainId, type DomainLevel } from '../data/domains';
import type { DomainState } from './domain';
import type { Vec2 } from './hit';

/** Decisão da tecla `P`/`N`, relógio do Domínio e alvos do acerto decisivo (DOM-06 a DOM-10). Regra pura. */
export type DomainDenial = 'none' | 'active' | 'charge' | 'busy';

/** Como o Domínio acabou: só `timer` roda o efeito de fim (DOM-10.10); a rodada limpa não encerra. */
export type DomainEnd = 'timer' | 'shop' | 'death' | 'reset';

/**
 * Motivo da recusa, na ordem `none` → `active` → `charge` → `busy` (com Domínio ativo a carga é 0, então `active` vem
 * antes de `charge`); `null` quando a ativação é aceita. Não mexe na carga (DOM-07).
 */
export const activationDenial = (state: DomainState, busy: boolean): DomainDenial | null => {
  if (!state.owned) return 'none';
  if (state.active) return 'active';
  if (state.charge < DOMAIN_CHARGE.max) return 'charge';
  if (busy) return 'busy';
  return null;
};

/** O Domínio em curso: o tempo cai com o tempo de jogo; o Jackpot reinicia o relógio com o tempo do efeito. */
export class ActiveDomain {
  totalMs: number;
  remainingMs: number;

  constructor(
    readonly id: DomainId,
    readonly level: DomainLevel,
    totalMs: number = DOMAINS[id].durationMs[level - 1],
  ) {
    this.totalMs = totalMs;
    this.remainingMs = totalMs;
  }

  /** Anda `dtMs`; devolve verdadeiro quando o tempo acabou. */
  update(dtMs: number): boolean {
    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
    return this.remainingMs <= 0;
  }

  restart(ms: number): void {
    this.totalMs = ms;
    this.remainingMs = ms;
  }
}

/** Dentro do raio, com a borda inclusa (DOM-08). */
export const inRadius = (center: Vec2, target: Vec2, radiusPx: number): boolean =>
  Math.hypot(target.x - center.x, target.y - center.y) <= radiusPx;

/** Dano do acerto decisivo: fração do HP máximo, sem multiplicador de build nem de voto, no mínimo 1. */
export const activationDamage = (fraction: number, maxHp: number): number => Math.max(1, Math.round(fraction * maxHp));

export interface ActivationTarget {
  id: number;
  center: Vec2;
  maxHp: number;
  isBoss: boolean;
}

/** Alvos no raio do Domínio, cada um com o dano da fração do seu tipo (comum ou chefe). */
export const activationTargets = <T extends ActivationTarget>(
  center: Vec2,
  targets: readonly T[],
  def: DomainDef,
): { target: T; damage: number }[] => {
  const { radiusPx, common, boss } = def.activation;
  return targets
    .filter((t) => inRadius(center, t.center, radiusPx))
    .map((target) => ({ target, damage: activationDamage(target.isBoss ? boss : common, target.maxHp) }));
};
