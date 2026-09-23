import { describe, expect, it } from 'vitest';
import { TILE, parseLevel } from '../../src/core/level';

describe('parseLevel', () => {
  it('junta blocos sólidos vizinhos da mesma linha num retângulo só', () => {
    const lvl = parseLevel(['###.##', '..P...']);
    expect(lvl.solids).toEqual([
      { x: 0, y: 0, width: 3 * TILE, height: TILE },
      { x: 4 * TILE, y: 0, width: 2 * TILE, height: TILE },
    ]);
  });

  it('calcula o tamanho em pixels', () => {
    const lvl = parseLevel(['###.##', '..P...']);
    expect(lvl.widthPx).toBe(6 * TILE);
    expect(lvl.heightPx).toBe(2 * TILE);
  });

  it('coloca spawns no centro do tile', () => {
    const lvl = parseLevel(['P.cbE']);
    expect(lvl.player).toEqual({ x: 16, y: 16 });
    expect(lvl.props).toEqual([
      { key: 'chair', x: 80, y: 16 },
      { key: 'bottle', x: 112, y: 16 },
    ]);
    expect(lvl.enemies).toEqual([{ x: 144, y: 16 }]);
  });

  it('rejeita level sem player, com dois players, com caractere desconhecido ou linhas desiguais', () => {
    expect(() => parseLevel(['....'])).toThrow(/P/);
    expect(() => parseLevel(['P..P'])).toThrow(/P/);
    expect(() => parseLevel(['P.x.'])).toThrow(/x/);
    expect(() => parseLevel(['P...', '..'])).toThrow(/colunas/);
    expect(() => parseLevel([])).toThrow();
  });
});
