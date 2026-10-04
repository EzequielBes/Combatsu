import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import { PROP_SHARDS, PROP_SPRITES, SMOKE, SMOKE_CURSE } from '../../../src/game/art/sprites/props';
import { FRAGMENT_FRAMES, FRAGMENT_ICON, HEAL_FRAMES } from '../../../src/game/art/sprites/economy';
import { TOOL_FRAMES, TOOL_SHARDS } from '../../../src/game/art/sprites/tools';
import { artMeasure } from './helpers';

describe('objetos com arte (PRP-01, ART-01, ART-03)', () => {
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));
  // Tamanhos atuais dos corpos físicos, que saem do tamanho da textura: a física não pode mudar.
  const BODY_PX = { chair: { w: 26, h: 26 }, bottle: { w: 8, h: 20 } } as const;

  for (const key of ['chair', 'bottle'] as const) {
    it(`${key}: passa no parseSheet só com cores da paleta, com o mesmo tamanho do corpo atual`, () => {
      const sheet = parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS);
      expect(sheet.width * ART_SCALE).toBe(BODY_PX[key].w);
      expect(sheet.height * ART_SCALE).toBe(BODY_PX[key].h);
    });

    it(`${key}: tem contorno (k) e pelo menos dois tons próprios além dele`, () => {
      const colors = colorsOf(parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS).frames[0].cells);
      expect(colors.has('k')).toBe(true);
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it(`${key}: os fragmentos passam no parseSheet e só usam cores do sprite de origem`, () => {
      const source = colorsOf(parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS).frames[0].cells);
      const shards = PROP_SHARDS[key];
      expect(shards.length).toBeGreaterThan(1);
      const frames = Object.fromEntries(shards.map((s) => [s.key, s.grid]));
      const sheet = parseSheet(`${key}-shards`, frames, PALETTE_KEYS);
      for (const f of sheet.frames) {
        const colors = colorsOf(f.cells);
        expect(colors.size, f.key).toBeGreaterThan(0);
        for (const c of colors) expect(source.has(c), `${f.key}: ${c}`).toBe(true);
      }
    });

    it(`${key}: cada fragmento é um recorte do sprite na sua posição, e juntos cobrem todo texel pintado`, () => {
      const grid = PROP_SPRITES[key];
      const covered = new Set<string>();
      for (const s of PROP_SHARDS[key]) {
        s.grid.forEach((row, dy) =>
          [...row].forEach((ch, dx) => {
            if (ch === '.') return;
            expect(grid[s.y + dy]?.[s.x + dx], `${s.key} (${dx}, ${dy})`).toBe(ch);
            covered.add(`${s.x + dx},${s.y + dy}`);
          }),
        );
      }
      grid.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') expect(covered.has(`${x},${y}`), `(${x}, ${y})`).toBe(true);
        }),
      );
    });
  }

  it('a fumaça da dissolução tem um frame por roxo da paleta (u, v, U), cada um só com a sua cor (ART-01)', () => {
    const sheet = parseSheet('smoke-curse', SMOKE_CURSE, PALETTE_KEYS);
    expect(sheet.frames.map((fr) => fr.key).sort()).toEqual(['U', 'u', 'v']);
    for (const fr of sheet.frames) {
      const colors = new Set(fr.cells.flat().filter((c) => c !== null));
      expect([...colors]).toEqual([fr.key]);
    }
  });

  it('a fumaça é uma textura pequena da paleta', () => {
    const sheet = parseSheet('smoke', { smoke: SMOKE }, PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBeLessThanOrEqual(8);
    expect(sheet.height * ART_SCALE).toBeLessThanOrEqual(8);
  });
});

describe('objetos com volume (OBJ-01, OBJ-02)', () => {
  it('OBJ-01: a cadeira tem 13x13 texels e pelo menos 6 chaves distintas, entre elas m, M, s e S', () => {
    const sheet = parseSheet('chair', { chair: PROP_SPRITES.chair }, PALETTE_KEYS);
    expect(sheet.width).toBe(13);
    expect(sheet.height).toBe(13);
    const keys = artMeasure.keysOf(PROP_SPRITES.chair);
    expect(keys.size).toBeGreaterThanOrEqual(6);
    for (const key of ['m', 'M', 's', 'S']) expect(keys.has(key), key).toBe(true);
  });

  it('OBJ-02: a garrafa tem 4x10 texels e as chaves G, g, w, l e L', () => {
    const sheet = parseSheet('bottle', { bottle: PROP_SPRITES.bottle }, PALETTE_KEYS);
    expect(sheet.width).toBe(4);
    expect(sheet.height).toBe(10);
    const keys = artMeasure.keysOf(PROP_SPRITES.bottle);
    for (const key of ['G', 'g', 'w', 'l', 'L']) expect(keys.has(key), key).toBe(true);
  });
});

describe('ferramentas com volume (OBJ-03, OBJ-04)', () => {
  it.each([
    ['cursedKnife', 3, 10, ['w', 'z']],
    ['cursedClub', 5, 8, ['l', 'M']],
  ] as const)(
    '%s: o frame common tem %ix%i texels, pelo menos 7 chaves distintas (entre elas %j) e nenhuma A',
    (key, w, h, required) => {
      const common = TOOL_FRAMES[key].common;
      const sheet = parseSheet(key, { common }, PALETTE_KEYS);
      expect(sheet.width).toBe(w);
      expect(sheet.height).toBe(h);
      const keys = artMeasure.keysOf(common);
      expect(keys.size).toBeGreaterThanOrEqual(7);
      for (const k of required) expect(keys.has(k), k).toBe(true);
      expect(keys.has('A')).toBe(false);
    },
  );
});

describe('fragmento amaldiçoado e ícone do contador (ECO-23)', () => {
  it('a folha do fragmento passa no parseSheet, tem 5x7 texels em 2 frames', () => {
    const sheet = parseSheet('fragment', FRAGMENT_FRAMES, PALETTE_KEYS);
    expect(sheet.width).toBe(5);
    expect(sheet.height).toBe(7);
    expect(sheet.frames.map((f) => f.key).sort()).toEqual(['a', 'b']);
  });

  it('os 2 frames do fragmento cintilam: não são idênticos', () => {
    expect(FRAGMENT_FRAMES.a).not.toEqual(FRAGMENT_FRAMES.b);
  });

  it('o ícone do contador passa no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('fragment-icon', { icon: FRAGMENT_ICON }, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(1);
  });
});

describe('gota de cura (HEAL)', () => {
  it('a folha da gota passa no parseSheet, tem 6x8 texels em 2 frames que pulsam', () => {
    const sheet = parseSheet('heal-drop', HEAL_FRAMES, PALETTE_KEYS);
    expect(sheet.width).toBe(6);
    expect(sheet.height).toBe(8);
    expect(sheet.frames.map((f) => f.key).sort()).toEqual(['a', 'b']);
    expect(HEAL_FRAMES.a).not.toEqual(HEAL_FRAMES.b);
  });
});

describe('ferramentas amaldiçoadas (ARM-19, RAR-03)', () => {
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));

  for (const key of ['cursedKnife', 'cursedClub'] as const) {
    it(`${key}: a folha passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      expect(sheet.frames.map((f) => f.key).sort()).toEqual(
        ['common', 'hold-a', 'hold-b', 'hold-rare', 'raised', 'rare'].sort(),
      );
    });

    it(`${key}: o frame rare tem contorno A e o common tem contorno k`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const rare = colorsOf(sheet.frames.find((f) => f.key === 'rare')!.cells);
      const common = colorsOf(sheet.frames.find((f) => f.key === 'common')!.cells);
      expect(rare.has('A')).toBe(true);
      expect(rare.has('k')).toBe(false);
      expect(common.has('k')).toBe(true);
      expect(common.has('A')).toBe(false);
    });

    it(`${key}: o frame raised tem o brilho U`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const raised = colorsOf(sheet.frames.find((f) => f.key === 'raised')!.cells);
      expect(raised.has('U')).toBe(true);
    });

    it(`${key}: hold-a e hold-b diferem só no contorno da aura (u vs v)`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const holdA = sheet.frames.find((f) => f.key === 'hold-a')!;
      const holdB = sheet.frames.find((f) => f.key === 'hold-b')!;
      const replaced = holdA.cells.map((row, y) => row.map((c, x) => (c === 'u' ? holdB.cells[y][x] : c)));
      expect(replaced).toEqual(holdB.cells);
      expect(colorsOf(holdA.cells).has('u')).toBe(true);
      expect(colorsOf(holdB.cells).has('v')).toBe(true);
    });

    it(`${key}: os estilhaços passam no parseSheet e só usam cores do frame comum`, () => {
      const source = colorsOf(parseSheet(key, { common: TOOL_FRAMES[key].common }, PALETTE_KEYS).frames[0].cells);
      const shards = TOOL_SHARDS[key];
      expect(shards.length).toBeGreaterThan(1);
      const frames = Object.fromEntries(shards.map((s) => [s.key, s.grid]));
      const sheet = parseSheet(`${key}-shards`, frames, PALETTE_KEYS);
      for (const f of sheet.frames) {
        const colors = colorsOf(f.cells);
        expect(colors.size, f.key).toBeGreaterThan(0);
        for (const c of colors) expect(source.has(c), `${f.key}: ${c}`).toBe(true);
      }
    });
  }
});
