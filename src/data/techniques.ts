/**
 * Dados das técnicas amaldiçoadas (DIV-01, RED-01, BLU-01, CUT-01, TEC-14) e tuning de energia, Kokusen e fx de
 * conjuração comuns a toda a feature (design "src/data/techniques.ts (novo) e tuning"). Sem `phaser` aqui.
 */
export type TechId = 'divergente' | 'vermelho' | 'azul' | 'corte';

export interface TechDef {
  id: TechId;
  name: string;
  /** Kanji da técnica (拳/赫/蒼/解); 黒/閃 só aparecem no card do Kokusen. */
  kanji: 'ken' | 'aka' | 'ao' | 'kai';
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

/** Kokusen / Black Flash (KOK-*): janela, zona, dano e camadas cinemáticas. */
export const KOKUSEN = {
  windowFrom: 120,
  windowTo: 200,
  zoneFrom: 60,
  zoneMs: 8000,
  damage: 45,
  hitstopMs: 220,
  knockbackMul: 2,
  poiseMul: 3,
  invertMs: 33,
  duotoneMs: 66,
  boltsAfterMs: 150,
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
