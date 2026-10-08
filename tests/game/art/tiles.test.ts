import { describe, expect, it } from 'vitest';
import { TILE, type TileVariant } from '../../../src/core/level';
import { parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import { TILE_FRAMES, tileFrameFor } from '../../../src/game/art/tiles';
import { SEAL_FRAMES, THEME_FRAMES, THEME_TEXTURES } from '../../../src/game/art/tilesThemes';

describe('tileset (ENV-01, ART-01)', () => {
  const VARIANTS: TileVariant[] = [
    'top',
    'middle',
    'left',
    'right',
    'top-left',
    'top-right',
    'thin',
    'thin-left',
    'thin-right',
  ];

  it('a folha passa no parseSheet só com cores da paleta, em tiles de 16x16 texels (32 px)', () => {
    const sheet = parseSheet('tiles', TILE_FRAMES, PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBe(TILE);
    expect(sheet.height * ART_SCALE).toBe(TILE);
  });

  it('tem um frame para cada variante do ENV-01', () => {
    for (const v of VARIANTS) expect(Object.keys(TILE_FRAMES)).toContain(v);
  });

  it('tileFrameFor sempre devolve um frame da folha daquela variante, igual para a mesma posição', () => {
    for (const v of VARIANTS) {
      for (let tx = 0; tx < 20; tx++) {
        for (let ty = 0; ty < 10; ty++) {
          const key = tileFrameFor(v, tx, ty);
          expect(Object.hasOwn(TILE_FRAMES, key)).toBe(true);
          expect(key === v || key.startsWith(`${v}~`)).toBe(true);
          expect(tileFrameFor(v, tx, ty)).toBe(key);
        }
      }
    }
  });
});

describe('folhas de terreno por tema e selo (THM-01, THM-03)', () => {
  const THEMES = ['rua', 'beco', 'parque', 'konbini', 'santuario'] as const;

  it.each(THEMES)('%s tem os mesmos frames da folha terrain, só com cores da paleta, em 16x16 texels', (theme) => {
    const sheet = parseSheet(`terrain-${theme}`, THEME_FRAMES[theme], PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBe(TILE);
    expect(sheet.height * ART_SCALE).toBe(TILE);
    expect(Object.keys(THEME_FRAMES[theme]).sort()).toEqual(Object.keys(TILE_FRAMES).sort());
  });

  it('tileFrameFor devolve um frame existente em todas as folhas de tema', () => {
    for (const theme of THEMES) {
      for (const v of [
        'top',
        'middle',
        'left',
        'right',
        'top-left',
        'top-right',
        'thin',
        'thin-left',
        'thin-right',
      ] as const) {
        for (let t = 0; t < 12; t++) expect(Object.hasOwn(THEME_FRAMES[theme], tileFrameFor(v, t, t * 3))).toBe(true);
      }
    }
  });

  it('os cinco chãos são distintos entre si (THM-01)', () => {
    const tops = THEMES.map((t) => THEME_FRAMES[t].top.join('\n'));
    expect(new Set(tops).size).toBe(THEMES.length);
    const bodies = THEMES.map((t) => THEME_FRAMES[t].middle.join('\n'));
    expect(new Set(bodies).size).toBe(THEMES.length);
  });

  it('o chão da rua não tem linha inteira laranja (CEN-04)', () => {
    for (const [name, rows] of Object.entries(THEME_FRAMES.rua)) {
      for (const row of rows) expect(/^[aA]+$/.test(row), `${name}: ${row}`).toBe(false);
    }
  });

  it('cada tema tem a chave de textura própria em TEX', () => {
    expect(new Set(Object.values(THEME_TEXTURES)).size).toBe(THEMES.length);
    for (const t of THEMES) expect(THEME_TEXTURES[t]).toBe(`terrain-${t}`);
  });

  it('o selo existe, é um tile de 16x16 texels e só usa cores da paleta', () => {
    expect(Object.keys(SEAL_FRAMES)).toContain('seal');
    const sheet = parseSheet('seal', SEAL_FRAMES, PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBe(TILE);
    expect(sheet.height * ART_SCALE).toBe(TILE);
  });
});
