/**
 * Números do Punho de Trovão (Kashimo; plano de builds, seção 5.1): a tecla carrega o corpo, e os próximos golpes do
 * moveset que acertam soltam raio em cadeia (micro, com o mundo parando 15 a 20 ms a cada salto). Não cria golpe. As
 * tabelas guardam o número do plano por pontos de eixo (0 a 3); os passos do meio, o bônus do 3º ponto, a janela da
 * carga e os números dos ramos e Despertares foram escolhidos na spec `regras-tecnicas-leva2`. Fora do `TechId` até a
 * F41. Sem `phaser`.
 */
import type { AxisTable } from './techRule';

export type ThunderAxisId = 'cargas' | 'saltos' | 'dano' | 'atordoa' | 'eficiencia' | 'recarga';

/** Ordem da tabela (desempate do eixo-foco na F30). */
export const THUNDER_AXIS_IDS = ['cargas', 'saltos', 'dano', 'atordoa', 'eficiencia', 'recarga'] as const;

export type ThunderBranchId = 'tempestade' | 'estatica';

export const THUNDER_FIST = {
  signMs: 150,
  recoverMs: 150,
  /** As cargas que sobram se apagam neste tempo desde a conjuração (ms). */
  windowMs: 8000,
  /** Parada do mundo a cada salto do raio (ms), dentro dos 15 a 20 da faixa micro. */
  hopHitstopMs: 18,
  /** Raio do salto, do centro do último atingido (px); com o eixo Saltos no 3º ponto, `capJumpRadiusPx`. */
  jumpRadiusPx: 120,
  capJumpRadiusPx: 160,
  /** O chefe atordoa esta fração do comum. */
  bossStunMul: 0.25,
  axes: {
    /** Golpes do moveset carregados por conjuração. */
    cargas: [3, 4, 5, 6],
    /** Saltos do raio depois do golpeado; no 3º ponto, o raio do salto cresce. */
    saltos: [2, 3, 4, 4],
    /** Dano de cada acerto do raio. */
    dano: [8, 11, 13, 16],
    /** Atordoamento de cada acerto do raio no comum (ms). */
    atordoa: [0, 100, 200, 300],
    /** Custo de energia. */
    eficiencia: [30, 25, 21, 18],
    /** Recarga (ms). */
    recarga: [6000, 5000, 4200, 3500],
  } satisfies Record<ThunderAxisId, AxisTable>,
  /** Ramo Tempestade: o golpe forte com carga também solta um raio vertical no x do golpeado. */
  tempestade: { halfWidthPx: 24, damageMul: 2 },
  /** Ramo Estática: cada acerto do raio atordoa a mais (ms; o chefe toma `bossStunMul`). */
  estatica: { stunMs: 250 },
} as const;
