import { describe, expect, it } from 'vitest';
import { SAVE_KEY, serializeSave, type RunRecord } from '../../src/core/save';
import { SaveStorage, type StorageLike } from '../../src/game/saveStorage';
import { loadRecord } from '../../src/scenes/test/recordLoad';

const RECORD: RunRecord = {
  round: 3,
  kills: 12,
  build: { techniques: [{ id: 'azul', level: 2 }], perks: ['executor'], relic: null, weapon: null, vows: [] },
};

/** Armazenamento falso: conta as leituras e guarda o que foi escrito. */
function fakeStorage(value: string | null, opts: { throws?: boolean } = {}) {
  const calls = { get: 0, set: 0 };
  const store: StorageLike = {
    getItem: (key: string) => {
      calls.get++;
      if (opts.throws) throw new Error('bloqueado');
      return key === SAVE_KEY ? value : null;
    },
    setItem: () => {
      calls.set++;
    },
  };
  return { port: new SaveStorage(() => store), calls };
}

const NO_DEBUG = { record: undefined, nosave: false };

describe('loadRecord (tabela de carga do save)', () => {
  it('chave válida: o recorde lido, armazenamento local', () => {
    const { port } = fakeStorage(serializeSave(RECORD));
    expect(loadRecord(NO_DEBUG, port)).toEqual({ best: RECORD, storage: 'local', locked: false });
  });

  it('SAVE-05: chave ausente, JSON quebrado ou recorde inválido dão recorde vazio e seguem gravando', () => {
    for (const raw of [null, 'lixo{', JSON.stringify({ version: 1, record: { ...RECORD, round: 0 } })]) {
      const { port } = fakeStorage(raw);
      expect(loadRecord(NO_DEBUG, port)).toEqual({ best: null, storage: 'local', locked: false });
    }
  });

  it('SAVE-04: versão mais nova trava a escrita e começa sem recorde', () => {
    const { port } = fakeStorage(JSON.stringify({ version: 9, record: RECORD }));
    expect(loadRecord(NO_DEBUG, port)).toEqual({ best: null, storage: 'local', locked: true });
  });

  it('SAVE-07: leitura que lança vira memória, sem recorde e sem exceção', () => {
    const { port } = fakeStorage(serializeSave(RECORD), { throws: true });
    expect(loadRecord(NO_DEBUG, port)).toEqual({ best: null, storage: 'memory', locked: false });
  });

  it('REC-07: nosave=1 não lê o armazenamento e começa sem recorde', () => {
    const { port, calls } = fakeStorage(serializeSave(RECORD));
    expect(loadRecord({ record: undefined, nosave: true }, port)).toEqual({
      best: null,
      storage: 'off',
      locked: false,
    });
    expect(calls.get).toBe(0);
  });

  it('REC-08: record=N começa com rN, 0 abates e build vazia, ganha de nosave e não lê o armazenamento', () => {
    const expected = {
      best: { round: 4, kills: 0, build: { techniques: [], perks: [], relic: null, weapon: null, vows: [] } },
      storage: 'off',
      locked: false,
    };
    for (const nosave of [false, true]) {
      const { port, calls } = fakeStorage(serializeSave(RECORD));
      expect(loadRecord({ record: 4, nosave }, port)).toEqual(expected);
      expect(calls.get).toBe(0);
    }
  });
});
