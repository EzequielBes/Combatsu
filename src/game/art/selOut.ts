/*
 * Passe de sel-out (contorno seletivo) compartilhado pelos sprites. Dados puros, sem `phaser`.
 * Todo texel `target` (por padrão `k`) cujos 4 vizinhos estão dentro do canvas e não são `.` é contorno interno e
 * vira linha colorida pelo material vizinho: a primeira regra com 2+ vizinhos das suas `keys` dá a `line`; se
 * nenhuma vale, usa `fallback`. O contorno externo (que encosta em transparente ou na borda) não muda.
 */

export interface SelOutRule {
  /** Teclas da paleta que formam o grupo (material). */
  keys: ReadonlySet<string>;
  /** Tecla que o `k` interno vira quando 2+ vizinhos são do grupo. */
  line: string;
}

export interface SelOutConfig {
  /** Avaliadas na ordem; vale a primeira com 2+ vizinhos do grupo. */
  rules: readonly SelOutRule[];
  /** Tecla quando nenhuma regra vale. */
  fallback: string;
  /** Tecla do contorno a trocar (padrão `k`). */
  target?: string;
}

const SKIN = new Set(['p', 'P', 'q', 'x']);
const HAIR = new Set(['h', 'j', 'H']);

/** Regra do player: pele -> `x`, cabelo -> `h`, resto -> `o`. */
export const PLAYER_SEL_OUT: SelOutConfig = {
  rules: [
    { keys: SKIN, line: 'x' },
    { keys: HAIR, line: 'h' },
  ],
  fallback: 'o',
};

/** Altera o canvas no lugar, lendo os vizinhos de uma cópia. */
export function selOut(canvas: string[][], config: SelOutConfig = PLAYER_SEL_OUT): void {
  const target = config.target ?? 'k';
  const h = canvas.length;
  const snap = canvas.map((row) => row.slice());
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < snap[y].length - 1; x++) {
      if (snap[y][x] !== target) continue;
      const n = [snap[y - 1][x], snap[y + 1][x], snap[y][x - 1], snap[y][x + 1]];
      if (n.some((c) => c === '.')) continue;
      const hit = config.rules.find((r) => n.filter((c) => r.keys.has(c)).length >= 2);
      canvas[y][x] = hit ? hit.line : config.fallback;
    }
  }
}
