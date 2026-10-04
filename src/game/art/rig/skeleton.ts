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

/** Do tornozelo à base do frame: o sapato e o contorno de baixo (o tornozelo fica a 1,8 texel do chão). */
export const SOLE = 1.8;

/** Perfil do tronco: meia largura (em texels) em cada faixa, do quadril ao pescoço. */
export interface TorsoShape {
  /** Meia largura do bloco do quadril, abaixo do cinto (u < 1). */
  hip: number;
  /** Meia largura da cintura (de u = 1,2 até o começo do ombro). */
  waist: number;
  /** Meia largura na linha dos ombros. */
  shoulder: number;
  /** Meia largura da gola (último texel antes do pescoço). */
  collar: number;
  /** Altura (a partir do quadril) onde começa a faixa do ombro. */
  shoulderFrom: number;
  /** Afunila de forma contínua da cintura ao ombro (V), em vez de degraus. */
  taper: boolean;
  /** Alturas (a partir do quadril) dos botões do paletó. */
  buttons: readonly number[];
}

/** Espessuras (raios de dentro do contorno) de braço e perna e a escala da mão. */
export interface Thickness {
  arm: { shoulder: number; elbow: number; wrist: number };
  leg: { hip: number; knee: number; ankle: number };
  /** Escala da mão fechada (1 = a do `idle-0`, de 2x2 em repouso e ~4x3 no soco). */
  hand: number;
  /** Raio do sapato. */
  shoe: number;
  torso: TorsoShape;
}

/**
 * Proporções do boneco, em texels do frame de 32x30. Toda medida do esqueleto sai daqui (`bonesOf`); a altura em pé é
 * cabeça + pescoço + tronco + coxa + canela + `SOLE` (o rasterizador carimba a cabeça de `head` linhas no pescoço).
 */
export interface Proportions {
  name: string;
  /** Altura total em pé (silhueta, do chão ao topo do contorno do cabelo). */
  height: number;
  /** Linhas da grade da cabeça (com o contorno e os espetos do cabelo). */
  head: number;
  /** Osso do pescoço: do peito (linha dos ombros) à base da cabeça. */
  neck: number;
  /** Tronco: do quadril (cinto) ao peito (linha dos ombros). */
  torso: number;
  /** Deslocamento do ombro de perto, para trás do eixo do peito, e do de longe, para a frente (corpo de 3/4). */
  shoulderNear: number;
  shoulderFar: number;
  upperArm: number;
  foreArm: number;
  thigh: number;
  shin: number;
  /** Pé de perto e de longe, do tornozelo à ponta. */
  foot: number;
  footFar: number;
  /** Largura do quadril: o de perto sai à frente e o de longe atrás do eixo. */
  pelvisNear: number;
  pelvisFar: number;
  thick: Thickness;
}

/*
 * O boneco chibi atual (`atual`), tirado do `idle-0` (grade 32x30): cabeça de 11 linhas (6..16), tronco de 7 linhas do
 * cinto (quadril, linha 24) ao pescoço (linha 17) com o peito a 5,4 do quadril, onde ficam os ombros; ombro de perto 0,8
 * atrás da vertical do pescoço, quadris a 3 à frente e 2 atrás do eixo, coxa + canela de 4,2 e sapato de 3 texels (o de
 * longe é mais curto, para o vão entre os pés). O braço (6,5 + 6,5) é mais longo que o do idle (5,5 do ombro à mão, de
 * lado): o gancho esticado precisa de ~13 texels do ombro ao punho; o idle usa `armScale` para encurtar o braço por
 * perspectiva (SPEC_DEVIATION de proporção, ver spec RIG-06). É a causa do "anão bombado": cabeça de 11/24 e pernas de
 * 6,4/24.
 */
export const CHIBI: Proportions = {
  name: 'atual',
  height: 24,
  head: 11,
  neck: 1.6,
  torso: 5.4,
  shoulderNear: 0.8,
  shoulderFar: 0.4,
  upperArm: 6.5,
  foreArm: 6.5,
  thigh: 2.1,
  shin: 2.1,
  foot: 2.4,
  footFar: 0.8,
  pelvisNear: 3,
  pelvisFar: 2,
  thick: {
    arm: { shoulder: 1.55, elbow: 1.3, wrist: 1.15 },
    leg: { hip: 1.5, knee: 1.25, ankle: 1.05 },
    hand: 1,
    shoe: 0.62,
    torso: { hip: 2.9, waist: 2.7, shoulder: 3.1, collar: 2.7, shoulderFrom: 3.4, taper: false, buttons: [1.9, 3.4, 4.9] },
  },
};

/** Comprimento de cada osso de um corpo. */
export function lengthsOf(p: Proportions): Record<BoneName, number> {
  return {
    spine: p.torso,
    neckBone: p.neck,
    shoulderNear: p.shoulderNear,
    upperArmNear: p.upperArm,
    foreArmNear: p.foreArm,
    shoulderFar: p.shoulderFar,
    upperArmFar: p.upperArm,
    foreArmFar: p.foreArm,
    pelvisNear: p.pelvisNear,
    thighNear: p.thigh,
    shinNear: p.shin,
    footNear: p.foot,
    pelvisFar: p.pelvisFar,
    thighFar: p.thigh,
    shinFar: p.shin,
    footFar: p.footFar,
  };
}

const LINKS: Record<BoneName, [JointName, JointName, BoneName | null]> = {
  spine: ['hip', 'chest', null],
  neckBone: ['chest', 'neck', 'spine'],
  shoulderNear: ['chest', 'shoulderNear', 'spine'],
  upperArmNear: ['shoulderNear', 'elbowNear', null],
  foreArmNear: ['elbowNear', 'wristNear', 'upperArmNear'],
  shoulderFar: ['chest', 'shoulderFar', 'spine'],
  upperArmFar: ['shoulderFar', 'elbowFar', null],
  foreArmFar: ['elbowFar', 'wristFar', 'upperArmFar'],
  pelvisNear: ['hip', 'hipNear', null],
  thighNear: ['hipNear', 'kneeNear', null],
  shinNear: ['kneeNear', 'ankleNear', 'thighNear'],
  footNear: ['ankleNear', 'toeNear', null],
  pelvisFar: ['hip', 'hipFar', null],
  thighFar: ['hipFar', 'kneeFar', null],
  shinFar: ['kneeFar', 'ankleFar', 'thighFar'],
  footFar: ['ankleFar', 'toeFar', null],
};

/** A tabela de ossos (pai antes do filho) de um corpo. */
export function bonesOf(p: Proportions): readonly Bone[] {
  const len = lengthsOf(p);
  return (Object.keys(LINKS) as BoneName[]).map((name) => ({ name, from: LINKS[name][0], to: LINKS[name][1], length: len[name], parent: LINKS[name][2] }));
}

/** Ossos do corpo atual (`CHIBI`); as poses sem `body` usam estes. */
export const BONES: readonly Bone[] = bonesOf(CHIBI);

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
  /** Escala só da mão fechada (padrão: a de `armScale`): a mão que cai junto ao corpo é menor que a do soco. */
  handScale?: number;
  /** Proporções do corpo; sem este campo, `CHIBI`. */
  body?: Proportions;
}

const ARM_BONES: ReadonlySet<BoneName> = new Set(['upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar']);

/** Comprimento de um osso nesta pose: o definido, vezes o encurtamento dos braços quando for osso de braço. */
export function boneLength(pose: Pose, bone: Bone): number {
  const base = pose.body ? lengthsOf(pose.body)[bone.name] : bone.length;
  return base * (ARM_BONES.has(bone.name) ? (pose.armScale ?? 1) : 1);
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

export function makePose(root: Vec2, angles: Partial<Record<BoneName, number>> = {}, body?: Proportions): Pose {
  const pose: Pose = { root: { ...root }, angles: { ...REST_ANGLES, ...angles } };
  if (body) pose.body = body;
  return pose;
}

export function clonePose(p: Pose): Pose {
  const out: Pose = { root: { ...p.root }, angles: { ...p.angles } };
  if (p.armScale !== undefined) out.armScale = p.armScale;
  if (p.handScale !== undefined) out.handScale = p.handScale;
  if (p.body) out.body = p.body;
  return out;
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
