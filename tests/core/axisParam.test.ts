import { describe, expect, it } from 'vitest';
import { AxisBuild } from '../../src/core/axisBuild';
import { parseAxesParam, parseBranchParam, type AxisEntry } from '../../src/core/axisParam';

/** O laço de quem lê o parâmetro: um `add` por ponto, recusas ignoradas. */
function applyAxes(build: AxisBuild, entries: AxisEntry[]): void {
  for (const entry of entries) {
    for (let i = 0; i < entry.points; i++) {
      if (entry.item === 'vermelho') build.add('vermelho', entry.axis);
      else build.add('corpo', entry.axis);
    }
  }
}

describe('parseAxesParam (VRM-10, CRP-14)', () => {
  it('lê eixos do Vermelho e do Corpo', () => {
    expect(parseAxesParam('vermelho.potencia:3,corpo.alcance:2')).toEqual([
      { item: 'vermelho', axis: 'potencia', points: 3 },
      { item: 'corpo', axis: 'alcance', points: 2 },
    ]);
  });

  it('null e vazio dão lista vazia', () => {
    expect(parseAxesParam(null)).toEqual([]);
    expect(parseAxesParam('')).toEqual([]);
  });

  it.each([
    'xx.potencia:1',
    'vermelho.xx:1',
    'vermelho.potencia:0',
    'vermelho.potencia:-1',
    'vermelho.potencia:1.5',
    'vermelho.potencia:',
    'vermelho.potencia',
    'vermelho:1',
    'vermelho.potencia:1:2',
    'vermelho.potencia.x:1',
    'vermelho.alcance:1',
    'corpo.potencia:1',
    'toString.potencia:1',
    ':',
  ])('descarta %s', (raw) => {
    expect(parseAxesParam(raw)).toEqual([]);
  });

  it('descarta só as entradas ruins e o resto vale', () => {
    const raw =
      'xx.potencia:1,vermelho.escala:2,vermelho.xx:1,vermelho.potencia:0,vermelho.potencia:-1,' +
      'vermelho.potencia:1.5,:,corpo.furia:1';
    expect(parseAxesParam(raw)).toEqual([
      { item: 'vermelho', axis: 'escala', points: 2 },
      { item: 'corpo', axis: 'furia', points: 1 },
    ]);
  });

  it('não corta o nível: o teto vem do AxisBuild.add', () => {
    const entries = parseAxesParam('vermelho.potencia:9,vermelho.escala:4,corpo.peso:2');
    expect(entries.map((e) => e.points)).toEqual([9, 4, 2]);
    const build = new AxisBuild();
    applyAxes(build, entries);
    expect(build.points('vermelho', 'potencia')).toBe(3);
    expect(build.points('vermelho', 'escala')).toBe(2);
    expect(build.total('vermelho')).toBe(5);
    expect(build.points('corpo', 'peso')).toBe(2);
  });
});

describe('parseBranchParam (VRM-18, CRP-14)', () => {
  it('a e b seguem a ordem dos ramos do item', () => {
    expect(parseBranchParam('vermelho:a,corpo:b')).toEqual([
      { item: 'vermelho', branch: 'ricochete' },
      { item: 'corpo', branch: 'ondaDoPunho' },
    ]);
    expect(parseBranchParam('vermelho:b,corpo:a')).toEqual([
      { item: 'vermelho', branch: 'contido' },
      { item: 'corpo', branch: 'cadencia' },
    ]);
  });

  it('null e vazio dão lista vazia', () => {
    expect(parseBranchParam(null)).toEqual([]);
    expect(parseBranchParam('')).toEqual([]);
  });

  it.each(['vermelho:c', 'vermelho:', 'vermelho', 'xx:a', 'vermelho:a:b', 'vermelho:toString', 'toString:a', ':'])(
    'descarta %s',
    (raw) => {
      expect(parseBranchParam(raw)).toEqual([]);
    },
  );

  it('descarta só as entradas ruins e o resto vale', () => {
    expect(parseBranchParam('vermelho:c,corpo:a')).toEqual([{ item: 'corpo', branch: 'cadencia' }]);
  });
});
