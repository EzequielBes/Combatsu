/*
 * Base das poses do player HD: o corpo de ~60 texels (as proporções do heroico alto vezes 1,875) e o `Kit` que as
 * famílias de poses (`families/`) usam para montar cada pose. Os alvos ficam em coordenadas do frame de 96x80 (bordas
 * de texel), com o eixo do corpo na coluna 36 e o chão na linha 79. Puro, sem `phaser`.
 */
import { buildPose, type PoseSpec } from '../rig/poses/build';
import { aimLimb, solve, type Pose, type Proportions, type Vec2 } from '../rig/skeleton';
import { ANKLE_HEIGHT } from './body';

/** Escala do heroico alto (32 texels) para o corpo HD (60): medidas herdadas dele se multiplicam por isto. */
export const K = 1.875;

/** O corpo HD. As espessuras de `thick` não são lidas pelo rasterizador HD (ele tem os próprios perfis). */
export const BODY_HD: Proportions = {
  name: 'hd',
  height: 60,
  head: 15,
  neck: 3,
  torso: 12.4,
  shoulderNear: 2.6,
  shoulderFar: 2.6,
  upperArm: 9,
  foreArm: 8.8,
  thigh: 13.6,
  shin: 12.7,
  foot: 5.2,
  footFar: 5.2,
  pelvisNear: 2.6,
  pelvisFar: 2.6,
  thick: {
    arm: { shoulder: 3, elbow: 2.5, wrist: 2 },
    leg: { hip: 3.8, knee: 3, ankle: 2.3 },
    hand: 1,
    shoe: 1.4,
    torso: { hip: 5, waist: 4.3, shoulder: 6.4, collar: 3, shoulderFrom: 10, taper: true, buttons: [] },
  },
};

export interface HdStage {
  w: number;
  h: number;
  originCol: number;
}

const LEGS = BODY_HD.thigh + BODY_HD.shin;
const ARM = BODY_HD.upperArm + BODY_HD.foreArm;

/** Tornozelos da guarda, à frente (perna de perto) e atrás (de longe) do eixo. */
const STANCE = { near: 9, far: -8.4 };

/** Linha do tornozelo com o pé no chão (a última linha do frame fica para o contorno). */
const groundOf = (s: HdStage): number => s.h - 1 - ANKLE_HEIGHT;

/** Interpolar ângulos não mantém o pé no chão: o tornozelo que afunda volta à linha do chão. */
function grounded(p: Pose, g: number): Pose {
  const j = solve(p);
  let out = p;
  for (const [leg, ankle] of [
    ['legNear', j.ankleNear],
    ['legFar', j.ankleFar],
  ] as const) {
    if (ankle.y > g) out = aimLimb(out, leg, { x: ankle.x, y: g }, 1);
  }
  return out;
}

/** O que uma família de poses recebe: as medidas do corpo no frame e os atalhos para montar poses. */
export interface Kit {
  stage: HdStage;
  /** Coluna do eixo do corpo. */
  cx: number;
  /** Linha do tornozelo com o pé no chão. */
  g: number;
  /** Linha do quadril em pé, com as pernas esticadas. */
  hy: number;
  /** Comprimento do braço (ombro ao pulso) e das pernas (quadril ao tornozelo). */
  arm: number;
  legs: number;
  /** Tornozelos da guarda em relação ao eixo: `near` à frente, `far` atrás. */
  stance: { near: number; far: number };
  /** Ponto do frame a `ahead` texels à frente do eixo do corpo e `up` texels acima do chão (1 texel = 1 px de mundo). */
  at(ahead: number, up: number): Vec2;
  /**
   * Monta uma pose do corpo HD (cinemática inversa nos braços e nas pernas). `shoulders` é opcional e muda, só nesta
   * pose, quanto cada ombro sai do eixo do peito (texels; padrão: o do corpo): é o giro de tronco fingido de perfil, o
   * ombro que bate projetado à frente e o outro recolhido atrás. O lado sai de `shoulderNear`/`shoulderFar`.
   */
  pose(spec: Omit<PoseSpec, 'body'> & { shoulders?: { near?: number; far?: number } }): Pose;
  /**
   * Guarda de luta: joelhos dobrados, tronco inclinado para o alvo e queixo recolhido, a mão da frente (de perto)
   * adiantada na altura do esterno e a de trás junto ao peito. `sink` abaixa o quadril e as mãos acompanham.
   */
  guard(sink?: number): Pose;
  /** Devolve a pose com o tornozelo que afundou abaixo do chão de volta à linha do chão. */
  grounded(p: Pose): Pose;
}

export function makeKit(stage: HdStage): Kit {
  const cx = stage.originCol;
  const g = groundOf(stage);
  const pose: Kit['pose'] = ({ shoulders: sh, ...spec }) => {
    const body = sh
      ? { ...BODY_HD, shoulderNear: sh.near ?? BODY_HD.shoulderNear, shoulderFar: sh.far ?? BODY_HD.shoulderFar }
      : BODY_HD;
    return buildPose({ ...spec, body });
  };
  return {
    stage,
    cx,
    g,
    hy: g - LEGS,
    arm: ARM,
    legs: LEGS,
    stance: STANCE,
    at: (ahead, up) => ({ x: cx + ahead, y: stage.h - 1 - up }),
    pose,
    guard: (sink = 0) =>
      pose({
        hip: { x: cx - 0.6, y: g - LEGS + 3.2 + sink },
        spine: 168,
        neck: 9,
        armNear: { rel: { x: ARM * 0.64, y: ARM * 0.32 + sink * 0.5 }, bend: -1 },
        armFar: { rel: { x: ARM * 0.36, y: -ARM * 0.08 + sink * 0.5 }, bend: -1 },
        legNear: { ankle: { x: cx + STANCE.near, y: g }, foot: 90 },
        legFar: { ankle: { x: cx + STANCE.far, y: g }, foot: 90 },
      }),
    grounded: (p) => grounded(p, g),
  };
}
