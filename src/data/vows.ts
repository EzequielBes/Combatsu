/**
 * Votos Vinculativos (VOW-10..17, AD-024): o *shibari* de Jujutsu Kaisen. Cada voto troca uma fraqueza por poder e
 * vale até o fim da run. Os números moram aqui para o balanceamento; a regra está em `core/vows.ts`. Sem `phaser`.
 */
export type VowId =
  | 'corpoDeVidro'
  | 'semGuarda'
  | 'pactoDoFeiticeiro'
  | 'fluxoSelado'
  | 'curaProibida'
  | 'ganancia'
  | 'furia'
  | 'peleDePedra';

export interface VowDef {
  id: VowId;
  name: string;
  /** O que o voto dá (texto da carta, em verde). */
  boon: string;
  /** O que o voto cobra (texto da carta, em vermelho). */
  cost: string;
}

/** Números dos votos, num lugar só. */
export const VOW = {
  /** Votos oferecidos no painel depois de cada chefe (VOW-01). */
  offers: 3,
  corpoDeVidro: { maxHpMul: 0.6, damageMul: 1.35 },
  semGuarda: { heavyMul: 1.6 },
  pactoDoFeiticeiro: { meleeMul: 0.7, techDamageMul: 1.5 },
  fluxoSelado: { techCostMul: 0.6 },
  curaProibida: { rctHealMul: 2, rctBelow: 0.3 },
  ganancia: { fragmentMul: 1.6, damageTakenMul: 1.25 },
  furia: { perKill: 0.03, max: 0.45 },
  peleDePedra: { damageTakenMul: 0.7, damageMul: 0.8 },
} as const;

export const VOWS: Record<VowId, VowDef> = {
  corpoDeVidro: { id: 'corpoDeVidro', name: 'Corpo de vidro', boon: 'todo dano +35%', cost: 'vida máxima -40%' },
  semGuarda: { id: 'semGuarda', name: 'Sem guarda', boon: 'golpe forte +60%', cost: 'não pode bloquear' },
  pactoDoFeiticeiro: {
    id: 'pactoDoFeiticeiro',
    name: 'Pacto do feiticeiro',
    boon: 'técnicas +50% de dano',
    cost: 'golpes -30% de dano',
  },
  fluxoSelado: { id: 'fluxoSelado', name: 'Fluxo selado', boon: 'técnicas custam -40%', cost: 'a Reversa não cura' },
  curaProibida: {
    id: 'curaProibida',
    name: 'Cura proibida',
    boon: 'a Reversa cura o dobro',
    cost: 'só abaixo de 30% da vida',
  },
  ganancia: { id: 'ganancia', name: 'Ganância', boon: 'fragmentos +60%', cost: 'dano sofrido +25%' },
  furia: { id: 'furia', name: 'Fúria', boon: '3% de dano por abate na rodada', cost: 'sem regeneração' },
  peleDePedra: { id: 'peleDePedra', name: 'Pele de pedra', boon: 'dano sofrido -30%', cost: 'todo dano -20%' },
};

export const VOW_IDS = Object.keys(VOWS) as VowId[];
