/**
 * Invariantes de grade da arte (POS-02..POS-06, TRL-02): funções puras sobre frames escritos como texto
 * (1 caractere = 1 cor da paleta, '.' = transparente). Os testes de arte usam estas funções em todos os frames.
 */
import { TRANSPARENT } from './pixelGrid';

export type FrameGrid = readonly string[];

/** O texel (col, row) existe na grade e não é transparente. */
export function isOpaque(grid: FrameGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.length) return false;
  const line = grid[row];
  if (col < 0 || col >= line.length) return false;
  return line[col] !== TRANSPARENT;
}

/** Os texels opacos formam exatamente 1 componente conexo, com diagonal contando como vizinho (POS-02). */
export function isSingleComponent(grid: FrameGrid): boolean {
  const seen = new Set<number>();
  const width = Math.max(0, ...grid.map((r) => r.length));
  const key = (c: number, r: number): number => r * (width + 1) + c;
  let components = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!isOpaque(grid, c, r) || seen.has(key(c, r))) continue;
      components++;
      if (components > 1) return false;
      const stack: Array<[number, number]> = [[c, r]];
      seen.add(key(c, r));
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (!isOpaque(grid, nx, ny) || seen.has(key(nx, ny))) continue;
            seen.add(key(nx, ny));
            stack.push([nx, ny]);
          }
        }
      }
    }
  }
  return components === 1;
}

/** Há texel opaco na última linha do frame, ou seja, o corpo toca o chão (POS-03). */
export function touchesBottom(grid: FrameGrid): boolean {
  if (grid.length === 0) return false;
  const last = grid.length - 1;
  return [...grid[last]].some((_, c) => isOpaque(grid, c, last));
}

/** Menor coluna que tem algum texel com uma das chaves (cabelo `h`, `H`, `j`), ou `null` (POS-04). */
export function headLeftCol(grid: FrameGrid, keys: readonly string[]): number | null {
  let best: number | null = null;
  for (const line of grid) {
    for (let c = 0; c < line.length; c++) {
      if (keys.includes(line[c]) && (best === null || c < best)) best = c;
    }
  }
  return best;
}

/** Menor linha (a mais alta) que tem algum texel com uma das chaves, ou `null` (POS-05). */
export function topRowOf(grid: FrameGrid, keys: readonly string[]): number | null {
  for (let r = 0; r < grid.length; r++) {
    if ([...grid[r]].some((ch) => keys.includes(ch))) return r;
  }
  return null;
}

/**
 * Altura opaca (texels) da coluna da coxa e da coluna da canela, contando só as linhas de `rows` (inclusive).
 * Quem chama escolhe colunas dentro da perna que bate, longe do pé e do quadril (POS-06).
 */
export function thighShinHeights(
  grid: FrameGrid,
  rows: { top: number; bottom: number },
  thighCol: number,
  shinCol: number,
): { thigh: number; shin: number } {
  const height = (col: number): number => {
    let n = 0;
    for (let r = rows.top; r <= rows.bottom; r++) if (isOpaque(grid, col, r)) n++;
    return n;
  };
  return { thigh: height(thighCol), shin: height(shinCol) };
}
