/**
 * Carga do save do recorde, sem o motor do jogo: decide o recorde inicial a partir dos parâmetros de debug e da porta
 * do armazenamento. Quem chama é o diretor do recorde, uma vez por carga da página.
 */
import { parseSave, type RunRecord } from '../../core/save';
import type { RecordStorage } from '../../game/recordSnapshot';
import type { SaveStorage } from '../../game/saveStorage';

/** O que o debug pede na carga: `record=N` (inteiro >= 1, senão `undefined`) e `nosave=1`. */
export interface RecordDebugParams {
  record: number | undefined;
  nosave: boolean;
}

/** Resultado da carga: o recorde inicial, de onde ele veio e se a sessão pode escrever na chave. */
export interface RecordLoad {
  best: RunRecord | null;
  storage: RecordStorage;
  /** Save de uma versão mais nova: não se escreve por cima (SAVE-04). */
  locked: boolean;
}

/** O recorde de `?debug&record=N`: rodada N, 0 abates e a build vazia (REC-08). */
function debugRecord(round: number): RunRecord {
  return { round, kills: 0, build: { techniques: [], perks: [], relic: null, weapon: null, vows: [] } };
}

/**
 * Tabela de carga do save (design, "Carga do save"): `record=N` ganha de `nosave=1` e nenhum dos dois toca o
 * armazenamento (REC-07/08); leitura que lança vira `'memory'` sem recorde (SAVE-07); chave ausente ou inválida dá
 * recorde vazio (SAVE-05); versão mais nova trava a escrita (SAVE-04); o resto é o recorde lido, já migrado.
 */
export function loadRecord(params: RecordDebugParams, storage: Pick<SaveStorage, 'read' | 'kind'>): RecordLoad {
  if (params.record !== undefined) return { best: debugRecord(params.record), storage: 'off', locked: false };
  if (params.nosave) return { best: null, storage: 'off', locked: false };
  const raw = storage.read();
  if (storage.kind === 'memory') return { best: null, storage: 'memory', locked: false };
  const result = parseSave(raw);
  if (result.kind === 'newer') return { best: null, storage: 'local', locked: true };
  const best = result.kind === 'ok' ? result.save.record : null;
  return { best, storage: 'local', locked: false };
}
