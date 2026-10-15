/*
 * Quadros HD pequenos desenhados como grade de texto: 1 caractere = 1 texel, a chave da cor na paleta única
 * (`art/palette.ts`) e '.' transparente. Os índices saem na tabela `PALETTE_COLORS` (a mesma dos ícones HD), então
 * toda folha feita assim fica, por construção, dentro da paleta. Puro, sem `phaser`.
 */
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
