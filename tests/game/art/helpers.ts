import { TRANSPARENT } from '../../../src/core/pixelGrid';

/** Medidas do Glossário da spec `sprite-chefes-e-acabamento`, usadas pelos blocos BSP, BAN, BPW, LMB, OBJ e EPD. */
export const artMeasure = {
  /** Menor retângulo com todos os texels opacos: [esquerda, topo, direita, base]. */
  box(rows: readonly string[]): [number, number, number, number] {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -1,
      y1 = -1;
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === TRANSPARENT) return;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }),
    );
    return [x0, y0, x1, y1];
  },
  /** Posições em que os dois frames diferem, sobre as posições em que pelo menos um é opaco. */
  difference(a: readonly string[], b: readonly string[]): number {
    let union = 0;
    let differ = 0;
    a.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const other = b[y][x];
        if (c === TRANSPARENT && other === TRANSPARENT) return;
        union++;
        if (c !== other) differ++;
      }),
    );
    return differ / union;
  },
  /** Quantidade de componentes 8-conexos de texels opacos. */
  components(rows: readonly string[]): number {
    const opaque = (x: number, y: number): boolean => rows[y]?.[x] !== undefined && rows[y][x] !== TRANSPARENT;
    const seen = new Set<string>();
    let count = 0;
    rows.forEach((row, y) =>
      [...row].forEach((_, x) => {
        if (!opaque(x, y) || seen.has(`${x},${y}`)) return;
        count++;
        const stack: Array<[number, number]> = [[x, y]];
        seen.add(`${x},${y}`);
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cx + dx},${cy + dy}`;
              if (opaque(cx + dx, cy + dy) && !seen.has(key)) {
                seen.add(key);
                stack.push([cx + dx, cy + dy]);
              }
            }
        }
      }),
    );
    return count;
  },
  /** Texels `k` cujos 4 vizinhos estão dentro do frame e são opacos. */
  interiorK(rows: readonly string[]): number {
    let n = 0;
    for (let y = 1; y < rows.length - 1; y++) {
      for (let x = 1; x < rows[y].length - 1; x++) {
        if (rows[y][x] !== 'k') continue;
        if ([rows[y - 1][x], rows[y + 1][x], rows[y][x - 1], rows[y][x + 1]].every((c) => c !== TRANSPARENT)) n++;
      }
    }
    return n;
  },
  /** Quantos texels do frame têm a chave `key`. */
  countOf(rows: readonly string[], key: string): number {
    return rows.join('').split(key).length - 1;
  },
  /** Chaves distintas do frame, sem o transparente. */
  keysOf(rows: readonly string[]): Set<string> {
    return new Set([...rows.join('')].filter((c) => c !== TRANSPARENT));
  },
  /** A chave mais frequente do frame, sem contar `k`. */
  dominant(rows: readonly string[]): string {
    const count = new Map<string, number>();
    for (const c of rows.join('')) if (c !== TRANSPARENT && c !== 'k') count.set(c, (count.get(c) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1])[0][0];
  },
  /** Texels opacos de cada coluna de uma parte (linhas de larguras diferentes contam como transparente). */
  profile(part: readonly string[]): number[] {
    const width = Math.max(...part.map((r) => r.length));
    return Array.from({ length: width }, (_, x) => part.filter((r) => (r[x] ?? TRANSPARENT) !== TRANSPARENT).length);
  },
};
