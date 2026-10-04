/*
 * Chave de debug do boneco articulado (RIG-09, RIG-10): só `?debug&rig=1` troca os 3 frames do gancho ascendente.
 * Funções puras sobre a query string, para o Vitest testar sem navegador.
 */
import { RIG_GANCHO_FRAMES, RIG_GANCHO_STRIKE } from './poses/ganchoAscendente';

/** `?debug&rig=1` na URL. */
export function rigEnabled(search: string): boolean {
  const q = new URLSearchParams(search);
  return q.has('debug') && q.get('rig') === '1';
}

/** Os frames de golpe com os 3 do gancho ascendente trocados pelos do boneco quando `rigEnabled`; senão, os mesmos. */
export function withRigFrames(
  frames: Readonly<Record<string, readonly string[]>>,
  search: string,
): Readonly<Record<string, readonly string[]>> {
  return rigEnabled(search) ? { ...frames, ...RIG_GANCHO_FRAMES } : frames;
}

/** Ponto de golpe do boneco para o frame, ou `undefined` (fora do `rig=1` ou de outro frame). */
export function rigStrikePoint(frameName: string, search: string): { col: number; row: number } | undefined {
  return rigEnabled(search) && frameName === 'ganchoAscendente-hit' ? RIG_GANCHO_STRIKE : undefined;
}

/** Query string da página, ou vazia fora do navegador (testes em Node). */
export const currentSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);
