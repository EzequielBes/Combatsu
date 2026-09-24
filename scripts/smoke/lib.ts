// Lógica pura do smoke runner (FND-11, FND-12). Sem tipos do Node: o I/O fica no run.mjs.

export interface SmokeResult {
  name: string;
  ok: boolean;
}

/** Onde o Edge fica numa instalação padrão do Windows. */
export const DEFAULT_EDGE_PATHS: string[] = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

/** `EDGE_PATH` se existir; senão o primeiro candidato que existe; nenhum, `null` (FND-12). */
export function findEdge(
  envPath: string | undefined,
  candidates: string[],
  exists: (p: string) => boolean,
): string | null {
  if (envPath && exists(envPath)) return envPath;
  return candidates.find(exists) ?? null;
}

/** 0 se todos os cenários passaram, 1 se ao menos um falhou (FND-11). */
export function exitCodeFor(results: SmokeResult[]): 0 | 1 {
  return results.every((r) => r.ok) ? 0 : 1;
}

/** Nomes dos cenários que falharam, na ordem em que rodaram. */
export function failedNames(results: SmokeResult[]): string[] {
  return results.filter((r) => !r.ok).map((r) => r.name);
}
