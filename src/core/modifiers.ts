import { ECONOMY, PICKUP, PLAYER_HEALTH, PLAYER_MOVE, SHOP } from '../data/tuning';
import { SHOP_CATALOG, type CoreModifierId, type EnergyModifierId, type ModifierId, type ShopEntry } from '../data/shop';

export type ModifierLevels = Record<CoreModifierId, number>;

const CORE_MODIFIER_IDS: readonly CoreModifierId[] = ['vida', 'forca', 'agilidade', 'ima', 'sorte'];
const ENERGY_MODIFIER_IDS: readonly EnergyModifierId[] = ['energia', 'fluxo'];
const ALL_MODIFIER_IDS: readonly ModifierId[] = [...CORE_MODIFIER_IDS, ...ENERGY_MODIFIER_IDS];

/** Vida máxima do player no nível `n` de `vida` (MOD-04). */
export const maxHpAtLevel = (n: number): number => PLAYER_HEALTH.maxHp + SHOP.vidaPerLevel * n;

/** Dano de um golpe com `forca` no nível `n`, arredondado com meio para cima (MOD-05). */
export const meleeDamageAtLevel = (base: number, n: number): number => Math.round(base * (1 + SHOP.forcaPerLevel * n));

/** Velocidade de corrida com `agilidade` no nível `n` (MOD-06). */
export const runSpeedAtLevel = (n: number): number => PLAYER_MOVE.runSpeed * (1 + SHOP.agilidadePerLevel * n);

/** Raio do ímã com `ima` no nível `n` (MOD-07). */
export const magnetRangeAtLevel = (n: number): number => PICKUP.magnetRange * (1 + SHOP.imaPerLevel * n);

/** Chance de cura por abate com `sorte` no nível `n` (MOD-08). */
export const healChanceAtLevel = (n: number): number => ECONOMY.healChance + SHOP.sortePerLevel * n;

/** Nível máximo de cada modificador, lido do catálogo (MOD-03); ids ausentes do catálogo passado ficam em 0. */
function maxLevelsFrom(catalog: readonly ShopEntry[]): Record<ModifierId, number> {
  const out = {} as Record<ModifierId, number>;
  for (const id of ALL_MODIFIER_IDS) {
    const found = catalog.find((e) => e.id === id);
    out[id] = found ? found.maxLevel : 0;
  }
  return out;
}

/**
 * Níveis de modificador com teto (MOD-01..03) e os valores derivados que `Player`/`Pickups`/`Loot` leem a cada
 * uso (MOD-04..09): sem cache aqui, então comprar muda o valor já no próximo uso e `reset` zera tudo (MOD-01,
 * MOD-10).
 *
 * `energia`/`fluxo` (TSH-08, TSH-15) ficam num mapa à parte de `_levels`: `.levels` e `reset()` da F4 só falam
 * dos 5 modificadores originais (`tests/core/modifiers.test.ts` fixa esse formato por igualdade exata), mas
 * `level`/`canLevel`/`apply`/`cost` atendem os dois grupos por um único `ModifierId`.
 */
export class Modifiers {
  private readonly maxLevels: Record<ModifierId, number>;
  private readonly _levels: ModifierLevels = { vida: 0, forca: 0, agilidade: 0, ima: 0, sorte: 0 };
  private readonly _energyLevels: Record<EnergyModifierId, number> = { energia: 0, fluxo: 0 };

  constructor(catalog: readonly ShopEntry[] = SHOP_CATALOG) {
    this.maxLevels = maxLevelsFrom(catalog);
  }

  level(id: ModifierId): number {
    return id === 'energia' || id === 'fluxo' ? this._energyLevels[id] : this._levels[id];
  }

  get levels(): ModifierLevels {
    return { ...this._levels };
  }

  canLevel(id: ModifierId): boolean {
    return this.level(id) < this.maxLevels[id];
  }

  /** Sobe um nível (MOD-02); no teto não muda nada e devolve `false`. */
  apply(id: ModifierId): boolean {
    if (!this.canLevel(id)) return false;
    if (id === 'energia' || id === 'fluxo') this._energyLevels[id]++;
    else this._levels[id]++;
    return true;
  }

  /** Custo do próximo nível de `entry`, pelo nível atual (MOD-09, TSH-08, TSH-15); consumíveis usam 0. */
  cost(entry: ShopEntry): number {
    const level = entry.kind === 'modifier' ? this.level(entry.id as ModifierId) : 0;
    return entry.cost.base + entry.cost.step * level;
  }

  /** Zera todos os níveis (MOD-01, MOD-10), incluindo `energia`/`fluxo` (nova run). */
  reset(): void {
    for (const id of CORE_MODIFIER_IDS) this._levels[id] = 0;
    for (const id of ENERGY_MODIFIER_IDS) this._energyLevels[id] = 0;
  }

  get maxHp(): number {
    return maxHpAtLevel(this._levels.vida);
  }

  meleeDamage(base: number): number {
    return meleeDamageAtLevel(base, this._levels.forca);
  }

  get runSpeed(): number {
    return runSpeedAtLevel(this._levels.agilidade);
  }

  get magnetRange(): number {
    return magnetRangeAtLevel(this._levels.ima);
  }

  get healChance(): number {
    return healChanceAtLevel(this._levels.sorte);
  }
}
