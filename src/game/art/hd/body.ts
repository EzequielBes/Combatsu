/*
 * Corpo do player HD: braços e pernas com perfil, tronco do paletó, pescoço, mãos e sapatos, pintados a partir das
 * juntas de uma pose resolvida. A ordem de pintura é a profundidade: braço e perna de longe, perna de perto, pescoço,
 * tronco, cabeça e braço de perto (com `headOverNearArm` a cabeça fica por cima do braço).
 * Puro, sem `phaser`.
 */
import { dir, solve, worldAngles, type JointName, type Pose, type Vec2 } from '../rig/skeleton';
import { paintHead, type Expression } from './head';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import {
  along,
  ellipse,
  inLocal,
  limb,
  localEllipse,
  localOf,
  localRect,
  radiusAt,
  toScreen,
  type Local,
  type LocalShape,
  type Profile,
} from './shapes';

/** Perfis dos membros (lado + = trás num membro pendurado): deltoide e tríceps, antebraço, coxa e panturrilha. */
const UPPER_ARM: Profile = [
  [0, 3.3, 3.1],
  [0.4, 3, 3.1],
  [1, 2.4, 2.3],
];
const FOREARM: Profile = [
  [0, 2.4, 2.3],
  [0.3, 2.7, 2.6],
  [1, 2, 1.9],
];
/** Coxa com o volume atrás (glúteo e posterior) e joelho estreito. */
const THIGH: Profile = [
  [0, 4.1, 3.5],
  [0.35, 3.9, 3.6],
  [1, 2.7, 2.9],
];
/** Canela: a patela na frente logo abaixo do joelho e a panturrilha atrás. */
const SHIN: Profile = [
  [0, 2.6, 3.1],
  [0.12, 2.9, 2.8],
  [0.34, 3.4, 2.6],
  [1, 2.2, 2.1],
];
const NECK: Profile = [
  [0, 2.1, 2],
  [1, 2, 1.9],
];

/** Tronco: `[altura a partir do quadril, meia largura da frente, meia largura das costas]`, da barra à gola. */
const TORSO: Profile = [
  [-6.4, 4.9, 5.1],
  [0, 4.9, 5.1],
  [4.4, 3.9, 4.1],
  [8.4, 6, 5.8],
  [10.8, 7.2, 7.5],
  [12.8, 5.6, 6.2],
  [14.2, 2.8, 3],
];

/** Do tornozelo ao chão (a altura do sapato abaixo da junta). */
export const ANKLE_HEIGHT = 3.3;

export interface BodyOpts {
  expr: Expression;
  /** A cabeça por cima do braço de perto (golpes em que o braço sobe rente ao rosto). */
  headOverNearArm?: boolean;
}

type Joints = Record<JointName, Vec2>;

const torsoShape: LocalShape = (f, u) => {
  if (u < TORSO[0][0] || u > TORSO[TORSO.length - 1][0]) return null;
  const [front, back] = radiusAt(TORSO, u);
  const o = f / (f >= 0 ? front : back);
  if (Math.abs(o) > 1) return null;
  // O alto dos ombros vira para cima e pega a luz; a luz de recorte só acende do peito para cima.
  const ny = Math.min(0.6, Math.max(0, (u - 9.5) / 6));
  const k = Math.sqrt(1 - ny * ny);
  return { x: o * k, y: ny, z: Math.sqrt(1 - o * o) * k, noRim: u < 7.4, dt: u < -5.4 ? -2 : 0 };
};

function paintHand(c: HdCanvas, wrist: Vec2, elbow: Vec2, part: number, far: boolean): void {
  const len = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y) || 1;
  const hand = localOf(wrist, { x: (wrist.x - elbow.x) / len, y: (wrist.y - elbow.y) / len });
  // Punho em tom chapado (sem sombra de almofada), com o polegar, a linha dos nós dos dedos e um realce em cima.
  const tone = far ? 2 : 3;
  c.paint(inLocal(hand, localEllipse(0, 1.9, 2.7, 2.3)), MAT.skin, part, { flat: tone });
  if (far) return;
  c.paint(inLocal(hand, localEllipse(2.2, 1.3, 1, 1.2)), MAT.skin, part, { flat: 3 });
  c.paint(inLocal(hand, localRect(-2.4, 2.4, 2.5, 3.5)), MAT.skin, part, { onlyOn: part, flat: 2 });
  const mid = toScreen(hand, 0, 1.9);
  c.paint(ellipse({ x: mid.x + 0.6, y: mid.y - 1.2 }, 1.3, 0.8), MAT.skin, part, { onlyOn: part, flat: 4 });
}

function paintArm(c: HdCanvas, j: Joints, side: 'Near' | 'Far', part: number): void {
  const far = side === 'Far';
  const o = { bias: far ? -1 : 0, rim: !far };
  const sh = j[`shoulder${side}`];
  const el = j[`elbow${side}`];
  const wr = j[`wrist${side}`];
  // A luz de recorte fica só no ombro; o antebraço escurece sob o cotovelo e fecha no punho da manga.
  c.paint(
    along(limb(sh, el, UPPER_ARM), (t) => ({ noRim: t > 0.5 })),
    MAT.jacket,
    part,
    o,
  );
  const sleeve = along(limb(el, wr, FOREARM), (t) => ({ noRim: true, dt: t < 0.3 ? -1 : t > 0.86 ? -2 : 0 }));
  c.paint(sleeve, MAT.jacket, part, o);
  paintHand(c, wr, el, part, far);
}

function paintLeg(c: HdCanvas, j: Joints, footAngle: number, side: 'Near' | 'Far', part: number): void {
  const far = side === 'Far';
  const o = { bias: far ? -1 : 0 };
  const hip = j[`hip${side}`];
  const knee = j[`knee${side}`];
  const ankle = j[`ankle${side}`];
  // A coxa escurece no terço de baixo (sombra do joelho) e a canela na barra da calça.
  c.paint(
    along(limb(hip, knee, THIGH), (t) => ({ dt: t > 0.7 ? -1 : 0 })),
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
  // Sapato: sola reta em `ANKLE_HEIGHT` abaixo do tornozelo, bico arredondado; gira com o ângulo do pé.
  const fd = dir(footAngle);
  const foot = localOf(ankle, { x: fd.y, y: -fd.x });
  const shoe: LocalShape = (f, u) => (u < -ANKLE_HEIGHT ? null : localEllipse(1.7, -1.3, 4.4, 2.7)(f, u));
  c.paint(inLocal(foot, shoe), MAT.shoe, part, { bias: far ? 0 : 1 });
  c.paint(inLocal(foot, localRect(-3, 6.2, -ANKLE_HEIGHT, -2.4)), MAT.white, part, { onlyOn: part, flat: far ? 0 : 1 });
}

function paintTorso(c: HdCanvas, spine: Local, part: number, len: number): void {
  c.paint(inLocal(spine, torsoShape), MAT.jacket, part, { rim: true });
  const on = { onlyOn: part };
  // Costura da frente, interrompida em dois pontos, e o botão dourado.
  const seam: LocalShape = (f, u) => {
    const gap = (u > 1.6 && u < 2.8) || (u > 6.2 && u < 7.2);
    return gap ? null : localRect(2.6, 3.6, -5.4, len - 2)(f, u);
  };
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
  const headPart = opts.headOverNearArm ? 7 : 6;
  const armPart = opts.headOverNearArm ? 6 : 7;

  paintArm(c, j, 'Far', 1);
  paintLeg(c, j, wa.footFar, 'Far', 2);
  paintLeg(c, j, wa.footNear, 'Near', 3);
  c.paint(limb(toScreen(spine, 0, len), toScreen(localOf(j.neck, neckUp), 0.4, 3), NECK), MAT.skin, 4, { bias: -1 });
  paintTorso(c, spine, 5, len);
  // Sombra projetada do braço de perto no paletó: o braço deslocado para trás e para baixo, só sobre o tronco.
  const cast = (p: Vec2): Vec2 => ({ x: p.x - 1.6, y: p.y + 1.2 });
  for (const [a, b, prof] of [
    [j.shoulderNear, j.elbowNear, UPPER_ARM],
    [j.elbowNear, j.wristNear, FOREARM],
  ] as const)
    c.paint(limb(cast(a), cast(b), prof), MAT.jacket, 5, { onlyOn: 5, flat: 1 });
  const head = (): void => paintHead(c, localOf(j.neck, neckUp), headPart, opts.expr);
  const arm = (): void => paintArm(c, j, 'Near', armPart);
  if (opts.headOverNearArm) {
    arm();
    head();
  } else {
    head();
    arm();
  }
  return j;
}
