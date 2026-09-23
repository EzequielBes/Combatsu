import { describe, expect, it } from 'vitest';
import { TILE, parseLevel, tileVariant } from '../../src/core/level';

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

describe('tileVariant (ENV-01)', () => {
  // Legenda dos mapinhos: '#' sólido, '.' vazio (P não é exigido: tileVariant não valida o level).
  it('tile vazio não tem variante', () => {
    expect(tileVariant(['#.#'], 1, 0)).toBeNull();
  });

  it('top: sem sólido em cima, com sólido embaixo e dos dois lados', () => {
    const rows = ['.....', '.###.', '.###.'];
    expect(tileVariant(rows, 2, 1)).toBe('top');
  });

  it('top-left e top-right: topo sem vizinho à esquerda / à direita', () => {
    const rows = ['.....', '.###.', '.###.'];
    expect(tileVariant(rows, 1, 1)).toBe('top-left');
    expect(tileVariant(rows, 3, 1)).toBe('top-right');
  });

  it('middle: sólido em cima e dos dois lados', () => {
    const rows = ['.....', '.###.', '.###.', '.###.'];
    expect(tileVariant(rows, 2, 2)).toBe('middle');
  });

  it('left e right: sólido em cima, sem vizinho à esquerda / à direita', () => {
    const rows = ['.....', '.###.', '.###.', '.###.'];
    expect(tileVariant(rows, 1, 2)).toBe('left');
    expect(tileVariant(rows, 3, 2)).toBe('right');
  });

  it('thin, thin-left e thin-right: plataforma de 1 tile de altura (nada em cima nem embaixo)', () => {
    const rows = ['.....', '.###.', '.....'];
    expect(tileVariant(rows, 1, 1)).toBe('thin-left');
    expect(tileVariant(rows, 2, 1)).toBe('thin');
    expect(tileVariant(rows, 3, 1)).toBe('thin-right');
  });

  it('bloco solto de 1 tile (sem vizinho nenhum) é thin', () => {
    expect(tileVariant(['...', '.#.', '...'], 1, 1)).toBe('thin');
  });

  it('borda do mapa: fora conta como sólido nas laterais e embaixo', () => {
    // Chão encostado nas duas paredes laterais e na base do mapa: topo sem cantos.
    const rows = ['...', '###'];
    expect(tileVariant(rows, 0, 1)).toBe('top');
    expect(tileVariant(rows, 2, 1)).toBe('top');
    // Coluna na lateral esquerda do mapa, com vazio à direita: parede virada para a direita.
    expect(tileVariant(['#.', '#.', '#.'], 0, 1)).toBe('right');
  });

  it('borda do mapa: fora conta como vazio no topo', () => {
    // Linha 0 com sólido embaixo vira topo, não meio.
    expect(tileVariant(['###', '###'], 1, 0)).toBe('top');
    // Linha 0 sem sólido embaixo é plataforma fina.
    expect(tileVariant(['###', '...'], 1, 0)).toBe('thin');
  });
});
