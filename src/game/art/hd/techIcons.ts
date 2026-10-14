/*
 * Folhas `tech-icons` e `tech-icons-24`: os ícones HD das técnicas e dos Domínios, desenhados em código (formas em
 * `icons/`) nas cores da paleta única. A mesma receita sai em dois tamanhos nativos, 48 texels (slot do HUD) e 24
 * (carta da loja), cada um na sua folha, porque reduzir o de 48 pela metade some com as linhas de 1 texel. 1 texel =
 * 1 px de mundo, o quadro tem o nome do ícone. Substituem o glifo kanji legado (`sprites/kanji.ts`) na F34. Puro,
 * sem `phaser`.
 */
import { IconCanvas, ICON_COLORS } from './icons/canvas';
import { drawPlate } from './icons/plate';
import { AMPLIFICACAO, JACKPOT, SANTUARIO } from './icons/domainArt';
import { BOOGIE, FALA, RESSONANCIA } from './icons/jjkArt';
import type { IconRecipe } from './icons/plate';
import { AZUL, CORTE, DIVERGENTE, ROXO, VERMELHO } from './icons/techArt';
import type { HdSheet } from './sheet';

/** Ícones das técnicas (as 5 de hoje e as 3 da leva 1) e dos 3 Domínios da leva 1. */
export const TECH_ICON_IDS = [
  'vermelho',
  'azul',
  'roxo',
  'divergente',
  'corte',
  'boogie',
  'ressonancia',
  'fala',
  'santuario',
  'jackpot',
  'amplificacao',
] as const;
export type TechIconId = (typeof TECH_ICON_IDS)[number];

/** Tamanhos nativos (lado do quadro em texels): o do slot do HUD e o da carta. */
export const TECH_ICON_SIZES = [48, 24] as const;
export type TechIconSize = (typeof TECH_ICON_SIZES)[number];

const RECIPES: Record<TechIconId, IconRecipe> = {
  vermelho: VERMELHO,
  azul: AZUL,
  roxo: ROXO,
  divergente: DIVERGENTE,
  corte: CORTE,
  boogie: BOOGIE,
  ressonancia: RESSONANCIA,
  fala: FALA,
  santuario: SANTUARIO,
  jackpot: JACKPOT,
  amplificacao: AMPLIFICACAO,
};

/** Um ícone no tamanho pedido: índices em `ICON_COLORS`, linha a linha. */
export function renderTechIcon(id: TechIconId, size: number): Uint8Array {
  const c = new IconCanvas(size);
  const recipe = RECIPES[id];
  drawPlate(c, recipe.plate);
  recipe.draw(c);
  return c.finish();
}

const cache = new Map<number, HdSheet>();

/** A folha de ícones no tamanho dado (calculada uma vez por tamanho). */
export function techIconSheet(size: TechIconSize): HdSheet {
  const hit = cache.get(size);
  if (hit) return hit;
  const frames: Record<string, Uint8Array> = {};
  for (const id of TECH_ICON_IDS) frames[id] = renderTechIcon(id, size);
  const sheet: HdSheet = { frameW: size, frameH: size, colors: ICON_COLORS, frames };
  cache.set(size, sheet);
  return sheet;
}
