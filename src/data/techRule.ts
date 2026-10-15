/**
 * Números da regra de eixos das técnicas (plano de builds, seção 2.1), usados pelas técnicas da leva 1: 6 eixos por
 * técnica com teto de 3 pontos, 5 pontos por técnica (Nv 1 a 6), ramo no Nv 2 e Despertar no Nv 5. O componente
 * proporcional do Despertar tira uma fração do HP máximo do alvo, com teto menor no chefe. Sem `phaser` aqui.
 */
export const TECH_RULE = {
  /** Teto de pontos num eixo. */
  axisCap: 3,
  /** Teto de pontos somados numa técnica (Nv 6 = 1 + 5). */
  pointCap: 5,
  /** O ramo abre no Nv 2 (o 1º ponto). */
  branchLevel: 2,
  /** O Despertar liga no Nv 5 (o 4º ponto), se o ramo já foi escolhido. */
  awakenLevel: 5,
  /** Componente proporcional: fração do HP máximo do comum e teto no chefe. */
  maxHpPct: { enemy: 0.04, boss: 0.01 },
} as const;

/** Tabela de um eixo: o valor com 0, 1, 2 e 3 pontos. */
export type AxisTable<T = number> = readonly [T, T, T, T];
