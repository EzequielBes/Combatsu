export type ModuleKind = 'combat' | 'konbini' | 'boss';
export type ModuleTheme = 'rua' | 'beco' | 'parque' | 'konbini' | 'santuario';

/** Um pedaço de cenário escrito à mão: grade de 17 linhas, legenda `# . E c b p` (MDL-01, MDL-02). */
export interface ModuleDef {
  id: string;
  kind: ModuleKind;
  theme: ModuleTheme;
  grid: readonly string[];
}

export const MODULE_ROWS = 17;
export const MODULE_MIN_COLS = 16;
export const MODULE_MAX_COLS = 48;
/** Linhas do chão sólido (MDL-04). */
export const FLOOR_ROWS: readonly number[] = [15, 16];
/** Linha onde o player anda e onde ficam os pontos de spawn (MDL-07). */
export const WALK_ROW = 14;
/** Colunas seguidas de espaço aberto exigidas num módulo de combate (MDL-06). */
export const OPEN_MIN_COLS = 12;
/** Faixa de linhas que conta como pé-direito do espaço de luta (MDL-06): da 9 à 14. */
export const HEADROOM_ROWS: readonly [number, number] = [9, 14];

const ALLOWED = new Set(['#', '.', 'E', 'c', 'b', 'p']);

const fail = (id: string, row: number, col: number, reason: string): never => {
  throw new Error(`Módulo "${id}": linha ${row}, coluna ${col}: ${reason}`);
};

/** Formato do módulo (MDL-01..03): falha alto, com id, linha e coluna na mensagem. */
export function validateModule(def: ModuleDef): void {
  const { id, grid } = def;
  if (grid.length !== MODULE_ROWS) {
    fail(id, grid.length, 0, `a grade tem ${grid.length} linhas; esperado ${MODULE_ROWS}`);
  }
  const width = grid[0].length;
  if (width < MODULE_MIN_COLS || width > MODULE_MAX_COLS) {
    fail(id, 0, width, `largura ${width}; esperado entre ${MODULE_MIN_COLS} e ${MODULE_MAX_COLS} colunas`);
  }
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (row.length !== width) fail(id, r, row.length, `a linha tem ${row.length} colunas; esperado ${width}`);
    for (let c = 0; c < row.length; c++) {
      if (!ALLOWED.has(row[c])) fail(id, r, c, `caractere '${row[c]}' proibido (legenda: # . E c b p)`);
    }
  }
}

const isSolid = (grid: readonly string[], r: number, c: number): boolean => grid[r]?.[c] === '#';

function lintFloor(grid: readonly string[], width: number): string[] {
  const errors: string[] = [];
  for (const r of FLOOR_ROWS) {
    for (let c = 0; c < width; c++) {
      if (!isSolid(grid, r, c)) {
        errors.push(`linha ${r}, coluna ${c}: o chão (linhas ${FLOOR_ROWS.join(' e ')}) tem de ser sólido (MDL-04)`);
        break;
      }
    }
  }
  return errors;
}

function lintNoPlatforms(grid: readonly string[], width: number): string[] {
  const errors: string[] = [];
  for (let r = 0; r < FLOOR_ROWS[0]; r++) {
    for (let c = 0; c < width; c++) {
      if (isSolid(grid, r, c)) {
        errors.push(`linha ${r}, coluna ${c}: sólido acima do chão, plataforma proibida (MDL-05)`);
        break;
      }
    }
  }
  return errors;
}

/** Maior trecho de colunas seguidas sem sólido nas linhas 9 a 14. */
function longestOpenRun(grid: readonly string[], width: number): number {
  let best = 0;
  let run = 0;
  for (let c = 0; c < width; c++) {
    let open = true;
    for (let r = HEADROOM_ROWS[0]; r <= HEADROOM_ROWS[1]; r++) {
      if (isSolid(grid, r, c)) open = false;
    }
    run = open ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function lintCombat(grid: readonly string[], width: number): string[] {
  const errors: string[] = [];
  const open = longestOpenRun(grid, width);
  if (open < OPEN_MIN_COLS) {
    errors.push(`só ${open} colunas abertas seguidas nas linhas 9 a 14; mínimo ${OPEN_MIN_COLS} (MDL-06)`);
  }
  let spawns = 0;
  let hasProp = false;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === 'E') {
        spawns++;
        if (r !== WALK_ROW) errors.push(`linha ${r}, coluna ${c}: 'E' fora da linha ${WALK_ROW} (MDL-07)`);
      } else if (ch === 'c' || ch === 'b' || ch === 'p') {
        hasProp = true;
      }
    }
  }
  if (spawns < 2) errors.push(`${spawns} pontos de spawn 'E'; mínimo 2 (MDL-07)`);
  if (!hasProp) errors.push(`nenhum objeto 'c', 'b' ou 'p' (MDL-08)`);
  return errors;
}

function lintKonbini(grid: readonly string[]): string[] {
  const errors: string[] = [];
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf('E');
    if (c >= 0) errors.push(`linha ${r}, coluna ${c}: a konbini não pode ter 'E' (MDL-09)`);
  }
  return errors;
}

/** Lint de level design (MDL-04..09): lista de erros; vazia = passou. MDL-06..08 valem para `combat` e `boss`. */
export function lintModule(def: ModuleDef): string[] {
  const width = def.grid[0]?.length ?? 0;
  const errors = [...lintFloor(def.grid, width), ...lintNoPlatforms(def.grid, width)];
  if (def.kind === 'combat' || def.kind === 'boss') errors.push(...lintCombat(def.grid, width));
  if (def.kind === 'konbini') errors.push(...lintKonbini(def.grid));
  return errors.map((e) => `Módulo "${def.id}": ${e}`);
}
