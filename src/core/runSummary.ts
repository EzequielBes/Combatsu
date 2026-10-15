/**
 * Resumo da run: dano por fonte acumulado durante a run (END-08, DMG-06, DMG-07) e as linhas do painel de fim
 * (END-03..12). Puro: quem soma é o caminho do golpe e o do acerto de técnica, quem desenha é o painel de fim de run.
 */
import { ARSENAL } from '../data/arsenal';
import { PERKS } from '../data/perks';
import { TECHNIQUES, type TechId } from '../data/techniques';
import { VOWS } from '../data/vows';
import type { LeveledId, RecordBuild } from './save';

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

/** Rótulo de cada fonte: `Golpe`, `Objeto` ou o rótulo curto da técnica (sem os dois-pontos do nome completo). */
export function sourceLabel(source: DamageSource): string {
  if (source === 'golpe') return 'Golpe';
  if (source === 'objeto') return 'Objeto';
  return TECHNIQUES[source].short;
}

/** As técnicas pelo rótulo curto, no formato que `nameIn` lê. */
const TECH_SHORT: Readonly<Record<string, { name: string }>> = Object.fromEntries(
  Object.values(TECHNIQUES).map((def) => [def.id, { name: def.short }]),
);

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

/**
 * Uma linha do painel de fim. Por padrão alinha à esquerda dentro da caixa; `center` centraliza (título e instrução),
 * `indent` recua sob o cabeçalho (fontes de dano, continuação de lista), `gap` abre um bloco novo com folga antes e
 * `highlight` pinta na cor de destaque (o título e o `Recorde!`).
 */
export interface SummaryLine {
  text: string;
  highlight?: boolean;
  center?: boolean;
  indent?: boolean;
  gap?: boolean;
}

/** O que o painel de fim precisa saber da run que acabou. */
export interface SummaryInput {
  round: number;
  kills: number;
  /** Saldo da carteira na morte. */
  fragments: number;
  /** A build no instante da morte, só com ids (o mesmo formato do save). */
  build: RecordBuild;
  /** `DamageLedger.rows()` da run. */
  damage: readonly DamageRow[];
  /** A morte virou recorde novo. */
  newRecord: boolean;
  /** Rodada do recorde guardado; `null` quando não há recorde (só com `round=N` de debug). */
  bestRound: number | null;
}

/** Largura máxima de uma linha de lista antes de quebrar em `, `. */
export const SUMMARY_LINE_MAX = 100;

/** Última linha do painel (END-12). */
export const RETRY_LINE = 'J / Enter para tentar de novo';

/** Título do painel (END-16). */
export const SUMMARY_TITLE = 'Fim da run';

/** Nome de `id` na tabela, ou `null` se o id não existe nela (id desconhecido some da linha). */
function nameIn(table: Readonly<Record<string, { name: string }>>, id: string): string | null {
  return Object.hasOwn(table, id) ? table[id].name : null;
}

function leveled(table: Readonly<Record<string, { name: string }>>, entry: LeveledId | null): string | null {
  const name = entry ? nameIn(table, entry.id) : null;
  return name ? `${name} Nv ${entry?.level}` : null;
}

/**
 * Junta os itens em `<rótulo>: a, b, c` (ou `<rótulo>: <vazio>`) e quebra em `, ` sempre que a linha passaria de
 * `SUMMARY_LINE_MAX` caracteres; a vírgula fica no fim da linha de cima.
 */
export function listLines(label: string, items: readonly (string | null)[], empty: string): string[] {
  const names = items.filter((item): item is string => item !== null);
  if (names.length === 0) return [`${label}: ${empty}`];
  const lines: string[] = [];
  let current = `${label}: ${names[0]}`;
  for (const name of names.slice(1)) {
    const joined = `${current}, ${name}`;
    if (joined.length <= SUMMARY_LINE_MAX) current = joined;
    else {
      lines.push(`${current},`);
      current = name;
    }
  }
  lines.push(current);
  return lines;
}

/** Uma lista em linhas do painel: a primeira abre bloco se `gap`; as de continuação (depois da quebra) recuam. */
function listBlock(lines: readonly string[], gap = false): SummaryLine[] {
  return lines.map((text, i) => (i === 0 ? (gap ? { text, gap } : { text }) : { text, indent: true }));
}

function buildLines(build: RecordBuild): SummaryLine[] {
  return [
    ...listBlock(
      listLines(
        'Técnicas',
        build.techniques.map((t) => leveled(TECH_SHORT, t)),
        'nenhuma',
      ),
      true,
    ),
    ...listBlock(
      listLines(
        'Passivas',
        build.perks.map((id) => nameIn(PERKS, id)),
        'nenhuma',
      ),
    ),
    ...listBlock(listLines('Arsenal', [leveled(ARSENAL, build.relic), leveled(ARSENAL, build.weapon)], 'nenhum')),
    ...listBlock(
      listLines(
        'Votos',
        build.vows.map((id) => nameIn(VOWS, id)),
        'nenhum',
      ),
    ),
  ];
}

/** END-08/09: cabeçalho `Dano` com uma fonte recuada por linha, ou `Dano: nenhum`. */
function damageLines(rows: readonly DamageRow[]): SummaryLine[] {
  if (rows.length === 0) return [{ text: 'Dano: nenhum', gap: true }];
  return [
    { text: 'Dano', gap: true },
    ...rows.map((row) => ({ text: `${row.label}: ${row.damage} (${row.pct}%)`, indent: true })),
  ];
}

function recordLine(input: SummaryInput): SummaryLine[] {
  if (input.newRecord) return [{ text: 'Recorde!', highlight: true, gap: true }];
  return input.bestRound === null ? [] : [{ text: `Recorde: r${input.bestRound}`, gap: true }];
}

/**
 * END-03..12, END-16: o título; rodada, abates e fragmentos; técnicas, passivas, arsenal e votos (uma lista por
 * linha, `nenhuma`/`nenhum` quando vazia); o cabeçalho `Dano` com cada fonte (ou `Dano: nenhum`); a linha do recorde;
 * e por último `J / Enter para tentar de novo`. Cada bloco abre com folga.
 */
export function summaryLines(input: SummaryInput): SummaryLine[] {
  return [
    { text: SUMMARY_TITLE, highlight: true, center: true },
    { text: `Rodada alcançada: ${input.round}`, gap: true },
    { text: `Abates: ${input.kills}` },
    { text: `Fragmentos: ${input.fragments}` },
    ...buildLines(input.build),
    ...damageLines(input.damage),
    ...recordLine(input),
    { text: RETRY_LINE, center: true, gap: true },
  ];
}
