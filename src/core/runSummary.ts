/**
 * Resumo da run: dano por fonte acumulado durante a run (END-08, DMG-06, DMG-07). Puro: quem soma é o caminho do
 * golpe e o do acerto de técnica, quem desenha é o painel de fim de run.
 */
import { TECHNIQUES, type TechId } from '../data/techniques';

/** De onde veio o dano: golpe corpo a corpo, uma técnica (o Kokusen conta como `divergente`) ou objeto. */
export type DamageSource = 'golpe' | TechId | 'objeto';

/** Ordem fixa das fontes: golpe, técnicas na ordem de `TechId`, objeto. Também desempata as linhas. */
export const DAMAGE_SOURCES: readonly DamageSource[] = ['golpe', ...(Object.keys(TECHNIQUES) as TechId[]), 'objeto'];

/** Uma linha do dano por fonte, já arredondada para o painel. */
export interface DamageRow {
  source: DamageSource;
  label: string;
  /** Dano inteiro arredondado. */
  damage: number;
  /** Fatia arredondada do total da run, em porcentagem inteira. */
  pct: number;
}

/** Rótulo de cada fonte: `Golpe`, `Objeto` ou o nome da técnica. */
export function sourceLabel(source: DamageSource): string {
  if (source === 'golpe') return 'Golpe';
  if (source === 'objeto') return 'Objeto';
  return TECHNIQUES[source].name;
}

function zeroTotals(): Record<DamageSource, number> {
  const totals = {} as Record<DamageSource, number>;
  for (const source of DAMAGE_SOURCES) totals[source] = 0;
  return totals;
}

/** Registro do dano da run por fonte. */
export class DamageLedger {
  private sums = zeroTotals();

  /** Soma o dano de um acerto aceito; valor não finito ou não positivo não conta. */
  add(source: DamageSource, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.sums[source] += amount;
  }

  /** DMG-06: run nova zera todas as fontes. */
  reset(): void {
    this.sums = zeroTotals();
  }

  /** Cópia dos totais brutos (sem arredondar) de cada fonte. */
  totals(): Record<DamageSource, number> {
    return { ...this.sums };
  }

  /**
   * END-08: fontes com dano acima de 0, do maior ao menor (empate pela ordem de `DAMAGE_SOURCES`), com dano e
   * porcentagem arredondados por `Math.round`.
   */
  rows(): DamageRow[] {
    const total = DAMAGE_SOURCES.reduce((sum, source) => sum + this.sums[source], 0);
    if (total <= 0) return [];
    return DAMAGE_SOURCES.map((source, order) => ({ source, order, raw: this.sums[source] }))
      .filter((entry) => entry.raw > 0)
      .sort((a, b) => b.raw - a.raw || a.order - b.order)
      .map(({ source, raw }) => ({
        source,
        label: sourceLabel(source),
        damage: Math.round(raw),
        pct: Math.round((raw / total) * 100),
      }));
  }
}
