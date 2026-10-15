/**
 * Números dos Cães Divinos (Megumi; plano de builds, seção 5.1): a tecla solta os cães da sombra numa investida
 * rasteira à frente; cada um morde o 1º alvo do caminho (acerto micro) e some em até 1,2 s. Não ficam e não escolhem
 * alvo. As tabelas guardam o número do plano por pontos de eixo (0 a 3); os passos do meio, os bônus do 3º ponto e os
 * números dos ramos e Despertares foram escolhidos na spec `regras-tecnicas-leva2`. Fora do `TechId` até a F41.
 * Sem `phaser`.
 */
import type { AxisTable } from './techRule';

export type DogsAxisId = 'caes' | 'alcance' | 'mordidas' | 'prisao' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const DOGS_AXIS_IDS = ['caes', 'alcance', 'mordidas', 'prisao', 'eficiencia', 'recarga'] as const;

export type DogsBranchId = 'totalidade' | 'matilha';

export const DIVINE_DOGS = {
  signMs: 120,
  recoverMs: 150,
  /** Os cães somem neste tempo desde a conjuração, mordendo ou não (ms). */
  lifeMs: 1200,
  /** Velocidade da investida (px/s). */
  speedPxS: 480,
  /** Com o eixo Cães no 3º ponto, a investida fica mais rápida. */
  capDashMul: 1.25,
  /** Dano de uma mordida; com o eixo Mordidas no 3º ponto, `capBiteDamage`. */
  biteDamage: 6,
  capBiteDamage: 8,
  /** Intervalo entre as mordidas de um cão no mesmo alvo (ms). */
  biteIntervalMs: 200,
  /** Os cães correm em faixas espalhadas nesta altura total (px), rentes ao chão. */
  laneSpreadPx: 16,
  /** Altura do centro das faixas acima do chão (px). */
  laneLiftPx: 8,
  /** O chefe fica preso esta fração da prisão do comum. */
  bossRootMul: 0.25,
  axes: {
    /** Cães por conjuração; no 3º ponto, a investida ×1,25. */
    caes: [2, 3, 4, 4],
    /** Até onde a investida vai (px). */
    alcance: [200, 240, 280, 320],
    /** Mordidas de cada cão no alvo; no 3º ponto, a mordida passa de 6 para 8. */
    mordidas: [1, 2, 3, 3],
    /** Prisão da 1ª mordida de cada cão (ms). */
    prisao: [0, 200, 400, 600],
    /** Custo de energia. */
    eficiencia: [24, 20, 17, 14],
    /** Recarga (ms). */
    recarga: [3500, 2900, 2400, 2000],
  } satisfies Record<DogsAxisId, AxisTable>,
  /** Ramo Totalidade: um lobo grande que salta de alvo em alvo. */
  totalidade: { leapRadiusPx: 120, leapMs: 150, targets: 3 },
  /** Despertar Totalidade Negra: mais saltos, com o componente proporcional. */
  totalidadeNegra: { targets: 5 },
  /** Despertar Matilha Faminta: o cão com tempo de sobra pula para outro alvo perto. */
  matilhaFaminta: { jumpRadiusPx: 80 },
} as const;
