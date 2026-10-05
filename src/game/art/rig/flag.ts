/*
 * Chave de debug do boneco articulado (RIG-09, RIG-10): só `?debug&rig=1` troca os 3 frames do gancho ascendente.
 * Funções puras sobre a query string, para o Vitest testar sem navegador.
 */
import { MOVES, type MoveDef } from '../../../data/moves';
import { RIG_GANCHO_FRAMES, RIG_GANCHO_SEQUENCE, RIG_GANCHO_STRIKE } from './poses/ganchoAscendente';
import { TUNINGS } from './poses/tunings';
import { uppercutFor } from './poses/uppercut';
import { HEROICO_ALTO } from './presets';
import { RIG_FRAME_40, wristTexel } from './rasterize';

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
  if (moveName !== 'ganchoAscendente' || (phase !== 'startup' && phase !== 'active' && phase !== 'recovery'))
    return undefined;
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

/** Gancho ascendente do heroico alto no frame de 40x40 (PRA-08), calculado uma vez, na carga. */
export const RIG_TALL = uppercutFor(HEROICO_ALTO, TUNINGS.heroicoAlto, RIG_FRAME_40);

/** Frame da folha do heroico alto: 40x40, com o eixo do corpo na coluna 12 e o pé na última linha. */
export const RIG_TALL_FRAME = RIG_FRAME_40;

/** Origem do sprite na folha do heroico alto: a coluna do eixo (12/40) no x e o pé (base do frame) no y. */
export const RIG_TALL_ORIGIN = { x: RIG_FRAME_40.originCol / RIG_FRAME_40.w, y: 1 } as const;

/**
 * Folha `player-rig` (PRA-08): os 12 quadros do gancho do heroico alto, com os nomes da sequência do boneco, só com
 * `?debug&rig=1`; senão `undefined` (a textura não é registrada).
 */
export function rigTallSheet(search: string): Record<string, readonly string[]> | undefined {
  if (!rigEnabled(search)) return undefined;
  return Object.fromEntries(RIG_TALL.sequence.map((r, i) => [rigSequenceFrameName(i), r.frame]));
}

/**
 * Ponto de golpe do heroico alto e a origem do frame dele (PRA-08): o pulso de perto no wind e no hit do gancho
 * ascendente, no frame de 40x40 com o eixo na coluna 12. Fora do `?debug&rig=1` ou de outro frame, `undefined`.
 */
export function rigStrike(
  frameName: string,
  search: string,
): { pt: { col: number; row: number }; frame: { originCol: number; rows: number } } | undefined {
  if (!rigEnabled(search)) return undefined;
  const frame = { originCol: RIG_TALL_FRAME.originCol, rows: RIG_TALL_FRAME.h };
  if (frameName === 'ganchoAscendente-wind') return { pt: wristTexel(RIG_TALL.frames.wind.joints), frame };
  if (frameName === 'ganchoAscendente-hit') return { pt: RIG_TALL.strike, frame };
  return undefined;
}

/** Quanto a hitbox do gancho ascendente cresce para cima com o heroico alto (px): o punho dele sobe 10 texels a mais. */
export const RIG_UPPERCUT_EXTRA_PX = 20;

/**
 * Hitbox do gancho ascendente do heroico alto (PRA-05): a do `MOVES` com a borda de cima 20 px mais alta e a de baixo no
 * mesmo lugar. O corpo de 32 texels bate acima da própria cabeça, fora da caixa do sprite de 24.
 */
export const RIG_UPPERCUT_HITBOX: NonNullable<MoveDef['hitbox']> = {
  ...MOVES.ganchoAscendente.hitbox!,
  offsetY: MOVES.ganchoAscendente.hitbox!.offsetY - RIG_UPPERCUT_EXTRA_PX / 2,
  height: MOVES.ganchoAscendente.hitbox!.height + RIG_UPPERCUT_EXTRA_PX,
};

/** Hitbox do golpe com o boneco: só o gancho ascendente, só com `?debug&rig=1`; senão `undefined` (a do `MOVES` vale). */
export function rigHitbox(moveName: string, search: string): NonNullable<MoveDef['hitbox']> | undefined {
  return rigEnabled(search) && moveName === 'ganchoAscendente' ? RIG_UPPERCUT_HITBOX : undefined;
}

/** Query string da página, ou vazia fora do navegador (testes em Node). */
export const currentSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);

/** `?debug&rig=1` na página aberta (avaliado uma vez, na carga). */
export const RIG_ON = rigEnabled(currentSearch());
