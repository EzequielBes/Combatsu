import type { AxisTable } from './techRule';

/**
 * Eixos, ramos e Despertares dos dois itens com eixo da F30: o Vermelho e o Corpo Amaldiçoado (plano de builds,
 * seções 2.1 e 2.2; VRM-03, VRM-04, CRP-02 a CRP-11). Cada linha de eixo é uma `AxisTable` (valor com 0, 1, 2 e 3
 * pontos), lida por `axisAt` (`core/axisRule.ts`). Os tetos (3 por eixo, 5 por item), os limiares (ramo no Nv 2,
 * Despertar no Nv 5), a fração do HP (4 % e 1 %) e o reembolso da Recarga 3 (0,3) não moram aqui: são o `TECH_RULE`
 * de `data/techRule.ts`. Sem `phaser` aqui.
 */

/** Eixos do Vermelho; a ordem é o desempate do eixo-foco. */
export const RED_AXIS_IDS = ['potencia', 'escala', 'conjuracao', 'eficiencia', 'recarga', 'perfuracao'] as const;
export type RedAxisId = (typeof RED_AXIS_IDS)[number];

/** Eixos do Corpo Amaldiçoado; a ordem é o desempate do eixo-foco. */
export const BODY_AXIS_IDS = ['impacto', 'peso', 'ritmo', 'alcance', 'fluxo', 'furia'] as const;
export type BodyAxisId = (typeof BODY_AXIS_IDS)[number];

export type AxisId = RedAxisId | BodyAxisId;
export type AxisItem = 'vermelho' | 'corpo';

export type RedBranchId = 'ricochete' | 'contido';
export type BodyBranchId = 'cadencia' | 'ondaDoPunho';
export type BranchId = RedBranchId | BodyBranchId;

export type RedAwakeningId = 'fliperama' | 'vermelhoMaximo';
export type BodyAwakeningId = 'marteloNegro' | 'punhoQueRasga';
export type AwakeningId = RedAwakeningId | BodyAwakeningId;

/** Eixos de cada item, na ordem do desempate. */
export const ITEM_AXES = { vermelho: RED_AXIS_IDS, corpo: BODY_AXIS_IDS } as const;

/** VRM-03, VRM-04: números do Vermelho por eixo. A base (0 pontos em tudo) é o Vermelho Nv 1. */
export const RED_AXES = {
  potencia: {
    /** Dano do toque no inimigo atravessado. */
    touch: [30, 35, 40, 45] as AxisTable,
    /** Dano da detonação em cada alvo do raio. */
    detonation: [25, 29, 33, 37] as AxisTable,
    /** Força (px/step) do toque e da detonação. */
    force: [8, 9, 10, 11] as AxisTable,
    /** VRM-04.6: anéis de choque a mais por ponto (a base é o `TECH_GEOMETRY.vermelho.rings`, 1). */
    ringsPerPoint: 1,
    /** VRM-04.6: hitstop da detonação a mais por ponto, em ms. */
    hitstopPerPointMs: 10,
  },
  escala: {
    /** Raio da detonação em px. */
    radius: [96, 120, 144, 168] as AxisTable,
    /** Tamanho em texels da textura do orbe em voo. */
    orbTexels: [12, 14, 16, 18] as AxisTable<12 | 14 | 16 | 18>,
    /** Raio do sensor de voo do orbe em px. */
    sensorPx: [6, 7, 8, 9] as AxisTable,
  },
  conjuracao: {
    signMs: [250, 200, 165, 125] as AxisTable,
    chargeMs: [350, 280, 225, 175] as AxisTable,
    /** Com estes pontos a soltura deixa a pós-imagem do player. */
    afterimageAt: 3,
  },
  eficiencia: {
    cost: [30, 26, 22, 18] as AxisTable,
  },
  recarga: {
    /** Recarga em ms; o reembolso do 3º ponto é o `killRefundPct` da leva 1. */
    cooldownMs: [4500, 3600, 2900, 2300] as AxisTable,
  },
  perfuracao: {
    /** VRM-08: dano cru do estilhaço (sem a Potência). */
    shard: [0, 6, 9, 12] as AxisTable,
    /** VRM-08: vizinhos atingidos pelo estilhaço, o mais perto primeiro. */
    shardNeighbors: [0, 1, 2, 2] as AxisTable<0 | 1 | 2>,
    /** VRM-08: distância máxima do vizinho ao alvo atravessado, em px. */
    shardReachPx: 60,
  },
} as const satisfies Record<RedAxisId, object>;

/** CRP-02 a CRP-07: números do Corpo Amaldiçoado por eixo. A base (0 pontos em tudo) é o soco de hoje. */
export const BODY_AXES = {
  impacto: {
    /** CRP-02: multiplicador do dano corpo a corpo, por cima da Força. */
    impactMul: [1, 1.1, 1.2, 1.3] as AxisTable,
  },
  peso: {
    /** CRP-03: multiplicador da força dos golpes do player. */
    forceMul: [1, 1.2, 1.4, 1.6] as AxisTable,
    /** CRP-03: a partir destes pontos todo golpe forte derruba o comum. */
    knockdownFrom: 2,
    /** VRM-16: com estes pontos o comum derrubado que bate na parede fica atordoado. */
    wallStunAt: 3,
  },
  ritmo: {
    /** CRP-04: multiplicador do `recovery` de todo golpe do moveset. */
    recoveryMul: [1, 0.92, 0.85, 0.78] as AxisTable,
    /** CRP-04: com estes pontos o `recovery` deixa a pós-imagem do player. */
    afterimageAt: 3,
  },
  alcance: {
    /** CRP-05: px que a hitbox ganha para a frente. */
    reachPx: [0, 6, 10, 14] as AxisTable,
  },
  fluxo: {
    /** CRP-06: energia a mais por golpe que acerta, somada ao `CE.meleeGain`. */
    energyBonus: [0, 1, 2, 3] as AxisTable,
  },
  furia: {
    /** CRP-07: bônus de dano corpo a corpo por acúmulo. */
    furyStep: [0, 0.03, 0.04, 0.05] as AxisTable,
    /** CRP-07: teto do bônus somado. */
    furyCap: [0, 0.15, 0.24, 0.35] as AxisTable,
  },
} as const satisfies Record<BodyAxisId, object>;

/** VRM-12, VRM-14: ramos do Vermelho. */
export const RED_BRANCHES = {
  /** Detona no 1º inimigo e rebate uma vez para o mais perto a até 200 px; o rebote dá 70 %. */
  ricochete: { reboundRangePx: 200, rebounds: 1, afterFirstMul: 0.7 },
  /** Segurar a tecla prende o orbe por até 1,2 s; a detonação segurada tem o raio ×1,4. */
  contido: { holdMs: 1200, radiusMul: 1.4 },
} as const satisfies Record<RedBranchId, object>;

/** VRM-13, VRM-15, VRM-16: Despertares do Vermelho. */
export const RED_AWAKENINGS = {
  /** Até 3 rebotes, +15 % de velocidade por detonação e o componente proporcional na 3ª. */
  fliperama: { rebounds: 3, speedStep: 0.15, pctAt: 3 },
  /** Derruba no raio e deixa um campo que empurra e dá chip; o comum jogado na parede fica atordoado. */
  vermelhoMaximo: { fieldMs: 1200, fieldTickMs: 200, fieldChip: 3, pushSpeed: 150, wallStunMs: 600 },
} as const satisfies Record<RedAwakeningId, object>;

/** CRP-09, CRP-10: ramos do Corpo. */
export const BODY_BRANCHES = {
  /** Todo 4º golpe seguido que acerta é decisivo e dá +50 %. */
  cadencia: { every: 4, damageMul: 1.5 },
  /** O golpe forte solta uma onda de 80 px a 600 px/s com 40 % do dano do golpe. */
  ondaDoPunho: { rangePx: 80, speed: 600, damageFrac: 0.4 },
} as const satisfies Record<BodyBranchId, object>;

/** CRP-09, CRP-11: Despertares do Corpo. */
export const BODY_AWAKENINGS = {
  /** O decisivo da Cadência derruba os comuns a até 48 px do acerto. */
  marteloNegro: { areaPx: 48 },
  /** A onda atravessa todos e anda 160 px; com a Fúria no teto sai uma 2ª onda 100 ms depois. */
  punhoQueRasga: { rangePx: 160, secondWaveMs: 100 },
} as const satisfies Record<BodyAwakeningId, object>;

/** CRP-12: teto do `strikeEmitter` (ondas por janela). */
export const EMITTER = { maxPerWindow: 4, windowMs: 1000 } as const;

/** Ramos de cada item, na ordem `a`/`b` do painel e do `ramo=<item>:<a|b>` do debug. */
export const ITEM_BRANCHES = {
  vermelho: ['ricochete', 'contido'],
  corpo: ['cadencia', 'ondaDoPunho'],
} as const satisfies Record<AxisItem, readonly [BranchId, BranchId]>;

/** Despertar que cada ramo abre no Nv 5. */
export const BRANCH_AWAKENING: Record<BranchId, AwakeningId> = {
  ricochete: 'fliperama',
  contido: 'vermelhoMaximo',
  cadencia: 'marteloNegro',
  ondaDoPunho: 'punhoQueRasga',
};

/** Nome do eixo na carta da loja. */
export const AXIS_NAMES: Record<AxisId, string> = {
  potencia: 'Potência',
  escala: 'Escala',
  conjuracao: 'Conjuração',
  eficiencia: 'Eficiência',
  recarga: 'Recarga',
  perfuracao: 'Perfuração',
  impacto: 'Impacto',
  peso: 'Peso',
  ritmo: 'Ritmo',
  alcance: 'Alcance',
  fluxo: 'Fluxo',
  furia: 'Fúria',
};

/** Nome do ramo no painel de escolha. */
export const BRANCH_NAMES: Record<BranchId, string> = {
  ricochete: 'Ricochete',
  contido: 'Contido',
  cadencia: 'Cadência',
  ondaDoPunho: 'Onda do Punho',
};

/** Nome do Despertar no banner e no painel. */
export const AWAKENING_NAMES: Record<AwakeningId, string> = {
  fliperama: 'Fliperama',
  vermelhoMaximo: 'Vermelho Máximo',
  marteloNegro: 'Martelo Negro',
  punhoQueRasga: 'Punho que Rasga',
};
