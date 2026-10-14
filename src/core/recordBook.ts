/**
 * Livro do recorde da sessão: guarda a melhor run, decide quando uma morte vira recorde novo e o que o marcador e o
 * banner de rodada mostram. Puro: quem grava o save e desenha o texto é o diretor do recorde.
 */
import type { RunState } from './run';
import type { RunRecord } from './save';

/** O que o marcador `Recorde: rN` mostra no HUD. */
export interface MarkerView {
  visible: boolean;
  text: string;
  /** A run atual já passou do recorde: o texto vai na cor de destaque. */
  highlight: boolean;
}

/** Resultado de uma morte: se ela virou o recorde e se o save precisa ser escrito. */
export interface DeathOutcome {
  newRecord: boolean;
  write: boolean;
}

/** Estados da run em que o marcador aparece (RMK-01); em `title` e `gameOver` ele some (RMK-04). */
const MARKER_STATES: ReadonlySet<RunState> = new Set(['roundActive', 'intermission', 'traverse', 'shop']);

const HIDDEN: MarkerView = { visible: false, text: '', highlight: false };

/**
 * REC-02: a run é melhor com rodada maior ou, na mesma rodada, com mais abates. Empate exato perde: o recorde antigo
 * fica. Sem recorde, qualquer run é melhor.
 */
export function isBetter(run: { round: number; kills: number }, best: RunRecord | null): boolean {
  if (!best) return true;
  if (run.round !== best.round) return run.round > best.round;
  return run.kills > best.kills;
}

/** O recorde em memória e o que já aconteceu nesta run (passou do recorde, banner já saiu). */
export class RecordBook {
  private _best: RunRecord | null;
  private _passed = false;
  private _lastDeathNewRecord = false;
  private bannerShown = false;

  constructor(best: RunRecord | null) {
    this._best = best;
  }

  /** O recorde atual (o carregado do save ou o da última morte que bateu). */
  get best(): RunRecord | null {
    return this._best;
  }

  /** A run atual chegou a uma rodada acima do recorde. */
  get passed(): boolean {
    return this._passed;
  }

  /** A última morte virou recorde novo. */
  get lastDeathNewRecord(): boolean {
    return this._lastDeathNewRecord;
  }

  /** Run nova: o banner pode sair de novo e a run ainda não passou do recorde. */
  startRun(): void {
    this._passed = false;
    this.bannerShown = false;
  }

  /**
   * Texto do banner de começo de rodada (RMK-05/06): `Rodada N · Novo recorde!` só na rodada recorde + 1 e uma vez
   * por run; senão `Rodada N`. Sem recorde nunca comemora.
   */
  roundBanner(round: number): string {
    this.see(round);
    const best = this._best;
    if (!best || this.bannerShown || round !== best.round + 1) return `Rodada ${round}`;
    this.bannerShown = true;
    return `Rodada ${round} · Novo recorde!`;
  }

  /**
   * O marcador para a rodada e o estado da run (RMK-01, RMK-03, RMK-04, RMK-07): escondido sem recorde ou fora da
   * luta; acima do recorde mostra a rodada atual em destaque.
   */
  marker(round: number, state: RunState): MarkerView {
    const best = this._best;
    if (!best || !MARKER_STATES.has(state)) return HIDDEN;
    this.see(round);
    const above = round > best.round;
    return { visible: true, text: `Recorde: r${above ? round : best.round}`, highlight: above };
  }

  /**
   * A morte (REC-01, REC-03, REC-09): com `canRecord` e uma run melhor, ela vira o recorde e o save é escrito;
   * empate, run pior ou `canRecord` falso deixam o recorde como está e não escrevem.
   */
  death(run: RunRecord, opts: { canRecord: boolean }): DeathOutcome {
    const newRecord = opts.canRecord && isBetter(run, this._best);
    if (newRecord) this._best = run;
    this._lastDeathNewRecord = newRecord;
    return { newRecord, write: newRecord };
  }

  /** Marca a run como acima do recorde quando a rodada passa dele. */
  private see(round: number): void {
    if (this._best && round > this._best.round) this._passed = true;
  }
}
