import { JACKPOT, type DomainLevel } from '../data/domains';

/**
 * Jackpot, regra pura (JAC-01 a JAC-06): a chance com o Riichi, a parada dos tambores com a piedade, o relógio do
 * efeito com os tiques de cura e as faces mostradas na parada.
 */

export type JackpotPhase = 'idle' | 'spin' | 'jackpot' | 'miss';
export type JackpotResult = 'jackpot' | 'miss';

/** Arredonda ao milionésimo: tira o resíduo da soma em ponto flutuante (0,33 + 0,04 = 0,37, não 0,37000000000000005). */
const clean = (v: number): number => Math.round(v * 1e6) / 1e6;

/**
 * Chance do giro (JAC-02): `min(0,60, base + bônus + 0,04 × golpes)`, com base 0,33 no Nv 1 e 0,40 nos Nv 2 e 3, e
 * bônus de 0,05 por jackpot ganho na run só no Nv 3. O teto vale para a soma.
 */
export const jackpotChance = (p: { level: DomainLevel; strikes: number; jackpotsWon: number }): number => {
  const bonus = p.level === 3 ? JACKPOT.winStep * p.jackpotsWon : 0;
  return clean(Math.min(JACKPOT.cap, JACKPOT.base[p.level - 1] + bonus + JACKPOT.riichiStep * p.strikes));
};

export class JackpotState {
  /** Falhas seguidas na run (piedade, JAC-03.5). */
  misses = 0;
  jackpotsWon = 0;
  phase: JackpotPhase = 'idle';
  /** Golpes que acertaram no giro em curso (Riichi). */
  strikes = 0;
  /** Tempo restante do efeito em curso. */
  effectMs = 0;
  private healAccMs = 0;

  startSpin(): void {
    this.phase = 'spin';
    this.strikes = 0;
    this.effectMs = 0;
    this.healAccMs = 0;
  }

  /** Riichi: um golpe que acertou. Fora do giro não soma. */
  onStrike(): void {
    if (this.phase === 'spin') this.strikes += 1;
  }

  /**
   * Para os tambores (JAC-03): com `pityMisses` falhas seguidas é jackpot sem chamar `draw`; senão jackpot quando
   * `draw() < chance`. O jackpot zera as falhas e soma um ganho; a falha soma uma falha. Arma o efeito.
   */
  stop(level: DomainLevel, draw: () => number): JackpotResult {
    const pity = this.misses >= JACKPOT.pityMisses;
    const chance = jackpotChance({ level, strikes: this.strikes, jackpotsWon: this.jackpotsWon });
    const result: JackpotResult = pity || draw() < chance ? 'jackpot' : 'miss';
    if (result === 'jackpot') {
      this.misses = 0;
      this.jackpotsWon += 1;
    } else this.misses += 1;
    this.phase = result;
    this.effectMs = result === 'jackpot' ? JACKPOT.hit.ms : JACKPOT.miss.ms;
    this.healAccMs = 0;
    return result;
  }

  /** Anda o efeito e devolve os tiques de cura que caíram neste passo (JAC-04, JAC-05); o resto fica guardado. */
  tickEffect(dtMs: number): number {
    if (this.phase !== 'jackpot' && this.phase !== 'miss') return 0;
    const every = this.phase === 'jackpot' ? JACKPOT.hit.healEveryMs : JACKPOT.miss.healEveryMs;
    const used = Math.min(Math.max(0, dtMs), this.effectMs);
    this.effectMs -= used;
    this.healAccMs += used;
    const ticks = Math.floor(this.healAccMs / every);
    this.healAccMs -= ticks * every;
    return ticks;
  }

  /** Morte no giro: para sem resultado e sem mexer nas falhas. */
  abort(): void {
    if (this.phase === 'spin') this.toIdle();
  }

  endEffect(): void {
    this.toIdle();
  }

  /** Run nova: zera as falhas e os ganhos. */
  reset(): void {
    this.toIdle();
    this.misses = 0;
    this.jackpotsWon = 0;
  }

  private toIdle(): void {
    this.phase = 'idle';
    this.strikes = 0;
    this.effectMs = 0;
    this.healAccMs = 0;
  }
}

/** A piedade está armada: a próxima parada é jackpot. */
export const guaranteed = (state: JackpotState): boolean => state.misses >= JACKPOT.pityMisses;

/** A chance que os tambores e o snapshot mostram (JAC-06.11): 1 com a piedade armada; o sorteio lê o `jackpotChance`. */
export const shownChance = (state: JackpotState, level: DomainLevel): number =>
  guaranteed(state) ? 1 : jackpotChance({ level, strikes: state.strikes, jackpotsWon: state.jackpotsWon });

/** Símbolos dos tambores; o primeiro é o do jackpot. */
export const REEL_SYMBOLS = ['7', '$', '@', '#'] as const;

/**
 * Faces da parada (JAC-06), sem `Rng`: três `7` no jackpot; na falha, dois iguais e o terceiro diferente, variando
 * com as falhas seguidas.
 */
export const reelFaces = (result: JackpotResult, misses: number): [string, string, string] => {
  if (result === 'jackpot') return [REEL_SYMBOLS[0], REEL_SYMBOLS[0], REEL_SYMBOLS[0]];
  const n = REEL_SYMBOLS.length;
  const pair = REEL_SYMBOLS[Math.abs(misses) % n];
  const odd = REEL_SYMBOLS[(Math.abs(misses) + 1) % n];
  return [pair, pair, odd];
};
