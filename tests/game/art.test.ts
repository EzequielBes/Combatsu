import { describe, expect, it } from 'vitest';
import { TILE, type TileVariant } from '../../src/core/level';
import { TRANSPARENT, parseSheet } from '../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { TILE_FRAMES, tileFrameFor } from '../../src/game/art/tiles';

describe('paleta única (ART-01)', () => {
  it('tem no máximo 32 cores, cada uma com chave de 1 caractere', () => {
    const keys = Object.keys(PALETTE);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(32);
    for (const k of keys) expect([...k]).toHaveLength(1);
  });

  it('reserva "." para transparente: não está na paleta', () => {
    expect(TRANSPARENT).toBe('.');
    expect(Object.hasOwn(PALETTE, '.')).toBe(false);
    expect(PALETTE_KEYS.has('.')).toBe(false);
  });

  it('só tem cores válidas entre 0x000000 e 0xffffff', () => {
    for (const color of Object.values(PALETTE)) {
      expect(Number.isInteger(color)).toBe(true);
      expect(color).toBeGreaterThanOrEqual(0x000000);
      expect(color).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('PALETTE_KEYS tem exatamente as chaves da paleta', () => {
    expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(PALETTE).sort());
  });
});

describe('escala de texel (ART-03)', () => {
  it('1 texel de arte = 2 px de mundo', () => {
    expect(ART_SCALE).toBe(2);
  });
});

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
