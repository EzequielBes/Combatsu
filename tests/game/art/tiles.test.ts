import { describe, expect, it } from 'vitest';
import { TILE, type TileVariant } from '../../../src/core/level';
import { parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import { TILE_FRAMES, tileFrameFor } from '../../../src/game/art/tiles';

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
