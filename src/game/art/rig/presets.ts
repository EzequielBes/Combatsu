/*
 * Presets de proporção do boneco (estudo do spike boneco-articulado). Os três do estudo medem de 24 a 26 texels em pé
 * (cabem no frame de 32x30 com a origem no pé); o `heroicoAlto` mede 32 e usa o frame de 40x40. Todos têm braço e
 * perna de perto e de longe do mesmo comprimento. Altura = cabeça + pescoço + tronco + coxa + canela + `SOLE`.
 */
import { HEAD_LARGE, HEAD_MEDIUM, HEAD_SMALL, HEAD_CHIBI, HEAD_TALL_FIGHT, HEAD_TALL_IDLE, type HeadSprite } from './heads';
import { CHIBI, type Proportions } from './skeleton';

/** A `heroico` (estilo Sifu): cabeça pequena, pernas pela metade da altura, ombros largos e cintura fina. */
export const HEROICO: Proportions = {
  name: 'heroico',
  height: 26,
  head: 5,
  neck: 1,
  torso: 7,
  shoulderNear: 0.7,
  shoulderFar: 0.7,
  upperArm: 3.6,
  foreArm: 3.5,
  thigh: 5.7,
  shin: 5.5,
  foot: 2.6,
  footFar: 2.6,
  pelvisNear: 1.3,
  pelvisFar: 1.3,
  thick: {
    arm: { shoulder: 1.4, elbow: 1.1, wrist: 0.95 },
    leg: { hip: 1.7, knee: 1.35, ankle: 1.1 },
    hand: 0.85,
    shoe: 0.68,
    torso: { hip: 2.6, waist: 2.3, shoulder: 4, collar: 1.8, shoulderFrom: 4.8, taper: true, buttons: [2.2, 3.8, 5.4] },
  },
};

/** A `semi`: cabeça de ~1/5 da altura, proporções equilibradas. */
export const SEMI: Proportions = {
  name: 'semi',
  height: 25,
  head: 6,
  neck: 0.9,
  torso: 6.3,
  shoulderNear: 0.7,
  shoulderFar: 0.7,
  upperArm: 3.3,
  foreArm: 3.3,
  thigh: 5,
  shin: 5,
  foot: 2.6,
  footFar: 2.6,
  pelvisNear: 1.5,
  pelvisFar: 1.5,
  thick: {
    arm: { shoulder: 1.45, elbow: 1.15, wrist: 1 },
    leg: { hip: 1.7, knee: 1.35, ankle: 1.1 },
    hand: 0.9,
    shoe: 0.68,
    torso: { hip: 2.7, waist: 2.5, shoulder: 3.7, collar: 2, shoulderFrom: 4.2, taper: true, buttons: [2, 3.5, 5] },
  },
};

/** A `inter`: cabeça de ~1/3,5, pernas bem mais longas que as do atual e braço proporcional. */
export const INTER: Proportions = {
  name: 'inter',
  height: 25,
  head: 8,
  neck: 0.8,
  torso: 5.8,
  shoulderNear: 0.7,
  shoulderFar: 0.7,
  upperArm: 3.4,
  foreArm: 3.4,
  thigh: 4.4,
  shin: 4.2,
  foot: 2.5,
  footFar: 2.5,
  pelvisNear: 1.6,
  pelvisFar: 1.6,
  thick: {
    arm: { shoulder: 1.5, elbow: 1.2, wrist: 1.05 },
    leg: { hip: 1.7, knee: 1.4, ankle: 1.15 },
    hand: 0.95,
    shoe: 0.7,
    torso: { hip: 2.8, waist: 2.6, shoulder: 3.6, collar: 2.2, shoulderFrom: 3.8, taper: true, buttons: [1.9, 3.3, 4.7] },
  },
};

/**
 * O heroico alto (PRA-01): o `heroico` reescalado para 32 texels em pé, com a cabeça (8 linhas com os espetos) em 1/4
 * da altura, as pernas (coxa + canela + sapato) em metade, ombros em V sobre a cintura fina e os dois lados iguais.
 * Vive no frame de 40x40 (`RIG_FRAME_40`): 32 de corpo mais a folga para o punho acima da cabeça.
 */
export const HEROICO_ALTO: Proportions = {
  name: 'heroicoAlto',
  height: 32,
  head: 8,
  neck: 1.6,
  torso: 6.6,
  shoulderNear: 1.4,
  shoulderFar: 1.4,
  upperArm: 4.8,
  foreArm: 4.7,
  thigh: 7.4,
  shin: 6.6,
  foot: 2.8,
  footFar: 2.8,
  pelvisNear: 1.5,
  pelvisFar: 1.5,
  thick: {
    arm: { shoulder: 1.5, elbow: 1.2, wrist: 1 },
    leg: { hip: 1.8, knee: 1.45, ankle: 1.15 },
    hand: 1,
    shoe: 0.72,
    torso: { hip: 2.7, waist: 2.4, shoulder: 4.3, collar: 1.7, shoulderFrom: 5.4, taper: true, buttons: [2.2, 3.8, 5.4] },
  },
};

/** Os presets do estudo, na ordem A, B, C. */
export const PRESETS: readonly Proportions[] = [HEROICO, SEMI, INTER];

/** Expressão da cabeça: `idle` (concentrado) ou `fight` (esforço, nos golpes). */
export type HeadMood = 'idle' | 'fight';

const HEADS: Record<string, { idle: HeadSprite; fight?: HeadSprite }> = {
  [CHIBI.name]: { idle: HEAD_CHIBI },
  heroico: { idle: HEAD_SMALL },
  semi: { idle: HEAD_MEDIUM },
  inter: { idle: HEAD_LARGE },
  heroicoAlto: { idle: HEAD_TALL_IDLE, fight: HEAD_TALL_FIGHT },
};

/** Cabeça do corpo na expressão pedida (a do chibi se o corpo não tem cabeça própria; a de idle se não tem a de luta). */
export function headOf(body: Proportions, mood: HeadMood = 'idle'): HeadSprite {
  const heads = HEADS[body.name] ?? { idle: HEAD_CHIBI };
  return (mood === 'fight' && heads.fight) || heads.idle;
}
