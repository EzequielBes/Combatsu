/*
 * Esqueleto 2D do boneco articulado (spike boneco-articulado). Puro, sem `phaser`: roda no Vitest e no Node.
 *
 * Coordenadas: bordas de texel no frame de 32x30 (o texel (i, j) cobre [i, i+1) x [j, j+1)), x para a direita
 * (o player olha para a direita) e y para baixo. Ângulos em graus: 0 aponta para baixo, 90 para a frente (+x),
 * 180 para cima e -90 (ou 270) para trás; a direção de um ângulo `a` é (sin a, cos a).
 *
 * Hierarquia de juntas: quadril (raiz) -> peito -> pescoço; peito -> ombro perto/longe -> cotovelo -> pulso;
 * quadril -> quadril perto/longe -> joelho -> tornozelo (-> ponta do pé). Cada osso tem comprimento fixo em texels.
 * A cabeça não é um osso: é uma grade pronta carimbada no pescoço (ver `rasterize`).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type JointName =
  | 'hip'
  | 'chest'
  | 'neck'
  | 'shoulderNear'
  | 'elbowNear'
  | 'wristNear'
  | 'shoulderFar'
  | 'elbowFar'
  | 'wristFar'
  | 'hipNear'
  | 'kneeNear'
  | 'ankleNear'
  | 'toeNear'
  | 'hipFar'
  | 'kneeFar'
  | 'ankleFar'
  | 'toeFar';

export type BoneName =
  | 'spine'
  | 'neckBone'
  | 'shoulderNear'
  | 'upperArmNear'
  | 'foreArmNear'
  | 'shoulderFar'
  | 'upperArmFar'
  | 'foreArmFar'
  | 'pelvisNear'
  | 'thighNear'
  | 'shinNear'
  | 'footNear'
  | 'pelvisFar'
  | 'thighFar'
  | 'shinFar'
  | 'footFar';

export interface Bone {
  name: BoneName;
  from: JointName;
  to: JointName;
  /** Comprimento fixo, em texels. */
  length: number;
  /** Osso cujo ângulo é somado ao local; `null` = o ângulo é absoluto (em relação ao quadro do frame). */
  parent: BoneName | null;
}

/*
 * Medidas tiradas do `idle-0` (grade 32x30): cabeça de 11 linhas (6..16), tronco de 7 linhas do cinto (quadril, linha 24)
 * ao pescoço (linha 17) com o peito a 5,4 do quadril, onde ficam os ombros; ombro de perto 0,8 atrás da vertical do
 * pescoço (o braço do idle cai por aí, com miolo de 2 texels), quadris a 3 à frente e 2 atrás do eixo (pernas de 4 texels com 1
 * de vão), coxa + canela de 4,2 (do quadril, linha 24, ao tornozelo, linha 28,2) e sapato de 3 texels (o de longe é mais curto, para o vão entre os pés). O braço (6,5 + 6,5) é mais longo que o do idle
 * (5,5 do ombro à mão, de lado): o gancho esticado precisa de ~13 texels do ombro ao punho; o idle usa `armScale` para
 * encurtar o braço por perspectiva (SPEC_DEVIATION de proporção, ver spec RIG-06).
 */
export const BONES: readonly Bone[] = [
  { name: 'spine', from: 'hip', to: 'chest', length: 5.4, parent: null },
  { name: 'neckBone', from: 'chest', to: 'neck', length: 1.6, parent: 'spine' },
  { name: 'shoulderNear', from: 'chest', to: 'shoulderNear', length: 0.8, parent: 'spine' },
  { name: 'upperArmNear', from: 'shoulderNear', to: 'elbowNear', length: 6.5, parent: null },
  { name: 'foreArmNear', from: 'elbowNear', to: 'wristNear', length: 6.5, parent: 'upperArmNear' },
  { name: 'shoulderFar', from: 'chest', to: 'shoulderFar', length: 0.4, parent: 'spine' },
  { name: 'upperArmFar', from: 'shoulderFar', to: 'elbowFar', length: 6.5, parent: null },
  { name: 'foreArmFar', from: 'elbowFar', to: 'wristFar', length: 6.5, parent: 'upperArmFar' },
  { name: 'pelvisNear', from: 'hip', to: 'hipNear', length: 3, parent: null },
  { name: 'thighNear', from: 'hipNear', to: 'kneeNear', length: 2.1, parent: null },
  { name: 'shinNear', from: 'kneeNear', to: 'ankleNear', length: 2.1, parent: 'thighNear' },
  { name: 'footNear', from: 'ankleNear', to: 'toeNear', length: 2.4, parent: null },
  { name: 'pelvisFar', from: 'hip', to: 'hipFar', length: 2, parent: null },
  { name: 'thighFar', from: 'hipFar', to: 'kneeFar', length: 2.1, parent: null },
  { name: 'shinFar', from: 'kneeFar', to: 'ankleFar', length: 2.1, parent: 'thighFar' },
  { name: 'footFar', from: 'ankleFar', to: 'toeFar', length: 0.8, parent: null },
];

export const BONE_BY_NAME: Readonly<Record<BoneName, Bone>> = Object.fromEntries(BONES.map((b) => [b.name, b])) as Record<BoneName, Bone>;

/** Pose: posição da raiz (quadril) e o ângulo local de cada osso, em graus. */
export interface Pose {
  root: Vec2;
  angles: Record<BoneName, number>;
  /**
   * Encurtamento de perspectiva dos braços (1 = comprimento cheio, o padrão). O braço que cai ou dobra junto ao corpo
   * aparece mais curto do que o esticado em direção ao golpe, como no `idle-0` desenhado (5,5 do ombro à mão contra
   * 13 no soco). Vale para braço e antebraço dos dois lados.
   */
  armScale?: number;
}

const ARM_BONES: ReadonlySet<BoneName> = new Set(['upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar']);

/** Comprimento de um osso nesta pose: o definido, vezes o encurtamento dos braços quando for osso de braço. */
export function boneLength(pose: Pose, bone: Bone): number {
  return bone.length * (ARM_BONES.has(bone.name) ? (pose.armScale ?? 1) : 1);
}

/** Ângulos de repouso: tronco em pé, ombros e quadris abertos para os lados, braços e pernas pendurados. */
export const REST_ANGLES: Readonly<Record<BoneName, number>> = {
  spine: 180,
  neckBone: 0,
  shoulderNear: 90,
  upperArmNear: 0,
  foreArmNear: 0,
  shoulderFar: -90,
  upperArmFar: 0,
  foreArmFar: 0,
  pelvisNear: 90,
  thighNear: 0,
  shinNear: 0,
  footNear: 90,
  pelvisFar: -90,
  thighFar: 0,
  shinFar: 0,
  footFar: 90,
};

export const dir = (deg: number): Vec2 => ({ x: Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) });
export const angleOf = (from: Vec2, to: Vec2): number => (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;

export function makePose(root: Vec2, angles: Partial<Record<BoneName, number>> = {}): Pose {
  return { root: { ...root }, angles: { ...REST_ANGLES, ...angles } };
}

export function clonePose(p: Pose): Pose {
  return p.armScale === undefined ? { root: { ...p.root }, angles: { ...p.angles } } : { root: { ...p.root }, angles: { ...p.angles }, armScale: p.armScale };
}

/** Ângulo absoluto (mundo) de cada osso: o local somado ao do osso pai. Os ossos estão em ordem pai-antes-do-filho. */
export function worldAngles(pose: Pose): Record<BoneName, number> {
  const out = {} as Record<BoneName, number>;
  for (const b of BONES) out[b.name] = pose.angles[b.name] + (b.parent ? out[b.parent] : 0);
  return out;
}

/** Cinemática direta: a posição de cada junta (os joints vêm antes dos filhos na tabela de ossos). */
export function solve(pose: Pose): Record<JointName, Vec2> {
  const wa = worldAngles(pose);
  const joints = { hip: { ...pose.root } } as Record<JointName, Vec2>;
  for (const b of BONES) {
    const d = dir(wa[b.name]);
    const f = joints[b.from];
    const len = boneLength(pose, b);
    joints[b.to] = { x: f.x + d.x * len, y: f.y + d.y * len };
  }
  return joints;
}

/**
 * Cinemática inversa de dois ossos: devolve os ângulos de mundo do osso de cima e do de baixo para a ponta alcançar
 * `target`. `bend` escolhe para que lado o meio (cotovelo ou joelho) dobra: +1 gira o osso de cima no sentido de
 * ângulo crescente a partir da linha raiz-alvo. Fora de alcance, o membro estica na direção do alvo.
 */
export function twoBone(root: Vec2, target: Vec2, l1: number, l2: number, bend: 1 | -1): [number, number] {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const phi = angleOf(root, target);
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-6), l1 + l2 - 1e-6);
  if (Math.hypot(dx, dy) >= l1 + l2) return [phi, phi];
  const alpha = (Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) * 180) / Math.PI;
  const a1 = phi + bend * alpha;
  const e = { x: root.x + dir(a1).x * l1, y: root.y + dir(a1).y * l1 };
  return [a1, angleOf(e, target)];
}

export type Limb = 'armNear' | 'armFar' | 'legNear' | 'legFar';
const LIMB_BONES: Record<Limb, [BoneName, BoneName]> = {
  armNear: ['upperArmNear', 'foreArmNear'],
  armFar: ['upperArmFar', 'foreArmFar'],
  legNear: ['thighNear', 'shinNear'],
  legFar: ['thighFar', 'shinFar'],
};
const LIMB_ROOT: Record<Limb, JointName> = { armNear: 'shoulderNear', armFar: 'shoulderFar', legNear: 'hipNear', legFar: 'hipFar' };

/** Aponta um membro para `target` por cinemática inversa (a raiz do membro vem da pose atual); devolve uma pose nova. */
export function aimLimb(pose: Pose, limb: Limb, target: Vec2, bend: 1 | -1): Pose {
  const [b1, b2] = LIMB_BONES[limb];
  const root = solve(pose)[LIMB_ROOT[limb]];
  const [a1, a2] = twoBone(root, target, boneLength(pose, BONE_BY_NAME[b1]), boneLength(pose, BONE_BY_NAME[b2]), bend);
  const next = clonePose(pose);
  next.angles[b1] = a1;
  next.angles[b2] = a2 - a1;
  return next;
}

/** Fixa o ângulo de mundo de um osso (converte para local descontando o pai). */
export function setWorldAngle(pose: Pose, bone: BoneName, worldDeg: number): Pose {
  const parent = BONE_BY_NAME[bone].parent;
  const next = clonePose(pose);
  next.angles[bone] = worldDeg - (parent ? worldAngles(pose)[parent] : 0);
  return next;
}

/** Comprimento medido de um osso entre as juntas de uma pose resolvida (RIG-02); compare com `boneLength(pose, bone)`. */
export function measuredLength(joints: Record<JointName, Vec2>, bone: Bone): number {
  const a = joints[bone.from];
  const b = joints[bone.to];
  return Math.hypot(b.x - a.x, b.y - a.y);
}
