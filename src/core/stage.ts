import type { Rng } from './rng';
import { MODULE_ROWS, WALK_ROW, type ModuleDef, type ModuleTheme } from './module';
import { isBossRound } from './waves';
import { AREA } from '../data/tuning';
import { COMBAT_IDS, MODULES } from '../data/modules';

/** Módulos que formam uma área, da esquerda para a direita (ARE-01..03). */
export interface AreaPlan {
  modules: string[];
}

/** Id do módulo da rodada de chefe (ARE-03). */
const BOSS_ID = 'santuario';
/** Módulo acrescentado quando a área fica estreita demais (ARE-06). */
const FILLER_ID = 'beco';

const widthOf = (modules: Record<string, ModuleDef>, id: string): number => modules[id].grid[0].length;

/** Colunas da área: soma dos módulos mais a parede e o selo (ARE-06). */
function areaCols(ids: readonly string[], modules: Record<string, ModuleDef>): number {
  return ids.reduce((sum, id) => sum + widthOf(modules, id), 2);
}

/** O módulo mais estreito que não seja `avoid`; empate fica com o primeiro da ordem do sorteio. */
function narrowest(combatIds: readonly string[], modules: Record<string, ModuleDef>, avoid: string | null): string {
  const pool = combatIds.filter((id) => id !== avoid);
  const options = pool.length > 0 ? pool : combatIds;
  return options.reduce((best, id) => (widthOf(modules, id) < widthOf(modules, best) ? id : best));
}

/**
 * Regra de largura (ARE-06): acima de `AREA.maxCols` troca o último módulo pelo mais estreito que respeite a
 * regra anti-repetição; abaixo de `AREA.minCols` acrescenta o `beco` (ou o mais estreito, se o último já é ele).
 */
function fitWidth(
  ids: string[],
  prevFirst: string | null,
  combatIds: readonly string[],
  modules: Record<string, ModuleDef>,
): string[] {
  const cols = areaCols(ids, modules);
  const last = ids.length - 1;
  if (cols > AREA.maxCols) {
    const neighbor = last === 0 ? prevFirst : ids[last - 1];
    return [...ids.slice(0, last), narrowest(combatIds, modules, neighbor)];
  }
  if (cols < AREA.minCols) {
    const filler = ids[last] === FILLER_ID ? narrowest(combatIds, modules, FILLER_ID) : FILLER_ID;
    return [...ids, filler];
  }
  return ids;
}

/**
 * Sorteia `count` módulos de combate (ARE-04, ARE-05, ARE-06): cada posição sai uniforme entre `combatIds`
 * menos o vizinho anterior (na posição 0, menos `prevFirst`, o primeiro da área anterior). Consome só `rng.int`,
 * uma vez por posição, e só do `rng` recebido (ARE-07).
 */
export function drawModules(
  rng: Rng,
  count: number,
  prevFirst: string | null,
  combatIds: readonly string[] = COMBAT_IDS,
  modules: Record<string, ModuleDef> = MODULES,
): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const avoid = i === 0 ? prevFirst : ids[i - 1];
    const pool = combatIds.filter((id) => id !== avoid);
    const options = pool.length > 0 ? pool : combatIds;
    ids.push(options[rng.int(0, options.length - 1)]);
  }
  return fitWidth(ids, prevFirst, combatIds, modules);
}

/**
 * Lista de `?debug&modules=a,b` (ARE-12, ARE-13): fica só com os ids de combate conhecidos, na ordem dada; sem
 * nenhum (ausente, vazia, só desconhecidos ou especiais) devolve `null` e o sorteio normal vale.
 */
export function parseModulesParam(raw: string | null, combatIds: readonly string[] = COMBAT_IDS): string[] | null {
  if (raw === null) return null;
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => combatIds.includes(id));
  return ids.length > 0 ? ids : null;
}

/** Sorteia os módulos de cada área da run e guarda o primeiro da área anterior (ARE-05). */
export class Stage {
  private prevFirst: string | null = null;

  /** `forced` (ARE-12) vale para toda área comum e ignora as regras de repetição e de largura. */
  constructor(
    private readonly stageRng: Rng,
    private readonly slotRng: Rng,
    private readonly forced: readonly string[] | null,
  ) {}

  /** Módulos da área da `round` (ARE-01..03): 2 nas rodadas 1 e 2, 3 depois, e só o santuário na de chefe. */
  nextArea(round: number): AreaPlan {
    if (isBossRound(round)) return { modules: [BOSS_ID] };
    const ids = this.forced ? [...this.forced] : drawModules(this.stageRng, round <= 2 ? 2 : 3, this.prevFirst);
    this.prevFirst = ids[0];
    return { modules: ids };
  }

  /** Grade da área do `plan`, com os slots `p` sorteados pelo `slotRng` da run (SLT-01). */
  compose(plan: AreaPlan): AreaGrid {
    return composeArea(plan.modules, MODULES, this.slotRng);
  }
}

/** Trecho de colunas de um módulo na área; `col0` e `col1` são inclusivos e contam a coluna de parede (col 0). */
export interface AreaSpan {
  id: string;
  theme: ModuleTheme;
  col0: number;
  col1: number;
}

/** Grade pronta para o `parseLevel`: `sealCol` é a coluna do selo (`null` na konbini, que não tem selo). */
export interface AreaGrid {
  rows: string[];
  spans: AreaSpan[];
  sealCol: number | null;
}

/** Slot `p` (SLT-01): cadeira abaixo de 0,4, garrafa abaixo de 0,8, senão vazio (0,4 / 0,4 / 0,2). */
const SLOT_CHAIR_BELOW = 0.4;
const SLOT_BOTTLE_BELOW = 0.8;

function drawSlot(slotRng: Rng): string {
  const v = slotRng.next();
  if (v < SLOT_CHAIR_BELOW) return 'c';
  return v < SLOT_BOTTLE_BELOW ? 'b' : '.';
}

/** Cola os módulos entre a parede (coluna 0) e a última coluna, que é `upperEnd` nas linhas 0 a 14 e `#` no chão. */
function joinRows(defs: readonly ModuleDef[], upperEnd: string): string[] {
  const rows: string[] = [];
  for (let r = 0; r < MODULE_ROWS; r++) {
    rows.push('#' + defs.map((d) => d.grid[r]).join('') + (r <= WALK_ROW ? upperEnd : '#'));
  }
  return rows;
}

function spansOf(defs: readonly ModuleDef[]): AreaSpan[] {
  let col = 1;
  return defs.map((d) => {
    const span = { id: d.id, theme: d.theme, col0: col, col1: col + d.grid[0].length - 1 };
    col += d.grid[0].length;
    return span;
  });
}

/** Troca cada `p` por `c`, `b` ou `.`, de cima para baixo e da esquerda para a direita (SLT-01). */
function resolveSlots(rows: string[], slotRng: Rng): string[] {
  return rows.map((row) => [...row].map((ch) => (ch === 'p' ? drawSlot(slotRng) : ch)).join(''));
}

/** Põe o `P` na coluna `AREA.playerCol` da linha 14 (ARE-09). */
function withPlayer(rows: string[]): string[] {
  return rows.map((row, r) =>
    r === WALK_ROW ? row.slice(0, AREA.playerCol) + 'P' + row.slice(AREA.playerCol + 1) : row,
  );
}

/**
 * Compõe a grade da área (ARE-06, ARE-08, ARE-09, SLT-01): coluna 0 de parede, os módulos lado a lado, e a última
 * coluna de selo (`S` nas linhas 0 a 14, `#` no chão); a largura é a soma dos módulos mais 2. Os `p` saem do
 * `slotRng`, nunca do stream de sorteio dos módulos (SLT-02); `c` e `b` fixos ficam como estão (SLT-03).
 */
export function composeArea(ids: readonly string[], modules: Record<string, ModuleDef>, slotRng: Rng): AreaGrid {
  const defs = ids.map((id) => modules[id]);
  const rows = withPlayer(resolveSlots(joinRows(defs, 'S'), slotRng));
  return { rows, spans: spansOf(defs), sealCol: rows[0].length - 1 };
}

/** Área da konbini (KON-01, KON-05): parede, o módulo e o fim aberto (`.` no lugar do selo), sem `S` nem `E`. */
export function konbiniArea(modules: Record<string, ModuleDef>): AreaGrid {
  const defs = [modules.konbini];
  return { rows: withPlayer(joinRows(defs, '.')), spans: spansOf(defs), sealCol: null };
}

/**
 * Modo da cena a partir da query string (LEG-01, LEG-02, LEG-04): `area=sala` vale com ou sem `?debug`; o
 * `?debug&fxlab` também usa a sala; todo o resto é o mundo modular.
 */
export function areaModeFor(search: string): 'modular' | 'sala' {
  const q = new URLSearchParams(search);
  if (q.get('area') === 'sala') return 'sala';
  return q.has('debug') && q.has('fxlab') ? 'sala' : 'modular';
}
