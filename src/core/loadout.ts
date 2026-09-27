import { LEVEL_FACTOR, TECHNIQUES, type TechId } from '../data/techniques';

export type TechLevel = 1 | 2 | 3;

interface LoadoutSlot {
  id: TechId;
  level: TechLevel;
}

/**
 * Loadout de técnicas do player (TEC-01..06, 13, 14): 2 slots, cada um vazio ou com uma técnica em nível 1–3;
 * dono também da recarga por slot (CAST-04). Sem `phaser` aqui.
 */
export class Loadout {
  private slots: [LoadoutSlot | null, LoadoutSlot | null] = [null, null];
  private cooldowns: [number, number] = [0, 0];

  get slotsView(): readonly [LoadoutSlot | null, LoadoutSlot | null] {
    return [this.slots[0], this.slots[1]];
  }

  /** Nível atual de `id`, 0 se não equipada (base para TEC-06, TEC-14, TSH-16). */
  levelOf(id: TechId): number {
    const found = this.slots[0]?.id === id ? this.slots[0] : this.slots[1]?.id === id ? this.slots[1] : null;
    return found ? found.level : 0;
  }

  /** Primeiro slot vazio (slot 1 antes do slot 2, TSH-06), `null` se os dois estão ocupados. */
  firstEmpty(): 0 | 1 | null {
    if (!this.slots[0]) return 0;
    if (!this.slots[1]) return 1;
    return null;
  }

  /** `true` se algum slot tem técnica (TSH-09: energia/fluxo só entram na loja com isso). */
  hasAny(): boolean {
    return this.slots[0] !== null || this.slots[1] !== null;
  }

  /**
   * Equipa `id` em `slot` no nível `level` (TEC-03). Recusa e não muda nada (TEC-05) se `level` sair de 1–3, e
   * recusa (TEC-04, TEC-13) se `id` já estiver no outro slot.
   */
  equip(slot: 0 | 1, id: TechId, level: TechLevel = 1): boolean {
    if (level < 1 || level > 3) return false;
    const other = slot === 0 ? 1 : 0;
    if (this.slots[other]?.id === id) return false;
    this.slots[slot] = { id, level };
    return true;
  }

  /** Sobe 1 nível a técnica `id` já equipada (TSH-07); recusa e não muda nada no nível 3 (TEC-05) ou se não equipada. */
  upgrade(id: TechId): boolean {
    const slot = this.slots[0]?.id === id ? 0 : this.slots[1]?.id === id ? 1 : null;
    if (slot === null) return false;
    const current = this.slots[slot]!;
    if (current.level >= 3) return false;
    this.slots[slot] = { id, level: (current.level + 1) as TechLevel };
    return true;
  }

  /** Custo de energia para conjurar `id` no nível atual (0 se não equipada trata como nível 1, TEC-14). */
  cost(id: TechId): number {
    const level = this.levelOf(id) || 1;
    return TECHNIQUES[id].cost - 5 * (level - 1);
  }

  /** Dano de `base` escalado pelo nível atual de `id` (TEC-06: arredonda meio para cima). */
  damage(id: TechId, base: number): number {
    const level = this.levelOf(id) || 1;
    return Math.round(base * LEVEL_FACTOR[level - 1]);
  }

  /** Recarga restante do slot, em ms (CAST-04, CAST-06). */
  cooldownOf(slot: 0 | 1): number {
    return this.cooldowns[slot];
  }

  /** Arma a recarga do slot com o cooldown completo da técnica equipada (CAST-04). */
  startCooldown(slot: 0 | 1): void {
    const s = this.slots[slot];
    if (!s) return;
    this.cooldowns[slot] = TECHNIQUES[s.id].cooldownMs;
  }

  /** Zera a recarga do slot na hora (FXL-09: o laboratório de efeitos nunca deixa recarga pendente). */
  clearCooldown(slot: 0 | 1): void {
    this.cooldowns[slot] = 0;
  }

  /** Some com o tempo, sem sair de 0. */
  tick(dtMs: number): void {
    this.cooldowns[0] = Math.max(0, this.cooldowns[0] - dtMs);
    this.cooldowns[1] = Math.max(0, this.cooldowns[1] - dtMs);
  }

  /** Nova run ou `?tech=` (TEC-01): os dois slots voltam a vazios, sem recarga pendente. */
  reset(): void {
    this.slots = [null, null];
    this.cooldowns = [0, 0];
  }
}
