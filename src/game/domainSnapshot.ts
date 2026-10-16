import type { DomainId, DomainLevel } from '../data/domains';

/** Campos do snapshot de debug da Expansão de Domínio (DDB-01), fora do `debugApi.ts` para ele não crescer. */

/** O Jackpot no snapshot: giro, chance do giro (ou a que valeria agora), piedade e efeito em curso. */
export interface JackpotSnapshot {
  spinning: boolean;
  chance: number;
  guaranteed: boolean;
  misses: number;
  jackpotsWon: number;
  effect: 'jackpot' | 'miss' | null;
  effectMs: number;
}

/**
 * O Domínio no snapshot (DDB-01): posse, carga, se a tecla ativaria agora, o Domínio em curso (`remainingMs` é o mesmo
 * número que a barra encolhe), o Jackpot (`null` quando o Domínio possuído não é ele), os gatilhos do Santuário no
 * último segundo e se o Baú do Véu está pendente.
 */
export interface DomainSnapshot {
  owned: { id: DomainId; level: DomainLevel } | null;
  charge: number;
  ready: boolean;
  active: { id: DomainId; level: DomainLevel; remainingMs: number } | null;
  jackpot: JackpotSnapshot | null;
  triggersLastSecond: number;
  veilPending: boolean;
}

/** A barra do Domínio sob a energia (DHD-01 a DHD-03), lida do retângulo vivo. */
export interface DomainBarSnapshot {
  visible: boolean;
  fill: number;
  blinking: boolean;
}
