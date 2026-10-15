import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que a folha não carrega o `phaser` como valor.
import { PALETTE } from '../../../src/game/art/palette';
import { DOG_FRAMES, DOGS_FRAME, dogsSheet } from '../../../src/game/art/hd/fx/dogsSheet';
import { TEX } from '../../../src/game/textures';

const sheet = dogsSheet();
const { w: W, h: H } = DOGS_FRAME;
const keyOf = (color: number): string | undefined => Object.keys(PALETTE).find((k) => PALETTE[k] === color);
const keyAt = (name: string, x: number, y: number): string | undefined => {
  const idx = sheet.frames[name][y * W + x];
  return idx === 0 ? undefined : keyOf(sheet.colors[idx]);
};
const count = (name: string, key: string): number => {
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (keyAt(name, x, y) === key) n++;
  return n;
};
const cells = (name: string): { x: number; y: number; key: string }[] => {
  const out: { x: number; y: number; key: string }[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const key = keyAt(name, x, y);
      if (key) out.push({ x, y, key });
    }
  return out;
};
const RUN = ['run-0', 'run-1', 'run-2', 'run-3'];

describe('folha HD dos Cães Divinos (DOG-06)', () => {
  it('tem os 6 quadros de 32x22 (4 de corrida, a mordida e o sumir), com textura própria', () => {
    expect(sheet.frameW).toBe(32);
    expect(sheet.frameH).toBe(22);
    expect(Object.keys(sheet.frames)).toEqual([...DOG_FRAMES]);
    expect(DOG_FRAMES).toEqual([...RUN, 'bite', 'vanish']);
    for (const name of DOG_FRAMES) expect(sheet.frames[name], name).toHaveLength(W * H);
    expect(TEX.dogs).toBe('fx-dogs');
    expect(Object.values(TEX).filter((v) => v === TEX.dogs)).toHaveLength(1);
  });

  it('só usa cores da paleta única (ART-01)', () => {
    for (const name of DOG_FRAMES)
      for (const idx of new Set(sheet.frames[name])) {
        if (idx === 0) continue;
        expect(idx, name).toBeLessThan(sheet.colors.length);
        expect(keyOf(sheet.colors[idx]), `${name}: 0x${sheet.colors[idx].toString(16)}`).toBeDefined();
      }
  });

  it('é silhueta preta com olho branco: o preto domina e todo quadro tem o olho W', () => {
    for (const name of DOG_FRAMES) {
      const all = cells(name);
      expect(count(name, 'b') / all.length, name).toBeGreaterThan(0.6);
      expect(count(name, 'W'), name).toBeGreaterThanOrEqual(2);
    }
  });

  it('a corrida só tem o preto, a borda u, as patas de lá v e o olho W; a boca r e os dentes w só na mordida', () => {
    for (const name of RUN) expect(new Set(cells(name).map((c) => c.key)), name).toEqual(new Set(['b', 'u', 'v', 'W']));
    expect(count('bite', 'w'), 'dentes').toBeGreaterThan(0);
    expect(count('bite', 'r'), 'boca').toBeGreaterThan(0);
  });

  it('a borda u fica só em cima (lombo, cabeça, orelha, cauda): nenhum u da linha do peito para baixo', () => {
    for (const name of [...RUN, 'bite']) {
      const rim = cells(name).filter((c) => c.key === 'u');
      expect(rim.length, name).toBeGreaterThan(15);
      for (const c of rim) expect(c.y, `${name} (${c.x}, ${c.y})`).toBeLessThan(13);
    }
  });

  it('olha para a direita (o jogo espelha): o olho fica na metade da frente, na cabeça, e o focinho passa dele', () => {
    for (const name of [...RUN, 'bite']) {
      const eye = cells(name).filter((c) => c.key === 'W');
      for (const c of eye) {
        expect(c.x, name).toBeGreaterThanOrEqual(W / 2 + 4);
        expect(c.y, name).toBeLessThan(H / 2);
      }
      const front = Math.max(
        ...cells(name)
          .filter((c) => c.y < 12)
          .map((c) => c.x),
      );
      expect(front - Math.max(...eye.map((c) => c.x)), `${name}: focinho depois do olho`).toBeGreaterThanOrEqual(4);
    }
  });

  it('tem porte de lobo: a cabeça chega perto do topo e nada sai pela borda de cima', () => {
    for (const name of [...RUN, 'bite']) {
      const top = Math.min(...cells(name).map((c) => c.y));
      expect(top, name).toBeGreaterThanOrEqual(1);
      expect(top, name).toBeLessThanOrEqual(3);
    }
  });

  it('a corrida pisa na última linha e o quadro esticado voa (nenhuma pata no chão)', () => {
    const touches = (name: string): boolean => cells(name).some((c) => c.y === H - 1);
    expect(touches('run-0')).toBe(false);
    for (const name of ['run-1', 'run-2', 'run-3', 'bite']) expect(touches(name), name).toBe(true);
  });

  it('os 4 quadros da corrida são diferentes entre si e da mordida', () => {
    const frames = [...RUN, 'bite'];
    for (let i = 0; i < frames.length; i++)
      for (let j = i + 1; j < frames.length; j++)
        expect(sheet.frames[frames[i]], `${frames[i]} vs ${frames[j]}`).not.toEqual(sheet.frames[frames[j]]);
  });

  it('ao sumir, o corpo vira uma poça rasa no chão; acima dela só a orelha, o olho e os fiapos', () => {
    const top = (name: string): number =>
      Math.min(
        ...cells(name)
          .filter((c) => c.key === 'b')
          .map((c) => c.y),
      );
    for (const name of RUN) expect(top('vanish'), name).toBeGreaterThan(top(name) + 10);
    const pool = cells('vanish').filter((c) => c.y >= H - 3);
    const width = Math.max(...pool.map((c) => c.x)) - Math.min(...pool.map((c) => c.x)) + 1;
    expect(width).toBeGreaterThanOrEqual(18);
    expect(width).toBeLessThanOrEqual(23);
    expect(cells('vanish').filter((c) => c.y < H - 3).length).toBeLessThan(20);
    expect(count('vanish', 'W')).toBe(2);
  });

  it('a folha é calculada uma vez', () => {
    expect(dogsSheet()).toBe(sheet);
  });
});
