export const TILE = 32;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Spawn {
  x: number;
  y: number;
}

export interface PropSpawn extends Spawn {
  key: string;
}

export interface LevelData {
  widthPx: number;
  heightPx: number;
  solids: Rect[];
  player: Spawn;
  enemies: Spawn[];
  props: PropSpawn[];
}

const PROP_CHARS: Record<string, string> = { c: 'chair', b: 'bottle' };

/**
 * Legenda: '#' sólido, '.' vazio, 'P' player, 'E' inimigo, 'c' cadeira, 'b' garrafa.
 * Sólidos vizinhos na mesma linha viram um retângulo só, para o player não
 * enganchar nas emendas entre tiles.
 */
export function parseLevel(rows: readonly string[]): LevelData {
  if (rows.length === 0) throw new Error('Level vazio');
  const width = rows[0].length;
  const solids: Rect[] = [];
  const enemies: Spawn[] = [];
  const props: PropSpawn[] = [];
  let player: Spawn | null = null;

  for (let ty = 0; ty < rows.length; ty++) {
    const row = rows[ty];
    if (row.length !== width) {
      throw new Error(`Linha ${ty} tem ${row.length} colunas; esperado ${width}`);
    }
    let runStart = -1;
    for (let tx = 0; tx <= width; tx++) {
      const ch = tx < width ? row[tx] : '.';
      if (ch === '#') {
        if (runStart < 0) runStart = tx;
        continue;
      }
      if (runStart >= 0) {
        solids.push({ x: runStart * TILE, y: ty * TILE, width: (tx - runStart) * TILE, height: TILE });
        runStart = -1;
      }
      if (tx === width || ch === '.') continue;
      const center = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
      if (ch === 'P') {
        if (player) throw new Error('Mais de um P no level');
        player = center;
      } else if (ch === 'E') {
        enemies.push(center);
      } else if (Object.hasOwn(PROP_CHARS, ch)) {
        props.push({ ...center, key: PROP_CHARS[ch] });
      } else {
        throw new Error(`Caractere desconhecido '${ch}' em (${tx}, ${ty})`);
      }
    }
  }

  if (!player) throw new Error('Level sem P (spawn do player)');
  return { widthPx: width * TILE, heightPx: rows.length * TILE, solids, player, enemies, props };
}

export type TileVariant =
  | 'top'
  | 'middle'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'thin'
  | 'thin-left'
  | 'thin-right';

/**
 * Variante visual de um tile sólido pelos quatro vizinhos (ENV-01); `null` se o tile não é sólido.
 * Fora do mapa conta como sólido nas laterais e embaixo (paredes e chão continuam além da borda) e como vazio
 * em cima (a primeira linha mostra o topo).
 * Regra:
 * - sem sólido em cima e sem sólido embaixo → linha fina: `thin-left` (só falta o vizinho da esquerda),
 *   `thin-right` (só falta o da direita), senão `thin`;
 * - sem sólido em cima, com sólido embaixo → topo: `top-left`, `top-right` ou `top`, pela mesma regra lateral;
 * - com sólido em cima → interior: `left` (só falta o vizinho da esquerda), `right` (só falta o da direita),
 *   senão `middle`.
 * Quando faltam os dois vizinhos laterais (coluna de 1 tile), fica a variante central da linha.
 */
export function tileVariant(rows: readonly string[], tx: number, ty: number): TileVariant | null {
  const solid = (x: number, y: number, outside: boolean): boolean => {
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[y].length) return outside;
    return rows[y][x] === '#';
  };
  if (!solid(tx, ty, false)) return null;
  const up = solid(tx, ty - 1, false);
  const down = solid(tx, ty + 1, true);
  const left = solid(tx - 1, ty, true);
  const right = solid(tx + 1, ty, true);
  const side = !left && right ? '-left' : left && !right ? '-right' : '';
  if (up) return side === '-left' ? 'left' : side === '-right' ? 'right' : 'middle';
  return `${down ? 'top' : 'thin'}${side}` as TileVariant;
}
