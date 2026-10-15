/**
 * Números da Convergência (Choso; plano de builds, seção 5.1): segurar carrega até a carga cheia, soltar dispara um
 * feixe fino de sangue que atravessa, até 320 px, e custa vida. As tabelas guardam o número cru do plano por pontos de
 * eixo (0 a 3); a energia fixa, a recarga e os números dos ramos e Despertares foram escolhidos na spec
 * `regras-tecnicas-leva2`. Fora do `TechId` até a F41. Sem `phaser`.
 */
import type { AxisTable } from './techRule';

export type ConvergenceAxisId = 'perfuracao' | 'carga' | 'largura' | 'vida' | 'dano' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const CONVERGENCE_AXIS_IDS = ['perfuracao', 'carga', 'largura', 'vida', 'dano', 'recarga'] as const;

export type ConvergenceBranchId = 'supernova' | 'curva';

export const CONVERGENCE = {
  releaseMs: 60,
  recoverMs: 200,
  /** Comprimento do feixe (px): o teto da tela. */
  rangePx: 320,
  /** Custo de energia fixo: a técnica não tem eixo de Eficiência, o gargalo é a vida. */
  cost: 20,
  /** A vida que sobra depois de pagar o custo nunca fica abaixo disto: a técnica não mata o player. */
  hpFloor: 1,
  /** Fração do dano num toque sem carga; sobe linear até 1 na carga cheia. */
  minChargeMul: 0.5,
  axes: {
    /** Alvos atravessados (o feixe para no último); no 3, todos. */
    perfuracao: [2, 3, 4, Infinity],
    /** Tempo para a carga cheia (ms). */
    carga: [600, 500, 400, 300],
    /** Espessura do feixe (px). */
    largura: [4, 6, 8, 10],
    /** Custo em vida. */
    vida: [6, 4, 2, 0],
    /** Dano por alvo na carga cheia. */
    dano: [28, 36, 44, 52],
    /** Recarga (ms). */
    recarga: [3500, 2900, 2400, 2000],
  } satisfies Record<ConvergenceAxisId, AxisTable>,
  /** Ramo Supernova: o fim do feixe estoura em estilhaços (micro). */
  supernova: { radiusPx: 48, damageMul: 0.5 },
  /** Ramo Curva: do fim, o feixe dobra para o vivo mais perto ainda não atingido. */
  curva: { radiusPx: 160, bends: 1 },
  /** Despertar Supernova Carmesim: estilhaços em raio maior, com o componente proporcional. */
  supernovaCarmesim: { radiusPx: 96 },
  /** Despertar Sangue Perfurante: mais dobras, cada uma com o componente proporcional. */
  sanguePerfurante: { bends: 3 },
} as const;
