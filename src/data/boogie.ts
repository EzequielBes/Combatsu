/**
 * Números do Boogie Woogie (plano de builds, seção 2.5): a palma que troca o player de lugar com o inimigo, o orbe
 * próprio ou o projétil mais próximo à frente. As tabelas guardam o número cru do plano por pontos de eixo (0 a 3);
 * o piso de 60% do custo fica no agregador de build. Fora do `TechId` até a F34. Sem `phaser` aqui.
 */
import type { AxisTable } from './techRule';

export type BoogieAxisId = 'alcance' | 'tontura' | 'cargas' | 'choque' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const BOOGIE_AXIS_IDS = ['alcance', 'tontura', 'cargas', 'choque', 'eficiencia', 'recarga'] as const;

export type BoogieBranchId = 'palmaFalsa' | 'duplaPalma';

export const BOOGIE = {
  signMs: 80,
  releaseMs: 60,
  recoverMs: 150,
  axes: {
    /** Alcance da troca (px, centro a centro); 320 é o teto da tela. */
    alcance: [220, 260, 290, 320],
    /** Tontura do inimigo comum trocado (ms); o chefe nunca fica tonto. */
    tontura: [0, 250, 400, 600],
    /** Cargas guardadas; no 3º ponto a recarga de cada carga cai 20%. */
    cargas: [1, 2, 3, 3],
    /** Choque da troca: chip nos dois pontos. */
    choque: [0, 8, 14, 20],
    /** Custo de energia. */
    eficiencia: [20, 16, 12, 8],
    /** Recarga de uma carga (ms). */
    recarga: [2500, 2000, 1600, 1200],
  } satisfies Record<BoogieAxisId, AxisTable>,
  /** Multiplicador da recarga de cada carga com o eixo Cargas no 3º ponto. */
  chargeCooldownMulAtCap: 0.8,
  /** Raio do choque em volta do ponto de saída e do de chegada (px). */
  shockRadiusPx: 40,
  /** Palma Falsa: segurar a tecla por isto ou mais finge a troca (ms). */
  feintHoldMs: 250,
  /** Palma Falsa: raio dos inimigos enganados (px). */
  feintRadiusPx: 120,
  /** Palma Falsa: janela de Contra aberta no inimigo enganado (ms). */
  counterWindowMs: 400,
  /** Dupla Palma: janela da 2ª troca sem gastar carga (ms). */
  doubleWindowMs: 1000,
  /** Finta Total: intervalo mínimo entre dois cancelamentos do chefe (ms). */
  fintaTotalCooldownMs: 10000,
  /** Eco da Palma: tempo até o eco trocar de volta (ms). */
  echoDelayMs: 1000,
} as const;
