import { ECONOMY, PICKUP, PLAYER_HEALTH, PLAYER_MOVE, SHOP } from '../data/tuning';
import { SHOP_CATALOG, type ModifierId, type ShopEntry } from '../data/shop';

export type ModifierLevels = Record<ModifierId, number>;

const MODIFIER_IDS: readonly ModifierId[] = ['vida', 'forca', 'agilidade', 'ima', 'sorte'];

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

/** Nível máximo de cada modificador, lido do catálogo (MOD-03). */
function maxLevelsFrom(catalog: readonly ShopEntry[]): Record<ModifierId, number> {
  const out = {} as Record<ModifierId, number>;
  for (const id of MODIFIER_IDS) {
    const found = catalog.find((e) => e.id === id);
    out[id] = found ? found.maxLevel : 0;
  }
  return out;
}

/**
 * Níveis de modificador com teto (MOD-01..03) e os valores derivados que `Player`/`Pickups`/`Loot` leem a cada
 * uso (MOD-04..09): sem cache aqui, então comprar muda o valor já no próximo uso e `reset` zera tudo (MOD-01,
 * MOD-10).
 */
export class Modifiers {
  private readonly maxLevels: Record<ModifierId, number>;
  private readonly _levels: ModifierLevels = { vida: 0, forca: 0, agilidade: 0, ima: 0, sorte: 0 };

  constructor(catalog: readonly ShopEntry[] = SHOP_CATALOG) {
    this.maxLevels = maxLevelsFrom(catalog);
  }

  level(id: ModifierId): number {
    return this._levels[id];
  }

  get levels(): ModifierLevels {
    return { ...this._levels };
  }

  canLevel(id: ModifierId): boolean {
    return this._levels[id] < this.maxLevels[id];
  }

  /** Sobe um nível (MOD-02); no teto não muda nada e devolve `false`. */
  apply(id: ModifierId): boolean {
    if (!this.canLevel(id)) return false;
    this._levels[id]++;
    return true;
  }

  /** Custo do próximo nível de `entry`, pelo nível atual (MOD-09); consumíveis não têm nível, usam 0. */
  cost(entry: ShopEntry): number {
    const level = entry.kind === 'modifier' ? this._levels[entry.id as ModifierId] : 0;
    return entry.cost.base + entry.cost.step * level;
  }

  /** Zera todos os níveis (MOD-01, MOD-10). */
  reset(): void {
    for (const id of MODIFIER_IDS) this._levels[id] = 0;
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
