import { HIT_BAND_FEEL } from '../data/feel';
import type { Hit, HitBand, Strength } from './hit';

const MICRO = HIT_BAND_FEEL.micro;

/** POW-03: hitstop do acerto micro, 15 ms no leve e 20 ms no forte. */
export function microHitstopMs(strength: Strength): number {
  return strength === 'heavy' ? MICRO.heavyMs : MICRO.lightMs;
}

/**
 * Teto do hitstop dos micro (POW-03, POW-14): soma o que foi concedido numa janela deslizante de `windowMs` de
 * relógio real (o hitstop congela o relógio de jogo, então a janela não pode andar nele). Um acerto concedido no
 * instante `t` conta enquanto `agora - t < windowMs`. O acerto que levaria a soma acima de `capMs` recebe 0.
 */
export class MicroBudget {
  private granted: { atMs: number; ms: number }[] = [];

  constructor(
    private readonly capMs: number = MICRO.capMs,
    private readonly windowMs: number = MICRO.windowMs,
  ) {}

  /** Hitstop concedido ao micro de força `strength` em `realNowMs`; 0 quando o teto da janela estouraria. */
  grant(strength: Strength, realNowMs: number): number {
    this.granted = this.granted.filter((g) => realNowMs - g.atMs < this.windowMs);
    const ms = microHitstopMs(strength);
    const used = this.granted.reduce((sum, g) => sum + g.ms, 0);
    if (used + ms > this.capMs) return 0;
    this.granted.push({ atMs: realNowMs, ms });
    return ms;
  }

  /**
   * Hitstop dos micro concedido na janela que termina em `realNowMs` (o `hitstop.microMs` do snapshot, POW-14): conta
   * quem foi concedido há menos de `windowMs`, pela mesma regra do `grant`. Nunca passa de `capMs`.
   */
  usedMs(realNowMs: number): number {
    return this.granted.filter((g) => realNowMs - g.atMs < this.windowMs).reduce((sum, g) => sum + g.ms, 0);
  }

  /** Esvazia a janela (reinício da cena). */
  reset(): void {
    this.granted = [];
  }
}

/**
 * Dano de postura do chefe pela faixa (POW-03.6): o chip tira `dano × chipMul`; micro e acerto normal seguem a regra
 * de sempre do `bossBrain` (leve = dano, forte = 2 × dano).
 */
export function bandPoiseDamage(hit: Hit, chipMul: number): number {
  if (hit.band === 'chip') return hit.damage * chipMul;
  return hit.strength === 'heavy' ? hit.damage * 2 : hit.damage;
}

/** Ganho de estrutura do inimigo pela faixa (POW-15.8): o chip não enche, o micro enche metade de `gain`. */
export function bandStructureGain(band: HitBand, gain: number): number {
  return band === 'chip' ? 0 : gain / 2;
}
