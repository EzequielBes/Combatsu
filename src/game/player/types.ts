import type { CastState } from '../../core/cast';
import type { ParryInfo } from '../../core/defense';
import type { TechId } from '../../data/techniques';

/** Fase do golpe corpo a corpo avisada à cena: `end` vale para o fim normal, o cancelamento e o golpe recebido. */
export type StrikePhase = 'startup' | 'active' | 'recovery' | 'end';
/** Avisa a troca de fase do golpe em andamento (a cena liga rastro e chamas nisto). */
export type OnStrikePhase = (name: string, phase: StrikePhase) => void;

/** Conjuração ativa que trava o player (CAST-11/12/13): id da técnica e estado atual, escrito pelo `TechCaster`. */
export interface CastPose {
  id: TechId;
  state: CastState;
}

/**
 * Quem atacou, para o lado do golpe (GRD-02/03), o tipo (GRD-06) e o efeito do parry no atacante (PAR-03/07/10,
 * DFL-07..11): `info` diz se o parry foi o do último golpe da sequência e se foi uma Deflexão; o chefe o ignora.
 */
export interface Attacker {
  x: number;
  isBoss: boolean;
  parried(info: ParryInfo): void;
}

/**
 * Desfecho de defesa avisado à cena (faíscas, hitstop, câmera lenta, textos) no ponto de contato. Na Deflexão sai só
 * `deflect` (no lugar de `parry`), para a cena mostrar um aviso só (DFL-13).
 */
export type DefenseKind = 'block' | 'parry' | 'perfectDodge' | 'duckEvade' | 'jumpEvade' | 'deflect';
