/*
 * Corpo do player HD: braços e pernas com perfil, tronco do paletó, pescoço, mãos e sapatos, pintados a partir das
 * juntas de uma pose resolvida. A ordem de pintura é a profundidade: braço e perna de longe, perna de perto, pescoço,
 * tronco, cabeça e braço de perto (no golpe a cabeça fica por cima do braço, para o rosto continuar visível).
 * Puro, sem `phaser`.
 */
import { dir, solve, worldAngles, type JointName, type Pose, type Vec2 } from '../rig/skeleton';
import { paintHead, type Expression } from './head';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import {
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
  [0, 3.1, 3],
  [0.4, 3.1, 3.2],
  [1, 2.5, 2.4],
];
const FOREARM: Profile = [
  [0, 2.5, 2.4],
  [0.3, 2.7, 2.7],
  [1, 2, 1.9],
];
const THIGH: Profile = [
  [0, 3.8, 3.7],
  [0.35, 3.9, 3.7],
  [1, 3, 2.8],
];
const SHIN: Profile = [
  [0, 3, 2.8],
  [0.32, 3.4, 2.7],
  [1, 2.3, 2.2],
];
const NECK: Profile = [
  [0, 2.4, 2.3],
  [1, 2.2, 2.1],
];

/** Tronco: `[altura a partir do quadril, meia largura da frente, meia largura das costas]`, da barra à gola. */
const TORSO: Profile = [
  [-4.4, 4.8, 5],
  [0, 4.9, 5.1],
  [4.4, 4.3, 4.4],
  [8.8, 5.8, 5.6],
  [11.4, 6.1, 6.8],
  [12.8, 5.2, 5.9],
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
  // O alto dos ombros vira para cima e pega a luz.
  const ny = Math.min(0.6, Math.max(0, (u - 9.5) / 6));
  const k = Math.sqrt(1 - ny * ny);
  return { x: o * k, y: ny, z: Math.sqrt(1 - o * o) * k };
};

function paintArm(c: HdCanvas, j: Joints, side: 'Near' | 'Far', part: number): void {
  const far = side === 'Far';
  const o = { bias: far ? -1 : 0, rim: !far };
  const sh = j[`shoulder${side}`];
  const el = j[`elbow${side}`];
  const wr = j[`wrist${side}`];
  c.paint(limb(sh, el, UPPER_ARM), MAT.jacket, part, o);
  c.paint(limb(el, wr, FOREARM), MAT.jacket, part, o);
  // Mão fechada: o punho sai do pulso na direção do antebraço, com a linha dos nós dos dedos e o polegar.
  const len = Math.hypot(wr.x - el.x, wr.y - el.y) || 1;
  const hand = localOf(wr, { x: (wr.x - el.x) / len, y: (wr.y - el.y) / len });
  c.paint(inLocal(hand, localEllipse(0, 2.2, 2.7, 2.9)), MAT.skin, part, { bias: far ? -1 : 0 });
  if (far) return;
  c.paint(inLocal(hand, localRect(-2.6, 2.6, 3.1, 3.9)), MAT.skin, part, { onlyOn: part, flat: 1 });
  c.paint(inLocal(hand, localEllipse(1.9, 1.5, 1, 1.6)), MAT.skin, part, { flat: 3 });
}

function paintLeg(c: HdCanvas, j: Joints, footAngle: number, side: 'Near' | 'Far', part: number): void {
  const far = side === 'Far';
  const o = { bias: far ? -1 : 0 };
  const hip = j[`hip${side}`];
  const knee = j[`knee${side}`];
  const ankle = j[`ankle${side}`];
  c.paint(limb(hip, knee, THIGH), MAT.pants, part, o);
  c.paint(limb(knee, ankle, SHIN), MAT.pants, part, o);
  // Sapato: sola reta em `ANKLE_HEIGHT` abaixo do tornozelo, bico arredondado; gira com o ângulo do pé.
  const fd = dir(footAngle);
  const foot = localOf(ankle, { x: fd.y, y: -fd.x });
  const shoe: LocalShape = (f, u) => (u < -ANKLE_HEIGHT ? null : localEllipse(1.7, -1.3, 4.4, 2.7)(f, u));
  c.paint(inLocal(foot, shoe), MAT.shoe, part, { bias: far ? -1 : 0 });
  c.paint(inLocal(foot, localRect(-3, 6.2, -ANKLE_HEIGHT, -2.4)), MAT.white, part, { onlyOn: part, flat: far ? 0 : 1 });
}

function paintTorso(c: HdCanvas, spine: Local, part: number, len: number): void {
  c.paint(inLocal(spine, torsoShape), MAT.jacket, part, { rim: true });
  // Gola alta do uniforme, costura da frente e o botão dourado.
  c.paint(inLocal(spine, localEllipse(0.3, len + 1.9, 3.4, 1.7)), MAT.jacket, part, { bias: 1 });
  c.paint(inLocal(spine, localRect(2.3, 3.1, -4.4, len - 0.5)), MAT.jacket, part, { onlyOn: part, flat: 1 });
  c.paint(inLocal(spine, localRect(3.4, 5.2, len - 3.4, len - 1.6)), MAT.gold, part, { onlyOn: part, flat: 3 });
  c.paint(inLocal(spine, localRect(4.3, 5.2, len - 3.4, len - 2.5)), MAT.gold, part, { onlyOn: part, flat: 1 });
}

/** Pinta o corpo inteiro da pose na tela. Devolve as juntas resolvidas. */
export function paintBody(c: HdCanvas, pose: Pose, opts: BodyOpts): Joints {
  const j = solve(pose);
  const wa = worldAngles(pose);
  const spineUp = dir(wa.spine);
  const spine = localOf(j.hip, spineUp);
  const len = Math.hypot(j.chest.x - j.hip.x, j.chest.y - j.hip.y);
  const neckUp = dir(wa.neckBone);
  const headPart = opts.headOverNearArm ? 7 : 6;
  const armPart = opts.headOverNearArm ? 6 : 7;

  paintArm(c, j, 'Far', 1);
  paintLeg(c, j, wa.footFar, 'Far', 2);
  paintLeg(c, j, wa.footNear, 'Near', 3);
  c.paint(limb(toScreen(spine, 0, len), toScreen(localOf(j.neck, neckUp), 0.4, 2), NECK), MAT.skin, 4, { bias: -1 });
  paintTorso(c, spine, 5, len);
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
