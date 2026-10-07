import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import type { ModuleDef } from '../../src/core/module';
import { Stage, drawModules, parseModulesParam } from '../../src/core/stage';
import { isBossRound } from '../../src/core/waves';
import { AREA } from '../../src/data/tuning';
import { COMBAT_IDS, MODULES } from '../../src/data/modules';

const cols = (ids: readonly string[]): number => ids.reduce((n, id) => n + MODULES[id].grid[0].length, 2);

/** Rng falso: `int` devolve `min + pick`, limitado a `max`. Só o `int` existe: qualquer outro uso quebra. */
function pickRng(pick = 0): Rng {
  return { int: (min: number, max: number) => Math.min(max, min + pick) } as unknown as Rng;
}

/** Catálogo sintético: só a largura importa para a regra de largura. */
const catalog = (widths: Record<string, number>): Record<string, ModuleDef> =>
  Object.fromEntries(
    Object.entries(widths).map(([id, w]) => [id, { id, kind: 'combat', theme: 'rua', grid: ['.'.repeat(w)] }]),
  ) as Record<string, ModuleDef>;

const newStage = (seed: number, forced: readonly string[] | null = null): Stage =>
  new Stage(new Rng(seed ^ 0x1f83d9ab), new Rng(seed ^ 0x5be0cd19), forced);

describe('AREA: tuning (ARE-06, ARE-09, TRV-03, TRV-10)', () => {
  it('bate com a spec', () => {
    expect(AREA).toEqual({ fadeMs: 250, sealBurnMs: 400, playerCol: 3, minCols: 48, maxCols: 120 });
  });
});

describe('Stage.nextArea: quantos módulos (ARE-01, ARE-02, ARE-03)', () => {
  it('2 módulos nas rodadas 1 e 2, 3 na rodada 3 e nas comuns seguintes', () => {
    const stage = newStage(7);
    expect(stage.nextArea(1).modules).toHaveLength(2);
    expect(stage.nextArea(2).modules).toHaveLength(2);
    expect(stage.nextArea(3).modules).toHaveLength(3);
    expect(stage.nextArea(4).modules).toHaveLength(3);
    expect(stage.nextArea(6).modules).toHaveLength(3);
  });

  it('rodadas 5 e 10 são só o santuário', () => {
    const stage = newStage(7);
    expect(stage.nextArea(5).modules).toEqual(['santuario']);
    expect(stage.nextArea(10).modules).toEqual(['santuario']);
  });
});

describe('Stage.nextArea: regras do sorteio em 20 seeds x rodadas 1 a 10 (ARE-04, ARE-05, ARE-06)', () => {
  it('sem vizinho repetido, sem primeiro igual ao da área anterior e com largura entre 48 e 120', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const stage = newStage(seed);
      let prevFirst: string | null = null;
      for (let round = 1; round <= 10; round++) {
        const { modules } = stage.nextArea(round);
        if (isBossRound(round)) continue;
        const where = `seed ${seed} rodada ${round}`;
        for (let i = 1; i < modules.length; i++) expect(modules[i], where).not.toBe(modules[i - 1]);
        if (prevFirst !== null) expect(modules[0], where).not.toBe(prevFirst);
        expect(cols(modules), where).toBeGreaterThanOrEqual(AREA.minCols);
        expect(cols(modules), where).toBeLessThanOrEqual(AREA.maxCols);
        for (const id of modules) expect(COMBAT_IDS, where).toContain(id);
        prevFirst = modules[0];
      }
    }
  });

  it('mesma seed dá a mesma sequência (ARE-07) e seeds diferentes não dão todas a mesma', () => {
    const run = (seed: number): string[][] => {
      const stage = newStage(seed);
      return Array.from({ length: 10 }, (_, i) => stage.nextArea(i + 1).modules);
    };
    expect(run(42)).toEqual(run(42));
    const distinct = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(run(i + 1))));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('o stageRng é o único stream consumido: o slotRng fica intocado', () => {
    const slot = new Rng(99);
    const stage = new Stage(new Rng(5), slot, null);
    for (let r = 1; r <= 10; r++) stage.nextArea(r);
    expect(slot.next()).toBe(new Rng(99).next());
  });
});

describe('drawModules: posições e vizinhos (ARE-04, ARE-05)', () => {
  it('a posição 0 evita o prevFirst e as seguintes evitam a anterior', () => {
    expect(drawModules(pickRng(0), 2, null)).toEqual(['rua', 'beco']);
    expect(drawModules(pickRng(0), 2, 'rua')).toEqual(['beco', 'rua']);
    expect(drawModules(pickRng(5), 3, 'parque')).toEqual(['beco', 'parque', 'beco']);
  });
});

describe('drawModules: regra de largura (ARE-06)', () => {
  // pick 0: posição 0 = a primeira opção, posição 1 = a primeira opção sem a anterior.
  it('120 colunas passa; 121 troca o último pelo mais estreito', () => {
    const ids = ['a', 'b', 'c'];
    expect(drawModules(pickRng(), 2, null, ids, catalog({ a: 60, b: 58, c: 20 }))).toEqual(['a', 'b']);
    expect(drawModules(pickRng(), 2, null, ids, catalog({ a: 60, b: 59, c: 20 }))).toEqual(['a', 'c']);
  });

  it('a troca respeita a regra anti-repetição: o mais estreito é o vizinho, então vale o seguinte', () => {
    // a (20) é o mais estreito, mas é o vizinho do último; sobra c (30).
    expect(drawModules(pickRng(), 2, null, ['a', 'b', 'c'], catalog({ a: 20, b: 100, c: 30 }))).toEqual(['a', 'c']);
  });

  it('48 colunas passa; 47 acrescenta o beco', () => {
    const ids = ['beco', 'x'];
    expect(drawModules(pickRng(), 2, null, ids, catalog({ beco: 20, x: 26 }))).toEqual(['beco', 'x']);
    expect(drawModules(pickRng(), 2, null, ids, catalog({ beco: 20, x: 25 }))).toEqual(['beco', 'x', 'beco']);
  });

  it('se o último já é o beco, acrescenta o mais estreito que não seja ele', () => {
    expect(drawModules(pickRng(), 2, null, ['x', 'beco'], catalog({ x: 20, beco: 25 }))).toEqual(['x', 'beco', 'x']);
  });
});

describe('Stage com módulos forçados (ARE-12)', () => {
  it('usa exatamente a lista, na ordem, em toda área comum', () => {
    const stage = newStage(3, ['beco', 'parque']);
    expect(stage.nextArea(1).modules).toEqual(['beco', 'parque']);
    expect(stage.nextArea(2).modules).toEqual(['beco', 'parque']);
    expect(stage.nextArea(3).modules).toEqual(['beco', 'parque']);
  });

  it('ignora as regras de repetição e de largura', () => {
    const stage = newStage(3, ['beco', 'beco']);
    expect(stage.nextArea(1).modules).toEqual(['beco', 'beco']);
    expect(stage.nextArea(2).modules).toEqual(['beco', 'beco']);
  });

  it('a rodada de chefe continua sendo o santuário', () => {
    expect(newStage(3, ['rua']).nextArea(5).modules).toEqual(['santuario']);
  });
});

describe('parseModulesParam (ARE-12, ARE-13)', () => {
  it('lista de ids de combate conhecidos vale, na ordem', () => {
    expect(parseModulesParam('beco,parque')).toEqual(['beco', 'parque']);
    expect(parseModulesParam('parque,rua')).toEqual(['parque', 'rua']);
  });

  it('ignora desconhecidos e especiais no meio da lista', () => {
    expect(parseModulesParam('rua,xyz,konbini,beco')).toEqual(['rua', 'beco']);
  });

  it('só desconhecidos ou especiais, lista vazia e ausente voltam ao sorteio', () => {
    expect(parseModulesParam('konbini,xyz')).toBeNull();
    expect(parseModulesParam('santuario')).toBeNull();
    expect(parseModulesParam('')).toBeNull();
    expect(parseModulesParam(null)).toBeNull();
  });
});
