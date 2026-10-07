import { describe, expect, it } from 'vitest';
import { TILE, parseLevel } from '../../src/core/level';
import type { ModuleDef } from '../../src/core/module';
import { Rng } from '../../src/core/rng';
import { Stage, areaModeFor, composeArea, konbiniArea } from '../../src/core/stage';
import { MODULES } from '../../src/data/modules';

/** Rng falso: `next` devolve os valores da fila, na ordem; sobrando, 0,99. */
function queueRng(values: number[]): Rng {
  const queue = [...values];
  return { next: () => queue.shift() ?? 0.99 } as unknown as Rng;
}

/** Módulo sintético de 16 colunas: todo vazio, com as células de `cells` (linha e coluna do módulo) trocadas. */
function synth(id: string, cells: Record<string, string>): ModuleDef {
  const rows = Array.from({ length: 15 }, () => '.'.repeat(16).split(''));
  for (const [key, ch] of Object.entries(cells)) {
    const [r, c] = key.split(',').map(Number);
    rows[r][c] = ch;
  }
  const grid = [...rows.map((r) => r.join('')), '#'.repeat(16), '#'.repeat(16)];
  return { id, kind: 'combat', theme: 'rua', grid };
}

const widthOf = (ids: readonly string[]): number => ids.reduce((n, id) => n + MODULES[id].grid[0].length, 0);

describe('composeArea: parede, selo e largura (ARE-06, ARE-08)', () => {
  const ids = ['rua', 'beco'];
  const grid = composeArea(ids, MODULES, new Rng(1));

  it('largura = soma dos módulos + 2 e 17 linhas', () => {
    expect(grid.rows).toHaveLength(17);
    for (const row of grid.rows) expect(row).toHaveLength(widthOf(ids) + 2);
  });

  it('a coluna 0 é toda #', () => {
    for (const row of grid.rows) expect(row[0]).toBe('#');
  });

  it('a última coluna é S nas linhas 0 a 14 e # nas linhas 15 e 16', () => {
    const last = grid.rows[0].length - 1;
    expect(grid.sealCol).toBe(last);
    for (let r = 0; r <= 14; r++) expect(grid.rows[r][last], `linha ${r}`).toBe('S');
    expect(grid.rows[15][last]).toBe('#');
    expect(grid.rows[16][last]).toBe('#');
  });

  it('spans: cada módulo com o tema e as colunas certas (col0 e col1 inclusivos)', () => {
    expect(grid.spans).toEqual([
      { id: 'rua', theme: 'rua', col0: 1, col1: 40 },
      { id: 'beco', theme: 'beco', col0: 41, col1: 60 },
    ]);
  });

  it('o parseLevel da grade lê o selo na última coluna, de cima até a linha 14', () => {
    const lvl = parseLevel(grid.rows);
    expect(lvl.seal).toEqual({ x: (grid.rows[0].length - 1) * TILE, y: 0, width: TILE, height: 15 * TILE });
  });
});

describe('composeArea: o player na coluna 3 (ARE-09)', () => {
  it('o parseLevel dá o player no centro da coluna 3, linha 14', () => {
    const lvl = parseLevel(composeArea(['parque', 'rua'], MODULES, new Rng(2)).rows);
    expect(lvl.player).toEqual({ x: 3 * TILE + TILE / 2, y: 14 * TILE + TILE / 2 });
  });

  it('o catálogo não perde nenhum E de borda com o P (nenhum E fica na coluna 3)', () => {
    for (const id of ['rua', 'beco', 'parque']) {
      expect(MODULES[id].grid[14][2], id).not.toBe('E');
    }
  });
});

describe('composeArea: slots p (SLT-01, SLT-02, SLT-03)', () => {
  // Um slot na linha 14 (coluna 6 do módulo), em módulo de uma linha só de interesse.
  const one = (rng: number): string => {
    const grid = composeArea(['t'], { t: synth('t', { '14,6': 'p' }) }, queueRng([rng]));
    return grid.rows[14][1 + 6];
  };

  it('0,39 vira cadeira; 0,4 vira garrafa', () => {
    expect(one(0.39)).toBe('c');
    expect(one(0.4)).toBe('b');
  });

  it('0,79 vira garrafa; 0,8 fica vazio', () => {
    expect(one(0.79)).toBe('b');
    expect(one(0.8)).toBe('.');
  });

  it('percorre de cima para baixo e da esquerda para a direita', () => {
    const mod = synth('t', { '14,6': 'p', '3,9': 'p', '3,5': 'p' });
    const grid = composeArea(['t'], { t: mod }, queueRng([0.1, 0.5, 0.9]));
    expect(grid.rows[3][1 + 5]).toBe('c');
    expect(grid.rows[3][1 + 9]).toBe('b');
    expect(grid.rows[14][1 + 6]).toBe('.');
  });

  it('mais de 1000 slots saem em 40/40/20 com 5 pontos de folga', () => {
    // 5 módulos de 15 linhas x 16 colunas, todas `p`: 1200 slots (a coluna 3 vira o P e não conta).
    const cells = Object.fromEntries(
      Array.from({ length: 15 * 16 }, (_, i) => [`${Math.floor(i / 16)},${i % 16}`, 'p']),
    );
    const grid = composeArea(['t', 't', 't', 't', 't'], { t: synth('t', cells) }, new Rng(123));
    const upper = grid.rows.slice(0, 15).join('');
    const count = (ch: string): number => [...upper].filter((x) => x === ch).length;
    const slots = count('c') + count('b') + count('.');
    expect(slots).toBeGreaterThan(1000);
    expect(Math.abs(count('c') / slots - 0.4)).toBeLessThan(0.05);
    expect(Math.abs(count('b') / slots - 0.4)).toBeLessThan(0.05);
    expect(Math.abs(count('.') / slots - 0.2)).toBeLessThan(0.05);
  });

  it('c e b fixos ficam e não consomem o slotRng', () => {
    const mod = synth('t', { '14,6': 'c', '14,9': 'b' });
    const slot = new Rng(7);
    const grid = composeArea(['t'], { t: mod }, slot);
    expect(grid.rows[14][1 + 6]).toBe('c');
    expect(grid.rows[14][1 + 9]).toBe('b');
    expect(slot.next()).toBe(new Rng(7).next());
  });

  it('trocar o número de slots não muda os ids sorteados para a mesma seed (SLT-02)', () => {
    const ids = (withSlots: boolean): string[][] => {
      const stage = new Stage(new Rng(11 ^ 0x1f83d9ab), new Rng(11 ^ 0x5be0cd19), null);
      const out: string[][] = [];
      for (let round = 1; round <= 10; round++) {
        const plan = stage.nextArea(round);
        if (withSlots) stage.compose(plan);
        out.push(plan.modules);
      }
      return out;
    };
    expect(ids(true)).toEqual(ids(false));
  });

  it('Stage.compose usa o slotRng da run: mesma seed, mesma grade', () => {
    const make = (): Stage => new Stage(new Rng(5), new Rng(6), null);
    const a = make();
    const b = make();
    expect(a.compose(a.nextArea(1)).rows).toEqual(b.compose(b.nextArea(1)).rows);
  });
});

describe('konbiniArea (KON-01, KON-05)', () => {
  const grid = konbiniArea(MODULES);

  it('largura = 20 + 2, com parede na coluna 0 e o chão fechado', () => {
    for (const row of grid.rows) expect(row).toHaveLength(22);
    for (const row of grid.rows) expect(row[0]).toBe('#');
    expect(grid.rows[15]).toBe('#'.repeat(22));
    expect(grid.rows[16]).toBe('#'.repeat(22));
  });

  it('não tem S nem E, não tem selo e o player fica na coluna 3', () => {
    const all = grid.rows.join('');
    expect(all.includes('S')).toBe(false);
    expect(all.includes('E')).toBe(false);
    expect(grid.sealCol).toBeNull();
    const lvl = parseLevel(grid.rows);
    expect(lvl.seal).toBeNull();
    expect(lvl.enemies).toEqual([]);
    expect(lvl.player).toEqual({ x: 3 * TILE + TILE / 2, y: 14 * TILE + TILE / 2 });
    expect(grid.spans).toEqual([{ id: 'konbini', theme: 'konbini', col0: 1, col1: 20 }]);
  });
});

describe('areaModeFor (LEG-01, LEG-02, LEG-04)', () => {
  it('area=sala, fxlab e fxlab com modules são a sala', () => {
    expect(areaModeFor('?area=sala')).toBe('sala');
    expect(areaModeFor('?debug&area=sala')).toBe('sala');
    expect(areaModeFor('?debug&fxlab')).toBe('sala');
    expect(areaModeFor('?debug&fxlab&modules=rua')).toBe('sala');
    expect(areaModeFor('?debug&fxlab&area=outra')).toBe('sala');
  });

  it('?debug, vazio e os demais parâmetros são o mundo modular', () => {
    expect(areaModeFor('?debug')).toBe('modular');
    expect(areaModeFor('')).toBe('modular');
    expect(areaModeFor('?debug&modules=rua')).toBe('modular');
    expect(areaModeFor('?area=outra')).toBe('modular');
    expect(areaModeFor('?area=sala2')).toBe('modular');
  });
});
