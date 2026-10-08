import { TILE } from '../../../core/level';
import type { ModuleTheme } from '../../../core/module';
import { rng } from './brush';
import { hashSeed } from './paint';
import type { ThemeSpan } from './layers';

/** Peça de decoração: o centro em px de mundo e o tema do trecho onde ela fica. */
export interface DecorSlot {
  x: number;
  theme: ModuleTheme;
}

/** Colunas livres em cada borda do trecho: a peça não encosta na emenda nem na parede. */
const EDGE_COLS = 3;
/** Uma peça a cada tantas colunas do trecho, com no mínimo 1 e no máximo 3. */
const COLS_PER_PIECE = 14;

/**
 * Posições da decoração sem colisão (CEN-13, CEN-15): de 1 a 3 por trecho, em colunas sorteadas por hash da coluna
 * inicial e do tema, sem o `Rng` da run (o sorteio por seed dos módulos não muda). A mesma grade dá sempre as mesmas
 * posições. Cada peça cai na sua fatia do trecho, então duas peças nunca se sobrepõem.
 */
export function decorSlots(spans: readonly ThemeSpan[]): DecorSlot[] {
  const out: DecorSlot[] = [];
  for (const sp of spans) {
    const first = sp.col0 + EDGE_COLS;
    const last = sp.col1 - EDGE_COLS;
    if (last < first) continue;
    const cols = last - first + 1;
    const count = Math.max(1, Math.min(3, Math.floor(cols / COLS_PER_PIECE)));
    const slice = cols / count;
    const rand = rng(hashSeed(sp.col0 * 31 + sp.theme.length * 7 + sp.theme.charCodeAt(0)));
    for (let i = 0; i < count; i++) {
      const col = first + Math.floor(i * slice + rand() * Math.max(1, slice - 2));
      out.push({ x: col * TILE + TILE / 2, theme: sp.theme });
    }
  }
  return out;
}
