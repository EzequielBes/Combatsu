// Heroico alto (spike boneco-articulado, P3): PRA-01..09, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { HEAD_TALL_FIGHT, HEAD_TALL_IDLE } from '../../src/game/art/rig/heads';

describe('cabeças do heroico alto (PRA-03)', () => {
  it.each([
    ['idle', HEAD_TALL_IDLE],
    ['luta', HEAD_TALL_FIGHT],
  ])('%s: cabelo espetado (h, H, j), olho com íris e brilho (b, w), linha de pele (x) e contorno k, só com teclas da PALETTE', (_name, head) => {
    const text = head.grid.join('');
    for (const ch of ['h', 'H', 'j', 'b', 'w', 'x', 'p', 'P', 'k']) expect(text, ch).toContain(ch);
    for (const ch of text) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
    expect(head.grid[0]).toMatch(/k\.+k/); // espetos no topo
    for (const row of head.grid) expect(row.length).toBe(head.grid[0].length);
    expect(head.neckCol).toBeGreaterThan(0);
    expect(head.neckCol).toBeLessThan(head.grid[0].length);
  });

  it('a cabeça de luta tem o mesmo tamanho da de idle e é diferente dela', () => {
    expect(HEAD_TALL_FIGHT.grid).toHaveLength(HEAD_TALL_IDLE.grid.length);
    expect(HEAD_TALL_FIGHT.grid[0]).toHaveLength(HEAD_TALL_IDLE.grid[0].length);
    expect(HEAD_TALL_FIGHT.neckCol).toBe(HEAD_TALL_IDLE.neckCol);
    expect(HEAD_TALL_FIGHT.grid).not.toEqual(HEAD_TALL_IDLE.grid);
  });

  it('o olho do idle tem o brilho w ao lado da íris b; o da luta é cerrado (sem w na linha do olho) e a boca abre com os dentes w', () => {
    const eyeRow = (grid: readonly string[]): string => grid.find((r) => r.includes('b'))!;
    expect(eyeRow(HEAD_TALL_IDLE.grid)).toContain('wb');
    expect(eyeRow(HEAD_TALL_FIGHT.grid)).not.toContain('w');
    const mouthRow = HEAD_TALL_FIGHT.grid[HEAD_TALL_FIGHT.grid.length - 2];
    expect(mouthRow).toContain('bw');
  });
});
