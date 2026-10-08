/**
 * Builds e passivas da run (BLD-01..08). A build não é escolhida: sai do que o jogador já comprou, e a loja puxa
 * as cartas da linha em que ele mais investiu. Sem `phaser` aqui.
 */
export type Build = 'lutador' | 'feiticeiro' | 'veloz';

export const BUILD_NAMES: Record<Build, string> = {
  lutador: 'Lutador',
  feiticeiro: 'Feiticeiro',
  veloz: 'Veloz',
};

export type PerkId = 'punhoPesado' | 'executor' | 'refluxo' | 'condutor' | 'passoSombrio' | 'contraAfiado';

export interface PerkDef {
  id: PerkId;
  name: string;
  build: Build;
  /** Texto da carta na loja, depois do nome da build. */
  effect: string;
}

/** Números das passivas, num lugar só para ajustar o balanceamento. */
export const PERK = {
  /** Rodada mínima para uma passiva aparecer na loja: a build só existe depois das primeiras compras. */
  minRound: 2,
  cost: 18,
  /** Punho pesado: multiplicador de dano dos golpes fortes. */
  heavyMul: 1.25,
  /** Executor: vida recuperada a cada finalizador. */
  finisherHeal: 20,
  /** Refluxo: energia devolvida por parry ou Deflexão. */
  parryEnergy: 12,
  /** Condutor: energia a mais por golpe corpo a corpo que acerta. */
  meleeEnergy: 2,
  /** Passo sombrio: multiplicador do primeiro golpe depois de uma esquiva perfeita. */
  shadowMul: 1.5,
  /** Contra afiado: multiplicador de dano do Contra. */
  counterMul: 1.4,
} as const;

export const PERKS: Record<PerkId, PerkDef> = {
  punhoPesado: { id: 'punhoPesado', name: 'Punho pesado', build: 'lutador', effect: 'golpe forte +25% de dano' },
  executor: { id: 'executor', name: 'Executor', build: 'lutador', effect: 'finalizador cura 20 de vida' },
  refluxo: { id: 'refluxo', name: 'Refluxo', build: 'feiticeiro', effect: 'parry devolve 12 de energia' },
  condutor: { id: 'condutor', name: 'Condutor', build: 'feiticeiro', effect: '+2 de energia por golpe' },
  passoSombrio: {
    id: 'passoSombrio',
    name: 'Passo sombrio',
    build: 'veloz',
    effect: 'pós-esquiva perfeita: +50%',
  },
  contraAfiado: { id: 'contraAfiado', name: 'Contra afiado', build: 'veloz', effect: 'Contra +40% de dano' },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

/** Peso de sorteio de uma carta da build do jogador: `1 + perPoint × pontos`, com os pontos limitados a `maxPoints`. */
export const BUILD_WEIGHT = { perPoint: 0.5, maxPoints: 4 } as const;
/** Pontos mínimos numa linha para ela contar como a build do jogador. */
export const BUILD_MIN_POINTS = 2;
/** Pontos de afinidade que cada passiva comprada vale na própria build. */
export const PERK_POINTS = 2;
