import { describe, expect, it } from 'vitest';
import { JevAuthError, askWithRetry, formatReport, readKey, type AcRow } from '../../tools/jev-refine/lib';

const KEY = 'chave-de-teste-nao-real-123';
const AC: AcRow = { id: 'RUN-01', story: 'P1: Rodadas', criterion: 'WHEN the run starts THEN the game SHALL set round to 1.' };
const OK_BODY = {
  answers: {
    ambiguous: { noul: 0.41 },
    bundled: { noul: 0.22 },
    testable: { noul: 0.91 },
    precision: { score: 2.89 },
  },
};

/** fetch falso que devolve as respostas na ordem e conta as chamadas. */
function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: unknown[] = [];
  const fn = async (...args: unknown[]): Promise<Response> => {
    calls.push(args);
    const r = responses[calls.length - 1];
    return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status });
  };
  return { fn: fn as unknown as typeof fetch, calls };
}

function fakeSleep() {
  const waits: number[] = [];
  return { fn: async (ms: number) => void waits.push(ms), waits };
}

describe('readKey (FND-15)', () => {
  it('prefere a variável de ambiente', () => {
    expect(readKey({ TYPESAFE_API_KEY: 'do-ambiente' }, 'TYPESAFE_API_KEY=do-arquivo\n')).toBe('do-ambiente');
  });
  it('sem ambiente, lê a linha TYPESAFE_API_KEY= do .env.local', () => {
    expect(readKey({}, 'OUTRA=1\nTYPESAFE_API_KEY=do-arquivo\n')).toBe('do-arquivo');
  });
  it('nada encontrado devolve null', () => {
    expect(readKey({}, null)).toBeNull();
    expect(readKey({}, 'OUTRA=1\n')).toBeNull();
  });
});

describe('askWithRetry', () => {
  it('429, 429, 200: repete esperando 1 s e 2 s e devolve as respostas (FND-16)', async () => {
    const f = fakeFetch([
      { status: 429, body: 'slow down' },
      { status: 429, body: 'slow down' },
      { status: 200, body: OK_BODY },
    ]);
    const s = fakeSleep();
    const result = await askWithRetry(AC, KEY, f.fn, s.fn);
    expect(result).toEqual({ ambiguous: 0.41, bundled: 0.22, testable: 0.91, precision: 2.89 });
    expect(s.waits).toEqual([1000, 2000]);
    expect(f.calls).toHaveLength(3);
  });

  it('529 quatro vezes: esperas de 1, 2 e 4 s e depois { error: "529" } (FND-16, FND-24)', async () => {
    const f = fakeFetch(Array.from({ length: 4 }, () => ({ status: 529, body: 'overloaded' })));
    const s = fakeSleep();
    const result = await askWithRetry(AC, KEY, f.fn, s.fn);
    expect(result).toEqual({ error: '529' });
    expect(s.waits).toEqual([1000, 2000, 4000]);
    expect(f.calls).toHaveLength(4);
  });

  it.each([401, 422])('%i lança JevAuthError com o status e a mensagem da API (FND-17)', async (status) => {
    const f = fakeFetch([{ status, body: { error: { message: `falha ${status}` } } }]);
    const s = fakeSleep();
    const err = await askWithRetry(AC, KEY, f.fn, s.fn).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(JevAuthError);
    expect((err as JevAuthError).status).toBe(status);
    expect((err as JevAuthError).message).toContain(`falha ${status}`);
    expect(s.waits).toEqual([]);
  });

  it('a mensagem do erro e o relatório não contêm a chave, mesmo se a API a ecoar (FND-18)', async () => {
    const f = fakeFetch([{ status: 401, body: `invalid key ${KEY}` }]);
    const err = (await askWithRetry(AC, KEY, f.fn, fakeSleep().fn).catch((e: unknown) => e)) as JevAuthError;
    expect(err.message).toContain('invalid key');
    expect(err.message).not.toContain(KEY);

    const ok = await askWithRetry(AC, KEY, fakeFetch([{ status: 200, body: OK_BODY }]).fn, fakeSleep().fn);
    expect(formatReport('exemplo', [{ ac: AC, result: ok }])).not.toContain(KEY);
  });
});
