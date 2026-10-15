import type { MarkerView } from '../core/recordBook';
import type { DamageSource } from '../core/runSummary';
import type { RunRecord } from '../core/save';
import type { RunSummaryDebug } from './RunSummaryPanel';

/**
 * De onde vem e para onde vai o recorde: `'local'` lê e grava no navegador, `'memory'` o armazenamento falhou e o
 * recorde vale só nesta aba (SAVE-07), `'off'` o debug desligou o save (`nosave=1` ou `record=N`, REC-07/08).
 */
export type RecordStorage = 'local' | 'memory' | 'off';

/** `record` do snapshot de debug (REC-10, RMK-09, END-15), lido do diretor do recorde e das vistas vivas. */
export interface RecordSnapshot {
  /** O recorde em memória (o carregado ou o da última morte que bateu), ou `null`. */
  best: RunRecord | null;
  storage: RecordStorage;
  /** O save gravado é de uma versão mais nova que a do jogo: nada é escrito nesta sessão (SAVE-04). */
  locked: boolean;
  /** A run atual passou do recorde. */
  passed: boolean;
  /** A última morte gravou recorde. */
  lastDeathRecord: boolean;
  marker: MarkerView;
  panel: RunSummaryDebug;
  /** Dano bruto da run por fonte. */
  damage: Record<DamageSource, number>;
}
