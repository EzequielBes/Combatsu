/*
 * Quadros HD pequenos desenhados como grade de texto: 1 caractere = 1 texel, a chave da cor na paleta única
 * (`art/palette.ts`) e '.' transparente. Os índices saem na tabela `PALETTE_COLORS` (a mesma dos ícones HD), então
 * toda folha feita assim fica, por construção, dentro da paleta. Puro, sem `phaser`.
 */
import { TRANSPARENT } from '../../../core/pixelGrid';
import { ICON_COLORS } from './icons/canvas';
import { PALETTE } from '../palette';

/** Tabela de cores 0xRRGGBB por índice: o índice `i + 1` é a `i`-ésima chave da paleta (o 0 é transparente). */
export const PALETTE_COLORS: readonly number[] = ICON_COLORS;

const KEYS: readonly string[] = Object.keys(PALETTE);

/** Índice da chave da paleta em `PALETTE_COLORS`; chave fora da paleta lança erro. */
export function paletteIndex(key: string): number {
  const i = KEYS.indexOf(key);
  if (i < 0) throw new Error(`Cor '${key}' fora da paleta única`);
  return i + 1;
}

/** A grade (`h` linhas de `w` caracteres) em índices de `PALETTE_COLORS`, linha a linha. */
export function gridFrame(rows: readonly string[], w: number, h: number, name = 'quadro'): Uint8Array {
  if (rows.length !== h) throw new Error(`${name}: ${rows.length} linhas, esperava ${h}`);
  const out = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${name}, linha ${y}: ${row.length} colunas, esperava ${w}`);
    for (let x = 0; x < w; x++) if (row[x] !== TRANSPARENT) out[y * w + x] = paletteIndex(row[x]);
  });
  return out;
}
