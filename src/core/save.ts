/**
 * Formato do save entre sessões: um JSON `{ version, record }` numa chave só. Aqui moram a validação e a migração;
 * quem lê e escreve a string é o adaptador do `game/`. Puro: sem o motor do jogo e sem o armazenamento do navegador
 * (o teste par confere no código-fonte).
 */

/** Chave do save no armazenamento do navegador. */
export const SAVE_KEY = 'combatsu.save';

/** Versão atual do formato. Subir a versão pede um passo novo em `MIGRATIONS`. */
export const SAVE_VERSION = 1;

/** Um id com nível: técnica equipada, relíquia ou arma vinculada. */
export interface LeveledId {
  id: string;
  level: number;
}

/** A build resumida, só com ids: o nome vem de `data/` na hora de exibir. */
export interface RecordBuild {
  techniques: LeveledId[];
  perks: string[];
  relic: LeveledId | null;
  weapon: LeveledId | null;
  vows: string[];
}

/** Uma run gravada: rodada alcançada, abates e a build no instante da morte. */
export interface RunRecord {
  round: number;
  kills: number;
  build: RecordBuild;
}

/** O que fica gravado na chave `SAVE_KEY`. */
export interface SaveData {
  version: number;
  record: RunRecord | null;
}

/** Resultado da leitura: save pronto, nada gravado, lixo, ou save de um build mais novo (não se escreve por cima). */
export type LoadResult =
  { kind: 'ok'; save: SaveData } | { kind: 'empty' } | { kind: 'invalid' } | { kind: 'newer'; version: number };

/** Um passo `vN → vN+1`: recebe o save cru da versão N e devolve o da N+1 (a versão o carregador acerta). */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** Passos de migração, pela versão de origem. A v1 é a primeira: ainda não há passo. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

type Plain = Record<string, unknown>;

function isPlain(x: unknown): x is Plain {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isIntAtLeast(x: unknown, min: number): x is number {
  return Number.isInteger(x) && (x as number) >= min;
}

function leveledId(x: unknown): LeveledId | null {
  if (!isPlain(x) || typeof x.id !== 'string' || !isIntAtLeast(x.level, 1)) return null;
  return { id: x.id, level: x.level };
}

/** `{ id, level }` válido ou `null` explícito; `undefined` quer dizer campo inválido. */
function optionalLeveledId(x: unknown): LeveledId | null | undefined {
  if (x === null) return null;
  return leveledId(x) ?? undefined;
}

function stringList(x: unknown): string[] | null {
  if (!Array.isArray(x) || !x.every((s) => typeof s === 'string')) return null;
  return [...(x as string[])];
}

function leveledList(x: unknown): LeveledId[] | null {
  if (!Array.isArray(x)) return null;
  const out = x.map(leveledId);
  return out.every((e) => e !== null) ? (out as LeveledId[]) : null;
}

function validateBuild(x: unknown): RecordBuild | null {
  if (!isPlain(x)) return null;
  const techniques = leveledList(x.techniques);
  const perks = stringList(x.perks);
  const vows = stringList(x.vows);
  const relic = optionalLeveledId(x.relic);
  const weapon = optionalLeveledId(x.weapon);
  if (!techniques || !perks || !vows || relic === undefined || weapon === undefined) return null;
  return { techniques, perks, relic, weapon, vows };
}

/**
 * Valida um recorde (SAVE-06): `round` inteiro >= 1, `kills` inteiro >= 0, a build com listas de strings, técnicas
 * `{ id, level }` com `level` inteiro >= 1, relíquia e arma `{ id, level }` ou `null`. Os ids não são checados contra
 * `data/`: um id que o jogo não conhece mais continua válido e só some da exibição. Devolve uma cópia limpa ou `null`.
 */
export function validateRecord(x: unknown): RunRecord | null {
  if (!isPlain(x) || !isIntAtLeast(x.round, 1) || !isIntAtLeast(x.kills, 0)) return null;
  const build = validateBuild(x.build);
  return build ? { round: x.round, kills: x.kills, build } : null;
}

/** Aplica `migrations[v]`, `migrations[v+1]`... até `current`. Passo faltando ou que lança dá `null`. */
function migrate(save: Plain, from: number, migrations: Readonly<Record<number, Migration>>, current: number) {
  let data = save;
  for (let v = from; v < current; v++) {
    const step = migrations[v];
    if (!step) return null;
    try {
      const next = step(data);
      if (!isPlain(next)) return null;
      data = { ...next, version: v + 1 };
    } catch {
      return null;
    }
  }
  return data;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Lê o save cru (SAVE-02..06): ausente ou vazio → `empty`; JSON quebrado, `version` não inteira, passo de migração
 * faltando ou recorde inválido → `invalid`; `version` maior que `current` → `newer`; senão → `ok` já migrado.
 */
export function parseSave(
  raw: string | null,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = SAVE_VERSION,
): LoadResult {
  if (raw === null || raw === '') return { kind: 'empty' };
  const parsed = parseJson(raw);
  if (!isPlain(parsed) || !Number.isInteger(parsed.version)) return { kind: 'invalid' };
  const version = parsed.version as number;
  if (version > current) return { kind: 'newer', version };
  const data = migrate(parsed, version, migrations, current);
  if (!data) return { kind: 'invalid' };
  if (data.record === null) return { kind: 'ok', save: { version: current, record: null } };
  const record = validateRecord(data.record);
  return record ? { kind: 'ok', save: { version: current, record } } : { kind: 'invalid' };
}

/** A string que vai para a chave `SAVE_KEY`, sempre na versão atual. */
export function serializeSave(record: RunRecord | null): string {
  const save: SaveData = { version: SAVE_VERSION, record };
  return JSON.stringify(save);
}
