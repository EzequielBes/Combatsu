import { describe, expect, it } from 'vitest';
import { lintModule, validateModule, type ModuleDef, type ModuleKind } from '../../src/core/module';

const FLOOR = (w: number): string => '#'.repeat(w);

/** Módulo válido de `w` colunas: espaço aberto, 2 `E` na linha 14, 1 `c`. `edit` troca uma linha. */
function mod(w: number, kind: ModuleKind = 'combat', edit: Record<number, string> = {}): ModuleDef {
  const rows: string[] = [];
  for (let r = 0; r < 15; r++) rows.push('.'.repeat(w));
  rows[14] = 'E' + '.'.repeat(w - 3) + 'E' + '.';
  rows[13] = 'c' + '.'.repeat(w - 1);
  rows.push(FLOOR(w), FLOOR(w));
  for (const [r, v] of Object.entries(edit)) rows[Number(r)] = v;
  return { id: 'teste', kind, theme: 'rua', grid: rows };
}

const replaceAt = (s: string, i: number, ch: string): string => s.slice(0, i) + ch + s.slice(i + 1);

describe('validateModule: formato (MDL-01, MDL-02, MDL-03)', () => {
  it('aceita 16 e 48 colunas', () => {
    expect(() => validateModule(mod(16))).not.toThrow();
    expect(() => validateModule(mod(48))).not.toThrow();
  });

  it('recusa 15 e 49 colunas, com id, linha e coluna na mensagem (MDL-03)', () => {
    expect(() => validateModule(mod(15))).toThrow('Módulo "teste": linha 0, coluna 15: largura 15');
    expect(() => validateModule(mod(49))).toThrow('Módulo "teste": linha 0, coluna 49: largura 49');
  });

  it('recusa 16 e 18 linhas, com id, linha e coluna na mensagem (MDL-03)', () => {
    const m = mod(20);
    expect(() => validateModule({ ...m, grid: m.grid.slice(1) })).toThrow(
      'Módulo "teste": linha 16, coluna 0: a grade tem 16 linhas',
    );
    expect(() => validateModule({ ...m, grid: [...m.grid, FLOOR(20)] })).toThrow(
      'Módulo "teste": linha 18, coluna 0: a grade tem 18 linhas',
    );
  });

  it('recusa linha de largura diferente, citando id, linha e coluna (MDL-03)', () => {
    const m = mod(20);
    const narrow = [...m.grid];
    narrow[5] = '.'.repeat(19);
    expect(() => validateModule({ ...m, grid: narrow })).toThrow(
      'Módulo "teste": linha 5, coluna 19: a linha tem 19 colunas; esperado 20',
    );
    const wide = [...m.grid];
    wide[5] = '.'.repeat(21);
    expect(() => validateModule({ ...m, grid: wide })).toThrow(
      'Módulo "teste": linha 5, coluna 21: a linha tem 21 colunas; esperado 20',
    );
  });

  it('recusa P com id, linha e coluna na mensagem', () => {
    const m = mod(20, 'combat', { 3: replaceAt('.'.repeat(20), 7, 'P') });
    expect(() => validateModule(m)).toThrow('Módulo "teste": linha 3, coluna 7');
  });

  it('recusa caractere desconhecido (x) com linha e coluna', () => {
    const m = mod(20, 'combat', { 9: replaceAt('.'.repeat(20), 0, 'x') });
    expect(() => validateModule(m)).toThrow('Módulo "teste": linha 9, coluna 0');
  });

  it('aceita a legenda inteira # . E c b p', () => {
    const m = mod(20, 'combat', { 12: 'bp' + '.'.repeat(18) });
    expect(() => validateModule(m)).not.toThrow();
  });
});

describe('lintModule: chão e plataformas (MDL-04, MDL-05)', () => {
  it('módulo válido não tem erro', () => {
    expect(lintModule(mod(32))).toEqual([]);
  });

  it('chão faltando 1 tile na linha 15 falha', () => {
    const errors = lintModule(mod(20, 'combat', { 15: replaceAt(FLOOR(20), 4, '.') }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/MDL-04/);
    expect(errors[0]).toMatch(/linha 15, coluna 4/);
  });

  it('chão faltando 1 tile na linha 16 falha', () => {
    const errors = lintModule(mod(20, 'combat', { 16: replaceAt(FLOOR(20), 19, '.') }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/linha 16, coluna 19/);
  });

  it('# na linha 14 falha', () => {
    const row = replaceAt(mod(20).grid[14], 10, '#');
    const errors = lintModule(mod(20, 'combat', { 14: row }));
    expect(errors.some((e) => /MDL-05/.test(e) && /linha 14, coluna 10/.test(e))).toBe(true);
  });

  it('# na linha 0 falha', () => {
    const errors = lintModule(mod(20, 'combat', { 0: replaceAt('.'.repeat(20), 0, '#') }));
    expect(errors.some((e) => /MDL-05/.test(e) && /linha 0/.test(e))).toBe(true);
  });
});

describe('lintModule: espaço de luta (MDL-06)', () => {
  // Bloco sólido na linha 9 divide o módulo de 24 colunas em dois trechos abertos.
  const split = (at: number): ModuleDef => mod(24, 'combat', { 9: replaceAt('.'.repeat(24), at, '#') });

  it('12 colunas abertas seguidas passa', () => {
    // sólido na coluna 12: aberto 0..11 (12 colunas) e 13..23 (11 colunas).
    // (o # em si é um erro de MDL-05, mas não de MDL-06)
    expect(lintModule(split(12)).some((e) => /MDL-06/.test(e))).toBe(false);
  });

  it('11 colunas abertas seguidas falha', () => {
    // sólido na coluna 11: aberto 0..10 (11) e 12..23 (12) passa; para falhar precisa de 11 e 11 em 23 colunas.
    const m = mod(23, 'combat', { 9: replaceAt('.'.repeat(23), 11, '#') });
    const errors = lintModule(m);
    expect(errors.some((e) => /MDL-06/.test(e))).toBe(true);
  });

  it('o limite vale para o módulo boss também', () => {
    const m = mod(23, 'boss', { 9: replaceAt('.'.repeat(23), 11, '#') });
    expect(lintModule(m).some((e) => /MDL-06/.test(e))).toBe(true);
  });
});

describe('lintModule: spawns e objetos (MDL-07, MDL-08)', () => {
  const withE = (n: number, w = 20): ModuleDef => {
    const cells = '.'.repeat(w).split('');
    for (let i = 0; i < n; i++) cells[1 + i * 3] = 'E';
    return mod(w, 'combat', { 14: cells.join('') });
  };

  it('1 E falha', () => {
    expect(lintModule(withE(1)).some((e) => /MDL-07/.test(e))).toBe(true);
  });

  it('2 E passa', () => {
    expect(lintModule(withE(2))).toEqual([]);
  });

  it('E na linha 13 falha', () => {
    const m = withE(2);
    const grid = [...m.grid];
    grid[13] = replaceAt(grid[13], 5, 'E');
    const errors = lintModule({ ...m, grid });
    expect(errors.some((e) => /MDL-07/.test(e) && /linha 13, coluna 5/.test(e))).toBe(true);
  });

  it('combate sem c, b nem p falha', () => {
    const m = mod(20, 'combat', { 13: '.'.repeat(20) });
    expect(lintModule(m).some((e) => /MDL-08/.test(e))).toBe(true);
  });

  it('um p basta como objeto', () => {
    const m = mod(20, 'combat', { 13: replaceAt('.'.repeat(20), 8, 'p') });
    expect(lintModule(m)).toEqual([]);
  });

  it('um b basta como objeto', () => {
    const m = mod(20, 'combat', { 13: replaceAt('.'.repeat(20), 8, 'b') });
    expect(lintModule(m)).toEqual([]);
  });
});

describe('lintModule: konbini e boss (MDL-06..09)', () => {
  it('konbini com E falha', () => {
    const m = mod(20, 'konbini', { 14: replaceAt('.'.repeat(20), 6, 'E') });
    expect(lintModule(m).some((e) => /MDL-09/.test(e) && /linha 14, coluna 6/.test(e))).toBe(true);
  });

  it('konbini sem E e sem objeto passa (MDL-06..08 não valem para ela)', () => {
    const m = mod(20, 'konbini', { 13: '.'.repeat(20), 14: '.'.repeat(20) });
    expect(lintModule(m)).toEqual([]);
  });

  it('módulo boss sem E falha em MDL-07 e sem objeto falha em MDL-08', () => {
    const m = mod(20, 'boss', { 13: '.'.repeat(20), 14: '.'.repeat(20) });
    const errors = lintModule(m);
    expect(errors.some((e) => /MDL-07/.test(e))).toBe(true);
    expect(errors.some((e) => /MDL-08/.test(e))).toBe(true);
  });
});
