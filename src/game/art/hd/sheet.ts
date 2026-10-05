/*
 * Folha `player-hd`: o contrato entre a arte (rasterizador HD) e o jogo. Cada quadro é um `Uint8Array` de
 * `HD_FRAME.w * HD_FRAME.h` índices na tabela `colors` (0 = transparente), linha a linha a partir do canto superior
 * esquerdo. 1 texel = 1 px de mundo: a textura é pintada sem `ART_SCALE`. Os quadros têm os nomes da folha antiga
 * (`idle-0`, `guard`, `jab-hit`), então o jogo usa a folha HD em todo quadro que ela já tem e a antiga no resto.
 * Puro, sem `phaser`.
 */
import { PLAYER_ANIMS, type AnimDef } from '../sprites/player';
import { HEAVY } from './families/carry';
import { MOVE_PHASE_FRAMES, moveFrameName, type MovePhase } from './frames';
import { renderHdPlayer, type HdAnchors } from './player';

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

let cached: ReturnType<typeof renderHdPlayer> | undefined;
const rendered = (): ReturnType<typeof renderHdPlayer> => (cached ??= renderHdPlayer());

/** A folha `player-hd` (calculada uma vez, na primeira chamada). */
export function hdPlayerSheet(): HdSheet {
  const r = rendered();
  return { frameW: HD_FRAME.w, frameH: HD_FRAME.h, colors: r.colors, frames: r.frames };
}

/** A folha HD tem este quadro? */
export const hdHasFrame = (name: string): boolean => name in rendered().frames;

/** Menor tempo de um quadro na tela (ms): 2 passos de 60 Hz. Uma fase curta mostra menos quadros. */
export const HD_MIN_FRAME_MS = 33;

const PHASES: ReadonlySet<string> = new Set(Object.keys(MOVE_PHASE_FRAMES));

/**
 * Quadro HD do golpe em curso, ou `undefined` se o golpe não tem sequência HD (o Player segue com o frame
 * `-wind/-hit/-recover`). A fase reparte o seu tempo em fatias iguais, tantas quantos quadros cabem com
 * `HD_MIN_FRAME_MS` cada (no mínimo 1); com menos fatias que quadros, valem os primeiros.
 */
export function hdMoveFrame(
  moveName: string,
  phase: string,
  elapsedMs: number,
  def: { startupMs: number; activeMs: number; recoveryMs: number },
): string | undefined {
  if (!PHASES.has(phase) || !rendered().moves.includes(moveName)) return undefined;
  const ph = phase as MovePhase;
  const total = ph === 'startup' ? def.startupMs : ph === 'active' ? def.activeMs : def.recoveryMs;
  const slices = Math.min(MOVE_PHASE_FRAMES[ph], Math.max(1, Math.floor(total / HD_MIN_FRAME_MS)));
  const slice = Math.floor((Math.max(0, elapsedMs) / Math.max(1, total)) * slices);
  return moveFrameName(moveName, ph, Math.min(slices - 1, slice));
}

let anims: Record<string, AnimDef> | undefined;

/** Chave da animação `name` na folha HD. */
export const playerHdAnimKey = (name: string): string => `player-hd-${name}`;

/** As animações do player cujos quadros a folha HD já tem todos (as outras continuam na folha antiga). */
export function hdAnims(): Record<string, AnimDef> {
  if (anims) return anims;
  anims = {};
  for (const [name, def] of Object.entries(PLAYER_ANIMS)) {
    if (def.frames.every(hdHasFrame)) anims[name] = def;
    // A pegada pesada tem a mesma animação com os quadros `heavy-`, quando a folha tem todos.
    const heavy = def.frames.map((f) => HEAVY + f);
    if (heavy.every(hdHasFrame)) anims[HEAVY + name] = { ...def, frames: heavy };
  }
  return anims;
}

/**
 * Nome do quadro, da animação ou do golpe para o objeto que o player segura: com um objeto pesado, a variante
 * `heavy-` quando a folha HD a tem; senão o próprio nome.
 */
export function hdHeldName(name: string, heavy: boolean, has: (n: string) => boolean): string {
  return heavy && has(HEAVY + name) ? HEAVY + name : name;
}

/** O golpe tem sequência de quadros na folha HD? */
export const hdHasMove = (name: string): boolean => rendered().moves.includes(name);

/** A animação `name` existe inteira na folha HD? */
export const hdHasAnim = (name: string): boolean => name in hdAnims();

/**
 * Mãos do quadro em px a partir do pé do corpo (x para a frente do player, y negativo para cima): é onde o jogo
 * prende o objeto na mão e faz nascer o efeito das técnicas. Quadro fora da folha HD: `undefined`.
 */
export const hdAnchors = (frameName: string): HdAnchors | undefined => rendered().anchors[frameName];

/**
 * Ponto de golpe HD (a parte do corpo que acerta) para o frame lógico do golpe (`<golpe>-wind` ou `<golpe>-hit`),
 * com a origem do frame HD e o tamanho do texel em px de mundo (1). Outro frame: `undefined`.
 */
export function hdStrike(
  frameName: string,
): { pt: { col: number; row: number }; frame: { originCol: number; rows: number }; texelPx: number } | undefined {
  const pt = rendered().strikes[frameName];
  return pt ? { pt, frame: { originCol: HD_FRAME.originCol, rows: HD_FRAME.h }, texelPx: 1 } : undefined;
}
