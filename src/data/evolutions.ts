import type { TechId } from './techniques';

/**
 * Receitas de evolução (EVO-01..04, AD-024): duas técnicas no nível máximo se fundem numa técnica nova. Só o Vazio
 * Roxo por enquanto; receita nova entra aqui. Sem `phaser`.
 */
export interface Recipe {
  /** Técnica que nasce da fusão. */
  into: TechId;
  /** As duas técnicas da receita; a primeira cede o slot para a nova (EVO-03). */
  from: readonly [TechId, TechId];
  /** Preço da carta na loja (EVO-04). */
  cost: number;
  /** Nome da carta. */
  name: string;
}

export const RECIPES: readonly Recipe[] = [
  { into: 'roxo', from: ['azul', 'vermelho'], cost: 60, name: 'Vazio Roxo (Azul + Vermelho)' },
];
