import { describe, expect, it } from 'vitest';
import { TRANSPARENT } from '../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';

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
