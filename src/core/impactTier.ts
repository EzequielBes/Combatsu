import type { Hit } from './hit';
import { Rng } from './rng';
import { IMPACT_FEEL } from '../data/feel';

/** Nível do impacto: decide quais camadas de efeito o acerto ganha. */
export type ImpactTier = 'light' | 'heavy' | 'decisive';

/**
 * Classifica o acerto (IMP-01..05, CRP-08): Contra, derrubada, golpe marcado como decisivo ou quebra de postura é `decisive`; senão a força do golpe
 * decide entre `heavy` e `light`. `ctx.forced` vence tudo (POW-11.4: o objeto do jogador bate sempre `heavy`).
 */
export function impactTier(
  hit: Pick<Hit, 'strength' | 'counter' | 'knockdown' | 'decisive'>,
  ctx: { brokePosture: boolean; forced?: ImpactTier },
): ImpactTier {
  if (ctx.forced !== undefined) return ctx.forced;
  if (hit.counter === true || hit.knockdown === true || hit.decisive === true || ctx.brokePosture) return 'decisive';
  return hit.strength === 'heavy' ? 'heavy' : 'light';
}

export interface Spike {
  /** Ângulo em radianos. */
  angle: number;
  /** Comprimento em px, em [spikeMinPx, spikeMaxPx]. */
  length: number;
}

/**
 * Espinhos radiais do impacto (IMP-09, IMP-10): `count` espinhos espalhados pela volta com um desvio por seed,
 * cada um com comprimento sorteado em [18, 30] px. Mesma seed e contagem, mesma saída (AD-006).
 */
export function impactSpikes(seed: number, count: number): Spike[] {
  const rng = new Rng(seed);
  const step = (Math.PI * 2) / Math.max(count, 1);
  const spikes: Spike[] = [];
  for (let i = 0; i < count; i++) {
    const jitter = (rng.next() - 0.5) * step * 0.6;
    const length = IMPACT_FEEL.spikeMinPx + rng.next() * (IMPACT_FEEL.spikeMaxPx - IMPACT_FEEL.spikeMinPx);
    spikes.push({ angle: i * step + jitter, length });
  }
  return spikes;
}
