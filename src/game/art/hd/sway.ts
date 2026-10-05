/*
 * Movimento secundário do player HD: o cabelo e a barra do paletó atrasam em relação ao corpo (follow-through e
 * overlap). Os quadros são assados, então não há simulação em tempo real: o desvio de cada quadro sai da velocidade da
 * cabeça e do quadril entre a pose anterior da mesma sequência e a do quadro. Parado, o desvio é zero e o quadro sai
 * idêntico ao rígido. Puro, sem `phaser`.
 */
import { dir, solve, worldAngles, type Pose, type Vec2 } from '../rig/skeleton';
import type { HdFrameSpec } from './frames';

/**
 * Desvio de um quadro, em texels de tela: `hair` é quanto anda a ponta da mecha mais longa (as outras andam em
 * proporção ao comprimento, a base fica presa ao crânio) e `hem` quanto anda a barra do paletó (a linha do quadril
 * fica parada).
 */
export interface Sway {
  hair: Vec2;
  hem: Vec2;
}

/** Tetos do desvio, em texels: a ponta da mecha mais longa e a barra do paletó. */
export const HAIR_SWAY_MAX = 2.4;
export const HEM_SWAY_MAX = 1.6;

/**
 * Ganhos: `drag` é o arrasto contra a velocidade do quadro (o cabelo deita para trás quando o corpo avança) e `carry`
 * a inércia do quadro anterior (o corpo para e o cabelo passa do ponto). `dead` zera o que é pequeno demais para ler:
 * a respiração do idle não mexe em nada.
 */
interface Tune {
  drag: number;
  carry: number;
  dead: number;
  max: number;
}

const HAIR: Tune = { drag: 0.3, carry: 0.28, dead: 0.3, max: HAIR_SWAY_MAX };
const HEM: Tune = { drag: 0.26, carry: 0.22, dead: 0.3, max: HEM_SWAY_MAX };

/** Parte do arrasto constante (`drift`) que chega à barra do paletó, mais pesada que o cabelo. */
const HEM_DRIFT = 0.6;

const ZERO: Vec2 = { x: 0, y: 0 };
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

/** Pontos seguidos: a coroa da cabeça (onde nascem as mechas longas) e o meio da barra do paletó. */
function tracked(p: Pose): { crown: Vec2; hem: Vec2 } {
  const j = solve(p);
  const wa = worldAngles(p);
  const up = dir(wa.neckBone);
  const spine = dir(wa.spine);
  return {
    crown: { x: j.neck.x + up.x * 14 + up.y * 2, y: j.neck.y + up.y * 14 - up.x * 2 },
    hem: { x: j.hip.x - spine.x * 3.6, y: j.hip.y - spine.y * 3.6 },
  };
}

/** Desvio para a velocidade `v` do quadro e a do anterior, com zona morta e teto suave (nunca passa de `max`). */
function lag(v: Vec2, before: Vec2, drift: Vec2, t: Tune): Vec2 {
  const x = -t.drag * v.x + t.carry * before.x + drift.x;
  const y = -t.drag * v.y + t.carry * before.y + drift.y;
  const mag = Math.hypot(x, y);
  if (mag <= t.dead) return ZERO;
  const k = (t.max * Math.tanh((mag - t.dead) / t.max)) / mag;
  return { x: x * k, y: y * k };
}

export interface SwayOpts {
  /** Ciclo (idle, corrida): o anterior do primeiro quadro é o último. */
  loop?: boolean;
  /** Pose de onde o corpo chega ao primeiro quadro de uma sequência que não é ciclo (em geral, a guarda). */
  from?: Pose;
  /**
   * Arrasto constante do cabelo, em texels: o deslocamento do corpo no mundo, que o quadro não mostra (a corrida
   * avança, a queda desce). A barra do paletó leva uma parte dele.
   */
  drift?: Vec2;
}

/** O desvio de cada pose de uma sequência (`undefined` onde nada se mexe). */
export function swayOf(poses: readonly Pose[], o: SwayOpts = {}): (Sway | undefined)[] {
  const pts = poses.map(tracked);
  const start = o.loop ? pts[pts.length - 1] : o.from ? tracked(o.from) : pts[0];
  const drift = o.drift ?? ZERO;
  const hemDrift = { x: drift.x * HEM_DRIFT, y: drift.y * HEM_DRIFT };
  // Velocidade de cada quadro; num ciclo, a do "anterior do primeiro" é a do último.
  const vel = pts.map((p, i) => {
    const prev = i === 0 ? start! : pts[i - 1]!;
    return { crown: sub(p.crown, prev.crown), hem: sub(p.hem, prev.hem) };
  });
  return vel.map((v, i) => {
    const before = i > 0 ? vel[i - 1]! : o.loop ? vel[vel.length - 1]! : { crown: ZERO, hem: ZERO };
    const hair = lag(v.crown, before.crown, drift, HAIR);
    const hem = lag(v.hem, before.hem, hemDrift, HEM);
    return hair === ZERO && hem === ZERO ? undefined : { hair, hem };
  });
}

/** Uma sequência de quadros soltos (os golpes ganham o desvio em `expandMove`). */
interface Sequence extends Omit<SwayOpts, 'from'> {
  frames: readonly string[];
  /** Quadro de onde o corpo chega (padrão: a guarda). `null`: a sequência começa parada. */
  from?: string | null;
}

/** Arrasto do cabelo na corrida (para trás), na subida do pulo (para baixo) e na queda (para cima). */
const RUN_DRIFT: Vec2 = { x: -1.3, y: 0.2 };
const RISE_DRIFT: Vec2 = { x: -0.4, y: 1.5 };
const FALL_DRIFT: Vec2 = { x: -0.3, y: -1.6 };

const numbered = (prefix: string, n: number): string[] => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const TECH_STEPS = ['sign', 'charge', 'release', 'recover'];

/** As sequências de quadros soltos, na ordem em que o jogo as mostra. Quadro fora daqui fica rígido. */
const SEQUENCES: readonly Sequence[] = [
  { frames: numbered('idle', 4), loop: true },
  { frames: numbered('run', 8), loop: true, drift: RUN_DRIFT },
  { frames: numbered('carry-idle', 2), loop: true },
  { frames: numbered('heavy-carry-idle', 2), loop: true },
  { frames: numbered('carry-run', 8), loop: true, drift: RUN_DRIFT },
  { frames: numbered('heavy-carry-run', 8), loop: true, drift: RUN_DRIFT },
  { frames: ['jump-0'] },
  // No ar o quadro não mostra a subida nem a queda (a origem é a sola do corpo físico): vale só o arrasto.
  { frames: ['jump-1'], from: null, drift: RISE_DRIFT },
  { frames: numbered('fall', 2), loop: true, drift: FALL_DRIFT },
  { frames: numbered('land', 2), from: 'fall-1' },
  { frames: numbered('dodge', 2) },
  { frames: ['hurt', 'hurt-1'] },
  { frames: numbered('stunned', 2), loop: true },
  { frames: numbered('throw', 2), from: 'carry-idle-0' },
  ...['divergente', 'corte', 'vermelho', 'azul'].map((t) => ({ frames: TECH_STEPS.map((s) => `${t}-${s}`) })),
];

/**
 * Dá aos quadros soltos de `frames` o desvio das suas sequências (troca o quadro por uma cópia com `sway`). A
 * sequência que não tem todos os quadros na folha é ignorada.
 */
export function swayLooseFrames(frames: Record<string, HdFrameSpec>, guard: Pose): void {
  for (const seq of SEQUENCES) {
    const specs = seq.frames.map((name) => frames[name]);
    if (specs.some((s) => s === undefined)) continue;
    const from = seq.from === null ? undefined : seq.from ? frames[seq.from]?.pose : guard;
    const sways = swayOf(
      specs.map((s) => s!.pose),
      { loop: seq.loop, drift: seq.drift, from },
    );
    seq.frames.forEach((name, i) => {
      if (sways[i]) frames[name] = { ...specs[i]!, sway: sways[i] };
    });
  }
}
