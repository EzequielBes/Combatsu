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
