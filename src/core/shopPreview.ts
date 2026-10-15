import { magnetRangeAtLevel, maxHpAtLevel, healChanceAtLevel, runSpeedAtLevel, type Modifiers } from './modifiers';
import { cursedEnergyMaxAtLevel, cursedEnergyRegenAtLevel } from './energy';
import type { Loadout } from './loadout';
import { arsenalPreview, type Arsenal } from './arsenal';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import { PERKS, type PerkId } from '../data/perks';
import { SHOP } from '../data/tuning';
import { LEVEL_FACTOR, type TechId } from '../data/techniques';
import type { ModifierId, ShopEntry } from '../data/shop';

const oneDecimalComma = (n: number): string => n.toFixed(1).replace('.', ',');

/** Fator de dano (TEC-06) com vírgula, sem casas fixas: 1 → "1,0", 1.25 → "1,25", 1.5 → "1,5" (TSH-16). */
const factorText = (k: number): string => (Number.isInteger(k) ? `${k},0` : String(k).replace('.', ','));

/** Prévia de uma técnica (TSH-12, TSH-16): o slot de destino se nova, senão os fatores de dano do nível atual e do seguinte. */
function techniquePreview(id: TechId, loadout?: Loadout): string {
  const level = loadout?.levelOf(id) ?? 0;
  if (level === 0) {
    const slot = loadout?.firstEmpty() === 0 ? 1 : 2; // TSH-12: slot 1 vazio → 1, senão → 2
    return `Nova · slot ${slot}`;
  }
  return `Dano ×${factorText(LEVEL_FACTOR[level - 1])} → ×${factorText(LEVEL_FACTOR[level])}`; // TSH-16 (level < 3 aqui)
}

/**
 * Texto "antes → depois" de uma oferta, nos formatos exatos das Assumptions (SHOP-21, TSH-12, TSH-13, TSH-16,
 * TSH-17): multiplicador com uma casa decimal para `forca`, valores arredondados para `agilidade`/`ima`,
 * porcentagem inteira para `sorte`, hp atual → curado (recortado no teto) para `cura`; técnica não equipada
 * mostra o slot de destino, equipada mostra os fatores de dano do nível atual e do seguinte.
 */
export function previewText(
  entry: ShopEntry,
  modifiers: Modifiers,
  hp: number,
  maxHp: number,
  loadout?: Loadout,
  arsenal?: Arsenal,
): string {
  if (entry.id in ARSENAL) return arsenal ? arsenalPreview(entry.id as ArsenalId, arsenal) : '';
  if (entry.id === 'cura') {
    const after = Math.min(hp + SHOP.curaHp, maxHp);
    return `Vida ${hp} → ${after}`;
  }
  if (entry.kind === 'perk') return PERKS[entry.id as PerkId].effect;
  if (entry.kind === 'evolution') return 'Funde as duas técnicas (Nv 3) numa só';
  if (entry.kind === 'technique') return techniquePreview(entry.id as TechId, loadout);
  const level = modifiers.level(entry.id as ModifierId);
  switch (entry.id as ModifierId) {
    case 'vida':
      return `Vida máx. ${maxHpAtLevel(level)} → ${maxHpAtLevel(level + 1)}`;
    case 'forca':
      return `Dano ×${oneDecimalComma(1 + SHOP.forcaPerLevel * level)} → ×${oneDecimalComma(1 + SHOP.forcaPerLevel * (level + 1))}`;
    case 'agilidade':
      return `Velocidade ${Math.round(runSpeedAtLevel(level))} → ${Math.round(runSpeedAtLevel(level + 1))}`;
    case 'ima':
      return `Ímã ${Math.round(magnetRangeAtLevel(level))} → ${Math.round(magnetRangeAtLevel(level + 1))}`;
    case 'sorte':
      return `Cura ${Math.round(healChanceAtLevel(level) * 100)}% → ${Math.round(healChanceAtLevel(level + 1) * 100)}%`;
    case 'energia':
      return `Energia máx. ${cursedEnergyMaxAtLevel(level)} → ${cursedEnergyMaxAtLevel(level + 1)}`;
    case 'fluxo':
      return `Regen ${cursedEnergyRegenAtLevel(level)}/s → ${cursedEnergyRegenAtLevel(level + 1)}/s`;
    default:
      throw new Error(`entrada sem prévia definida: ${entry.id}`);
  }
}
