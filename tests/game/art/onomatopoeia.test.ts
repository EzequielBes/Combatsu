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

  it('a sombra fica só por fora do desenho: nenhum r espremido entre tinta dos dois lados na mesma linha', () => {
    const { w, h } = DON_FRAME;
    const ink = (x: number, y: number): boolean => x >= 0 && x < w && ['w', 'k'].includes(px[y * w + x]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (px[y * w + x] !== 'r') continue;
        const near = (dir: number): boolean => [1, 2, 3, 4, 5, 6].some((d) => ink(x + dir * d, y));
        expect(near(-1) && near(1), `(${x}, ${y})`).toBe(false);
      }
  });

  it('as letras respiram: 2 colunas vazias entre o ド e o ン no alto, 1 entre as marcas do dakuten', () => {
    const { w } = DON_FRAME;
    const empty = (x: number, rows: number[]): boolean => rows.every((y) => px[y * w + x] === '.');
    const top = [0, 1, 2, 3, 4, 5, 6];
    expect(empty(16, top) && empty(17, top), 'ド | ン').toBe(true);
    expect(empty(11, [0, 1, 2, 3, 4]), 'dakuten').toBe(true);
  });

  it('nada cortado na borda direita: a última coluna não tem miolo nem contorno', () => {
    const { w, h } = DON_FRAME;
    for (let y = 0; y < h; y++) expect(['.', 'r'], `(${w - 1}, ${y})`).toContain(px[y * w + w - 1]);
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

  it('só usa a fenda k, o fundo K e as lascas claras y', () => {
    for (const name of CRACK_FRAMES) expect(new Set(keys(sheet, name)), name).toEqual(new Set(['.', 'k', 'K', 'y']));
  });

  it('nasce no meio, numa cunha que quebra a borda do chão e desce as 6 linhas', () => {
    for (const name of CRACK_FRAMES) {
      expect(at(sheet, name, 23, 0), name).toBe('K');
      for (let y = 0; y < CRACK_FRAME.h; y++) expect(at(sheet, name, 23, y), `${name}, linha ${y}`).not.toBe('.');
    }
  });

  it('o fundo K fica só dentro da cunha: cada K tem a borda k dos dois lados na mesma linha', () => {
    const { w, h } = CRACK_FRAME;
    for (const name of CRACK_FRAMES)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (at(sheet, name, x, y) !== 'K') continue;
          const edge = (dir: number): string => {
            let i = x;
            while (at(sheet, name, i, y) === 'K') i += dir;
            return at(sheet, name, i, y);
          };
          expect([edge(-1), edge(1)], `${name} (${x}, ${y})`).toEqual(['k', 'k']);
        }
  });

  it('a segunda se espalha mais que a primeira e as pontas param 2 texels antes da borda', () => {
    const cols = (name: string): number[] =>
      keys(sheet, name).flatMap((k, i) => (k === '.' ? [] : [i % CRACK_FRAME.w]));
    const span = (name: string): number => Math.max(...cols(name)) - Math.min(...cols(name));
    expect(span('crack-1')).toBeGreaterThan(span('crack-0') * 2);
    for (const name of CRACK_FRAMES) {
      expect(Math.min(...cols(name)), name).toBeGreaterThanOrEqual(2);
      expect(Math.max(...cols(name)), name).toBeLessThanOrEqual(CRACK_FRAME.w - 3);
    }
  });

  it('as folhas são calculadas uma vez', () => {
    expect(groundCrackSheet()).toBe(sheet);
    expect(onomatopoeiaSheet()).toBe(onomatopoeiaSheet());
  });
});
