import type { AttackStep } from '../core/combo';

/** Botão de golpe: leve (`J`/`X`) ou forte (`K`/`Z`). */
export type MoveButton = 'light' | 'heavy';

/** Direção segurada junto do botão; `forward` é o lado para onde o jogador está virado. */
export type MoveDirection = 'none' | 'down' | 'up' | 'forward';

/** Entrada que inicia o golpe; follow-up, carregado e meia-lua não são um aperto simples. */
export type MoveInput =
  | { via: 'press'; button: MoveButton; direction: MoveDirection; air: boolean }
  | { via: 'followUp' }
  | { via: 'charge' }
  | { via: 'motion' }
  | { via: 'counter' };

/** Efeito no inimigo comum que sobrevive ao golpe (MOV-10, MOV-11, SPC-02). */
export type MoveEffect =
  { type: 'knockdown'; ms: number } | { type: 'launch'; minLiftPx: number } | { type: 'push'; px: number };

/** Deslocamento do jogador durante o `active` de um golpe aéreo (AIR-02). */
export interface MoveTravel {
  forwardPx: number;
  downPx: number;
}

export interface MoveDef extends AttackStep {
  input: MoveInput;
  /** Golpes que podem seguir este, por botão (MOV-04). */
  followUps: Partial<Record<MoveButton, string>>;
  effect?: MoveEffect;
  /** Estrutura total que o golpe soma no inimigo comum ao acertar (STR-02). */
  structureGain: number;
  /** A guarda do inimigo não reduz o dano (EBL-04). */
  unblockable?: boolean;
  travel?: MoveTravel;
  /** Pisão: põe a velocidade vertical na queda máxima (AIR-03). */
  slam?: boolean;
  /** Alvos que o golpe pode atingir numa abertura da hitbox, o mais perto primeiro (TGT-01, TGT-02). */
  maxTargets: number;
  /** Derruba o inimigo comum que sobrevive; sem isso o forte só o faz cambalear (PST-04, AD-021). */
  knockdown?: true;
  /** Postura que o jogador paga ao começar o golpe (VOA-01). */
  postureCost?: number;
  /** Contra: golpe que só a janela aberta por uma defesa inicia (CNT-09, CNT-10). */
  counter?: true;
  /** Duração da `recovery` quando o golpe termina sem nenhum alvo aceitar (VOA-07). */
  whiffRecoveryMs?: number;
  /** Quique ao acertar: recuo, duração e velocidade vertical (VOA-04..06). */
  bounce?: { backPx: number; ms: number; vy: number };
}

/** Nome do golpe do finalizador (FIN-01): não está no grafo (`MOVES`), só marca o `Hit` e a nota do combo. */
export const FINISHER_MOVE = 'finalizador';

/** Janela para encadear depois da recovery (MOV-03). */
export const MOVE_WINDOW_MS = 260;

/** Tempo segurando `K` desde o aperto para o carregado sair na soltura (MOV-09, MOV-16). */
export const CHARGE_MS = 400;

/** Estrutura que um golpe leve e um forte somam no inimigo comum (STR-02). */
export const STRUCTURE_LIGHT = 4;
export const STRUCTURE_HEAVY = 10;

const FIST = { offsetX: 22, offsetY: -4, width: 26, height: 18 };
const KICK = { offsetX: 26, offsetY: 6, width: 32, height: 20 };

const press = (button: MoveButton, direction: MoveDirection = 'none', air = false): MoveInput => ({
  via: 'press',
  button,
  direction,
  air,
});

/** Todos os golpes do jogador (MOV-01), chão e ar. Tempos em ms, force em px por step do Matter. */
export const MOVES: Record<string, MoveDef> = {
  jab: {
    name: 'jab',
    damage: 6,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 120,
    hitbox: FIST,
    input: press('light'),
    followUps: { light: 'direto', heavy: 'joelhada' },
    structureGain: STRUCTURE_LIGHT,
    maxTargets: 1,
  },
  direto: {
    name: 'direto',
    damage: 7,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 140,
    hitbox: FIST,
    input: { via: 'followUp' },
    followUps: { light: 'gancho', heavy: 'chuteGiratorio' },
    structureGain: STRUCTURE_LIGHT,
    maxTargets: 1,
  },
  gancho: {
    name: 'gancho',
    damage: 9,
    strength: 'light',
    force: 4,
    startupMs: 70,
    activeMs: 80,
    recoveryMs: 150,
    hitbox: { offsetX: 22, offsetY: -2, width: 28, height: 22 },
    input: { via: 'followUp' },
    followUps: { light: 'cotovelada' },
    structureGain: STRUCTURE_LIGHT,
    maxTargets: 1,
  },
  cotovelada: {
    name: 'cotovelada',
    damage: 14,
    strength: 'heavy',
    force: 8,
    startupMs: 110,
    activeMs: 90,
    recoveryMs: 240,
    hitbox: { offsetX: 20, offsetY: -4, width: 28, height: 20 },
    input: { via: 'followUp' },
    followUps: {},
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  chuteFrontal: {
    name: 'chuteFrontal',
    damage: 12,
    strength: 'heavy',
    force: 8,
    startupMs: 110,
    activeMs: 100,
    recoveryMs: 240,
    hitbox: KICK,
    input: press('heavy'),
    followUps: { heavy: 'chuteAlto' },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  chuteAlto: {
    name: 'chuteAlto',
    damage: 14,
    strength: 'heavy',
    force: 9,
    startupMs: 120,
    activeMs: 100,
    recoveryMs: 260,
    hitbox: { offsetX: 26, offsetY: -10, width: 32, height: 20 },
    input: { via: 'followUp' },
    followUps: {},
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  joelhada: {
    name: 'joelhada',
    damage: 12,
    strength: 'heavy',
    force: 8,
    startupMs: 100,
    activeMs: 90,
    recoveryMs: 240,
    hitbox: { offsetX: 18, offsetY: 4, width: 26, height: 22 },
    input: { via: 'followUp' },
    followUps: {},
    structureGain: STRUCTURE_HEAVY + 20,
    maxTargets: 2,
  },
  chuteGiratorio: {
    name: 'chuteGiratorio',
    damage: 18,
    strength: 'heavy',
    force: 10,
    startupMs: 130,
    activeMs: 110,
    recoveryMs: 300,
    hitbox: { offsetX: 24, offsetY: 2, width: 40, height: 26 },
    input: { via: 'followUp' },
    followUps: {},
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  socoBaixo: {
    name: 'socoBaixo',
    damage: 6,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 120,
    hitbox: { offsetX: 22, offsetY: 10, width: 26, height: 16 },
    input: press('light', 'down'),
    followUps: {},
    structureGain: STRUCTURE_LIGHT,
    maxTargets: 1,
  },
  rasteira: {
    name: 'rasteira',
    damage: 10,
    strength: 'heavy',
    force: 6,
    startupMs: 100,
    activeMs: 100,
    recoveryMs: 260,
    hitbox: { offsetX: 26, offsetY: 14, width: 36, height: 14 },
    input: press('heavy', 'down'),
    followUps: {},
    effect: { type: 'knockdown', ms: 900 },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 1,
    knockdown: true,
  },
  ganchoAscendente: {
    name: 'ganchoAscendente',
    damage: 10,
    strength: 'heavy',
    force: 6,
    startupMs: 90,
    activeMs: 90,
    recoveryMs: 260,
    hitbox: { offsetX: 18, offsetY: -12, width: 24, height: 32 },
    input: press('light', 'up'),
    followUps: {},
    effect: { type: 'launch', minLiftPx: 64 },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
    knockdown: true,
  },
  chuteEmpurrao: {
    name: 'chuteEmpurrao',
    damage: 12,
    strength: 'heavy',
    force: 12,
    startupMs: 120,
    activeMs: 100,
    recoveryMs: 260,
    hitbox: KICK,
    input: press('heavy', 'forward'),
    followUps: {},
    effect: { type: 'push', px: 60 },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  chuteCarregado: {
    name: 'chuteCarregado',
    damage: 24,
    strength: 'heavy',
    force: 14,
    startupMs: 140,
    activeMs: 120,
    recoveryMs: 340,
    hitbox: { offsetX: 26, offsetY: 4, width: 40, height: 26 },
    input: { via: 'charge' },
    followUps: {},
    structureGain: 40,
    unblockable: true,
    maxTargets: 2,
  },
  socoAereo: {
    name: 'socoAereo',
    damage: 7,
    strength: 'light',
    force: 3,
    startupMs: 50,
    activeMs: 100,
    recoveryMs: 120,
    hitbox: { offsetX: 20, offsetY: 4, width: 26, height: 20 },
    input: press('light', 'none', true),
    followUps: {},
    structureGain: STRUCTURE_LIGHT,
    maxTargets: 1,
  },
  voadora: {
    name: 'voadora',
    damage: 16,
    strength: 'heavy',
    force: 10,
    startupMs: 80,
    activeMs: 240,
    recoveryMs: 160,
    hitbox: { offsetX: 22, offsetY: 10, width: 32, height: 24 },
    input: press('heavy', 'none', true),
    followUps: {},
    travel: { forwardPx: 120, downPx: 60 },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 1,
    postureCost: 15,
    whiffRecoveryMs: 460,
    bounce: { backPx: 36, ms: 150, vy: -240 },
  },
  pisao: {
    name: 'pisao',
    damage: 14,
    strength: 'heavy',
    force: 8,
    startupMs: 60,
    activeMs: 300,
    recoveryMs: 140,
    hitbox: { offsetX: 4, offsetY: 16, width: 28, height: 22 },
    input: press('heavy', 'down', true),
    followUps: {},
    slam: true,
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
  },
  palmaExplosiva: {
    name: 'palmaExplosiva',
    damage: 20,
    strength: 'heavy',
    force: 14,
    startupMs: 120,
    activeMs: 100,
    recoveryMs: 300,
    hitbox: { offsetX: 24, offsetY: -2, width: 36, height: 24 },
    input: { via: 'motion' },
    followUps: {},
    effect: { type: 'push', px: 200 },
    structureGain: STRUCTURE_HEAVY,
    maxTargets: 2,
    knockdown: true,
  },
  // Contras (CNT-09, CNT-10): só a janela aberta por uma defesa os inicia (`via: 'counter'`), passam pela guarda e
  // somam 30 de postura. Sem `effect` nem `knockdown`: o inimigo comum cambaleia (CNT-21).
  contra: {
    name: 'contra',
    damage: 10,
    strength: 'heavy',
    force: 8,
    startupMs: 50,
    activeMs: 80,
    recoveryMs: 160,
    hitbox: FIST,
    input: { via: 'counter' },
    followUps: {},
    structureGain: 30,
    unblockable: true,
    counter: true,
    maxTargets: 1,
  },
  contraGancho: {
    name: 'contraGancho',
    damage: 12,
    strength: 'heavy',
    force: 8,
    startupMs: 50,
    activeMs: 90,
    recoveryMs: 200,
    hitbox: { offsetX: 18, offsetY: -12, width: 24, height: 32 },
    input: { via: 'counter' },
    followUps: {},
    structureGain: 30,
    unblockable: true,
    counter: true,
    maxTargets: 1,
  },
};

/** Nomes dos golpes com frames `<move>-wind|hit|recover` no sheet do jogador (MOV-14). */
export const MOVE_NAMES: readonly string[] = Object.keys(MOVES);

/** Guarda e parry (GRD-05, GRD-06, GRD-09, PAR-01, PAR-04, PAR-07, PAR-08, PAR-10). */
export const DEFENSE = {
  parryWindowMs: 150,
  parryCooldownMs: 300,
  /** Fração do dano do chefe que passa pela guarda (GRD-06). */
  bossChipFraction: 0.25,
  /** Com a guarda de pé o jogador vira e não anda (DEF-05); substitui os 40% do GRD-05. */
  guardSpeedFactor: 0,
  blockPushPx: 8,
  parryHitstopMs: 80,
  parryBossPoiseDamage: 30,
  /** O inimigo aparado fica parado, sem atacar nem andar (PAR-10). */
  parrySuppressMs: 400,
} as const;

/** Esquiva e câmera lenta (DOD-01..08, DOD-10). */
export const DODGE = {
  distancePx: 96,
  durationMs: 200,
  invulnMs: 180,
  cooldownMs: 450,
  slowScale: 0.3,
  slowMs: 400,
  counterMultiplier: 1.5,
  counterWindowMs: 1000,
} as const;

/** Abaixar (DEF-07, DEF-15): parado por `durationMs`; a recarga de `cooldownMs` conta do início e é dividida com a esquiva. */
export const DUCK = { durationMs: 320, cooldownMs: 450 } as const;

/**
 * Janela de Contra (CNT-01, CNT-04): `windowMs` depois de parry, esquiva perfeita ou abaixar que evitou golpe;
 * `deflectWindowMs` e `deflectStaggerMs` na Deflexão (DFL-10, DFL-11).
 */
export const COUNTER = { windowMs: 450, deflectWindowMs: 900, deflectStaggerMs: 900 } as const;

/** Estrutura do jogador e do inimigo comum (STR-01..08, PAR-03, FIN-01). */
export const STRUCTURE = {
  max: 100,
  enemy: {
    decayDelayMs: 1500,
    /** Taxa no foco (PST-16); fora dele vale `offFocusDecayPerSec` (PST-14). */
    decayPerSec: 10,
    offFocusDecayPerSec: 40,
    stunMs: 1500,
    parryGain: 35,
    guardedLightGain: 8,
    unbalanceMs: 400,
  },
  /** `evadeRelief`: quanto a postura cai numa esquiva perfeita ou num abaixar que evita golpe (DEF-13, DEF-19). */
  player: { blockRegular: 15, blockBoss: 25, decayDelayMs: 1000, decayPerSec: 20, stunMs: 800, evadeRelief: 10 },
  finisherDamage: 40,
  finisherRangePx: 40,
} as const;

/** Contador de combo e nota (CMB-01..03): a nota é a maior cuja `minDistinct` foi atingida. */
export const COMBO_STYLE = {
  expireMs: 1500,
  minHitsForGrade: 2,
  grades: [
    { grade: 'D', minDistinct: 1 },
    { grade: 'C', minDistinct: 3 },
    { grade: 'B', minDistinct: 4 },
    { grade: 'A', minDistinct: 5 },
    { grade: 'S', minDistinct: 6 },
  ],
} as const;

/** Guarda do inimigo comum (EBL-01): chance = min(base + perRound × (round − 1), cap). */
export const ENEMY_GUARD = {
  baseChance: 0.1,
  perRound: 0.03,
  cap: 0.4,
  durationMs: 600,
  triggerRangePx: 60,
} as const;

/**
 * Leitura de repetição e empurrão do inimigo comum (RDG-01..03, RDG-13..16, RDG-19..21): repetir o mesmo golpe em
 * `windowMs` soma `perRepeat` à chance de guarda; o 4º leve seguido dá `shoveChance` de o inimigo empurrar.
 */
export const READING = {
  windowMs: 3000,
  perRepeat: 0.25,
  /** Alcance da leitura na horizontal, somado ao avanço do golpe (`travel.forwardPx`). */
  rangePx: 80,
  streakMin: 4,
  streakGapMs: 1500,
  shoveChance: 0.35,
  shovePx: 48,
  shoveMs: 150,
  shoveLockMs: 300,
} as const;

/**
 * Tolerância do gancho ascendente (AD-011): um `J` até este tempo (ms, inclusive) depois de um pulo que saiu do chão
 * com `W` cancela o pulo e vira `ganchoAscendente`.
 */
export const UPPERCUT_JUMP_CANCEL_MS = 100;

/** Meia-lua (SPC-01). */
export const MOTION = { windowMs: 300 } as const;
