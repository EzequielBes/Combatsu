import { drawVows, vowEffects, Vows, type VowEffects } from '../../core/vows';
import { VOWS, type VowId } from '../../data/vows';
import { MOVES, type MoveDef } from '../../data/moves';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';

/**
 * Votos Vinculativos da run (VOW-01..18, AD-024): guarda os votos tomados, sorteia as ofertas do painel pelo stream
 * próprio da run e expõe os efeitos agregados para os pontos do combate que eles mudam.
 */
export class VowDirector {
  readonly vows = new Vows();
  /** Ofertas do painel aberto; `null` com o painel fechado. */
  private offersValue: VowId[] | null = null;

  constructor(readonly s: TestScene) {}

  /** Run nova (VOW-08): nenhum voto sobrevive. `?debug&vows=a,b` começa a run com os votos listados. */
  reset(): void {
    this.vows.reset();
    this.offersValue = null;
    this.s.vowPanel?.hide();
    for (const id of (debugParam('vows') ?? '').split(',')) if (id in VOWS) this.vows.take(id as VowId);
  }

  /**
   * A cada quadro (VOW-12, VOW-13, VOW-15..17): repassa os efeitos aos números que o combate lê. A Fúria muda com os
   * abates, então isto roda todo quadro, não só ao tomar o voto.
   */
  sync(): void {
    const fx = this.effects;
    this.s.loadout.vowDamageMul = fx.techDamageMul * fx.damageMul;
    this.s.loadout.costMul = fx.techCostMul;
    this.s.player.damageTakenMul = fx.damageTakenMul;
    // VOW-10: vida máxima dos modificadores × o voto; também vale depois de comprar `vida`.
    const maxHp = Math.round(this.s.modifiers.maxHp * fx.maxHpMul);
    if (this.s.player.maxHp !== maxHp) this.s.player.setMaxHp(maxHp);
  }

  /** Multiplicador do golpe corpo a corpo que abre a hitbox (VOW-10..12, VOW-16, VOW-17). */
  strikeMul(move: MoveDef): number {
    const fx = this.effects;
    return fx.damageMul * fx.meleeMul * (move.strength === 'heavy' ? fx.heavyMul : 1);
  }

  /** Efeitos dos votos tomados agora, com os abates da rodada atual (Fúria). */
  get effects(): VowEffects {
    return vowEffects(this.vows.list, { kills: this.s.run.roundKills });
  }

  get offers(): readonly VowId[] | null {
    return this.offersValue;
  }

  get panelOpen(): boolean {
    return this.offersValue !== null;
  }

  /** Abre o painel com o sorteio da run (VOW-01, VOW-06); sem voto restante, não abre e devolve `false`. */
  openPanel(): boolean {
    const rng = this.s.run.vowRng;
    if (!rng) return false;
    const offers = drawVows(rng, this.vows.list);
    if (offers.length === 0) return false;
    this.offersValue = offers;
    return true;
  }

  /** Toma a oferta `slot` (VOW-03) ou recusa com `null` (VOW-04); fecha o painel. Devolve o voto tomado. */
  choose(slot: number | null): VowId | null {
    const offers = this.offersValue;
    if (!offers) return null;
    const id = slot === null ? null : (offers[slot] ?? null);
    if (slot !== null && id === null) return null;
    this.offersValue = null;
    if (id) this.vows.take(id);
    return id;
  }

  /** Campo `vows` do snapshot de debug (VOW-09). */
  snapshot(): {
    taken: VowId[];
    offers: VowId[] | null;
    effects: VowEffects;
    strike: { light: number; heavy: number };
    panelCards: number;
  } {
    // L-076: o multiplicador lido da composição da cena (a mesma do `player.damageMul`), não do efeito daqui.
    const strike = { light: this.s.strikeMul(MOVES.jab, true), heavy: this.s.strikeMul(MOVES.cotovelada, true) };
    return {
      taken: this.vows.list,
      offers: this.offersValue ? [...this.offersValue] : null,
      effects: this.effects,
      strike,
      // Cartas que o painel desenhou de verdade (VOW-01), lidas do painel.
      panelCards: this.s.vowPanel?.visibleCards ?? 0,
    };
  }
}
