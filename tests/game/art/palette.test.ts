import { describe, expect, it } from 'vitest';
import { TRANSPARENT } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../../src/game/art/palette';
import {
  ENERGY_BAR_BG_COLOR,
  ENERGY_BAR_FILL_COLOR,
  ENERGY_BAR_FLASH_COLOR,
  ENERGY_BAR_MARK_COLOR,
  TECH_ICON_OVERLAY_COLOR,
} from '../../../src/game/art/techColors';

describe('paleta única (ART-01)', () => {
  it('tem no máximo 42 cores (RDA-01, AD-017), cada uma com chave de 1 caractere', () => {
    const keys = Object.keys(PALETTE);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(42);
    for (const k of keys) expect([...k]).toHaveLength(1);
  });

  it('tem as 5 chaves do player (o, x, j, y, z) e, com as 2 do Vermelho (t, T), soma 42 cores (SPR-01, RDA-01)', () => {
    const keys = Object.keys(PALETTE);
    for (const k of ['o', 'x', 'j', 'y', 'z']) expect(keys, k).toContain(k);
    // SPEC_DEVIATION: a spec da SPR-01 dizia 34 + 5 = 39, mas a paleta já tinha 35 chaves (total real 40).
    // Reason: contagem da spec desatualizada; a F10 (RDA-01, AD-017) soma `t` e `T` e fixa o total em 42.
    expect(keys).toHaveLength(42);
    expect(PALETTE.o).toBe(0x161d3d);
    expect(PALETTE.x).toBe(0x6b3a2e);
    expect(PALETTE.j).toBe(0x33263b);
    expect(PALETTE.y).toBe(0x8fa3c9);
    expect(PALETTE.z).toBe(0x9c6a1f);
  });

  it('tem o carmim t e o magenta-claro T do Vermelho (RDA-01)', () => {
    expect(Object.keys(PALETTE)).toHaveLength(42);
    expect(PALETTE.t).toBe(0xd1103a);
    expect(PALETTE.T).toBe(0xff4f8b);
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

describe('paleta das técnicas (TFX-08)', () => {
  it('adiciona exatamente as 4 chaves b, R, W e d com os valores do AC', () => {
    expect(PALETTE.b).toBe(0x050205);
    expect(PALETTE.R).toBe(0xff3344);
    expect(PALETTE.W).toBe(0xffffff);
    expect(PALETTE.d).toBe(0x14307a);
  });
});

describe('cores da barra de energia e ícones de slot (TEC-15)', () => {
  it('preenchimento, fundo, marca, flash e overlay são cores da paleta', () => {
    for (const c of [
      ENERGY_BAR_FILL_COLOR,
      ENERGY_BAR_BG_COLOR,
      ENERGY_BAR_MARK_COLOR,
      ENERGY_BAR_FLASH_COLOR,
      TECH_ICON_OVERLAY_COLOR,
    ]) {
      expect(Object.values(PALETTE)).toContain(c);
    }
  });
});
