/*
 * Montagem de uma pose a partir de alvos: o quadril e o tronco dão a base e a cinemática inversa posiciona braços e
 * pernas. Usado pelas poses do idle e do gancho ascendente.
 */
import { aimLimb, makePose, type Pose, type Vec2 } from '../skeleton';

export interface PoseSpec {
  hip: Vec2;
  /** Ângulo do tronco: 180 em pé, acima de 180 inclina para trás. */
  spine: number;
  neck?: number;
  /** Encurtamento de perspectiva dos braços (padrão 1: comprimento cheio). */
  armScale?: number;
  /** Ângulo local do ombro de perto: 90 (padrão) o deixa atrás do eixo; -90 o leva para a frente (soco). */
  shoulderNear?: number;
  armNear: { to: Vec2; bend: 1 | -1 };
  armFar: { to: Vec2; bend: 1 | -1 };
  legNear: { ankle: Vec2; foot: number; bend?: 1 | -1 };
  legFar: { ankle: Vec2; foot: number; bend?: 1 | -1 };
}

export function buildPose(s: PoseSpec): Pose {
  let p = makePose(s.hip, { spine: s.spine, neckBone: s.neck ?? 0, footNear: s.legNear.foot, footFar: s.legFar.foot, ...(s.shoulderNear === undefined ? {} : { shoulderNear: s.shoulderNear }) });
  if (s.armScale !== undefined) p.armScale = s.armScale;
  p = aimLimb(p, 'legNear', s.legNear.ankle, s.legNear.bend ?? 1);
  p = aimLimb(p, 'legFar', s.legFar.ankle, s.legFar.bend ?? 1);
  p = aimLimb(p, 'armNear', s.armNear.to, s.armNear.bend);
  p = aimLimb(p, 'armFar', s.armFar.to, s.armFar.bend);
  return p;
}
