/*
 * Folha `player-yuta`: o protagonista novo em quadros desenhados inteiros, trazidos de um atlas pelo
 * `tools/sprite-atlas.mjs` (`yutaAtlas.data.ts`). A arte tem o dobro da densidade do resto do jogo: 2 texels por px
 * de mundo, então o sprite é exibido com `YUTA_SCALE`. Como na folha HD, o jogo usa esta folha em todo quadro,
 * animação e golpe que ela já tem e a folha HD no resto.
 * Puro, sem `phaser`.
 */
import type { AttackPhase } from '../../../../core/animState';
import { PLAYER_ANIMS, type AnimDef } from '../../sprites/player';
import { HEAVY } from '../families/carry';
import { RUN_FRAMES } from '../families/locomotion';
import type { HdAnchors } from '../player';
import { HD_MIN_FRAME_MS, HD_RUN_FRAME_MS, type HdSheet } from '../sheet';
import { YUTA_ATLAS_DATA } from './yutaAtlas.data';

/** Frame do protagonista novo: a célula do atlas, com o eixo do corpo em `originCol` e a sola na última linha. */
export const YUTA_FRAME = {
  w: YUTA_ATLAS_DATA.frameW,
  h: YUTA_ATLAS_DATA.frameH,
  originCol: YUTA_ATLAS_DATA.originCol,
} as const;

/** Origem do sprite: a coluna do eixo no x e o pé (base do frame) no y. */
export const YUTA_ORIGIN = { x: YUTA_FRAME.originCol / YUTA_FRAME.w, y: 1 } as const;

/** Escala de exibição: 2 texels da folha por px de mundo. */
export const YUTA_SCALE = 0.5;

/** Desfaz os pares (repetições, índice) em base64 de um quadro do atlas. */
export function decodeAtlasFrame(encoded: string, size: number): Uint8Array {
  const bytes = atob(encoded);
  const out = new Uint8Array(size);
  let at = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const n = bytes.charCodeAt(i);
    out.fill(bytes.charCodeAt(i + 1), at, at + n);
    at += n;
  }
  if (at !== size) throw new Error(`Quadro do atlas com ${at} texels; esperava ${size}`);
  return out;
}

let cached: HdSheet | undefined;

/** A folha `player-yuta` (decodificada uma vez, na primeira chamada). */
export function yutaSheet(): HdSheet {
  if (cached) return cached;
  const size = YUTA_FRAME.w * YUTA_FRAME.h;
  const frames: Record<string, Uint8Array> = {};
  for (const [name, encoded] of Object.entries(YUTA_ATLAS_DATA.frames)) frames[name] = decodeAtlasFrame(encoded, size);
  cached = { frameW: YUTA_FRAME.w, frameH: YUTA_FRAME.h, colors: YUTA_ATLAS_DATA.colors, frames };
  return cached;
}

/** A folha tem este quadro? */
export const yutaHasFrame = (name: string): boolean => name in YUTA_ATLAS_DATA.frames;

/** Quadros `<prefixo>-0`, `<prefixo>-1`... que a folha tem, em ordem. */
function sequence(prefix: string): string[] {
  const out: string[] = [];
  while (yutaHasFrame(`${prefix}-${out.length}`)) out.push(`${prefix}-${out.length}`);
  return out;
}

/**
 * Passadas que o ciclo desenhado de cada corrida cobre. O ciclo da corrida HD tem duas (uma de cada perna); um ciclo
 * que desenhe uma só, que se repete, dura metade do tempo.
 */
const RUN_STRIDES: Readonly<Record<string, number>> = { run: 2, 'carry-run': 2, [`${HEAVY}carry-run`]: 2 };

/**
 * Ciclo de corrida: os quadros `<nome>-N` da folha repartem o tempo que a corrida HD leva nas mesmas passadas, para a
 * cadência das pernas ser a mesma na velocidade de corrida. Com quadros demais para `HD_MIN_FRAME_MS`, o ciclo alonga.
 */
function runAnim(name: string, frames: string[]): AnimDef {
  const cycle = (RUN_FRAMES * HD_RUN_FRAME_MS * RUN_STRIDES[name]) / 2;
  const ms = Math.max(HD_MIN_FRAME_MS, Math.round(cycle / frames.length));
  return { frames, frameRate: Math.round(1000 / ms), repeat: -1, durations: frames.map(() => ms) };
}

/** Tempo de cada quadro (ms) da arrancada (`run-start`) e da freada (`run-stop`). */
const RUN_EDGE_MS = { 'run-start': 60, 'run-stop': 70 } as const;

/** Duração (ms) da arrancada ou da freada na folha; 0 se ela não tem os quadros. */
export function yutaRunEdgeMs(name: keyof typeof RUN_EDGE_MS): number {
  return sequence(name).length * RUN_EDGE_MS[name];
}

/** Animação do arremesso com o player em corrida, e o tempo total dela (ms). */
export const THROW_RUN = 'throw-run';
const THROW_RUN_MS = 200;

/**
 * A guarda respirando: com `idle-1` na folha, a guarda alterna o quadro base (mais tempo) e ele; com `idle-2` também,
 * volta ao base entre os dois, nos tempos do idle do player. Sem eles, fica parada no base.
 */
function idleAnim(frames: string[]): AnimDef {
  if (frames.length < 2) return { frames, frameRate: 2, repeat: -1 };
  if (frames.length === 2) return { frames, frameRate: 2, repeat: -1, durations: [620, 380] };
  const { frameRate, repeat, durations } = PLAYER_ANIMS.idle;
  return { frames: [frames[0], frames[1], frames[0], frames[2]], frameRate, repeat, durations };
}

let anims: Record<string, AnimDef> | undefined;

/** Animações do ar: os quadros são os que a folha tem, com o ritmo e a repetição da animação de mesmo nome do player. */
const AIR_ANIMS = ['jump', 'apex', 'fall', 'land'] as const;

/** A animação `name` do player com os quadros da folha; os tempos por quadro só valem se a contagem for a mesma. */
function likePlayerAnim(name: string, frames: string[]): AnimDef {
  const { frameRate, repeat, durations } = PLAYER_ANIMS[name];
  return { frames, frameRate, repeat, ...(durations?.length === frames.length ? { durations } : {}) };
}

/** Animação que toca uma vez, com `ms` por quadro (nunca menos que `HD_MIN_FRAME_MS`). */
function once(frames: string[], ms: number): AnimDef {
  const each = Math.max(HD_MIN_FRAME_MS, ms);
  return { frames, frameRate: Math.round(1000 / each), repeat: 0, durations: frames.map(() => each) };
}

type Anims = Record<string, AnimDef>;

/** Os laços da folha: a guarda respirando e as corridas, de mãos vazias e com objeto. */
function addLoops(out: Anims): void {
  const idle = sequence('idle');
  if (idle.length > 0) out.idle = idleAnim(idle);
  for (const name of Object.keys(RUN_STRIDES)) {
    const frames = sequence(name);
    if (frames.length > 0) out[name] = runAnim(name, frames);
  }
  for (const name of AIR_ANIMS) {
    const frames = sequence(name);
    if (frames.length > 0) out[name] = likePlayerAnim(name, frames);
  }
}

/**
 * As que tocam uma vez: o arremesso em corrida (e o da pegada pesada), dentro do tempo que a pose de arremesso fica
 * na tela, e a entrada e a saída da corrida, entre a guarda e o ciclo (veja `PlayerAnimator`).
 */
function addOneShots(out: Anims): void {
  for (const name of [THROW_RUN, HEAVY + THROW_RUN]) {
    const frames = sequence(name);
    if (frames.length > 0) out[name] = once(frames, Math.floor(THROW_RUN_MS / frames.length));
  }
  for (const [name, ms] of Object.entries(RUN_EDGE_MS)) {
    const frames = sequence(name);
    if (frames.length > 0) out[name] = once(frames, ms);
  }
}

/**
 * O resto das animações do player (objeto na mão, arremesso, dano) entra quando a folha tem todos os quadros dela; a
 * pegada pesada (objeto de duas mãos) é a mesma animação com os quadros `heavy-`. Com só o primeiro quadro do dano na
 * folha, ele sozinho faz a animação.
 */
function addPlayerAnims(out: Anims): void {
  for (const [name, def] of Object.entries(PLAYER_ANIMS)) {
    for (const prefix of ['', HEAVY]) {
      const frames = def.frames.map((f) => prefix + f);
      if (!(prefix + name in out) && frames.every(yutaHasFrame)) out[prefix + name] = { ...def, frames };
    }
  }
  const hurt = PLAYER_ANIMS.hurt.frames.filter(yutaHasFrame);
  if (!out.hurt && hurt.length > 0) out.hurt = likePlayerAnim('hurt', hurt);
}

/** As animações do player que a folha tem (as outras continuam na folha HD). */
export function yutaAnims(): Anims {
  if (anims) return anims;
  anims = {};
  addLoops(anims);
  addOneShots(anims);
  addPlayerAnims(anims);
  return anims;
}

/**
 * Quadro do golpe em curso na folha, ou `undefined` se ela não tem o golpe: `<golpe>-wind` na antecipação,
 * `<golpe>-hit` com a hitbox ligada e, na volta, `<golpe>-recover` quando existe (senão a antecipação de novo).
 */
export function yutaMoveFrame(moveName: string, phase: AttackPhase): string | undefined {
  const wind = `${moveName}-wind`;
  const hit = `${moveName}-hit`;
  if (!yutaHasFrame(wind) || !yutaHasFrame(hit)) return undefined;
  if (phase === 'startup') return wind;
  if (phase === 'active') return hit;
  const recover = `${moveName}-recover`;
  return yutaHasFrame(recover) ? recover : wind;
}

const HANDS: Readonly<Record<string, readonly number[]>> = YUTA_ATLAS_DATA.hands;

/**
 * Mão que conjura no quadro, em px de mundo a partir do pé do corpo (x para a frente, y negativo para cima), no
 * formato das âncoras da folha HD: é onde nasce o efeito da técnica e onde o objeto fica preso. O atlas só marca um
 * ponto, então as duas mãos e a ponta dos dedos ficam nele; sem ângulo marcado, o objeto fica deitado para a frente.
 * Quadro sem mão marcada: `undefined`.
 */
export function yutaAnchors(frameName: string): HdAnchors | undefined {
  const hand = HANDS[frameName];
  if (!hand) return undefined;
  const at = { x: hand[0] * YUTA_SCALE, y: -hand[1] * YUTA_SCALE };
  return { near: at, far: at, tip: at, nearAngle: hand[2] ?? 90 };
}

/** A animação `name` existe inteira na folha? */
export const yutaHasAnim = (name: string): boolean => name in yutaAnims();

/** Chave da animação `name` na folha `player-yuta`. */
export const playerYutaAnimKey = (name: string): string => `player-yuta-${name}`;
