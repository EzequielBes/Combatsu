import { TECHNIQUES, type TechId } from '../data/techniques';
import { AxisBuild } from './axisBuild';
import { levelFactor, resolveTechStats, scaleDamage, type TechStats } from './techStats';

export type TechLevel = 1 | 2 | 3;

interface LoadoutSlot {
  id: TechId;
  level: TechLevel;
}

/** Slot como os leitores veem: o Vermelho com o nível derivado dos eixos (1 a 6, VRM-02); as outras, 1 a 3. */
export interface LoadoutSlotView {
  id: TechId;
  level: number;
}

/**
 * Loadout de técnicas do player (TEC-01..06, 13, 14): 2 slots, cada um vazio ou com uma técnica em nível 1–3;
 * dono também da recarga por slot (CAST-04). Sem `phaser` aqui.
 */
/**
 * `?debug&tech=` (TEC-02, EVO): lista `id` ou `id:nível` separada por vírgula; ids desconhecidos saem, nível fora de
 * 1..3 vira 1. Puro, para o teste.
 */
export function parseDebugTech(raw: string): { id: TechId; level: TechLevel }[] {
  return raw.split(',').flatMap((part) => {
    const [id, lv] = part.split(':');
    if (!(id in TECHNIQUES)) return [];
    const n = Number(lv);
    const level = (lv !== undefined && Number.isInteger(n) && n >= 1 && n <= 3 ? n : 1) as TechLevel;
    return [{ id: id as TechId, level }];
  });
}

export class Loadout {
  private slots: [LoadoutSlot | null, LoadoutSlot | null] = [null, null];
  private cooldowns: [number, number] = [0, 0];
  /** VRM-02: pontos de eixo do Vermelho (e do Corpo, no passo 3); o nível do Vermelho sai daqui. */
  readonly axes = new AxisBuild();
  /** VRM-20: último slot que conjurou (gravado em `startCooldown`); `null` antes da 1ª conjuração. */
  lastSlot: 0 | 1 | null = null;
  /** ARS-06: multiplicador de dano de toda técnica (a relíquia Rosário); 1 sem ela. */
  damageMul = 1;
  /** VOW-10/12/16/17: multiplicador de dano de técnica dos votos, por cima da relíquia; 1 sem voto. */
  vowDamageMul = 1;
  /** VOW-13: multiplicador do custo de energia (Fluxo selado); 1 sem voto. */
  costMul = 1;

  get slotsView(): readonly [LoadoutSlotView | null, LoadoutSlotView | null] {
    return [this.view(this.slots[0]), this.view(this.slots[1])];
  }

  /** Nível atual de `id`, 0 se não equipada (base para TEC-06, TEC-14, TSH-16); o Vermelho, pelos eixos (VRM-02). */
  levelOf(id: TechId): number {
    return this.view(this.slotOf(id))?.level ?? 0;
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
   * recusa (TEC-04, TEC-13) se `id` já estiver no outro slot. O Vermelho grava sempre Nv 1 no slot: o nível dele é o
   * dos eixos. Ponte da T14 até a T23 (`axes=` no debug): o `level` do Vermelho vira `level − 1` pontos no eixo-foco,
   * para o `tech=vermelho:3` do smoke `evolution` seguir com o Vermelho no Nv 3.
   */
  equip(slot: 0 | 1, id: TechId, level: TechLevel = 1): boolean {
    if (level < 1 || level > 3) return false;
    const other = slot === 0 ? 1 : 0;
    if (this.slots[other]?.id === id) return false;
    if (this.slots[slot]?.id === 'vermelho') this.axes.resetItem('vermelho');
    this.slots[slot] = { id, level: id === 'vermelho' ? 1 : level };
    if (id === 'vermelho') for (let i = 1; i < level; i++) this.upgrade(id);
    return true;
  }

  /**
   * Esvazia `slot` (EVO-03: a segunda técnica da receita sai na fusão), sem recarga pendente. O Vermelho que sai leva
   * junto os pontos, o ramo e o Despertar (edge case da evolução).
   */
  clear(slot: 0 | 1): void {
    if (this.slots[slot]?.id === 'vermelho') this.axes.resetItem('vermelho');
    this.slots[slot] = null;
    this.cooldowns[slot] = 0;
  }

  /**
   * Sobe 1 nível a técnica `id` já equipada (TSH-07); recusa e não muda nada no nível 3 (TEC-05) ou se não equipada.
   * No Vermelho é 1 ponto no eixo-foco (VRM-19: maestria e prêmio do chefe), e nada muda com 5 pontos.
   */
  upgrade(id: TechId): boolean {
    const current = this.slotOf(id);
    if (!current) return false;
    if (id === 'vermelho') {
      const axis = this.axes.focusAxis('vermelho');
      return axis !== null && this.axes.add('vermelho', axis).ok;
    }
    if (current.level >= 3) return false;
    current.level = (current.level + 1) as TechLevel;
    return true;
  }

  /**
   * O `TechStats` de `id` no nível atual com os multiplicadores deste `Loadout` (TST-01); não equipada trata como
   * nível 1 (TEC-14). O Vermelho sai dos pontos de `axes` e ignora o nível do slot (VRM-03). Resolvido a cada
   * chamada: os multiplicadores mudam por quadro no `StatsDirector`.
   */
  stats(id: TechId): TechStats {
    return resolveTechStats({
      id,
      level: this.slotOf(id)?.level ?? 1,
      axes: this.axes,
      damageMul: this.damageMul,
      vowDamageMul: this.vowDamageMul,
      costMul: this.costMul,
    });
  }

  /** Custo de energia para conjurar `id` no nível atual, já com o `costMul` (TEC-14, VOW-13). */
  cost(id: TechId): number {
    return this.stats(id).cost;
  }

  /**
   * Dano de `base` no nível do stat de `id`, com os multiplicadores (TEC-06: arredonda meio para cima); o Vermelho
   * não leva o `LEVEL_FACTOR` (VRM-03.5).
   */
  damage(id: TechId, base: number): number {
    return scaleDamage(base, levelFactor(this.stats(id)), this.damageMul, this.vowDamageMul);
  }

  /** Recarga restante do slot, em ms (CAST-04, CAST-06). */
  cooldownOf(slot: 0 | 1): number {
    return this.cooldowns[slot];
  }

  /** Arma a recarga do slot com o cooldown completo da técnica (CAST-04) e o marca como o último usado (VRM-20). */
  startCooldown(slot: 0 | 1): void {
    const s = this.slots[slot];
    if (!s) return;
    this.cooldowns[slot] = this.stats(s.id).cooldownMs;
    this.lastSlot = slot;
  }

  /** VRM-07: corta `ms` da recarga que resta no slot (o reembolso do abate), sem passar de 0. */
  refundCooldown(slot: 0 | 1, ms: number): void {
    this.cooldowns[slot] = Math.max(0, this.cooldowns[slot] - ms);
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

  /** Nova run ou `?tech=` (TEC-01): os dois slots voltam a vazios, sem recarga pendente nem ponto de eixo. */
  reset(): void {
    this.slots = [null, null];
    this.cooldowns = [0, 0];
    this.axes.reset();
    this.lastSlot = null;
    this.damageMul = 1;
    this.vowDamageMul = 1;
    this.costMul = 1;
  }

  private slotOf(id: TechId): LoadoutSlot | null {
    return this.slots[0]?.id === id ? this.slots[0] : this.slots[1]?.id === id ? this.slots[1] : null;
  }

  private view(slot: LoadoutSlot | null): LoadoutSlotView | null {
    if (!slot) return null;
    return { id: slot.id, level: slot.id === 'vermelho' ? this.axes.level('vermelho') : slot.level };
  }
}
