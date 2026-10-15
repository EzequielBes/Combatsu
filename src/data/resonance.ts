/**
 * Números da Ressonância (plano de builds, seção 5.1): o 1º toque crava pregos que marcam; o 2º toque detona todas as
 * marcas. As tabelas guardam o número cru do plano por pontos de eixo (0 a 3); custo, recarga e os números do prego
 * não vêm do plano e foram escolhidos no meio do Desmantelar e do Boogie (spec `regras-tecnicas-leva1`). Fora do
 * `TechId` até a F34. Sem `phaser` aqui.
 */
import type { AxisTable } from './techRule';

export type ResonanceAxisId = 'pregos' | 'detonacao' | 'marca' | 'propagacao' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const RESONANCE_AXIS_IDS = ['pregos', 'detonacao', 'marca', 'propagacao', 'eficiencia', 'recarga'] as const;

export type ResonanceBranchId = 'grampo' | 'boneco';

export const RESONANCE = {
  signMs: 120,
  releaseMs: 80,
  recoverMs: 180,
  axes: {
    /** Pregos por toque. */
    pregos: [3, 4, 5, 6],
    /** Dano da detonação por marca. */
    detonacao: [20, 28, 36, 44],
    /** Duração da marca (ms); é também a janela do 2º toque. */
    marca: [6000, 8000, 10000, 12000],
    /** Raio da propagação da marca ao matar (px); 0 = não propaga. */
    propagacao: [0, 40, 70, 100],
    /** Custo de energia (só o 1º toque). */
    eficiencia: [25, 21, 18, 15],
    /** Recarga (ms), contada depois da detonação ou do fim da janela. */
    recarga: [3000, 2400, 1900, 1500],
  } satisfies Record<ResonanceAxisId, AxisTable>,
  nail: {
    /** Velocidade do prego (px/s). */
    speed: 900,
    /** Alcance do prego (px); 320 é o teto da tela. */
    rangePx: 320,
    /** Altura total do leque de pregos (px), centrado no ponto de saída. */
    spreadPx: 36,
    /** Desvio vertical máximo de cada prego (px), sorteado pelo `Rng` recebido. */
    jitterPx: 4,
    /** Dano do prego ao cravar (micro). */
    damage: 3,
  },
  /** Ramo Grampo: o prego explode ao cravar. */
  grampo: { radiusPx: 32, damage: 6 },
  /** Ramo Boneco: o chefe marcado repete parte do dano da detonação. */
  boneco: { echoMul: 0.5, echoDelayMs: 250 },
  /** Despertar Coroa de Pregos (Grampo): 2ª detonação no centro do grupo marcado. */
  coroa: { minMarks: 5, radiusPx: 80 },
  /** Despertar Boneco de Palha (Boneco): o chefe marcado repete parte de todo dano por um tempo. */
  bonecoDePalha: { windowMs: 3000, echoMul: 0.5 },
} as const;
