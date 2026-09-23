/** Caractere de célula transparente nas folhas de pixel art. */
export const TRANSPARENT = '.';

export interface ParsedFrame {
  key: string;
  /** cells[y][x]: caractere da paleta, ou null onde é transparente. */
  cells: (string | null)[][];
}

export interface ParsedSheet {
  name: string;
  width: number;
  height: number;
  frames: ParsedFrame[];
}

/**
 * Lê uma folha de sprite escrita como texto (1 caractere = 1 cor da paleta, '.' = transparente).
 * Todos os frames precisam ter o mesmo tamanho. Todo erro cita o nome do sprite.
 */
export function parseSheet(
  name: string,
  frames: Record<string, readonly string[]>,
  colors: ReadonlySet<string>,
): ParsedSheet {
  const entries = Object.entries(frames);
  if (entries.length === 0) throw new Error(`Sprite '${name}' sem frames`);

  let size: { width: number; height: number } | null = null;
  const parsed: ParsedFrame[] = [];
  for (const [key, rows] of entries) {
    if (rows.length === 0) throw new Error(`Sprite '${name}', frame '${key}' sem linhas`);
    const width = rows[0].length;
    const cells = rows.map((row, y) => {
      if (row.length !== width) {
        throw new Error(`Sprite '${name}', frame '${key}': linha ${y} tem largura ${row.length}; esperado ${width}`);
      }
      return [...row].map((ch, x) => {
        if (ch === TRANSPARENT) return null;
        if (!colors.has(ch)) {
          throw new Error(`Sprite '${name}', frame '${key}': caractere '${ch}' fora da paleta em (${x}, ${y})`);
        }
        return ch;
      });
    });
    if (!size) size = { width, height: rows.length };
    else if (size.width !== width || size.height !== rows.length) {
      throw new Error(
        `Sprite '${name}', frame '${key}' tem tamanho ${width}x${rows.length}; esperado ${size.width}x${size.height}`,
      );
    }
    parsed.push({ key, cells });
  }
  return { name, width: size!.width, height: size!.height, frames: parsed };
}
