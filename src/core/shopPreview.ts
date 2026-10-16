import { magnetRangeAtLevel, maxHpAtLevel, healChanceAtLevel, runSpeedAtLevel, type Modifiers } from './modifiers';
import { cursedEnergyMaxAtLevel, cursedEnergyRegenAtLevel } from './energy';
import type { Loadout } from './loadout';
import { AxisBuild } from './axisBuild';
import { axisAt } from './axisRule';
import { resolveTechStats } from './techStats';
import { arsenalPreview, type Arsenal } from './arsenal';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import { PERKS, type PerkId } from '../data/perks';
import { SHOP } from '../data/tuning';
import { TECH_RULE } from '../data/techRule';
import { AXIS_NAMES, BODY_AXES, type AxisId, type AxisItem } from '../data/techAxes';
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
  if (entry.kind === 'body') return ''; // a prévia da carta de eixo é a `axisPreview` (CRD-05)
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

/** Número com vírgula decimal e sem casa à toa: 1 → "1", 1.1 → "1,1". */
const commaNumber = (n: number): string => String(n).replace('.', ',');
const percent = (fraction: number): number => Math.round(fraction * 100);

/** Cópia dos pontos de `item` com `bump` a mais em `axis`, para resolver o valor do ponto seguinte. */
function pointsWith(axes: AxisBuild, item: AxisItem, axis: AxisId | null): AxisBuild {
  const copy = new AxisBuild();
  for (const [name, points] of Object.entries(axes.axesOf(item))) {
    for (let i = 0; i < (points as number); i++) copy.add(item, name as never);
  }
  if (axis !== null) copy.add(item, axis as never);
  return copy;
}

/** Valor que o jogo usa para `axis` com os pontos de `build` (CRD-05): o do `resolveTechStats` ou o do `bodyStrike`. */
function axisValue(item: AxisItem, axis: AxisId, build: AxisBuild, loadout: Loadout): string {
  if (item === 'vermelho') {
    const stats = resolveTechStats({
      id: 'vermelho',
      level: 1,
      axes: build,
      damageMul: loadout.damageMul,
      vowDamageMul: loadout.vowDamageMul,
      costMul: loadout.costMul,
    });
    const red = stats.red!;
    const byAxis: Record<string, number> = {
      potencia: stats.damage.hit,
      escala: red.radius,
      conjuracao: stats.signMs + stats.chargeMs,
      eficiencia: stats.cost,
      recarga: stats.cooldownMs,
      perfuracao: red.shard,
    };
    return String(byAxis[axis]);
  }
  const points = build.axesOf('corpo');
  switch (axis) {
    case 'impacto':
      return `×${commaNumber(axisAt(BODY_AXES.impacto.impactMul, points.impacto))}`;
    case 'peso':
      return `+${percent(axisAt(BODY_AXES.peso.forceMul, points.peso) - 1)}%`;
    case 'ritmo':
      return `-${percent(1 - axisAt(BODY_AXES.ritmo.recoveryMul, points.ritmo))}%`;
    case 'alcance':
      return `+${axisAt(BODY_AXES.alcance.reachPx, points.alcance)}`;
    case 'fluxo':
      return `+${axisAt(BODY_AXES.fluxo.energyBonus, points.fluxo)}`;
    default:
      return `+${percent(axisAt(BODY_AXES.furia.furyCap, points.furia))}%`;
  }
}

/**
 * Prévia da carta de eixo do Vermelho ou do Corpo (CRD-05): uma linha por eixo com o nome, o valor resolvido de
 * agora e o do próximo ponto, a escolhida com `›` e a outra com um espaço, sem espaço em volta da seta para caber
 * em 20 caracteres; uma linha `+ ramo` (a compra leva ao Nv 2) ou `+ Despertar` (leva ao Nv 5) ao fim.
 */
export function axisPreview(item: AxisItem, axes: readonly AxisId[], selected: number, loadout: Loadout): string {
  const now = pointsWith(loadout.axes, item, null);
  const lines = axes.map((axis, i) => {
    const next = pointsWith(loadout.axes, item, axis);
    return `${i === selected ? '›' : ' '}${AXIS_NAMES[axis]} ${axisValue(item, axis, now, loadout)}→${axisValue(item, axis, next, loadout)}`;
  });
  const levelAfter = loadout.axes.level(item) + 1;
  if (levelAfter === TECH_RULE.branchLevel) lines.push('+ ramo');
  if (levelAfter === TECH_RULE.awakenLevel) lines.push('+ Despertar');
  return lines.join('\n');
}
