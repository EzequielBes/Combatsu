/*
 * Chave de debug do boneco articulado (RIG-09, RIG-10): só `?debug&rig=1` troca os 3 frames do gancho ascendente.
 * Funções puras sobre a query string, para o Vitest testar sem navegador.
 */
import { RIG_GANCHO_FRAMES, RIG_GANCHO_SEQUENCE, RIG_GANCHO_STRIKE } from './poses/ganchoAscendente';

/** `?debug&rig=1` na URL. */
export function rigEnabled(search: string): boolean {
  const q = new URLSearchParams(search);
  return q.has('debug') && q.get('rig') === '1';
}

/** Nome do quadro `i` da sequência do gancho ascendente pelo boneco. */
export const rigSequenceFrameName = (i: number): string => `ganchoAscendente-rig-${i}`;

/** Quadros da sequência por fase: antecipação e subida no startup, pico e overshoot no active, volta no recovery. */
export const RIG_PHASE_FRAMES = {
  startup: [0, 1, 2, 3, 4, 5],
  active: [6, 7, 8],
  recovery: [9, 10, 11],
} as const;

/**
 * Quadro da sequência do boneco para o golpe em curso, ou `undefined` se não é o gancho ascendente (o Player segue
 * então com o frame -wind/-hit/-recover). Cada fase reparte os seus quadros em fatias iguais do tempo da fase.
 */
export function rigMoveFrame(
  moveName: string,
  phase: string,
  elapsedMs: number,
  def: { startupMs: number; activeMs: number; recoveryMs: number },
): string | undefined {
  if (moveName !== 'ganchoAscendente' || (phase !== 'startup' && phase !== 'active' && phase !== 'recovery')) return undefined;
  const frames = RIG_PHASE_FRAMES[phase];
  const total = phase === 'startup' ? def.startupMs : phase === 'active' ? def.activeMs : def.recoveryMs;
  const slice = Math.floor((Math.max(0, elapsedMs) / Math.max(1, total)) * frames.length);
  return rigSequenceFrameName(frames[Math.min(frames.length - 1, slice)]);
}

/** Os frames de golpe com os 3 do gancho ascendente trocados pelos do boneco (e os quadros extras da sequência) quando `rigEnabled`; senão, os mesmos. */
export function withRigFrames(
  frames: Readonly<Record<string, readonly string[]>>,
  search: string,
): Readonly<Record<string, readonly string[]>> {
  if (!rigEnabled(search)) return frames;
  const extra = Object.fromEntries(RIG_GANCHO_SEQUENCE.map((r, i) => [rigSequenceFrameName(i), r.frame]));
  return { ...frames, ...RIG_GANCHO_FRAMES, ...extra };
}

/** Ponto de golpe do boneco para o frame, ou `undefined` (fora do `rig=1` ou de outro frame). */
export function rigStrikePoint(frameName: string, search: string): { col: number; row: number } | undefined {
  return rigEnabled(search) && frameName === 'ganchoAscendente-hit' ? RIG_GANCHO_STRIKE : undefined;
}

/** Query string da página, ou vazia fora do navegador (testes em Node). */
export const currentSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);

/** `?debug&rig=1` na página aberta (avaliado uma vez, na carga). */
export const RIG_ON = rigEnabled(currentSearch());
