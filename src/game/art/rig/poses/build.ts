/*
 * Montagem de uma pose a partir de alvos: o quadril e o tronco dão a base e a cinemática inversa posiciona braços e
 * pernas. Usado pelas poses do idle e do gancho ascendente.
 */
import { aimLimb, makePose, solve, type Pose, type Proportions, type Vec2 } from '../skeleton';

/** Alvo de um braço: ponto do frame (`to`) ou deslocamento a partir do ombro já posicionado (`rel`). */
export interface ArmTarget {
  to?: Vec2;
  rel?: Vec2;
  bend: 1 | -1;
}

export interface PoseSpec {
  hip: Vec2;
  /** Ângulo do tronco: 180 em pé, acima de 180 inclina para trás. */
  spine: number;
  neck?: number;
  /** Encurtamento de perspectiva dos braços (padrão 1: comprimento cheio). */
  armScale?: number;
  /** Escala só da mão (padrão: a do braço). */
  handScale?: number;
  /** Ângulo local do ombro de perto: 90 (padrão) o deixa atrás do eixo; -90 o leva para a frente (soco). */
  shoulderNear?: number;
  /** Proporções do corpo (padrão: o chibi `atual`). */
  body?: Proportions;
  armNear: ArmTarget;
  armFar: ArmTarget;
  legNear: { ankle: Vec2; foot: number; bend?: 1 | -1 };
  legFar: { ankle: Vec2; foot: number; bend?: 1 | -1 };
}

export function buildPose(s: PoseSpec): Pose {
  let p = makePose(
    s.hip,
    {
      spine: s.spine,
      neckBone: s.neck ?? 0,
      footNear: s.legNear.foot,
      footFar: s.legFar.foot,
      ...(s.shoulderNear === undefined ? {} : { shoulderNear: s.shoulderNear }),
    },
    s.body,
  );
  if (s.armScale !== undefined) p.armScale = s.armScale;
  if (s.handScale !== undefined) p.handScale = s.handScale;
  p = aimLimb(p, 'legNear', s.legNear.ankle, s.legNear.bend ?? 1);
  p = aimLimb(p, 'legFar', s.legFar.ankle, s.legFar.bend ?? 1);
  for (const [limb, joint, t] of [
    ['armNear', 'shoulderNear', s.armNear],
    ['armFar', 'shoulderFar', s.armFar],
  ] as const) {
    const sh = solve(p)[joint];
    const to = t.to ?? { x: sh.x + (t.rel?.x ?? 0), y: sh.y + (t.rel?.y ?? 0) };
    p = aimLimb(p, limb, to, t.bend);
  }
  return p;
}
