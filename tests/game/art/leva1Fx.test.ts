import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que a folha não carrega o `phaser` como valor.
import { PALETTE } from '../../../src/game/art/palette';
import { LEVA1_FX_FRAMES, LEVA1_FX_SIZE, leva1FxSheet } from '../../../src/game/art/hd/fx/leva1Fx';
import { TEX } from '../../../src/game/textures';

const keyOf = (color: number): string | undefined => Object.keys(PALETTE).find((k) => PALETTE[k] === color);
const sheet = leva1FxSheet();
const n = LEVA1_FX_SIZE;

/** Chaves da paleta usadas no quadro, sem o transparente. */
const keysIn = (name: string): Set<string> => {
  const used = new Set(sheet.frames[name]);
  used.delete(0);
  return new Set([...used].map((i) => keyOf(sheet.colors[i]) ?? `?${i}`));
};

/** Caixa dos texels pintados do quadro: colunas e linhas da primeira à última. */
function bounds(name: string): { x0: number; x1: number; y0: number; y1: number } {
  const px = sheet.frames[name];
  const b = { x0: n, x1: -1, y0: n, y1: -1 };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (px[y * n + x] !== 0)
        Object.assign(b, {
          x0: Math.min(b.x0, x),
          x1: Math.max(b.x1, x),
          y0: Math.min(b.y0, y),
          y1: Math.max(b.y1, y),
        });
  return b;
}

describe('folha tech-fx-leva1 (F34, BWG-12, RSN-13, FLA-10)', () => {
  it('tem textura própria', () => {
    expect(TEX.techFxLeva1).toBe('tech-fx-leva1');
    expect(Object.values(TEX).filter((v) => v === TEX.techFxLeva1)).toHaveLength(1);
  });

  it('tem os 7 quadros de 16x16, 1 texel = 1 px', () => {
    expect(sheet.frameW).toBe(16);
    expect(sheet.frameH).toBe(16);
    expect(Object.keys(sheet.frames)).toEqual(['palm-0', 'palm-1', 'nail', 'nailHead', 'seal', 'stun-0', 'stun-1']);
    for (const name of LEVA1_FX_FRAMES) expect(sheet.frames[name], name).toHaveLength(n * n);
  });

  it('só usa cores da paleta única (ART-01) e nenhum quadro é vazio ou igual a outro', () => {
    for (const name of LEVA1_FX_FRAMES) {
      for (const key of keysIn(name)) expect(PALETTE, `${name}: ${key}`).toHaveProperty(key);
      expect(keysIn(name).size, name).toBeGreaterThan(0);
    }
    for (let i = 0; i < LEVA1_FX_FRAMES.length; i++)
      for (let j = i + 1; j < LEVA1_FX_FRAMES.length; j++)
        expect(sheet.frames[LEVA1_FX_FRAMES[i]]).not.toEqual(sheet.frames[LEVA1_FX_FRAMES[j]]);
  });

  it('a palma do Boogie é âmbar e branca (BWG-12)', () => {
    for (const name of ['palm-0', 'palm-1']) expect([...keysIn(name)].sort(), name).toEqual(['A', 'w']);
  });

  it('o prego em voo é de aço, 8x3 no meio do quadro, com a cabeça à esquerda (RSN-13)', () => {
    expect([...keysIn('nail')].sort()).toEqual(['S', 'W', 'n']);
    const b = bounds('nail');
    expect(b.x1 - b.x0 + 1).toBe(8);
    expect(b.y1 - b.y0 + 1).toBe(3);
    expect(b.x0 + b.x1).toBe(n - 1);
    expect(Math.abs(b.y0 + b.y1 - (n - 1))).toBeLessThanOrEqual(1);
    // A cabeça (3 texels de altura) na coluna da esquerda; a ponta, à direita, é um texel só.
    const px = sheet.frames.nail;
    const tall = (x: number): number => [0, 1, 2].filter((k) => px[(b.y0 + k) * n + x] !== 0).length;
    expect(tall(b.x0)).toBe(3);
    expect(tall(b.x1)).toBe(1);
  });

  it('a cabeça de prego cabe 3 vezes lado a lado sobre o alvo e tem contorno', () => {
    const b = bounds('nailHead');
    expect(b.x1 - b.x0 + 1).toBeLessThanOrEqual(8);
    expect(keysIn('nailHead')).toContain('k');
  });

  it('o selo é roxo com a pupila preta e o atordoado alterna as estrelas sobre a órbita', () => {
    for (const key of ['v', 'u', 'U', 'b']) expect(keysIn('seal'), key).toContain(key);
    for (const name of ['stun-0', 'stun-1']) {
      for (const key of ['u', 'A', 'w']) expect(keysIn(name), `${name}: ${key}`).toContain(key);
    }
  });

  it('a folha é calculada uma vez', () => {
    expect(leva1FxSheet()).toBe(sheet);
  });
});
