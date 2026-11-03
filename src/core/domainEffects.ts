import { AMPLIFICATION, JACKPOT, type DomainId, type DomainLevel } from '../data/domains';
import type { Rect } from './level';

/** O que o Domínio ativo muda nos números e nas travas (JAC-04, JAC-05, AMP-02 a AMP-05). */
export interface DomainStatMods {
  /** Multiplicador do golpe corpo a corpo, aplicado por último na folha. */
  meleeMul: number;
  /** Custo das técnicas: 0 no jackpot, 0,5 na falha, 1 fora. */
  costMul: number;
  /** Recarga das técnicas: idem. */
  cooldownMul: number;
  techLocked: boolean;
  guardPierce: boolean;
  nullifyProjectiles: boolean;
  /** Jackpot: energia no máximo a cada quadro. */
  energyLock: boolean;
}

export const NEUTRAL_DOMAIN_MODS: Readonly<DomainStatMods> = Object.freeze({
  meleeMul: 1,
  costMul: 1,
  cooldownMul: 1,
  techLocked: false,
  guardPierce: false,
  nullifyProjectiles: false,
  energyLock: false,
});

/** Efeito do Jackpot em curso: `null` no giro e fora do Jackpot. */
export type JackpotEffect = 'jackpot' | 'miss' | null;

/**
 * Modificadores do Domínio ativo: Amplificação → técnicas travadas, guarda atravessada e projétil anulado, com o
 * corpo a corpo × 1,25 só no Nv 3; jackpot → custo 0, recarga 0 e energia travada no máximo; falha → custo e recarga
 * × 0,5; giro, Santuário ou nenhum → neutro.
 */
export const domainStatMods = (
  active: { id: DomainId; level: DomainLevel } | null,
  jackpotEffect: JackpotEffect,
): DomainStatMods => {
  if (active?.id === 'amplificacao') {
    const meleeMul = active.level === 3 ? AMPLIFICATION.meleeMulLv3 : 1;
    return { ...NEUTRAL_DOMAIN_MODS, meleeMul, techLocked: true, guardPierce: true, nullifyProjectiles: true };
  }
  if (active?.id !== 'jackpot' || jackpotEffect === null) return { ...NEUTRAL_DOMAIN_MODS };
  if (jackpotEffect === 'jackpot') return { ...NEUTRAL_DOMAIN_MODS, costMul: 0, cooldownMul: 0, energyLock: true };
  return { ...NEUTRAL_DOMAIN_MODS, costMul: JACKPOT.miss.costMul, cooldownMul: JACKPOT.miss.cooldownMul };
};

/** Dois retângulos pelo centro (convenção do `hurtRect`) se tocam; borda encostada conta. */
export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  Math.abs(a.x - b.x) <= (a.width + b.width) / 2 && Math.abs(a.y - b.y) <= (a.height + b.height) / 2;
