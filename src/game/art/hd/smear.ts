/*
 * Borrão de movimento (smear) do player HD: no quadro mais rápido de um golpe, o membro que bate deixa atrás de si uma
 * cunha nas próprias cores, do ponto onde estava no quadro anterior até onde está. É a linguagem do smear frame de
 * anime: lê como velocidade, não como um membro a mais. O borrão é pintado antes (atrás) do membro nítido, não tem
 * contorno e afina até sumir na cauda. Puro, sem `phaser`.
 */
import type { JointName, Vec2 } from '../rig/skeleton';
import type { StrikeLimb } from './frames';
import { MAT } from './palette';
import type { HdCanvas, Shape } from './raster';

type Joints = Record<JointName, Vec2>;

/** O borrão de um quadro: a parte que bate e as juntas do quadro anterior, de onde ela veio. */
export interface Smear {
  limb: StrikeLimb;
  from: Joints;
}

/**
 * Deslocamento do ponto de golpe (texels) entre dois quadros a partir do qual o quadro ganha borrão. Abaixo disso o
 * membro ainda lê nítido de um quadro para o outro.
 */
export const SMEAR_MIN_TRAVEL = 10;

/** Fração máxima do caminho do membro que o borrão cobre (o comprimento máximo em texels é de cada faixa). */
const MAX_SHARE = 0.72;

/** Juntas que definem cada parte que acerta: de onde vem e a ponta, e quanto o centro da parte passa da ponta. */
const LIMB_JOINTS: Record<StrikeLimb, readonly [JointName, JointName, number]> = {
  handNear: ['elbowNear', 'wristNear', 2.2],
  handFar: ['elbowFar', 'wristFar', 2.2],
  footNear: ['ankleNear', 'toeNear', 0],
  footFar: ['ankleFar', 'toeFar', 0],
  kneeNear: ['hipNear', 'kneeNear', 0],
  elbowNear: ['shoulderNear', 'elbowNear', 0],
};

/** Ponto da parte que acerta: a ponta do osso, mais os texels que o centro da parte passa dela (o punho, do pulso). */
export function strikePoint(j: Joints, limb: StrikeLimb): Vec2 {
  const [from, to, extra] = LIMB_JOINTS[limb];
  const a = j[from];
  const b = j[to];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: b.x + ((b.x - a.x) / len) * extra, y: b.y + ((b.y - a.y) / len) * extra };
}

const mix = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Uma faixa do borrão: o trecho do membro que ela arrasta (de `a`, mais perto do corpo, a `b`, a ponta), o material,
 * o tom do meio e a meia largura junto ao membro.
 */
interface Streak {
  a: (j: Joints) => Vec2;
  b: (j: Joints) => Vec2;
  mat: number;
  tone: number;
  half: number;
  /** Comprimento máximo da faixa ao longo do caminho (texels). */
  reach: number;
}

interface Plan {
  /** Junta em volta da qual o membro gira: o caminho do borrão é um arco em volta dela. */
  pivot: JointName;
  streaks: readonly Streak[];
}

/** Borrão do braço: o punho em pele, um pouco mais largo que o punho nítido. */
function armPlan(side: 'Near' | 'Far'): Plan {
  const fist = (j: Joints): Vec2 => strikePoint(j, `hand${side}`);
  return { pivot: `shoulder${side}`, streaks: [{ a: fist, b: fist, mat: MAT.skin, tone: 3, half: 2.7, reach: 9 }] };
}

/**
 * Ponto do sapato, `down` texels abaixo (para a sola) da linha do tornozelo ao bico; `t` vai de 0 (tornozelo) a 1
 * (bico). O padrão é o meio da altura do sapato.
 */
function shoeAt(j: Joints, side: 'Near' | 'Far', t: number, down = 1): Vec2 {
  const ankle = j[`ankle${side}`];
  const toe = j[`toe${side}`];
  const len = Math.hypot(toe.x - ankle.x, toe.y - ankle.y) || 1;
  const p = mix(ankle, toe, t);
  // A sola fica do lado direito de quem olha do tornozelo para o bico.
  return { x: p.x - ((toe.y - ankle.y) / len) * down, y: p.y + ((toe.x - ankle.x) / len) * down };
}

/** Borrão da perna: o sapato, do salto ao bico, e por cima o fio claro da sola, que é o que mais brilha no pé. */
function legPlan(side: 'Near' | 'Far'): Plan {
  const sole = (j: Joints): Vec2 => shoeAt(j, side, 0.9, 2.6);
  return {
    pivot: `hip${side}`,
    streaks: [
      { a: (j) => shoeAt(j, side, 0), b: (j) => shoeAt(j, side, 0.9), mat: MAT.shoe, tone: 3, half: 2.3, reach: 12 },
      { a: sole, b: sole, mat: MAT.white, tone: 0, half: 1.1, reach: 12 },
    ],
  };
}

const PLANS: Record<StrikeLimb, Plan> = {
  handNear: armPlan('Near'),
  handFar: armPlan('Far'),
  footNear: legPlan('Near'),
  footFar: legPlan('Far'),
  kneeNear: {
    pivot: 'hipNear',
    streaks: [{ a: (j) => j.kneeNear, b: (j) => j.kneeNear, mat: MAT.pants, tone: 2, half: 2.4, reach: 8 }],
  },
  elbowNear: {
    pivot: 'shoulderNear',
    streaks: [{ a: (j) => j.elbowNear, b: (j) => j.elbowNear, mat: MAT.jacket, tone: 2, half: 3, reach: 9 }],
  },
};

/** O membro (a camada do corpo) a que pertence o borrão de cada parte que acerta. */
export const SMEAR_LAYER: Record<StrikeLimb, 'armNear' | 'armFar' | 'legNear' | 'legFar'> = {
  handNear: 'armNear',
  elbowNear: 'armNear',
  handFar: 'armFar',
  footNear: 'legNear',
  kneeNear: 'legNear',
  footFar: 'legFar',
};

/** Disco da cunha: posição, raio e `s` de 0 (cauda) a 1 (junto ao membro). */
interface Sample {
  x: number;
  y: number;
  half: number;
  s: number;
}

const STEPS = 28;
/** Discos ao longo do trecho do membro em cada passo do caminho. */
const ACROSS = 6;

/**
 * Caminho de um ponto de `from` (quadro anterior) a `to` (este quadro) em volta do pivô: o ângulo e o raio
 * interpolam, então um membro que gira desenha um arco e um que estica desenha uma reta.
 */
function arc(pivot: Vec2, from: Vec2, to: Vec2): (t: number) => Vec2 {
  const ra = Math.hypot(from.x - pivot.x, from.y - pivot.y);
  const rb = Math.hypot(to.x - pivot.x, to.y - pivot.y);
  // Junto ao pivô o ângulo não quer dizer nada: o caminho é a reta.
  if (ra < 2 || rb < 2) return (t) => mix(from, to, t);
  const ta = Math.atan2(from.y - pivot.y, from.x - pivot.x);
  let turn = Math.atan2(to.y - pivot.y, to.x - pivot.x) - ta;
  if (turn > Math.PI) turn -= 2 * Math.PI;
  if (turn < -Math.PI) turn += 2 * Math.PI;
  return (t) => {
    const r = ra + (rb - ra) * t;
    return { x: pivot.x + Math.cos(ta + turn * t) * r, y: pivot.y + Math.sin(ta + turn * t) * r };
  };
}

/**
 * Os discos da cunha de uma faixa: o trecho do membro varrido pelo fim do caminho (só os últimos texels antes de
 * chegar a este quadro). Para a cauda a cunha afina e encolhe até a ponta do membro, que é quem mais anda.
 */
function samples(pivot: Vec2, k: Streak, from: Joints, to: Joints): Sample[] {
  const root = arc(pivot, k.a(from), k.a(to));
  const tip = arc(pivot, k.b(from), k.b(to));
  const tips = Array.from({ length: STEPS + 1 }, (_, i) => tip(i / STEPS));
  let total = 0;
  const run = tips.map((p, i) => (total += i === 0 ? 0 : Math.hypot(p.x - tips[i - 1]!.x, p.y - tips[i - 1]!.y)));
  const length = Math.min(k.reach, total * MAX_SHARE);
  const out: Sample[] = [];
  tips.forEach((b, i) => {
    const s = 1 - (total - run[i]!) / (length || 1);
    if (s < 0) return;
    const a = mix(b, root(i / STEPS), s);
    const half = Math.max(0.8, k.half * s ** 0.7);
    for (let n = 0; n <= ACROSS; n++) out.push({ ...mix(a, b, n / ACROSS), s, half });
  });
  return out;
}

/**
 * A cunha como forma: a união dos discos, calculada uma vez por texel da sua caixa. Devolve `t` = `s` do disco que
 * mais cobre o ponto.
 */
function wedge(discs: readonly Sample[], c: HdCanvas): Shape {
  // O borrão só passa por cima do vazio e do pano (paletó, calça): nunca cobre o rosto, as mãos ou o cabelo.
  const free = (i: number): boolean => c.mat[i] === 0 || c.mat[i] === MAT.jacket || c.mat[i] === MAT.pants;
  const r = Math.max(...discs.map((p) => p.half));
  // Dois texels de folga das bordas do frame: o borrão nunca encosta nelas.
  const x0 = Math.max(2, Math.floor(Math.min(...discs.map((p) => p.x)) - r));
  const y0 = Math.max(2, Math.floor(Math.min(...discs.map((p) => p.y)) - r));
  const w = Math.max(0, Math.min(c.w - 2, Math.ceil(Math.max(...discs.map((p) => p.x)) + r)) - x0);
  const h = Math.max(0, Math.min(c.h - 2, Math.ceil(Math.max(...discs.map((p) => p.y)) + r)) - y0);
  const cover = new Float32Array(w * h).fill(-1);
  const near = new Float32Array(w * h).fill(1);
  for (const p of discs) {
    const reach = Math.ceil(p.half);
    const px = Math.floor(p.x) - x0;
    const py = Math.floor(p.y) - y0;
    for (let y = Math.max(0, py - reach); y <= Math.min(h - 1, py + reach); y++) {
      for (let x = Math.max(0, px - reach); x <= Math.min(w - 1, px + reach); x++) {
        const d = Math.hypot(x + x0 + 0.5 - p.x, y + y0 + 0.5 - p.y) / p.half;
        if (d > near[y * w + x]!) continue;
        near[y * w + x] = d;
        cover[y * w + x] = p.s;
      }
    }
  }
  const shape: Shape = (x, y) => {
    const col = Math.floor(x) - x0;
    const row = Math.floor(y) - y0;
    if (col < 0 || row < 0 || col >= w || row >= h) return null;
    const t = cover[row * w + col]!;
    return t < 0 || !free((row + y0) * c.w + col + x0) ? null : { x: 0, y: 0, z: 1, t };
  };
  shape.bounds = { x0, y0, x1: x0 + w, y1: y0 + h };
  return shape;
}

/** Trechos da cunha (em `s`), do mais escuro (a cauda, que some no fundo) ao mais claro (junto ao membro). */
const BANDS: readonly (readonly [number, number])[] = [
  [0, 0.3],
  [0.3, 0.62],
  [0.62, 2],
];

/** Só o trecho da forma com `t` em `[from, to)`. */
function slice(shape: Shape, from: number, to: number): Shape {
  const out: Shape = (x, y) => {
    const n = shape(x, y);
    return n && (n.t ?? 0) >= from && (n.t ?? 0) < to ? n : null;
  };
  out.bounds = shape.bounds;
  return out;
}

/**
 * Pinta o borrão do quadro na parte `part`, antes do membro nítido: um tom mais claro junto ao membro e escurecendo
 * até a cauda. `dim`: o membro está do lado de longe, um tom abaixo.
 */
export function paintSmear(c: HdCanvas, j: Joints, smear: Smear, part: number, dim: boolean): void {
  const plan = PLANS[smear.limb];
  const pivot = j[plan.pivot];
  for (const k of plan.streaks) {
    const discs = samples(pivot, k, smear.from, j);
    if (discs.length === 0) continue;
    const shape = wedge(discs, c);
    const tone = k.tone - (dim ? 1 : 0);
    BANDS.forEach(([from, to], i) => {
      const flat = Math.min(4, Math.max(0, tone - 1 + i));
      c.paint(slice(shape, from, to), k.mat, part, { flat, soft: true });
    });
  }
}
