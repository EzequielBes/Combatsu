/*
 * Conjuração das técnicas amaldiçoadas do player HD: selo, carga, disparo e volta, e o impacto do Kokusen.
 *
 * As poses são paradas e longas: a atitude conta mais que o movimento. O Vermelho, o Azul e o Desmantelar têm a
 * postura ereta e displicente de Gojo no selo (a outra mão solta ao lado do corpo) e só descem a base no disparo; o
 * Punho Divergente e o Kokusen são de Itadori: base baixa, corpo torcido e o soco atravessando o alvo.
 *
 * Os efeitos são desenhados pelo jogo por cima do sprite, em pontos fixos em relação ao pé (1 px = 1 texel): a mão
 * que conjura fica nesses pontos (ver `RED_TIP` e `FIST_AURA`).
 */
import type { ArmTarget, PoseSpec } from '../../rig/poses/build';
import { solve, type Pose, type Vec2 } from '../../rig/skeleton';
import type { HdFamily, HdFrameSpec } from '../frames';
import type { Kit } from '../kit';

type Spec = Omit<PoseSpec, 'body'>;
type Leg = PoseSpec['legNear'];
type Tip = readonly [ahead: number, up: number, len: number];

/** Do pulso à ponta de cada forma de mão, ao longo do antebraço (as medidas de `hand.ts`). */
const TIP = { fist: 4.3, open: 6.4, sign: 8.2, palm: 1.6 };

/**
 * Ponta dos dedos do Vermelho em cada fase, na altura do ombro do corpo HD: [à frente, acima do chão]. O orbe nasce
 * aqui (`hdAnchors`). No disparo o corpo recua, então o dedo não avança tanto quanto o braço esticado sugere.
 */
const RED_TIP = { sign: [24, 39], charge: [25, 40], release: [25, 38] } as const;
/** Centro da aura do punho do Divergente no selo e na carga (`FIST_OFFSET` de `DivergentFx`, a partir do pé). */
const FIST_AURA = [22, 22] as const;

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
        hip: [-5, 10],
        spine: 162,
        neck: 14,
        near: { to: k.at(-13, 28), bend: 1 },
        far: byTip(),
        farTip: aim,
        legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 2 }, foot: 62 },
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
      expr: 'shout',
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
        nearTip: [38, 33, TIP.fist],
        far: { to: k.at(-12, 38), bend: 1 },
        ...lunge(k, 18, -13, 3),
      }),
      expr: 'shout',
    },
  };
}

/** Desmantelar: a mão em lâmina sobe diante do rosto, recolhe para o quadril de trás e corta o ar na diagonal. */
function corte(k: Kit): Record<string, HdFrameSpec> {
  return {
    'corte-sign': {
      pose: build(k, {
        hip: [-0.5, 3.2],
        spine: 176,
        neck: 3,
        near: byTip(),
        nearTip: [8, 41.5, TIP.open],
        far: loose(k),
      }),
      hands: { near: 'open', far: 'relaxed' },
    },
    'corte-charge': {
      pose: build(k, {
        hip: [-2.5, 6],
        spine: 173,
        neck: 6,
        near: byTip(-1),
        nearTip: [-6, 44, TIP.open],
        far: { rel: { x: k.arm * 0.7, y: k.arm * 0.1 }, bend: -1 },
      }),
      hands: { near: 'open', far: 'open' },
    },
    'corte-release': {
      pose: build(k, {
        hip: [5, 7],
        spine: 156,
        neck: 18,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [30, 15, TIP.open],
        far: { to: k.at(-9, 46), bend: 1 },
        ...lunge(k, 14, -10, 1.6),
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
        hip: [-0.5, 3.2],
        spine: 176,
        neck: 3,
        near: byTip(),
        nearTip: tip(RED_TIP.sign),
        far: loose(k),
      }),
      hands: { near: 'sign', far: 'relaxed' },
    },
    'vermelho-charge': {
      pose: build(k, {
        hip: [-1.5, 5.5],
        spine: 179,
        neck: 1,
        shoulderNear: -90,
        near: byTip(),
        nearTip: tip(RED_TIP.charge),
        far: { to: k.at(RED_TIP.charge[0] - 13, RED_TIP.charge[1] - 2.5), bend: -1 },
      }),
      hands: { near: 'sign', far: 'open' },
    },
    'vermelho-release': {
      pose: build(k, {
        hip: [-3, 6],
        spine: 190,
        neck: -6,
        shoulderNear: -90,
        near: byTip(),
        nearTip: tip(RED_TIP.release),
        far: { to: k.at(-10, 21), bend: 1 },
        legNear: { ankle: { x: k.cx + 14, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx - 9, y: k.g }, foot: 90 },
      }),
      hands: { near: 'sign', far: 'open' },
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
        hip: [-0.5, 3.2],
        spine: 176,
        neck: 3,
        near: byTip(),
        nearTip: [15, 42, TIP.palm],
        far: loose(k),
      }),
      hands: { near: 'palm', far: 'open' },
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
        hip: [3, 5.5],
        spine: 165,
        neck: 12,
        shoulderNear: -90,
        near: byTip(),
        nearTip: [27, 37, TIP.palm],
        far: byTip(),
        farTip: [26, 28, TIP.palm],
        ...lunge(k, 11, -9.5, 0.8),
      }),
      hands: { near: 'palm', far: 'palm' },
      farFront: { arm: true },
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
