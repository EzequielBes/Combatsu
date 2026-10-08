import type { Build } from './perks';

/**
 * Arsenal da run (ARS-01..12), três tipos de carta na loja:
 * - relíquia: arma amaldiçoada vestida, não ocupa a mão e mantém o combo; um slot, 3 níveis;
 * - arma vinculada: fica na mão, não quebra e volta a cada área; um slot, 3 níveis;
 * - ferramenta: faca ou porrete comuns, entregues na mão na rodada seguinte; quebram como as largadas.
 * Sem `phaser` aqui.
 */
export type RelicId = 'manoplas' | 'faixas' | 'rosario';
export type WeaponId = 'bastao' | 'lamina';
export type ToolItemId = 'faca' | 'porrete';
export type ArsenalId = RelicId | WeaponId | ToolItemId;
export type ArsenalKind = 'relic' | 'weapon' | 'tool';

export interface ArsenalDef {
  id: ArsenalId;
  kind: ArsenalKind;
  name: string;
  build: Build;
  /** Chave em `TOOL_DEFS` de onde saem sprite, peso e alcance (arma vinculada e ferramenta). */
  tool?: 'cursedKnife' | 'cursedClub';
}

export const ARSENAL: Record<ArsenalId, ArsenalDef> = {
  manoplas: { id: 'manoplas', kind: 'relic', name: 'Manoplas de ferro', build: 'lutador' },
  faixas: { id: 'faixas', kind: 'relic', name: 'Faixas de vento', build: 'veloz' },
  rosario: { id: 'rosario', kind: 'relic', name: 'Rosário amaldiçoado', build: 'feiticeiro' },
  bastao: { id: 'bastao', kind: 'weapon', name: 'Bastão selado', build: 'lutador', tool: 'cursedClub' },
  lamina: { id: 'lamina', kind: 'weapon', name: 'Lâmina vinculada', build: 'veloz', tool: 'cursedKnife' },
  faca: { id: 'faca', kind: 'tool', name: 'Faca amaldiçoada', build: 'veloz', tool: 'cursedKnife' },
  porrete: { id: 'porrete', kind: 'tool', name: 'Porrete amaldiçoado', build: 'lutador', tool: 'cursedClub' },
};

export const ARSENAL_IDS = Object.keys(ARSENAL) as ArsenalId[];

/** Números do arsenal, num lugar só para ajustar o balanceamento. */
export const ARSENAL_TUNING = {
  maxLevel: 3,
  /** Rodada mínima da primeira compra e dos níveis 2 e 3. */
  minRound: [2, 4, 6],
  relicCost: { base: 20, step: 12 },
  weaponCost: { base: 24, step: 14 },
  toolCost: 10,
  /** Manoplas: dano de todo golpe corpo a corpo, por nível. */
  manoplasPerLevel: 0.1,
  /** Faixas: dano dos golpes leves, por nível. */
  faixasPerLevel: 0.15,
  /** Rosário: dano das técnicas, por nível. */
  rosarioPerLevel: 0.1,
  /** Arma vinculada: fator de dano sobre a ferramenta base, por nível. */
  weaponFactor: [1, 1.25, 1.5],
} as const;
