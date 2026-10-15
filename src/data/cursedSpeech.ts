/**
 * Números da Fala Amaldiçoada (plano de builds, seção 5.1): "Pare!", um cone que atordoa e custa vida e energia. As
 * tabelas guardam o número cru do plano por pontos de eixo (0 a 3); custo de energia, recarga e os números dos ramos
 * que o plano não fixa foram escolhidos na spec `regras-tecnicas-leva1`. Fora do `TechId` até a F34. Sem `phaser`.
 */
import type { AxisTable } from './techRule';

export type SpeechAxisId = 'alcance' | 'atordoamento' | 'vida' | 'cone' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const SPEECH_AXIS_IDS = ['alcance', 'atordoamento', 'vida', 'cone', 'eficiencia', 'recarga'] as const;

export type SpeechBranchId = 'exploda' | 'volte';

export const CURSED_SPEECH = {
  signMs: 100,
  releaseMs: 80,
  recoverMs: 200,
  axes: {
    /** Alcance do cone (px, do centro do player). */
    alcance: [140, 180, 220, 260],
    /** Atordoamento do inimigo comum (ms); o chefe toma `bossStunMul` disso. */
    atordoamento: [600, 800, 1000, 1200],
    /** Custo em vida. */
    vida: [8, 6, 4, 2],
    /** Abertura total do cone (graus). */
    cone: [30, 40, 50, 60],
    /** Custo de energia. */
    eficiencia: [25, 21, 18, 15],
    /** Recarga (ms). */
    recarga: [4000, 3300, 2700, 2200],
  } satisfies Record<SpeechAxisId, AxisTable>,
  /** O chefe atordoa 25% do comum (150 ms no 0 do eixo). */
  bossStunMul: 0.25,
  /** Ramo "Exploda": dano em cada atordoado. */
  exploda: { damage: 20 },
  /** Ramo "Volte": empurrão para longe; o comum cai, o chefe só recua. */
  volte: { force: 9, bossForceMul: 0.3 },
  /** Despertar Exploda em Cadeia: o atordoado que morre explode e atordoa os vizinhos. */
  explodaEmCadeia: { radiusPx: 70, stunMs: 300 },
  /** Despertar Esmague: janela, desde a fala, em que o empurrado ainda esmaga ao bater (ms). */
  esmague: { windowMs: 800 },
} as const;
