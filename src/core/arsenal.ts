import {
  ARSENAL,
  ARSENAL_TUNING as T,
  type ArsenalId,
  type RelicId,
  type ToolItemId,
  type WeaponId,
} from '../data/arsenal';
import { TOOL_DEFS } from '../data/props';
import type { PropDef } from './props';

/** Chave do `PropDef` de cada arma vinculada; sem o prefixo das ferramentas largadas, não entra no sumiço por tempo. */
const WEAPON_KEYS: Record<WeaponId, string> = { bastao: 'boundClub', lamina: 'boundKnife' };
/** Folha de arte própria de cada arma vinculada (`art/hd/weapons`): o bastão e a lâmina não usam o sprite da ferramenta. */
const WEAPON_TEXTURES: Record<WeaponId, string> = { bastao: 'bound-staff', lamina: 'bound-blade' };

/** Estado do arsenal na run (ARS-01): uma relíquia, uma arma vinculada e, no máximo, uma ferramenta a entregar. */
export class Arsenal {
  relic: { id: RelicId; level: number } | null = null;
  weapon: { id: WeaponId; level: number } | null = null;
  pendingTool: ToolItemId | null = null;

  /** Nível da relíquia ou da arma `id`; 0 se não é a equipada (ferramenta não tem nível). */
  levelOf(id: ArsenalId): number {
    if (this.relic?.id === id) return this.relic.level;
    if (this.weapon?.id === id) return this.weapon.level;
    return 0;
  }

  /** ARS-02: equipa (nível 1) ou sobe um nível da relíquia/arma; ferramenta fica pendente para a próxima rodada. */
  buy(id: ArsenalId): void {
    const { kind } = ARSENAL[id];
    if (kind === 'tool') {
      this.pendingTool = id as ToolItemId;
      return;
    }
    const level = Math.min(this.levelOf(id) + 1, T.maxLevel);
    if (kind === 'relic') this.relic = { id: id as RelicId, level };
    else {
      this.weapon = { id: id as WeaponId, level };
      // A arma vinculada ocupa a mão: uma ferramenta comprada e ainda não entregue perde o lugar.
      this.pendingTool = null;
    }
  }

  takePendingTool(): ToolItemId | null {
    const tool = this.pendingTool;
    this.pendingTool = null;
    return tool;
  }

  reset(): void {
    this.relic = null;
    this.weapon = null;
    this.pendingTool = null;
  }
}

/**
 * ARS-03: a carta `id` pode aparecer na loja da rodada `round`? Relíquia e arma: a primeira compra de qualquer uma
 * enquanto o slot está vazio; depois, só o próximo nível da equipada. Ferramenta: só de mãos livres (sem arma
 * vinculada e sem outra ferramenta já comprada).
 */
export function arsenalEligible(id: ArsenalId, arsenal: Arsenal, round: number): boolean {
  const { kind } = ARSENAL[id];
  if (kind === 'tool') return arsenal.weapon === null && arsenal.pendingTool === null && round >= T.minRound[0];
  const slot = kind === 'relic' ? arsenal.relic : arsenal.weapon;
  if (slot !== null && slot.id !== id) return false;
  const level = slot?.level ?? 0;
  return level < T.maxLevel && round >= T.minRound[level];
}

/** ARS-04: custo da carta pelo nível atual; ferramenta tem preço fixo. */
export function arsenalCost(id: ArsenalId, arsenal: Arsenal): number {
  const { kind } = ARSENAL[id];
  if (kind === 'tool') return T.toolCost;
  const cost = kind === 'relic' ? T.relicCost : T.weaponCost;
  return cost.base + cost.step * arsenal.levelOf(id);
}

/** ARS-05: multiplicador de dano de um golpe corpo a corpo pela relíquia equipada. */
export function relicStrikeMul(arsenal: Arsenal, light: boolean): number {
  const relic = arsenal.relic;
  if (relic?.id === 'manoplas') return 1 + T.manoplasPerLevel * relic.level;
  if (relic?.id === 'faixas' && light) return 1 + T.faixasPerLevel * relic.level;
  return 1;
}

/** ARS-06: multiplicador de dano das técnicas pela relíquia equipada. */
export function relicTechMul(arsenal: Arsenal): number {
  return arsenal.relic?.id === 'rosario' ? 1 + T.rosarioPerLevel * arsenal.relic.level : 1;
}

/** ARS-07: o objeto da arma vinculada no nível `level`: peso e pegada da ferramenta base, arte própria, dano do nível, sem quebrar. */
export function weaponDef(id: WeaponId, level: number): PropDef {
  const base = TOOL_DEFS[ARSENAL[id].tool!];
  return {
    ...base,
    key: WEAPON_KEYS[id],
    texture: WEAPON_TEXTURES[id],
    damage: Math.round(base.damage * T.weaponFactor[level - 1]),
    durability: 1,
    unbreakable: true,
  };
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** ARS-08: texto da carta: o efeito no nível que a compra dá. */
export function arsenalPreview(id: ArsenalId, arsenal: Arsenal): string {
  const next = arsenal.levelOf(id) + 1;
  switch (id) {
    case 'manoplas':
      return `todo golpe +${pct(T.manoplasPerLevel * next)}`;
    case 'faixas':
      return `golpe leve +${pct(T.faixasPerLevel * next)}`;
    case 'rosario':
      return `técnicas +${pct(T.rosarioPerLevel * next)}`;
    case 'bastao':
    case 'lamina':
      return `não quebra · dano ${weaponDef(id, next).damage}`;
    default:
      return `na próxima rodada · ${TOOL_DEFS[ARSENAL[id].tool!].durability} usos`;
  }
}
