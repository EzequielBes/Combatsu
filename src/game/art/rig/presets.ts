/*
 * Presets de proporção do boneco (estudo do spike boneco-articulado). Todos medem de 24 a 26 texels em pé (cabem no
 * frame de 32x30 com a origem no pé), com braço e perna de perto e de longe do mesmo comprimento.
 * Altura = cabeça + pescoço + tronco + coxa + canela + `SOLE`.
 */
import { HEAD_LARGE, HEAD_MEDIUM, HEAD_SMALL, HEAD_CHIBI, type HeadSprite } from './heads';
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
    leg: { hip: 1.5, knee: 1.15, ankle: 0.95 },
    hand: 0.85,
    shoe: 0.6,
    torso: { hip: 2.6, waist: 2.3, shoulder: 3.5, collar: 1.7, shoulderFrom: 4.8, taper: true, buttons: [2.2, 3.8, 5.4] },
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
    leg: { hip: 1.55, knee: 1.2, ankle: 1 },
    hand: 0.9,
    shoe: 0.62,
    torso: { hip: 2.7, waist: 2.5, shoulder: 3.3, collar: 1.9, shoulderFrom: 4.2, taper: true, buttons: [2, 3.5, 5] },
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
  upperArm: 3.1,
  foreArm: 3.1,
  thigh: 4.4,
  shin: 4.2,
  foot: 2.5,
  footFar: 2.5,
  pelvisNear: 1.6,
  pelvisFar: 1.6,
  thick: {
    arm: { shoulder: 1.5, elbow: 1.2, wrist: 1.05 },
    leg: { hip: 1.55, knee: 1.25, ankle: 1.05 },
    hand: 0.95,
    shoe: 0.62,
    torso: { hip: 2.8, waist: 2.6, shoulder: 3.2, collar: 2.2, shoulderFrom: 3.8, taper: true, buttons: [1.9, 3.3, 4.7] },
  },
};

/** Os presets do estudo, na ordem A, B, C. */
export const PRESETS: readonly Proportions[] = [HEROICO, SEMI, INTER];

const HEADS: Record<string, HeadSprite> = { [CHIBI.name]: HEAD_CHIBI, heroico: HEAD_SMALL, semi: HEAD_MEDIUM, inter: HEAD_LARGE };

/** Cabeça do corpo (a do chibi se o corpo não tem cabeça própria). */
export function headOf(body: Proportions): HeadSprite {
  return HEADS[body.name] ?? HEAD_CHIBI;
}
