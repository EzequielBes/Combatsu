import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_PATHS, exitCodeFor, failedNames, findEdge } from '../../scripts/smoke/lib';

const existsIn = (paths: string[]) => (p: string): boolean => paths.includes(p);

describe('findEdge: onde procurar o Edge (FND-12)', () => {
  const candidates = ['C:/a/msedge.exe', 'C:/b/msedge.exe'];

  it('prefere o EDGE_PATH quando ele existe', () => {
    const exists = existsIn(['C:/custom/msedge.exe', ...candidates]);
    expect(findEdge('C:/custom/msedge.exe', candidates, exists)).toBe('C:/custom/msedge.exe');
  });

  it('EDGE_PATH inválido: cai no primeiro candidato que existe', () => {
    const exists = existsIn(['C:/b/msedge.exe']);
    expect(findEdge('C:/nao/existe.exe', candidates, exists)).toBe('C:/b/msedge.exe');
  });

  it('sem EDGE_PATH: o primeiro candidato existente, na ordem da lista', () => {
    expect(findEdge(undefined, candidates, existsIn(candidates))).toBe('C:/a/msedge.exe');
  });

  it('nada existe: null (o runner sai com código 2)', () => {
    expect(findEdge('C:/nao/existe.exe', candidates, existsIn([]))).toBeNull();
    expect(findEdge(undefined, candidates, existsIn([]))).toBeNull();
  });
});

describe('DEFAULT_EDGE_PATHS: caminhos padrão do Windows', () => {
  it('contém Program Files e Program Files (x86)', () => {
    expect(DEFAULT_EDGE_PATHS).toContain('C:/Program Files/Microsoft/Edge/Application/msedge.exe');
    expect(DEFAULT_EDGE_PATHS).toContain('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  });
});

describe('exitCodeFor e failedNames (FND-11)', () => {
  const allOk = [
    { name: 'a.smoke.mjs', ok: true },
    { name: 'b.smoke.mjs', ok: true },
  ];
  const mixed = [
    { name: 'a.smoke.mjs', ok: true },
    { name: 'b.smoke.mjs', ok: false },
    { name: 'c.smoke.mjs', ok: false },
  ];

  it('todos ok: saída 0 e nenhum nome', () => {
    expect(exitCodeFor(allOk)).toBe(0);
    expect(failedNames(allOk)).toEqual([]);
  });

  it('ao menos uma falha: saída 1 e só os nomes que falharam', () => {
    expect(exitCodeFor(mixed)).toBe(1);
    expect(exitCodeFor([{ name: 'x.smoke.mjs', ok: false }])).toBe(1);
    expect(failedNames(mixed)).toEqual(['b.smoke.mjs', 'c.smoke.mjs']);
  });
});
