/**
 * Expansão de Domínio (F31, plano seção 5.6): a ultimate da tecla `P`/`N`. Todos os números de ajuste dos três
 * Domínios da leva 1 (Santuário, Jackpot e Amplificação), da barra de carga, da loja e as chaves de cor da vista
 * (DHD-04: só chaves da `PALETTE`). Só dados, sem o motor.
 */
export type DomainId = 'santuario' | 'jackpot' | 'amplificacao';
export type DomainLevel = 1 | 2 | 3;

export const DOMAIN_IDS: readonly DomainId[] = ['santuario', 'jackpot', 'amplificacao'];

export interface DomainDef {
  name: string;
  /** Efeito numa linha, para a carta do Baú do Véu e do baú do chefe. */
  line: string;
  /**
   * Acerto decisivo da ativação (DOM-08): raio a partir do centro do player e fração do HP máximo por tipo de alvo.
   * `force` é o empurrão do acerto (0 no Jackpot, para os atingidos ficarem ao alcance do Riichi).
   */
  activation: { radiusPx: number; common: number; boss: number; elite: number; force: number };
  /** Duração por nível (Nv 1, Nv 2, Nv 3). No Jackpot é o giro dos tambores; o efeito vem de `JACKPOT`. */
  durationMs: readonly [number, number, number];
}

export const DOMAINS: Readonly<Record<DomainId, DomainDef>> = {
  santuario: {
    name: 'Santuário Malevolente',
    line: 'Todo acerto seu solta cortes nos inimigos em volta',
    activation: { radiusPx: 320, common: 0.4, boss: 0.06, elite: 0.2, force: 8 },
    durationMs: [6000, 8000, 8000],
  },
  jackpot: {
    name: 'Jackpot',
    line: 'Tambores giram: no jackpot, energia infinita e cura',
    activation: { radiusPx: 96, common: 0.4, boss: 0.06, elite: 0.2, force: 0 },
    durationMs: [2000, 2000, 2000],
  },
  amplificacao: {
    name: 'Amplificação de Domínio',
    line: 'Golpes atravessam guarda e anulam projéteis; técnicas travam',
    activation: { radiusPx: 96, common: 0.25, boss: 0.04, elite: 0.12, force: 8 },
    durationMs: [7000, 9000, 9000],
  },
};

/** Carga da barra por evento (DOM-02) e o esvaziamento (DOM-03). */
export const DOMAIN_CHARGE = {
  max: 100,
  light: 1,
  heavy: 2,
  prop: 2,
  kill: 1,
  defense: 5,
  techCast: 1,
  finisher: 5,
  kokusen: 15,
  /** Tempo seguido sem carga, em `roundActive`, antes de cada esvaziamento. */
  drainAfterMs: 8000,
  drainStep: 10,
  /** Carga com que o Domínio chega pelo Baú do Véu (VEU-03). */
  veilStart: 100,
} as const;

/** Santuário Malevolente (SAN-*). */
export const SANCTUARY = {
  triggersPerWindow: 4,
  windowMs: 1000,
  /** Alvos por corte, por nível. */
  targets: [4, 6, 6] as readonly [number, number, number],
  radiusPx: 320,
  /** Dano do corte micro antes da escala da rodada. */
  cutBase: 6,
  /** Corte do Mundo no fim do Nv 3: executa comuns abaixo do limiar e tira a fração do HP máximo do chefe. */
  worldCut: { threshold: 0.35, bossFraction: 0.08 },
} as const;

/** Jackpot (JAC-*). */
export const JACKPOT = {
  spinMs: 2000,
  /** Chance base por nível. */
  base: [0.33, 0.4, 0.4] as readonly [number, number, number],
  /** Riichi: cada golpe que acerta durante o giro. */
  riichiStep: 0.04,
  /** Bônus acumulado por jackpot ganho na run (Nv 3). */
  winStep: 0.05,
  cap: 0.6,
  /** Falhas seguidas antes do jackpot garantido. */
  pityMisses: 2,
  hit: { ms: 8000, healEveryMs: 200 },
  miss: { ms: 4000, healEveryMs: 400, costMul: 0.5, cooldownMul: 0.5 },
} as const;

/** Amplificação de Domínio (AMP-*). */
export const AMPLIFICATION = { meleeMulLv3: 1.25 } as const;

/** Empurrão do Corte do Mundo, no tamanho do golpe forte. */
export const DOMAIN_HIT = { force: 8, liftY: -0.6 } as const;

/** Loja: nível 2 = base, nível 3 = base + step, só da rodada mínima em diante. */
export const DOMAIN_SHOP = { base: 40, step: 10, minRound: 8 } as const;

/** Cores da barra e do `DomainFx`, só chaves da `PALETTE` (DHD-04). */
export const DOMAIN_COLORS = {
  barBg: 'K',
  barFill: 'U',
  barReady: 'W',
  barActive: 'T',
  vignette: 't',
  reelFace: 'w',
  reelBorder: 'A',
  reelText: 'A',
  outline: 'C',
} as const;

/** Barra do Domínio sob a energia (DHD-01..03). */
export const DOMAIN_BAR = { y: 51, h: 3, blinkMs: 250, keyLabel: 'P' } as const;

export const DOMAIN_FX = { vignettePx: 24, vignetteAlpha: 0.35, fadeMs: 300, outlinePad: 3 } as const;
