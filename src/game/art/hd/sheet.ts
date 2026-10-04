/*
 * Folha `player-hd` do spike de alta densidade: o contrato entre a arte (rasterizador HD) e o jogo. Cada quadro é um
 * `Uint8Array` de `HD_FRAME.w * HD_FRAME.h` índices na tabela `colors` (0 = transparente), linha a linha a partir do
 * canto superior esquerdo. 1 texel = 1 px de mundo: a textura é pintada sem `ART_SCALE`. Puro, sem `phaser`.
 */
import { renderHdPlayer } from './player';

/** Frame do player HD: 96x80, eixo do corpo na coluna 36 e o pé na última linha. */
export const HD_FRAME = { w: 96, h: 80, originCol: 36 } as const;

/** Origem do sprite na folha HD: a coluna do eixo no x e o pé (base do frame) no y. */
export const HD_ORIGIN = { x: HD_FRAME.originCol / HD_FRAME.w, y: 1 } as const;

export interface HdSheet {
  frameW: number;
  frameH: number;
  /** Cores 0xRRGGBB por índice; o índice 0 é transparente e não é lido. */
  colors: readonly number[];
  /** Quadros por nome, cada um com `frameW * frameH` índices. */
  frames: Readonly<Record<string, Uint8Array>>;
}

/** Quadros do idle (respiração), em ordem, e quanto cada um fica na tela. */
export const HD_IDLE_FRAMES = ['hd-idle-0', 'hd-idle-1', 'hd-idle-2', 'hd-idle-3'] as const;
export const HD_IDLE_FRAME_MS = 200;

/** Quadro do idle para o relógio de jogo `clockMs`. */
export function hdIdleFrame(clockMs: number): string {
  return HD_IDLE_FRAMES[Math.floor(Math.max(0, clockMs) / HD_IDLE_FRAME_MS) % HD_IDLE_FRAMES.length];
}

/**
 * Quadros do gancho ascendente por fase. Cada quadro fica no mínimo 33 ms na tela (2 passos de 60 Hz): 2 no startup
 * de 90 ms, 2 no active de 90 ms e 4 no recovery de 260 ms.
 */
export const HD_UPPERCUT_PHASES = {
  startup: ['hd-gancho-0', 'hd-gancho-1'],
  active: ['hd-gancho-2', 'hd-gancho-3'],
  recovery: ['hd-gancho-4', 'hd-gancho-5', 'hd-gancho-6', 'hd-gancho-7'],
} as const;

/**
 * Quadro HD do golpe em curso, ou `undefined` se o golpe não tem arte HD (o Player segue com a folha antiga). Cada
 * fase reparte os seus quadros em fatias iguais do tempo da fase.
 */
export function hdMoveFrame(
  moveName: string,
  phase: string,
  elapsedMs: number,
  def: { startupMs: number; activeMs: number; recoveryMs: number },
): string | undefined {
  if (moveName !== 'ganchoAscendente' || (phase !== 'startup' && phase !== 'active' && phase !== 'recovery'))
    return undefined;
  const frames = HD_UPPERCUT_PHASES[phase];
  const total = phase === 'startup' ? def.startupMs : phase === 'active' ? def.activeMs : def.recoveryMs;
  const slice = Math.floor((Math.max(0, elapsedMs) / Math.max(1, total)) * frames.length);
  return frames[Math.min(frames.length - 1, slice)];
}

let cached: ReturnType<typeof renderHdPlayer> | undefined;
const rendered = (): ReturnType<typeof renderHdPlayer> => (cached ??= renderHdPlayer());

/** A folha `player-hd` (calculada uma vez, na primeira chamada). */
export function hdPlayerSheet(): HdSheet {
  const r = rendered();
  return { frameW: HD_FRAME.w, frameH: HD_FRAME.h, colors: r.colors, frames: r.frames };
}

/**
 * Ponto de golpe HD (o punho de perto) para o frame lógico do golpe (`ganchoAscendente-wind` ou `-hit`), com a origem
 * do frame HD e o tamanho do texel em px de mundo (1). Outro frame: `undefined`.
 */
export function hdStrike(
  frameName: string,
): { pt: { col: number; row: number }; frame: { originCol: number; rows: number }; texelPx: number } | undefined {
  const pt = rendered().strikes[frameName];
  return pt ? { pt, frame: { originCol: HD_FRAME.originCol, rows: HD_FRAME.h }, texelPx: 1 } : undefined;
}
