import { describe, expect, it } from 'vitest';
import { TILE, parseLevel, tileVariant } from '../../src/core/level';
import { LEVEL_1 } from '../../src/data/level1';

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

describe('LEVEL_1: pontos de spawn E (SPN-06)', () => {
  const lvl = parseLevel(LEVEL_1);

  it('tem exatamente 4 pontos E', () => {
    expect(lvl.enemies).toHaveLength(4);
  });

  it('os novos nas colunas 1 e 38 ficam em x = coluna * TILE + TILE / 2 (48 e 1232)', () => {
    const xs = lvl.enemies.map((e) => e.x);
    expect(xs).toContain(1 * TILE + TILE / 2);
    expect(xs).toContain(38 * TILE + TILE / 2);
    expect(1 * TILE + TILE / 2).toBe(48);
    expect(38 * TILE + TILE / 2).toBe(1232);
  });

  it('os dois pontos antigos continuam (624 e 1200) e todos estão na linha do chão', () => {
    expect(lvl.enemies.map((e) => e.x)).toEqual([48, 624, 1200, 1232]);
    expect(new Set(lvl.enemies.map((e) => e.y)).size).toBe(1);
  });
});

describe('parseLevel: selo (ARE-08, TRV-01)', () => {
  /** 5 colunas, 17 linhas: parede na 0, selo na 4 (S nas linhas 0 a 14), chão nas linhas 15 e 16. */
  const sealed = (): string[] => [
    ...Array.from({ length: 15 }, (_, r) => (r === 14 ? '#.P.S' : '#...S')),
    '#####',
    '#####',
  ];

  it('S nas linhas 0 a 14 vira o retângulo da coluna', () => {
    expect(parseLevel(sealed()).seal).toEqual({ x: 4 * TILE, y: 0, width: TILE, height: 15 * TILE });
  });

  it('o selo cobre do primeiro ao último S', () => {
    const lvl = parseLevel(['..S', '..S', 'P.S', '..S', '...']);
    expect(lvl.seal).toEqual({ x: 2 * TILE, y: 0, width: TILE, height: 4 * TILE });
    expect(parseLevel(['...', '..S', 'P..']).seal).toEqual({ x: 2 * TILE, y: TILE, width: TILE, height: TILE });
  });

  it('grade sem S dá seal null', () => {
    expect(parseLevel(['P..', '###']).seal).toBeNull();
    expect(parseLevel(LEVEL_1).seal).toBeNull();
  });

  it('o selo fica fora de solids e o # vizinho não se mescla com ele', () => {
    const lvl = parseLevel(sealed());
    expect(lvl.solids).toEqual(
      [
        { x: 0, y: 15 * TILE, width: 5 * TILE, height: TILE },
        { x: 0, y: 16 * TILE, width: 5 * TILE, height: TILE },
        ...Array.from({ length: 15 }, (_, r) => ({ x: 0, y: r * TILE, width: TILE, height: TILE })),
      ].sort((a, b) => a.y - b.y),
    );
    const row = parseLevel(['##S#', 'P...']);
    expect(row.solids).toEqual([
      { x: 0, y: 0, width: 2 * TILE, height: TILE },
      { x: 3 * TILE, y: 0, width: TILE, height: TILE },
    ]);
  });

  it('recusa S em duas colunas diferentes', () => {
    expect(() => parseLevel(['S.S', 'P..'])).toThrow(/Selo/);
  });

  it('tileVariant trata S como vazio e o # vizinho como borda', () => {
    const rows = ['##S', '###'];
    expect(tileVariant(rows, 2, 0)).toBeNull();
    expect(tileVariant(rows, 1, 0)).toBe('top-right');
  });
});
