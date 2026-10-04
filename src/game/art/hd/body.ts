/*
 * Corpo do player HD: braços e pernas com perfil, tronco do paletó, pescoço, mãos e sapatos, pintados a partir das
 * juntas de uma pose resolvida. A ordem de pintura é a profundidade: braço e perna de longe, perna de perto, pescoço,
 * tronco, cabeça e braço de perto (com `headOverNearArm` a cabeça fica por cima do braço).
 * Puro, sem `phaser`.
 */
import { dir, solve, worldAngles, type JointName, type Pose, type Vec2 } from '../rig/skeleton';
import type { FarFront, HandShape, Hands } from './frames';
import { paintHand } from './hand';
import { paintHead, type Expression } from './head';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import {
  along,
  inLocal,
  limb,
  localOf,
  localRect,
  radiusAt,
  toScreen,
  type Local,
  boxed,
  type LocalShape,
  type Profile,
} from './shapes';

/** Perfis dos membros (lado + = trás num membro pendurado): deltoide e tríceps, antebraço, coxa e panturrilha. */
const UPPER_ARM: Profile = [
  [0, 3.1, 3],
  [0.35, 3, 3],
  [1, 2.4, 2.3],
];
const FOREARM: Profile = [
  [0, 2.5, 2.4],
  [0.3, 2.7, 2.6],
  [1, 1.9, 1.8],
];
/** Coxa forte, com o volume atrás (glúteo e posterior), afinando até o joelho. */
const THIGH: Profile = [
  [0, 4.3, 3.8],
  [0.4, 4, 3.8],
  [1, 2.9, 3],
];
/** Canela: a patela na frente logo abaixo do joelho, a panturrilha atrás e a barra da calça abrindo sobre o sapato. */
const SHIN: Profile = [
  [0, 2.8, 3.2],
  [0.12, 3, 2.9],
  [0.36, 3.7, 2.7],
  [0.86, 2.4, 2.3],
  [1, 2.8, 2.7],
];
const NECK: Profile = [
  [0, 2.1, 2],
  [1, 2, 1.9],
];

/**
 * Tronco: `[altura a partir do quadril, meia largura da frente, meia largura das costas]`, da barra à gola. Peito à
 * frente, cintura estreita e a barra do paletó logo abaixo do quadril (curto, para a perna ler comprida).
 */
const TORSO: Profile = [
  [-3.6, 4.5, 4.8],
  [0, 4.5, 4.7],
  [4.2, 4.1, 4.2],
  [8.4, 5.7, 5.2],
  [10.8, 6.5, 6.7],
  [12.8, 5.2, 5.8],
  [14.2, 2.8, 3],
];

/** Do tornozelo ao chão (a altura do sapato abaixo da junta). */
export const ANKLE_HEIGHT = 3.3;

export interface BodyOpts {
  expr: Expression;
  /** Forma das mãos (padrão: punho fechado). */
  hands?: Hands;
  /** A cabeça por cima do braço de perto (golpes em que o braço sobe rente ao rosto). */
  headOverNearArm?: boolean;
  /** Membro de longe pintado na frente do corpo, nos tons do lado de perto. */
  farFront?: FarFront;
}

type Joints = Record<JointName, Vec2>;

const torsoShape: LocalShape = boxed(
  (f, u) => {
    if (u < TORSO[0][0] || u > TORSO[TORSO.length - 1][0]) return null;
    const [front, back] = radiusAt(TORSO, u);
    const o = f / (f >= 0 ? front : back);
    if (Math.abs(o) > 1) return null;
    // O alto dos ombros vira para cima e pega a luz; a luz de recorte só acende do peito para cima.
    const ny = Math.min(0.6, Math.max(0, (u - 9.5) / 6));
    const k = Math.sqrt(1 - ny * ny);
    return { x: o * k, y: ny, z: Math.sqrt(1 - o * o) * k, noRim: u < 7.4, dt: u < -2.6 ? -2 : 0 };
  },
  [-8, 8, -4, 14.5],
);

/** `dim`: o braço fica um tom abaixo e sem luz de recorte (o lado de longe, quando está atrás do corpo). */
function paintArm(c: HdCanvas, j: Joints, side: 'Near' | 'Far', part: number, hand: HandShape, dim: boolean): void {
  const far = dim;
  const o = { bias: far ? -1 : 0, rim: !far };
  const sh = j[`shoulder${side}`];
  const el = j[`elbow${side}`];
  const wr = j[`wrist${side}`];
  // A luz de recorte fica só no ombro; o antebraço escurece sob o cotovelo e fecha no punho da manga.
  c.paint(
    along(limb(sh, el, UPPER_ARM), (t) => ({ noRim: t > 0.3 })),
    MAT.jacket,
    part,
    o,
  );
  const sleeve = along(limb(el, wr, FOREARM), (t) => ({ noRim: true, dt: t < 0.3 ? -1 : t > 0.86 ? -2 : 0 }));
  c.paint(sleeve, MAT.jacket, part, o);
  paintHand(c, wr, el, part, far, hand);
}

function paintLeg(c: HdCanvas, j: Joints, footAngle: number, side: 'Near' | 'Far', part: number, dim: boolean): void {
  const far = dim;
  const o = { bias: far ? -1 : 0 };
  const hip = j[`hip${side}`];
  const knee = j[`knee${side}`];
  const ankle = j[`ankle${side}`];
  // A coxa escurece no terço de baixo (sombra do joelho) e a canela na barra da calça.
  c.paint(
    along(limb(hip, knee, THIGH), (t, s) => ({ dt: t > 0.78 && s < 0 ? -1 : 0 })),
    MAT.pants,
    part,
    o,
  );
  c.paint(
    along(limb(knee, ankle, SHIN), (t) => ({ dt: t > 0.9 ? -1 : 0 })),
    MAT.pants,
    part,
    o,
  );
  paintShoe(c, ankle, footAngle, part, far);
}

/** Linha de cima do sapato em `f` (à frente do tornozelo): o cano junto ao tornozelo e o peito do pé descendo ao bico. */
const shoeTop = (f: number): number => (f < 1.6 ? 1.3 : 1.3 - (f - 1.6) * 0.3);

/** Sapato no sistema local do pé (`f` para o bico, `u` para cima a partir do tornozelo): salto reto, bico arredondado. */
const shoe: LocalShape = boxed(
  (f, u) => {
    if (f < -2.8 || f > 6.8 || u < -ANKLE_HEIGHT || u > shoeTop(f)) return null;
    if (f > 5.4 && u > -0.6 - (f - 5.4) * 1.2) return null;
    if (f < -2 && u > 0.4) return null;
    // O peito do pé olha para cima e pega a luz; a lateral fica no tom médio.
    const up = u > shoeTop(f) - 1.1 ? 0.75 : 0.1;
    return { x: 0.25, y: up, z: Math.sqrt(1 - 0.0625 - up * up) };
  },
  [-3, 7, -ANKLE_HEIGHT, 1.5],
);

/** Sapato de couro escuro com a sola clara de 1 texel e o salto marcado; gira com o ângulo do pé. */
function paintShoe(c: HdCanvas, ankle: Vec2, footAngle: number, part: number, far: boolean): void {
  const fd = dir(footAngle);
  const foot = localOf(ankle, { x: fd.y, y: -fd.x });
  const on = { onlyOn: part };
  c.paint(inLocal(foot, shoe), MAT.shoe, part, { bias: far ? 0 : 1 });
  c.paint(inLocal(foot, localRect(-2.8, 6.8, -ANKLE_HEIGHT, -2.3)), MAT.white, part, { ...on, flat: 0 });
  c.paint(inLocal(foot, localRect(-2.8, -0.8, -2.3, -1.3)), MAT.shoe, part, { ...on, flat: 0 });
}

function paintTorso(c: HdCanvas, spine: Local, part: number, len: number): void {
  c.paint(inLocal(spine, torsoShape), MAT.jacket, part, { rim: true });
  const on = { onlyOn: part };
  // Costura da frente, interrompida em dois pontos, e o botão dourado.
  const seam: LocalShape = boxed(
    (f, u) => {
      const gap = (u > 1.6 && u < 2.8) || (u > 6.2 && u < 7.2);
      return gap ? null : localRect(2.4, 3.4, -2.6, len - 2)(f, u);
    },
    [2.4, 3.4, -2.6, len],
  );
  c.paint(inLocal(spine, seam), MAT.jacket, part, { ...on, flat: 1 });
  c.paint(inLocal(spine, localRect(4, 6, len - 3.6, len - 1.6)), MAT.gold, part, { ...on, flat: 3 });
  c.paint(inLocal(spine, localRect(5, 6, len - 3.6, len - 2.6)), MAT.gold, part, { ...on, flat: 1 });
  // Gola alta: uma faixa clara com a linha de sombra por baixo.
  c.paint(inLocal(spine, localRect(-2.6, 3.4, len - 1.2, len - 0.2)), MAT.jacket, part, { ...on, flat: 0 });
  c.paint(inLocal(spine, localRect(-2.4, 3.2, len - 0.2, len + 2)), MAT.jacket, part, { flat: 3 });
}

/** Pinta o corpo inteiro da pose na tela. Devolve as juntas resolvidas. */
export function paintBody(c: HdCanvas, pose: Pose, opts: BodyOpts): Joints {
  const j = solve(pose);
  const wa = worldAngles(pose);
  const spine = localOf(j.hip, dir(wa.spine));
  const len = Math.hypot(j.chest.x - j.hip.x, j.chest.y - j.hip.y);
  const neckUp = dir(wa.neckBone);
  const front = opts.farFront ?? {};
  // A parte de cada camada é a sua posição na ordem de pintura: a linha interna cai sempre na camada de trás.
  let part = 0;
  const farArm = (dim: boolean): void => paintArm(c, j, 'Far', ++part, opts.hands?.far ?? 'fist', dim);
  const farLeg = (dim: boolean): void => paintLeg(c, j, wa.footFar, 'Far', ++part, dim);

  if (!front.arm) farArm(true);
  if (!front.leg) farLeg(true);
  paintLeg(c, j, wa.footNear, 'Near', ++part, false);
  if (front.leg) farLeg(false);
  const neck = limb(toScreen(spine, 0, len), toScreen(localOf(j.neck, neckUp), 0.4, 3), NECK);
  c.paint(neck, MAT.skin, ++part, { bias: -1 });
  const torso = ++part;
  paintTorso(c, spine, torso, len);
  // Sombra projetada do braço de perto no paletó: o braço deslocado para trás e para baixo, só sobre o tronco.
  const cast = (p: Vec2): Vec2 => ({ x: p.x - 1, y: p.y + 1 });
  for (const [a, b, prof] of [
    [j.shoulderNear, j.elbowNear, UPPER_ARM],
    [j.elbowNear, j.wristNear, FOREARM],
  ] as const)
    c.paint(limb(cast(a), cast(b), prof), MAT.jacket, torso, { onlyOn: torso, darken: 1 });
  const head = (): void => paintHead(c, localOf(j.neck, neckUp), ++part, opts.expr);
  const arm = (): void => paintArm(c, j, 'Near', ++part, opts.hands?.near ?? 'fist', false);
  if (opts.headOverNearArm) {
    arm();
    head();
  } else {
    head();
    arm();
  }
  if (front.arm) farArm(false);
  return j;
}
