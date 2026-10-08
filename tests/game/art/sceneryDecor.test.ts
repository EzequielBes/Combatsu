import { describe, expect, it } from 'vitest';
import { TILE } from '../../../src/core/level';
import { PALETTE } from '../../../src/game/art/palette';
import { Brush } from '../../../src/game/art/scenery/brush';
import { decorSlots } from '../../../src/game/art/scenery/decor';
import { paintDecor } from '../../../src/game/art/scenery/decorArt';
import { RasterSink } from './sceneryRaster';

const PALETTE_COLORS = new Set(Object.values(PALETTE));

const AREA = [
  { theme: 'beco' as const, col0: 1, col1: 24 },
  { theme: 'parque' as const, col0: 25, col1: 64 },
  { theme: 'rua' as const, col0: 65, col1: 104 },
];

describe('posições da decoração (CEN-13, CEN-15)', () => {
  it('pelo menos uma peça por trecho, dentro do trecho, com o tema dele', () => {
    const slots = decorSlots(AREA);
    for (const sp of AREA) {
      const mine = slots.filter((s) => s.x >= sp.col0 * TILE && s.x < (sp.col1 + 1) * TILE);
      expect(mine.length, sp.theme).toBeGreaterThanOrEqual(1);
      expect(mine.length, sp.theme).toBeLessThanOrEqual(3);
      for (const s of mine) expect(s.theme).toBe(sp.theme);
    }
    expect(slots.every((s) => AREA.some((sp) => s.x >= sp.col0 * TILE && s.x < (sp.col1 + 1) * TILE))).toBe(true);
  });

  it('a mesma grade dá sempre as mesmas posições', () => {
    expect(decorSlots(AREA)).toEqual(decorSlots(AREA.map((s) => ({ ...s }))));
  });

  it('o mesmo tema em outra posição da área dá outras posições', () => {
    const a = decorSlots([{ theme: 'rua', col0: 1, col1: 40 }]).map((s) => s.x - 1 * TILE);
    const b = decorSlots([{ theme: 'rua', col0: 41, col1: 80 }]).map((s) => s.x - 41 * TILE);
    expect(a).not.toEqual(b);
  });

  it('nenhuma peça a menos de 3 colunas da borda do trecho', () => {
    for (const s of decorSlots(AREA)) {
      const sp = AREA.find((p) => s.x >= p.col0 * TILE && s.x < (p.col1 + 1) * TILE)!;
      expect(s.x).toBeGreaterThanOrEqual((sp.col0 + 3) * TILE);
      expect(s.x).toBeLessThan((sp.col1 - 2) * TILE);
    }
  });
});

describe('arte da decoração (CEN-13)', () => {
  it.each(['rua', 'beco', 'parque', 'konbini'] as const)(
    '%s tem peça, pintada só acima do chão e com a paleta',
    (theme) => {
      const sink = new RasterSink();
      paintDecor(new Brush(sink), theme, 200, 480);
      expect(sink.texels.size).toBeGreaterThan(0);
      for (const c of sink.texels.values()) expect(PALETTE_COLORS.has(c)).toBe(true);
      for (const key of sink.texels.keys()) expect(Number(key.split(',')[1]) * 2).toBeLessThan(480);
    },
  );

  it('tema sem peça (santuário) não pinta nada e não lança erro', () => {
    const sink = new RasterSink();
    expect(paintDecor(new Brush(sink), 'santuario', 200, 480)).toBe(false);
    expect(sink.texels.size).toBe(0);
  });
});
