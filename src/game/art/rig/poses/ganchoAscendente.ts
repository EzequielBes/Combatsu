/*
 * Gancho ascendente pelo boneco articulado: 3 poses-chave (wind, hit, recover) mais uma guarda de partida, e uma
 * sequência de quadros com antecipação (agacha além do wind) e overshoot (o punho passa do ponto do hit e volta).
 * Os alvos são pontos do frame de 32x30 (bordas de texel); a cinemática inversa devolve os ângulos.
 */
import { easeInOutCubic, inbetween } from '../interpolate';
import { rasterize, wristTexel, type RasterResult } from '../rasterize';
import type { Pose } from '../skeleton';
import { buildPose as build } from './build';

/*
 * O corpo tem pernas de 4,2 como o `idle-0`, então o quadril fica perto do chão em todas as poses (24 em pé) e o golpe
 * vem do braço de 13 texels esticado, sem esticar a perna. O braço encurta por perspectiva (`armScale`) quando fica
 * dobrado junto ao corpo e chega ao comprimento cheio só no hit.
 */

/** Guarda de partida (não é um dos 3 frames do jogo). */
export const POSE_GUARD: Pose = build({
  hip: { x: 10, y: 24.2 },
  spine: 178,
  armScale: 0.55,
  armNear: { to: { x: 13.5, y: 18.5 }, bend: -1 },
  armFar: { to: { x: 13, y: 16.5 }, bend: -1 },
  legNear: { ankle: { x: 13.5, y: 28.2 }, foot: 90 },
  legFar: { ankle: { x: 6.8, y: 28.2 }, foot: 90 },
});

/** Wind: agacha, joelhos dobrados, punho baixo perto do quadril. */
export const POSE_WIND: Pose = build({
  hip: { x: 9.4, y: 25 },
  spine: 172,
  armScale: 0.55,
  armNear: { to: { x: 12.4, y: 23.4 }, bend: -1 },
  armFar: { to: { x: 13, y: 17.5 }, bend: -1 },
  legNear: { ankle: { x: 14, y: 28.2 }, foot: 90 },
  legFar: { ankle: { x: 5.4, y: 28.2 }, foot: 90 },
});

/** Meio da subida: o punho passa pela frente do corpo, cotovelo baixo, já sobre a ponta dos pés. */
export const POSE_MID: Pose = build({
  hip: { x: 10.2, y: 23.6 },
  spine: 176,
  armScale: 0.8,
  armNear: { to: { x: 15.2, y: 14.6 }, bend: -1 },
  armFar: { to: { x: 13, y: 15.6 }, bend: -1 },
  legNear: { ankle: { x: 13.6, y: 27.6 }, foot: 70 },
  legFar: { ankle: { x: 6.6, y: 27.6 }, foot: 80 },
});

/** Hit: pernas esticadas na ponta do pé, braço da frente esticado na diagonal para cima, tronco um pouco à frente. */
export const POSE_HIT: Pose = build({
  hip: { x: 9.6, y: 23 },
  spine: 172,
  armNear: { to: { x: 17, y: 6.8 }, bend: -1 },
  armFar: { to: { x: 12.8, y: 13.6 }, bend: -1 },
  legNear: { ankle: { x: 13, y: 26.9 }, foot: 55 },
  legFar: { ankle: { x: 6.2, y: 26.2 }, foot: 35 },
});

/** Recover: desce, braço volta. */
export const POSE_RECOVER: Pose = build({
  hip: { x: 10.2, y: 24 },
  spine: 180,
  armScale: 0.85,
  armNear: { to: { x: 16.2, y: 10.4 }, bend: -1 },
  armFar: { to: { x: 13, y: 16.8 }, bend: -1 },
  legNear: { ankle: { x: 13.6, y: 28.2 }, foot: 90 },
  legFar: { ankle: { x: 6.4, y: 28.2 }, foot: 90 },
});

export const RIG_GANCHO_POSES = {
  'ganchoAscendente-wind': POSE_WIND,
  'ganchoAscendente-hit': POSE_HIT,
  'ganchoAscendente-recover': POSE_RECOVER,
} as const;

/** Os 3 frames do jogo, como grades de texto de 30 linhas x 32 colunas. */
export const RIG_GANCHO_FRAMES: Readonly<Record<keyof typeof RIG_GANCHO_POSES, readonly string[]>> = {
  'ganchoAscendente-wind': rasterize(POSE_WIND).frame,
  'ganchoAscendente-hit': rasterize(POSE_HIT).frame,
  'ganchoAscendente-recover': rasterize(POSE_RECOVER).frame,
};

/** Ponto de golpe do hit: o texel do pulso (RIG-06). */
export const RIG_GANCHO_STRIKE = wristTexel(rasterize(POSE_HIT).joints);

interface Step {
  from: Pose;
  to: Pose;
  t: number;
  ease?: (t: number) => number;
}

/** Quadros da animação: guarda, antecipação, wind, subida acelerando, hit, overshoot, e a volta até o recover. */
const STEPS: readonly Step[] = [
  { from: POSE_GUARD, to: POSE_WIND, t: 0 },
  { from: POSE_GUARD, to: POSE_WIND, t: 1.3 },
  { from: POSE_GUARD, to: POSE_WIND, t: 1 },
  { from: POSE_WIND, to: POSE_MID, t: 0.5 },
  { from: POSE_WIND, to: POSE_MID, t: 1 },
  { from: POSE_MID, to: POSE_HIT, t: 0.4 },
  { from: POSE_MID, to: POSE_HIT, t: 0.75 },
  { from: POSE_MID, to: POSE_HIT, t: 1 },
  { from: POSE_MID, to: POSE_HIT, t: 1.07 },
  { from: POSE_HIT, to: POSE_RECOVER, t: 0.35, ease: easeInOutCubic },
  { from: POSE_HIT, to: POSE_RECOVER, t: 0.75, ease: easeInOutCubic },
  { from: POSE_HIT, to: POSE_RECOVER, t: 1 },
];

export const RIG_GANCHO_SEQUENCE_POSES: readonly Pose[] = STEPS.map((s) =>
  inbetween(s.from, s.to, s.ease && s.t > 0 && s.t < 1 ? s.ease(s.t) : s.t),
);

export const RIG_GANCHO_SEQUENCE: readonly RasterResult[] = RIG_GANCHO_SEQUENCE_POSES.map((p) => rasterize(p));
