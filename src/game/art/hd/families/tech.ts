/*
 * Conjuração das técnicas amaldiçoadas do player HD: selo, carga, disparo e volta, e o impacto do Kokusen.
 *
 * As poses são paradas e longas: a atitude conta mais que o movimento. O Vermelho, o Azul e o Desmantelar têm a
 * postura ereta e displicente de Gojo no selo (a outra mão solta ao lado do corpo) e só descem a base no disparo; o
 * Punho Divergente e o Kokusen são de Itadori: base baixa, corpo torcido e o soco atravessando o alvo.
 *
 * Os efeitos são desenhados pelo jogo por cima do sprite, em pontos fixos em relação ao pé (1 px = 1 texel): a mão
 * que conjura fica nesses pontos (ver `RED_TIP`, `FIST_AURA` e `CUT_LINE_UP`).
 */
import type { ArmTarget, PoseSpec } from '../../rig/poses/build';
import { solve, type Pose, type Vec2 } from '../../rig/skeleton';
import type { HdFamily, HdFrameSpec } from '../frames';
import type { Kit } from '../kit';

type Spec = Omit<PoseSpec, 'body'>;
type Leg = PoseSpec['legNear'];
type Tip = readonly [ahead: number, up: number, len: number];

/** Do pulso à ponta de cada forma de mão, ao longo do antebraço (as medidas de `hand.ts`). */
const TIP = { fist: 4.3, open: 6.4, sign: 8.2 };

/** Ponta dos dedos do Vermelho em cada fase (`fingertipOffsetPx` da arte antiga): [à frente, acima do chão]. */
const RED_TIP = { sign: [18, 24], charge: [24, 28], release: [30, 24] } as const;
/** Centro da aura do punho do Divergente no selo e na carga (`FIST_OFFSET` de `DivergentFx`, a partir do pé). */
const FIST_AURA = [22, 22] as const;
/** Altura da linha do Desmantelar ao sair do corpo (o centro do corpo de colisão). */
const CUT_LINE_UP = 18;

/**
 * Alvo de braço para a PONTA da mão: o pulso recua `len` ao longo do antebraço. Ponto fixo amortecido, porque o
 * ângulo do antebraço muda com o alvo do pulso.
 */
function tipArm(k: Kit, spec: Spec, limb: 'armNear' | 'armFar', tip: Vec2, len: number): Spec {
  const near = limb === 'armNear';
  const bend = spec[limb].bend;
  let to = tip;
  for (let i = 0; i < 24; i++) {
    const j = solve(k.pose({ ...spec, [limb]: { to, bend } }));
    const elbow = near ? j.elbowNear : j.elbowFar;
    const wrist = near ? j.wristNear : j.wristFar;
    const d = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y) || 1;
    const next = { x: tip.x - ((wrist.x - elbow.x) / d) * len, y: tip.y - ((wrist.y - elbow.y) / d) * len };
    to = { x: (to.x + next.x) / 2, y: (to.y + next.y) / 2 };
  }
  return { ...spec, [limb]: { to, bend } };
}

interface Body {
  /** Quadril: à frente do eixo e abaixo da linha de pé (`k.hy`). */
  hip: [number, number];
  spine: number;
  neck: number;
  shoulderNear?: number;
  near: ArmTarget;
  far: ArmTarget;
  legNear?: Leg;
  legFar?: Leg;
  /** Ponta da mão de perto / de longe no ponto dado, com o comprimento da forma de mão. */
  nearTip?: Tip;
  farTip?: Tip;
}

function build(k: Kit, b: Body): Pose {
  let spec: Spec = {
    hip: { x: k.cx + b.hip[0], y: k.hy + b.hip[1] },
    spine: b.spine,
    neck: b.neck,
    ...(b.shoulderNear === undefined ? {} : { shoulderNear: b.shoulderNear }),
    armNear: b.near,
    armFar: b.far,
    legNear: b.legNear ?? { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: b.legFar ?? { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  };
  if (b.nearTip) spec = tipArm(k, spec, 'armNear', k.at(b.nearTip[0], b.nearTip[1]), b.nearTip[2]);
  if (b.farTip) spec = tipArm(k, spec, 'armFar', k.at(b.farTip[0], b.farTip[1]), b.farTip[2]);
  return k.pose(spec);
}

/** Braço solto ao lado do corpo, a mão na altura do bolso: a displicência de Gojo. */
const loose = (k: Kit): ArmTarget => ({ rel: { x: 4, y: k.arm * 0.62 }, bend: 1 });
/** Mão de trás recolhida junto ao peito (guarda). */
const tucked = (k: Kit): ArmTarget => ({ rel: { x: k.arm * 0.36, y: -k.arm * 0.06 }, bend: -1 });
/** Braço cujo alvo vem da ponta da mão (`nearTip`/`farTip`): só o lado do cotovelo importa. */
const byTip = (bend: 1 | -1 = -1): ArmTarget => ({ rel: { x: 0, y: 0 }, bend });

/** Base do disparo: a perna da frente avança e a de trás empurra o chão na ponta do pé. */
function lunge(k: Kit, front: number, back: number, lift: number): Pick<Body, 'legNear' | 'legFar'> {
  return {
    legNear: { ankle: { x: k.cx + front, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + back, y: k.g - lift }, foot: 90 - lift * 12 },
  };
}

/** Punho Divergente: o punho recua para o quadril com a mão da frente medindo o alvo; o soco sai no corpo. */
function divergente(k: Kit): Record<string, HdFrameSpec> {
  const aim: Tip = [FIST_AURA[0], FIST_AURA[1], TIP.fist];
  return {
    'divergente-sign': {
      pose: build(k, {
        hip: [-2, 4.5],
        spine: 174,
        neck: 6,
        near: { to: k.at(-7, 27), bend: 1 },
        far: byTip(),
        farTip: aim,
      }),
    },
    'divergente-charge': {
      pose: build(k, {
        hip: [-3.5, 7.5],
        spine: 178,
        neck: 4,
        near: { to: k.at(-11, 25), bend: 1 },
        far: byTip(),
        farTip: aim,
      }),
      expr: 'effort',
    },
    'divergente-release': {
      pose: build(k, {
        hip: [6, 5.5],
        spine: 157,
        neck: 15,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [34, 29, TIP.fist],
        far: { rel: { x: k.arm * 0.2, y: k.arm * 0.1 }, bend: -1 },
        ...lunge(k, 15, -10, 2),
      }),
      expr: 'effort',
    },
    'divergente-recover': {
      pose: build(k, {
        hip: [3, 5],
        spine: 165,
        neck: 11,
        shoulderNear: -40,
        near: byTip(),
        nearTip: [26, 24, TIP.fist],
        far: tucked(k),
        ...lunge(k, 12, -9, 0.6),
      }),
      expr: 'effort',
    },
  };
}

/** Kokusen: o pico do soco com o corpo inteiro; a perna de trás esticada e o braço de trás lançado para trás. */
function kokusen(k: Kit): Record<string, HdFrameSpec> {
  return {
    'kokusen-hit': {
      pose: build(k, {
        hip: [9, 7],
        spine: 148,
        neck: 22,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [38, 27, TIP.fist],
        far: { to: k.at(-12, 36), bend: 1 },
        ...lunge(k, 18, -13, 3),
      }),
      expr: 'effort',
    },
  };
}

/** Desmantelar: a mão em lâmina sobe diante do rosto, recolhe para o quadril de trás e corta o ar na diagonal. */
function corte(k: Kit): Record<string, HdFrameSpec> {
  return {
    'corte-sign': {
      pose: build(k, {
        hip: [-1, 2],
        spine: 183,
        neck: -2,
        near: byTip(),
        nearTip: [13, 52, TIP.open],
        far: loose(k),
      }),
      hands: { near: 'open', far: 'open' },
    },
    'corte-charge': {
      pose: build(k, {
        hip: [-3, 7],
        spine: 171,
        neck: 8,
        near: byTip(1),
        nearTip: [-10, 25, TIP.open],
        far: tucked(k),
      }),
      hands: { near: 'open', far: 'open' },
    },
    'corte-release': {
      pose: build(k, {
        hip: [4, 5.5],
        spine: 160,
        neck: 15,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [28, CUT_LINE_UP + 1, TIP.open],
        far: { to: k.at(-11, 34), bend: 1 },
        ...lunge(k, 13, -10, 1.6),
      }),
      hands: { near: 'open', far: 'open' },
      expr: 'effort',
    },
    'corte-recover': {
      pose: build(k, {
        hip: [2, 5],
        spine: 167,
        neck: 10,
        shoulderNear: -30,
        near: byTip(),
        nearTip: [22, 13, TIP.open],
        far: tucked(k),
        ...lunge(k, 11, -9, 0.5),
      }),
      hands: { near: 'open' },
    },
  };
}

/** Vermelho: os dois dedos apontados; a esfera cresce na ponta e o disparo estica o corpo inteiro atrás do dedo. */
function vermelho(k: Kit): Record<string, HdFrameSpec> {
  const tip = (p: readonly [number, number]): Tip => [p[0], p[1], TIP.sign];
  return {
    'vermelho-sign': {
      pose: build(k, {
        hip: [0.5, 2],
        spine: 181,
        neck: -1,
        near: byTip(1),
        nearTip: tip(RED_TIP.sign),
        far: loose(k),
      }),
      hands: { near: 'sign', far: 'open' },
    },
    'vermelho-charge': {
      pose: build(k, {
        hip: [0, 5.5],
        spine: 171,
        neck: 8,
        near: byTip(),
        nearTip: tip(RED_TIP.charge),
        far: { to: k.at(RED_TIP.charge[0] - 15, RED_TIP.charge[1] - 1), bend: -1 },
      }),
      hands: { near: 'sign', far: 'open' },
    },
    'vermelho-release': {
      pose: build(k, {
        hip: [3, 7.5],
        spine: 161,
        neck: 15,
        shoulderNear: -90,
        near: byTip(),
        nearTip: tip(RED_TIP.release),
        far: { to: k.at(-9, 30), bend: 1 },
        ...lunge(k, 13, -11, 1.5),
      }),
      hands: { near: 'sign' },
      expr: 'effort',
    },
    'vermelho-recover': {
      pose: build(k, {
        hip: [0.5, 5],
        spine: 172,
        neck: 7,
        near: byTip(),
        nearTip: [23, 21, TIP.sign],
        far: tucked(k),
        ...lunge(k, 11, -9.5, 0),
      }),
      hands: { near: 'sign' },
    },
  };
}

/** Azul: a mão aberta se ergue acima dos ombros chamando a esfera e desce empurrando-a para a frente. */
function azul(k: Kit): Record<string, HdFrameSpec> {
  return {
    'azul-sign': {
      pose: build(k, {
        hip: [-1, 1.5],
        spine: 185,
        neck: -3,
        near: byTip(),
        nearTip: [17, 47, TIP.open],
        far: loose(k),
      }),
      hands: { near: 'open', far: 'open' },
    },
    'azul-charge': {
      pose: build(k, {
        hip: [-2, 5],
        spine: 186,
        neck: -8,
        near: byTip(),
        nearTip: [20, 60, TIP.open],
        far: loose(k),
      }),
      headOverNearArm: true,
      hands: { near: 'open', far: 'open' },
    },
    'azul-release': {
      pose: build(k, {
        hip: [4, 6],
        spine: 162,
        neck: 14,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [30, 30, TIP.open],
        far: { to: k.at(-9, 31), bend: 1 },
        ...lunge(k, 13, -10, 1.5),
      }),
      hands: { near: 'open' },
      expr: 'effort',
    },
    'azul-recover': {
      pose: build(k, {
        hip: [1.5, 5],
        spine: 170,
        neck: 8,
        near: byTip(),
        nearTip: [22, 27, TIP.open],
        far: tucked(k),
        ...lunge(k, 11, -9.5, 0),
      }),
      hands: { near: 'open' },
    },
  };
}

export function techFamily(k: Kit): HdFamily {
  return { frames: { ...divergente(k), ...corte(k), ...vermelho(k), ...azul(k), ...kokusen(k) } };
}
