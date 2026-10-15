/**
 * Números da Erupção (Jogo; plano de builds, seção 5.1): um pilar de fogo sobe do chão à frente. As tabelas guardam o
 * número do plano por pontos de eixo (0 a 3); a altura, os passos do meio, a geometria da fila e os números dos ramos
 * e Despertares foram escolhidos na spec `regras-tecnicas-leva2`. Fora do `TechId` até a F41. Sem `phaser`.
 */
import type { AxisTable } from './techRule';

export type EruptionAxisId = 'altura' | 'erupcoes' | 'queima' | 'dano' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const ERUPTION_AXIS_IDS = ['altura', 'erupcoes', 'queima', 'dano', 'eficiencia', 'recarga'] as const;

export type EruptionBranchId = 'meteoro' | 'lagoDeLava';

export const ERUPTION = {
  /** Aviso no chão antes do 1º pilar subir (ms). */
  signMs: 250,
  recoverMs: 200,
  /** Distância do 1º pilar à frente do player (px). */
  aheadPx: 80,
  /** Distância entre dois pilares da fila (px). */
  spacingPx: 56,
  /** Atraso entre dois pilares da fila (ms). */
  staggerMs: 120,
  /** Largura do pilar (px). */
  widthPx: 32,
  /** Queima: um tique chip a cada `tickMs`, por no máximo `durationMs` desde o acerto. */
  burn: { tickMs: 300, durationMs: 2000 },
  axes: {
    /** Altura do pilar acima do chão (px). */
    altura: [64, 80, 96, 112],
    /** Pilares em fila. */
    erupcoes: [1, 2, 3, 4],
    /** Dano chip de cada tique da queima (0 = sem queima). */
    queima: [0, 2, 3, 4],
    /** Dano do pilar. */
    dano: [24, 30, 36, 42],
    /** Custo de energia. */
    eficiencia: [30, 26, 22, 18],
    /** Recarga (ms). */
    recarga: [3500, 3000, 2500, 2000],
  } satisfies Record<EruptionAxisId, AxisTable>,
  /** Ramo Meteoro: o pilar vira meteoro que cai depois, num raio em volta do ponto no chão, e derruba o comum. */
  meteoro: { delayMs: 400, radiusPx: 56, damageMul: 1.5 },
  /** Ramo Lago de Lava: cada pilar deixa lava rasa no chão; chip de `max(chip, queima)` a cada `tickMs`. */
  lagoDeLava: { durationMs: 3000, widthPx: 64, heightPx: 8, tickMs: 300, chip: 3 },
  /** Despertar Chuva de Meteoros: cada meteoro solta 2 estilhaços (micro), um para cada lado. */
  chuvaDeMeteoros: { offsetPx: 48, delayMs: 200, radiusPx: 24, damageMul: 0.5 },
} as const;
