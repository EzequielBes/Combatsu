import { describe, expect, it } from 'vitest';
import { lintModule, validateModule } from '../../src/core/module';
import { COMBAT_IDS, MODULES } from '../../src/data/modules';

const EXPECTED = [
  ['rua', 40, 'combat'],
  ['beco', 20, 'combat'],
  ['parque', 32, 'combat'],
  ['konbini', 20, 'konbini'],
  ['santuario', 48, 'boss'],
] as const;

describe('catálogo de módulos (MDL-10, THM-01)', () => {
  it('tem exatamente os cinco módulos, e COMBAT_IDS na ordem do sorteio', () => {
    expect(Object.keys(MODULES).sort()).toEqual(['beco', 'konbini', 'parque', 'rua', 'santuario']);
    expect(COMBAT_IDS).toEqual(['rua', 'beco', 'parque']);
  });

  for (const [id, width, kind] of EXPECTED) {
    describe(id, () => {
      const def = MODULES[id];

      it(`tem ${width} colunas, kind ${kind} e tema ${id}`, () => {
        expect(def.id).toBe(id);
        expect(def.grid).toHaveLength(17);
        expect(def.grid.every((row) => row.length === width)).toBe(true);
        expect(def.kind).toBe(kind);
        expect(def.theme).toBe(id);
      });

      it('passa em validateModule e lintModule sem erro', () => {
        expect(() => validateModule(def)).not.toThrow();
        expect(lintModule(def)).toEqual([]);
      });
    });
  }

  it('o santuário tem exatamente dois slots de objeto p (ARN-12)', () => {
    const slots = MODULES.santuario.grid
      .join('')
      .split('')
      .filter((ch) => ch === 'p').length;
    expect(slots).toBe(2);
  });

  it('todo módulo de combate e o santuário têm um E a até 4 colunas de cada borda', () => {
    for (const id of [...COMBAT_IDS, 'santuario']) {
      const row = MODULES[id].grid[14];
      const w = row.length;
      const cols = [...row].flatMap((ch, c) => (ch === 'E' ? [c] : []));
      expect(
        cols.some((c) => c <= 4),
        id,
      ).toBe(true);
      expect(
        cols.some((c) => c >= w - 5),
        id,
      ).toBe(true);
    }
  });

  it('todo módulo de combate tem pelo menos um p', () => {
    for (const id of COMBAT_IDS) {
      expect(MODULES[id].grid.join('').includes('p'), id).toBe(true);
    }
  });

  it('a konbini não tem E', () => {
    expect(MODULES.konbini.grid.join('').includes('E')).toBe(false);
  });
});
