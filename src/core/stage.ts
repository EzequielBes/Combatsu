import type { Rng } from './rng';
import type { ModuleDef } from './module';
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
    readonly slotRng: Rng,
    private readonly forced: readonly string[] | null,
  ) {}

  /** Módulos da área da `round` (ARE-01..03): 2 nas rodadas 1 e 2, 3 depois, e só o santuário na de chefe. */
  nextArea(round: number): AreaPlan {
    if (isBossRound(round)) return { modules: [BOSS_ID] };
    const ids = this.forced ? [...this.forced] : drawModules(this.stageRng, round <= 2 ? 2 : 3, this.prevFirst);
    this.prevFirst = ids[0];
    return { modules: ids };
  }
}
