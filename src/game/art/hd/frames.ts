/*
 * Quadros do player HD como dados: cada família de poses (`families/`) devolve quadros soltos e golpes; aqui o golpe
 * vira a sua sequência de quadros por fase. Os nomes são os da folha antiga (`idle-0`, `guard`, `jab-hit`), para o
 * jogo trocar de folha quadro a quadro. Puro, sem `phaser`.
 */
import { inbetween } from '../rig/interpolate';
import { solve, type Pose } from '../rig/skeleton';
import type { Expression } from './head';
import type { Kit } from './kit';
import { SMEAR_MIN_TRAVEL, strikePoint, type Smear } from './smear';
import { swayOf, type Sway } from './sway';

/**
 * Forma da mão: punho fechado, mão aberta no eixo do antebraço (faca de mão, guarda aberta), o selo de dois dedos das
 * técnicas, a mão solta com os dedos caídos (atordoado, levando golpe) ou a palma dobrada no pulso, com os dedos para
 * cima (o golpe de palma que empurra).
 */
export type HandShape = 'fist' | 'open' | 'sign' | 'relaxed' | 'palm';

export interface Hands {
  near?: HandShape;
  far?: HandShape;
}

/**
 * Membro de longe que passa para a frente do corpo: pintado por cima e nos tons do lado de perto. É o braço de trás
 * que atravessa no direto e a perna de trás que varre no chute giratório.
 */
export interface FarFront {
  arm?: boolean;
  leg?: boolean;
}

/**
 * Corpo virado num giro: `away` é de costas para a câmera (as costas do paletó e a cabeça por trás, só cabelo) e
 * `shoulder` mantém as costas com a cabeça de perfil, olhando o alvo por cima do ombro. Virado, o lado de perto passa
 * para trás (um tom abaixo) e os braços ficam atrás do tronco, salvo o de longe com `farFront.arm`.
 */
export type Turned = 'away' | 'shoulder';

/** Parte do corpo que acerta: de onde sai o ponto de golpe (rastro e faísca). */
export type StrikeLimb = 'handNear' | 'handFar' | 'footNear' | 'footFar' | 'kneeNear' | 'elbowNear';

/** Um quadro: a pose e o que muda na pintura. */
export interface HdFrameSpec {
  pose: Pose;
  /** Expressão do rosto (padrão `focus`). */
  expr?: Expression;
  hands?: Hands;
  /** A cabeça por cima do braço de perto (o braço passa por trás do rosto). */
  headOverNearArm?: boolean;
  farFront?: FarFront;
  /** Corpo virado de costas (padrão: de perfil, olhando o alvo). */
  turned?: Turned;
  /** Atraso do cabelo e da barra do paletó em relação ao corpo (padrão: rígidos). */
  sway?: Sway;
  /** Borrão de movimento do membro que bate (só no quadro rápido de um golpe). */
  smear?: Smear;
}

/**
 * Um golpe: as poses-chave. `wind` é a antecipação, `hit` o pico (pose-chave, nunca um intermediário) e `recover` o
 * fim da recuperação, de onde o corpo volta à guarda. `mid` (meio da subida), `over` (overshoot depois do pico) e
 * `down` (primeiro quadro da volta) são opcionais: sem eles, saem da interpolação das chaves.
 */
export interface HdMoveSpec {
  wind: Pose;
  mid?: Pose;
  hit: Pose;
  over?: Pose;
  down?: Pose;
  recover: Pose;
  /**
   * Para onde o último quadro da volta caminha (padrão: a guarda do chão). Um golpe aéreo aponta para uma pose de ar
   * e o golpe com objeto para a pose de carregar.
   */
  back?: Pose;
  /** Parte do corpo que acerta. */
  strike: StrikeLimb;
  /** Mãos no pico (e no overshoot); na antecipação e na volta as mãos são punhos. */
  hands?: Hands;
  /** Membro de longe na frente do corpo, do meio da subida ao overshoot. */
  farFront?: FarFront;
  /** Expressão dos quadros do golpe (padrão `effort`). */
  expr?: Expression;
  headOverNearArm?: boolean;
  /** Corpo virado de costas no meio da subida (`mid`) e no pico com o overshoot (`hit`): os quadros de um giro. */
  turned?: { mid?: Turned; hit?: Turned };
}

/** O que uma família de poses devolve. */
export interface HdFamily {
  frames?: Record<string, HdFrameSpec>;
  moves?: Record<string, HdMoveSpec>;
}

export type MovePhase = 'startup' | 'active' | 'recovery';

/** Quadros por fase de todo golpe: 2 na antecipação, 2 no pico (pico e overshoot) e 3 na volta. */
export const MOVE_PHASE_FRAMES: Readonly<Record<MovePhase, number>> = { startup: 2, active: 2, recovery: 3 };

/** Nome do quadro `i` da fase de um golpe (`jab@startup-0`). */
export const moveFrameName = (move: string, phase: MovePhase, i: number): string => `${move}@${phase}-${i}`;

/**
 * Os quadros de um golpe: a sequência por fase e os três nomes da folha antiga (`-wind`, `-hit`, `-recover`), que
 * apontam para a antecipação, o pico e o fim da volta.
 */
export function expandMove(k: Kit, name: string, m: HdMoveSpec): Record<string, HdFrameSpec> {
  const expr = m.expr ?? 'effort';
  // O grito vale do meio da subida ao overshoot; na antecipação e na volta o rosto é o de esforço.
  const opts = { expr: expr === 'shout' ? ('effort' as const) : expr, headOverNearArm: m.headOverNearArm };
  const at = (from: Pose, to: Pose, t: number): Pose => k.grounded(inbetween(from, to, t));
  const over = m.over ?? at(m.wind, m.hit, 1.06);
  const wind: HdFrameSpec = { pose: m.wind, ...opts };
  const peak = { hands: m.hands, farFront: m.farFront, ...opts, expr };
  const turnedHit = { turned: m.turned?.hit };
  const hit: HdFrameSpec = { pose: m.hit, ...peak, ...turnedHit };
  const recover: HdFrameSpec = { pose: m.recover, ...opts };
  const back = m.back ?? k.guard();
  const mid: HdFrameSpec = { pose: m.mid ?? at(m.wind, m.hit, 0.55), ...peak, turned: m.turned?.mid };
  // A sequência na ordem em que o jogo a mostra: é dela que saem o atraso do cabelo e do paletó e o borrão.
  const seq: HdFrameSpec[] = [
    wind,
    mid,
    hit,
    { pose: over, ...peak, ...turnedHit },
    { pose: m.down ?? at(over, m.recover, 0.5), ...opts },
    recover,
    { pose: at(m.recover, back, 0.6), ...opts },
  ];
  swayOf(
    seq.map((f) => f.pose),
    { from: back },
  ).forEach((sway, i) => {
    if (sway) seq[i]!.sway = sway;
  });
  smearFast(m.strike, mid, hit);
  return {
    ...Object.fromEntries(seq.map((f, i) => [moveFrameName(name, SEQ_PHASES[i]![0], SEQ_PHASES[i]![1]), f])),
    [`${name}-wind`]: wind,
    [`${name}-hit`]: hit,
    [`${name}-recover`]: recover,
  };
}

/** Fase e índice de cada quadro da sequência de um golpe, na ordem. */
const SEQ_PHASES: readonly (readonly [MovePhase, number])[] = [
  ['startup', 0],
  ['startup', 1],
  ['active', 0],
  ['active', 1],
  ['recovery', 0],
  ['recovery', 1],
  ['recovery', 2],
];

/**
 * Dá o borrão de movimento ao quadro `to` se o ponto de golpe andou mais que `SMEAR_MIN_TRAVEL` desde `from`. Só a
 * chegada ao pico passa por aqui. No meio da subida o membro ainda está junto do corpo, e o borrão do punho cairia
 * sobre o rosto; o overshoot (o membro parado no pico) e a volta ficam nítidos.
 */
function smearFast(limb: StrikeLimb, from: HdFrameSpec, to: HdFrameSpec): void {
  const before = solve(from.pose);
  const a = strikePoint(before, limb);
  const b = strikePoint(solve(to.pose), limb);
  if (Math.hypot(b.x - a.x, b.y - a.y) > SMEAR_MIN_TRAVEL) to.smear = { limb, from: before };
}
