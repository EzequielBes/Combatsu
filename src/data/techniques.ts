/**
 * Dados das técnicas amaldiçoadas (DIV-01, RED-01, BLU-01, CUT-01, TEC-14) e tuning de energia, Kokusen e fx de
 * conjuração comuns a toda a feature (design "src/data/techniques.ts (novo) e tuning"). Sem `phaser` aqui.
 */
/** `roxo` (Vazio Roxo) não é vendida direto: nasce da evolução de Azul + Vermelho (EVO-03). */
export type TechId = 'divergente' | 'vermelho' | 'azul' | 'corte' | 'roxo';

export interface TechDef {
  id: TechId;
  name: string;
  /** Rótulo curto, sem dois-pontos, para listas como o painel de fim de run (`Vermelho: 46 (31%)`). */
  short: string;
  /** Kanji da técnica (拳/赫/蒼/解); 黒/閃 só aparecem no card do Kokusen. */
  kanji: 'ken' | 'aka' | 'ao' | 'kai' | 'murasaki';
  /** Chave de `PALETTE` usada na aura da conjuração (CAST-14). */
  aura: string;
  /** Custo de energia em nível 1 (TEC-14 escala com o nível). */
  cost: number;
  cooldownMs: number;
  signMs: number;
  chargeMs: number;
  releaseMs: number;
  recoverMs: number;
  /** Valores de dano em nível 1 (TEC-06 escala com o nível); chaves por AC (ex.: `first`/`second`). */
  damage: Record<string, number>;
}

export const TECHNIQUES: Record<TechId, TechDef> = {
  divergente: {
    id: 'divergente',
    name: 'Punho Divergente',
    short: 'Divergente',
    kanji: 'ken', // feat(art): 拳 (de "逕庭拳") - antes usava 黒 (kuro), que é do Kokusen (KOK-22)
    aura: 'c',
    cost: 20,
    cooldownMs: 1200,
    signMs: 60,
    chargeMs: 60,
    releaseMs: 80,
    recoverMs: 200,
    damage: { first: 12, second: 18 }, // DIV-03, DIV-04
  },
  vermelho: {
    id: 'vermelho',
    name: 'Reversão de Técnica: Vermelho',
    short: 'Vermelho',
    kanji: 'aka',
    aura: 'r',
    cost: 45,
    cooldownMs: 3000,
    signMs: 250,
    chargeMs: 350,
    releaseMs: 100,
    recoverMs: 250,
    damage: { hit: 30, detonation: 25 }, // RED-06, RED-10
  },
  azul: {
    id: 'azul',
    name: 'Azul',
    short: 'Azul',
    kanji: 'ao',
    aura: 'd',
    cost: 35,
    cooldownMs: 4000,
    signMs: 200,
    chargeMs: 250,
    releaseMs: 100,
    recoverMs: 200,
    damage: { tick: 5, end: 10 }, // BLU-06, BLU-07
  },
  corte: {
    id: 'corte',
    name: 'Desmantelar',
    short: 'Desmantelar',
    kanji: 'kai',
    aura: 'u',
    cost: 30,
    cooldownMs: 2500,
    signMs: 150,
    chargeMs: 0, // CUT-01: charge 0 é pulado pela CastMachine (CAST-02)
    releaseMs: 150,
    recoverMs: 200,
    damage: { cut: 10 }, // CUT-03
  },
  roxo: {
    id: 'roxo',
    name: 'Vazio Roxo',
    short: 'Vazio Roxo',
    kanji: 'murasaki', // 紫
    aura: 'u',
    cost: 70, // EVO-07
    cooldownMs: 6000, // EVO-07
    signMs: 300,
    chargeMs: 400,
    releaseMs: 100,
    recoverMs: 300,
    damage: { hit: 60 }, // EVO-06
  },
};

/** Fatores de dano por nível (TEC-06): índice 0/1/2 = nível 1/2/3. */
export const LEVEL_FACTOR: readonly [number, number, number] = [1, 1.25, 1.5];

/** Energia amaldiçoada (CE-01, CE-07, CE-09, KOK-09): tetos e ganhos de energia. */
export const CE = {
  max: 100,
  regen: 8,
  meleeGain: 3,
  kokusenGain: 30,
  maxPerLevel: 20,
  maxCap: 200,
  regenPerLevel: 2,
  regenCap: 16,
};

/**
 * Energia Amaldiçoada Reversa (RCT-01..09): segurar a tecla converte energia em vida, gastando o dobro em energia
 * do que cura. Começa depois de uma concentração curta e trava o player como uma conjuração.
 */
export const REVERSE_CURSED = {
  /** Concentração antes da primeira cura (ms): o player já está parado e vulnerável. */
  warmupMs: 250,
  /** HP curado por segundo de canalização. */
  hpPerSec: 12,
  /** Energia gasta por HP curado. */
  energyPerHp: 2,
};

/**
 * Kokusen / Black Flash (KOK-*): janela, zona, dano e camadas cinemáticas. `windowFrom`, `windowTo` e `zoneFrom` são
 * a janela de base (sem sorteio). No jogo cada Punho Divergente sorteia `delayMs` (o tempo do 1º ao 2º impacto, que é
 * também o fim da janela e o tempo em que o anel fecha) e `windowMs` (a largura dela): o anel mostra quando, mas a
 * folga muda de um golpe para o outro. Na zona a janela abre `windowFrom − zoneFrom` ms mais cedo.
 */
export const KOKUSEN = {
  windowFrom: 120,
  windowTo: 200,
  zoneFrom: 60,
  delayMs: { min: 170, max: 290 },
  windowMs: { min: 50, max: 90 },
  zoneMs: 8000,
  damage: 45,
  hitstopMs: 220,
  knockbackMul: 2,
  poiseMul: 3,
  invertMs: 33,
  duotoneMs: 66,
  boltsAfterMs: 150,
  /**
   * Estouro desenhado no ponto do impacto: tempo real (ms) de cada um dos 5 quadros e a escala do desenho. O núcleo
   * (1º quadro) dura o negativo e o duotom inteiros, que pintam a tela de preto e vermelho e esconderiam os raios; os
   * raios entram quando a cor volta, ainda dentro do congelamento. Em 1,5 cada texel ocupa 3 px de tela no zoom 2.
   */
  burstFrameMs: [100, 60, 110, 90, 100],
  burstScale: 1.5,
  cardMs: 800,
  zoomPeak: 1.68,
  zoomInMs: 60,
  zoomOutMs: 300,
};

/** Fx comuns de toda conjuração (CAST-11, CAST-15, CAST-16, CAST-19). */
export const CAST_FX = {
  zoomBase: 1.5,
  zoomCharge: 1.6,
  zoomBackMs: 250,
  calloutMs: 900,
  airGravity: 0.3,
};

/**
 * Geometria das técnicas num lugar só (TST-01): os números que hoje são constantes soltas nos módulos de regra, nos
 * adaptadores de `game/tech/` e nas vistas de `game/techFx/`. Nesta etapa os módulos ainda têm a cópia deles; o
 * `tests/core/techStats.test.ts` compara cada número com a constante do módulo até os módulos passarem a ler daqui.
 */
export const TECH_GEOMETRY = {
  vermelho: {
    /** Raio da detonação (RED-10, `core/redOrb.ts`), também o raio máximo da esfera da vista (`redDetonation.ts`). */
    radius: 96,
    /** Tamanho em texels da textura do orbe em voo (`TEX.techOrbRed12`). */
    orbTexels: 12,
    /** Raio do sensor de voo do orbe (px de mundo, `game/tech/red.ts`). */
    sensorPx: 6,
    /** Velocidade do orbe em px/s (RDA-11). */
    speed: 760,
    /** Alcance do voo em px (RED-08). */
    rangePx: 420,
    /** Força (px/step) do toque e da detonação (RED-06/09/10). */
    force: 8,
    /** Repulsão da soltura (RDA-08): dano, força e alcance horizontal e vertical a partir do centro do player. */
    repulse: { damage: 4, force: 10, reachX: 80, reachY: 48 },
    /** Raio máximo da onda de choque da detonação (`redDetonation.ts`). */
    ringPx: 160,
  },
  azul: {
    /** BLU-02: o orbe nasce a esta distância à frente do player, recuando até esta folga da parede. */
    aheadPx: 110,
    wallMarginPx: 16,
    /** BLU-04, BLU-06, BLU-07: raio da puxada, do tique e da implosão. */
    radius: 130,
    /** BLU-04: velocidade da puxada (px/s). */
    pullSpeed: 150,
    /** BLU-06: intervalo entre tiques (ms). */
    tickMs: 250,
    /** BLU-03: duração do orbe (ms). */
    lifeMs: 1400,
    /** BLU-02: alcance da consulta de parede à frente do player (`game/tech/blue.ts`). */
    wallQueryPx: 130,
  },
  corte: {
    /** CUT-02: instante de cada corte (ms). */
    times: [0, 60, 120],
    /** CUT-05: ângulo de cada corte, na ordem. */
    anglesDeg: [20, -25, 70],
    /** CUT-03: retângulo de dano de 60 a 180 px à frente, com 48 px de altura. */
    nearPx: 60,
    farPx: 180,
    heightPx: 48,
    /** Comprimento da linha branca da vista (`CutFx.ts`). */
    lineLen: 240,
  },
  roxo: {
    /** EVO-05/06: velocidade (px/s), duração do voo (ms), raio e distância de nascimento à frente do player. */
    speed: 180,
    lifeMs: 1600,
    radius: 36,
    spawnAhead: 40,
    /** A esfera voa esta altura acima do centro do corpo (`game/tech/purple.ts`). */
    lift: 14,
    /** Empurrão do golpe (px/step), na direção do voo. */
    force: 9,
  },
} as const;
