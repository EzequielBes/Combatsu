import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que a folha não carrega o `phaser` como valor.
import { PALETTE } from '../../../src/game/art/palette';
import {
  CRACK_FRAME,
  CRACK_FRAMES,
  DON_FRAME,
  groundCrackSheet,
  onomatopoeiaSheet,
} from '../../../src/game/art/hd/onomatopoeia';
import type { HdSheet } from '../../../src/game/art/hd/sheet';
import { TEX } from '../../../src/game/textures';

const keyOf = (color: number): string | undefined => Object.keys(PALETTE).find((k) => PALETTE[k] === color);
const keys = (sheet: HdSheet, name: string): string[] =>
  [...sheet.frames[name]].map((idx) => (idx === 0 ? '.' : (keyOf(sheet.colors[idx]) ?? '?')));
const at = (sheet: HdSheet, name: string, x: number, y: number): string => keys(sheet, name)[y * sheet.frameW + x];

describe('ドン do patamar 3 (DON-03)', () => {
  const sheet = onomatopoeiaSheet();
  const px = keys(sheet, 'don');

  it('é a folha `onomatopoeia` com o quadro `don` de 32x20, com textura própria', () => {
    expect([sheet.frameW, sheet.frameH]).toEqual([DON_FRAME.w, DON_FRAME.h]);
    expect([sheet.frameW, sheet.frameH]).toEqual([32, 20]);
    expect(Object.keys(sheet.frames)).toEqual(['don']);
    expect(sheet.frames.don).toHaveLength(32 * 20);
    expect(TEX.onomatopoeia).toBe('fx-onomatopoeia');
    expect(Object.values(TEX).filter((v) => v === TEX.onomatopoeia)).toHaveLength(1);
  });

  it('só usa o miolo w, o contorno k e a sombra r, todas da paleta', () => {
    expect(new Set(px)).toEqual(new Set(['.', 'w', 'k', 'r']));
  });

  it('todo texel do miolo tem contorno: nenhum w encosta no vazio nem na borda do quadro', () => {
    const { w, h } = DON_FRAME;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (px[y * w + x] !== 'w') continue;
        expect(x > 0 && y > 0 && x < w - 1 && y < h - 1, `(${x}, ${y}) na borda`).toBe(true);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          expect(at(sheet, 'don', x + dx, y + dy), `(${x}, ${y})`).not.toBe('.');
      }
  });

  it('a sombra fica embaixo e à direita: cada r tem tinta na diagonal de cima à esquerda', () => {
    const { w, h } = DON_FRAME;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (px[y * w + x] === 'r') expect(['w', 'k'], `(${x}, ${y})`).toContain(at(sheet, 'don', x - 1, y - 1));
  });

  it('as duas letras ocupam as duas metades: o miolo tem texels dos dois lados da coluna 16', () => {
    const cols = px.flatMap((k, i) => (k === 'w' ? [i % DON_FRAME.w] : []));
    expect(cols.filter((x) => x < 16).length).toBeGreaterThan(30);
    expect(cols.filter((x) => x >= 16).length).toBeGreaterThan(30);
  });
});

describe('rachadura no chão (DON-02)', () => {
  const sheet = groundCrackSheet();

  it('é a folha `ground-crack` com crack-0 e crack-1 de 48x6, com textura própria', () => {
    expect([sheet.frameW, sheet.frameH]).toEqual([CRACK_FRAME.w, CRACK_FRAME.h]);
    expect([sheet.frameW, sheet.frameH]).toEqual([48, 6]);
    expect(Object.keys(sheet.frames)).toEqual([...CRACK_FRAMES]);
    expect(TEX.groundCrack).toBe('fx-ground-crack');
    expect(TEX.groundCrack).not.toBe(TEX.onomatopoeia);
  });

  it('só usa a fenda k e a borda funda K', () => {
    for (const name of CRACK_FRAMES) expect(new Set(keys(sheet, name)), name).toEqual(new Set(['.', 'k', 'K']));
  });

  it('nasce no meio, na linha do chão, e a segunda se espalha mais que a primeira', () => {
    const span = (name: string): number => {
      const cols = keys(sheet, name).flatMap((k, i) => (k === '.' ? [] : [i % CRACK_FRAME.w]));
      return Math.max(...cols) - Math.min(...cols);
    };
    for (const name of CRACK_FRAMES) expect(at(sheet, name, 23, 0), name).toBe('k');
    expect(span('crack-1')).toBeGreaterThan(span('crack-0') * 2);
    expect(span('crack-1')).toBe(CRACK_FRAME.w - 1);
  });

  it('as folhas são calculadas uma vez', () => {
    expect(groundCrackSheet()).toBe(sheet);
    expect(onomatopoeiaSheet()).toBe(onomatopoeiaSheet());
  });
});
