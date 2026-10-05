/*
 * Corpo do player HD: braços e pernas com perfil, tronco do paletó, pescoço, mãos e sapatos, pintados a partir das
 * juntas de uma pose resolvida. A ordem de pintura é a profundidade: braço e perna de longe, perna de perto, pescoço,
 * tronco, cabeça e braço de perto (com `headOverNearArm` a cabeça fica por cima do braço).
 * Puro, sem `phaser`.
 */
import { dir, solve, worldAngles, type JointName, type Pose, type Vec2 } from '../rig/skeleton';
import type { FarFront, HandShape, Hands, Turned } from './frames';
import { paintHand } from './hand';
import { paintHead, paintHeadBack, type Expression } from './head';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import { SMEAR_LAYER, paintSmear, type Smear } from './smear';
import type { Sway } from './sway';
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
  /** Corpo virado de costas num giro (ver `Turned`). */
  turned?: Turned;
  /** Atraso do cabelo e da barra do paletó (padrão: rígidos). */
  sway?: Sway;
  /** Borrão de movimento do membro que bate, pintado atrás dele. */
  smear?: Smear;
}

type Joints = Record<JointName, Vec2>;

/**
 * Quanto do desvio da barra vale na altura `u`: nada logo acima do quadril, tudo na barra. É o que faz a barra do
 * paletó arrastar com o quadril parado no lugar.
 */
const hemAt = (u: number): number => Math.min(1, Math.max(0, (0.6 - u) / 4.2));

/**
 * Tronco de perfil. `hem` (texels, + para a frente) arrasta a barra: a borda do lado para onde ela vai anda inteira e
 * a outra só metade, então a barra abre em vez de só deslizar.
 */
const torsoShape = (hem: number): LocalShape =>
  boxed(
    (f, u) => {
      if (u < TORSO[0][0] || u > TORSO[TORSO.length - 1][0]) return null;
      const [front, back] = radiusAt(TORSO, u);
      const shift = hem * hemAt(u);
      const mid = shift * 0.75;
      const g = f - mid;
      const o = g / (g >= 0 ? front + shift * (hem > 0 ? 1 : 0.5) - mid : back - shift * (hem < 0 ? 1 : 0.5) + mid);
      if (Math.abs(o) > 1) return null;
      // O alto dos ombros vira para cima e pega a luz; a luz de recorte só acende do peito para cima.
      const ny = Math.min(0.6, Math.max(0, (u - 9.5) / 6));
      const k = Math.sqrt(1 - ny * ny);
      return { x: o * k, y: ny, z: Math.sqrt(1 - o * o) * k, noRim: u < 7.4, dt: u < -2.6 ? -2 : 0 };
    },
    [-8 - Math.abs(hem), 8 + Math.abs(hem), -4, 14.5],
  );

/**
 * Tronco visto de costas: simétrico e mais largo nos ombros do que o de perfil, com a mesma luz de cima. `hem`
 * desliza a barra para o lado.
 */
const backShape = (hem: number): LocalShape =>
  boxed(
    (f, u) => {
      if (u < TORSO[0][0] || u > TORSO[TORSO.length - 1][0]) return null;
      const [front, back] = radiusAt(TORSO, u);
      const g = f - hem * hemAt(u);
      const o = g / (((front + back) / 2) * (1.08 + 0.2 * Math.min(1, Math.max(0, (u - 3) / 6))));
      if (Math.abs(o) > 1) return null;
      const ny = Math.min(0.6, Math.max(0, (u - 9.5) / 6));
      const k = Math.sqrt(1 - ny * ny);
      return { x: o * k, y: ny, z: Math.sqrt(1 - o * o) * k, noRim: u < 7.4, dt: u < -2.6 ? -2 : 0 };
    },
    [-8.5 - Math.abs(hem), 8.5 + Math.abs(hem), -4, 14.5],
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

/** As costas do paletó: lisas, com a costura do meio e a gola alta fechando a nuca. */
function paintTorsoBack(c: HdCanvas, spine: Local, part: number, len: number, hem: number): void {
  c.paint(inLocal(spine, backShape(hem)), MAT.jacket, part, { rim: true });
  const on = { onlyOn: part };
  const seam = localRect(-0.5, 0.5, -2.6, len - 2.4);
  const leaning: LocalShape = boxed((f, u) => seam(f - hem * hemAt(u), u), [-2.5, 2.5, -2.6, len]);
  c.paint(inLocal(spine, leaning), MAT.jacket, part, { ...on, flat: 1 });
  c.paint(inLocal(spine, localRect(-3.2, 3.2, len - 1.2, len - 0.2)), MAT.jacket, part, { ...on, flat: 0 });
  c.paint(inLocal(spine, localRect(-3, 3, len - 0.2, len + 2)), MAT.jacket, part, { flat: 3 });
}

function paintTorso(c: HdCanvas, spine: Local, part: number, len: number, hem: number): void {
  c.paint(inLocal(spine, torsoShape(hem)), MAT.jacket, part, { rim: true });
  const on = { onlyOn: part };
  // Costura da frente, interrompida em dois pontos, e o botão dourado. A costura acompanha a barra.
  const seam: LocalShape = boxed(
    (f, u) => {
      const gap = (u > 1.6 && u < 2.8) || (u > 6.2 && u < 7.2);
      return gap ? null : localRect(2.4, 3.4, -2.6, len - 2)(f - hem * hemAt(u), u);
    },
    [2.4 - Math.abs(hem), 3.4 + Math.abs(hem), -2.6, len],
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
  // O borrão de movimento entra logo antes do seu membro, numa camada própria: fica atrás dele e na frente do resto.
  const blur = (layer: (typeof SMEAR_LAYER)[keyof typeof SMEAR_LAYER], dim: boolean): void => {
    if (opts.smear && SMEAR_LAYER[opts.smear.limb] === layer) paintSmear(c, j, opts.smear, ++part, dim);
  };
  const farArm = (dim: boolean): void => {
    blur('armFar', dim);
    paintArm(c, j, 'Far', ++part, opts.hands?.far ?? 'fist', dim);
  };
  const farLeg = (dim: boolean): void => {
    blur('legFar', dim);
    paintLeg(c, j, wa.footFar, 'Far', ++part, dim);
  };

  // Virado de costas, o lado de perto passa para trás e os dois braços ficam atrás do tronco.
  const turned = opts.turned !== undefined;
  const arm = (): void => {
    blur('armNear', turned);
    paintArm(c, j, 'Near', ++part, opts.hands?.near ?? 'fist', turned);
  };
  if (turned) arm();
  if (!front.arm) farArm(!turned);
  if (!front.leg) farLeg(true);
  blur('legNear', turned);
  paintLeg(c, j, wa.footNear, 'Near', ++part, turned);
  if (front.leg) farLeg(false);
  const neck = limb(toScreen(spine, 0, len), toScreen(localOf(j.neck, neckUp), 0.4, 3), NECK);
  c.paint(neck, MAT.skin, ++part, { bias: -1 });
  const torso = ++part;
  // A barra do paletó só anda de lado: do desvio de tela vale a parte ao longo da frente do tronco.
  const hem = opts.sway ? opts.sway.hem.x * spine.fwd.x + opts.sway.hem.y * spine.fwd.y : 0;
  if (turned) paintTorsoBack(c, spine, torso, len, hem);
  else paintTorso(c, spine, torso, len, hem);
  // Sombra projetada do braço de perto no paletó: o braço deslocado para trás e para baixo, só sobre o tronco.
  const cast = (p: Vec2): Vec2 => ({ x: p.x - 1, y: p.y + 1 });
  const casts = [
    [j.shoulderNear, j.elbowNear, UPPER_ARM],
    [j.elbowNear, j.wristNear, FOREARM],
  ] as const;
  for (const [a, b, prof] of turned ? [] : casts)
    c.paint(limb(cast(a), cast(b), prof), MAT.jacket, torso, { onlyOn: torso, darken: 1 });
  const headAt = localOf(j.neck, neckUp);
  const head = (): void =>
    opts.turned === 'away'
      ? paintHeadBack(c, headAt, ++part, opts.sway?.hair)
      : paintHead(c, headAt, ++part, opts.expr, opts.sway?.hair);
  if (turned) head();
  else if (opts.headOverNearArm) {
    arm();
    head();
  } else {
    head();
    arm();
  }
  if (front.arm) farArm(false);
  return j;
}
