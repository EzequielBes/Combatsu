import {
  ITEM_AXES,
  ITEM_BRANCHES,
  type AxisItem,
  type BodyAxisId,
  type BodyBranchId,
  type RedAxisId,
  type RedBranchId,
} from '../data/techAxes';

/** Uma entrada do `?axes=`: o eixo sempre é do próprio item (o Vermelho não aceita eixo do Corpo). */
export type AxisEntry =
  { item: 'vermelho'; axis: RedAxisId; points: number } | { item: 'corpo'; axis: BodyAxisId; points: number };

/** Uma entrada do `?ramo=`: `a` e `b` seguem a ordem de `ITEM_BRANCHES`. */
export type BranchEntry = { item: 'vermelho'; branch: RedBranchId } | { item: 'corpo'; branch: BodyBranchId };

const isItem = (id: string): id is AxisItem => Object.hasOwn(ITEM_AXES, id);

/** Nível válido: só dígitos e maior que zero (`-1`, `0`, `1.5` e vazio ficam de fora). */
const LEVEL = /^\d+$/;

/** Letra do ramo no parâmetro, na ordem do painel. */
const BRANCH_SLOT: Record<string, 0 | 1> = { a: 0, b: 1 };

/** Divide `chave:valor` e recusa entrada com mais de um `:`. */
function splitPair(entry: string): [string, string] | null {
  const [key = '', value = '', ...rest] = entry.trim().split(':');
  return rest.length > 0 ? null : [key, value];
}

/**
 * Lê `?axes=<item>.<eixo>:<n>[,...]` (VRM-10, CRP-14). Item ou eixo desconhecido, ou nível que não é inteiro positivo,
 * some sem derrubar o resto. O teto (3 por eixo, 5 por item) não é aplicado aqui: quem aplica é o `AxisBuild.add`,
 * chamado em laço por quem lê o parâmetro.
 */
export const parseAxesParam = (raw: string | null): AxisEntry[] => {
  if (!raw) return [];
  const entries: AxisEntry[] = [];
  for (const part of raw.split(',')) {
    const pair = splitPair(part);
    if (!pair) continue;
    const [path, level] = pair;
    const [item = '', axis = '', ...extra] = path.split('.');
    const points = Number(level);
    if (extra.length > 0 || !isItem(item) || !LEVEL.test(level) || points <= 0) continue;
    if (!(ITEM_AXES[item] as readonly string[]).includes(axis)) continue;
    entries.push({ item, axis, points } as AxisEntry);
  }
  return entries;
};

/**
 * Lê `?ramo=<item>:<a|b>[,...]` (VRM-18, CRP-14): `a` é o 1º ramo do item e `b` o 2º. Item ou letra desconhecidos
 * somem sem derrubar o resto.
 */
export const parseBranchParam = (raw: string | null): BranchEntry[] => {
  if (!raw) return [];
  const entries: BranchEntry[] = [];
  for (const part of raw.split(',')) {
    const pair = splitPair(part);
    if (!pair) continue;
    const [item, letter] = pair;
    if (!isItem(item) || !Object.hasOwn(BRANCH_SLOT, letter)) continue;
    entries.push({ item, branch: ITEM_BRANCHES[item][BRANCH_SLOT[letter]] } as BranchEntry);
  }
  return entries;
};
