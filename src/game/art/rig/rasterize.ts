/*
 * Rasterizador do boneco articulado: transforma uma `Pose` numa grade de texto 32x30 com as teclas da `PALETTE`
 * (mesmo formato dos frames do player, AD-002). Puro, sem `phaser`.
 *
 * Ordem de desenho: braço e perna de longe (um tom mais escuro), tronco, cabeça, perna de perto, braço de perto.
 * Cada parte é uma ou mais cápsulas (segmentos com raio) amostradas no centro de cada texel; o sombreamento vem da luz
 * de cima e de trás (`LIGHT`), em 3 tons, e cada parte ganha o seu contorno `k` por cima do que está atrás. No fim
 * roda o `selOut` do player, como na montagem manual.
 */
import { selOut } from '../selOut';
import { HEAD_FOCUS, PLAYER_FRAME_H, PLAYER_FRAME_W, type Grid } from '../sprites/player';
import { solve, worldAngles, dir, type JointName, type Pose, type Vec2 } from './skeleton';

export const RIG_W = PLAYER_FRAME_W;
export const RIG_H = PLAYER_FRAME_H;

/** Luz (de cima, um pouco de trás): o lado do texel voltado para cá pega o tom claro. */
const LIGHT: Vec2 = { x: -0.45, y: -0.89 };
/** A cabeça (grade 13x11) fica com o canto superior esquerdo a este deslocamento do pescoço. */
const HEAD_DX = -5;
const HEAD_DY = -11;

export interface RasterResult {
  /** 30 linhas de 32 colunas. */
  frame: string[];
  /** Texels opacos que caíram fora da grade e foram descartados (EDG-01), como `composeWithStats`. */
  clipped: number;
  /** Juntas resolvidas da pose (coordenadas de borda de texel). */
  joints: Record<JointName, Vec2>;
}

// ---------------------------------------------------------------- tela e camadas

const OFF = 40;
const STRIDE = 160;
const key = (x: number, y: number): number => (y + OFF) * STRIDE + (x + OFF);

class Canvas {
  readonly cells: string[][] = Array.from({ length: RIG_H }, () => Array<string>(RIG_W).fill('.'));
  clipped = 0;
  set(x: number, y: number, ch: string): void {
    if (x < 0 || x >= RIG_W || y < 0 || y >= RIG_H) {
      this.clipped++;
      return;
    }
    this.cells[y][x] = ch;
  }
}

/** Texels de uma parte: tecla de cada um, indexada pela posição. */
type Layer = Map<number, { x: number; y: number; ch: string }>;

function paint(canvas: Canvas, layer: Layer): void {
  for (const c of layer.values()) canvas.set(c.x, c.y, c.ch);
  // Contorno só nos vizinhos de 4 direções que não são da própria parte; cobre o que está atrás.
  const outline = new Set<number>();
  for (const c of layer.values()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const k = key(nx, ny);
      if (layer.has(k) || outline.has(k)) continue;
      outline.add(k);
      canvas.set(nx, ny, 'k');
    }
  }
}

interface Seg {
  a: Vec2;
  b: Vec2;
  ra: number;
  rb: number;
}

interface Hit {
  x: number;
  y: number;
  seg: number;
  /** Parâmetro do ponto mais próximo no segmento, em [0, 1]. */
  t: number;
  /** Distância ao longo do eixo do segmento, a partir de `a`, sem limitar (negativa antes de `a`). */
  axial: number;
  /** Ponto mais próximo do eixo e raio ali. */
  c: Vec2;
  r: number;
  /** Deslocamento do centro do texel ao eixo, normalizado pelo raio (|d| <= 1 dentro). */
  off: Vec2;
  /** Direção do segmento. */
  d: Vec2;
}

/** Cápsulas com raio que varia: o texel entra se o centro está dentro; vale o segmento em que está mais ao centro. */
function sample(segs: readonly Seg[], accept?: (h: Hit) => boolean): Hit[] {
  const best = new Map<number, { score: number; hit: Hit }>();
  segs.forEach((s, i) => {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len = Math.hypot(dx, dy) || 1e-9;
    const d = { x: dx / len, y: dy / len };
    const rmax = Math.max(s.ra, s.rb);
    const minX = Math.floor(Math.min(s.a.x, s.b.x) - rmax) - 1;
    const maxX = Math.ceil(Math.max(s.a.x, s.b.x) + rmax) + 1;
    const minY = Math.floor(Math.min(s.a.y, s.b.y) - rmax) - 1;
    const maxY = Math.ceil(Math.max(s.a.y, s.b.y) + rmax) + 1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5 - s.a.x;
        const py = y + 0.5 - s.a.y;
        const axial = px * d.x + py * d.y;
        const t = Math.min(Math.max(axial / len, 0), 1);
        const c = { x: s.a.x + dx * t, y: s.a.y + dy * t };
        const r = s.ra + (s.rb - s.ra) * t;
        const ox = x + 0.5 - c.x;
        const oy = y + 0.5 - c.y;
        const dist = Math.hypot(ox, oy);
        if (dist > r) continue;
        const hit: Hit = { x, y, seg: i, t, axial, c, r, off: { x: ox / r, y: oy / r }, d };
        if (accept && !accept(hit)) continue;
        const score = dist / r;
        const k = key(x, y);
        const prev = best.get(k);
        if (!prev || score < prev.score) best.set(k, { score, hit });
      }
    }
  });
  return [...best.values()].map((b) => b.hit);
}

const shadeOf = (h: Hit): number => h.off.x * LIGHT.x + h.off.y * LIGHT.y;

type Ramp = { light: string; mid: string; dark: string };
const NEAR_CLOTH: Ramp = { light: 's', mid: 'N', dark: 'n' };
const FAR_CLOTH: Ramp = { light: 'N', mid: 'n', dark: 'K' };

function tone(h: Hit, ramp: Ramp): string {
  const s = shadeOf(h);
  return s > 0.22 ? ramp.light : s < -0.4 ? ramp.dark : ramp.mid;
}

function toLayer(cells: { x: number; y: number; ch: string }[]): Layer {
  return new Map(cells.map((c) => [key(c.x, c.y), c]));
}

// ---------------------------------------------------------------- partes

interface LimbStyle {
  cloth: Ramp;
  /** Cor da pele da mão: claro/sombra/linha. */
  skin: { lit: string; shade: string; line: string };
  /** Destaque da luz (ombro) e dobra (cotovelo, joelho por dentro). */
  spec: string;
  crease: string;
  /** Luz fria de borda nas costas (só o corpo de perto). */

}
const NEAR: LimbStyle = { cloth: NEAR_CLOTH, skin: { lit: 'p', shade: 'P', line: 'x' }, spec: 's', crease: 'o' };
const FAR: LimbStyle = { cloth: FAR_CLOTH, skin: { lit: 'P', shade: 'q', line: 'q' }, spec: 's', crease: 'K' };

const ARM_R = { shoulder: 2.1, elbow: 1.7, wrist: 1.4 };
const LEG_R = { hip: 2.2, knee: 1.85, ankle: 1.4 };

const unit = (a: Vec2, b: Vec2): Vec2 => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
};

/**
 * Dobra e luz de uma junta de dois ossos: o texel por dentro da dobra vira a linha de dobra e o por fora pega o
 * tom claro (cotovelo e joelho). Só marca se a dobra passa de ~25 graus, onde há pixels para mostrar.
 */
function bendMarks(layer: Layer, from: Vec2, joint: Vec2, to: Vec2, style: LimbStyle, reach: number): void {
  const u1 = unit(from, joint);
  const u2 = unit(joint, to);
  const dx = u2.x - u1.x;
  const dy = u2.y - u1.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.45) return;
  const inner = { x: dx / mag, y: dy / mag };
  const at = (k: number, ch: string): void => {
    const cell = layer.get(key(Math.floor(joint.x + inner.x * k), Math.floor(joint.y + inner.y * k)));
    if (cell) cell.ch = ch;
  };
  at(reach, style.crease);

}


/**
 * Punho de verdade: palma de ~4x3 com os nós dos dedos na ponta (vãos em sombra), o polegar ao lado e a sombra do
 * lado da frente. Montado no eixo do antebraço, então gira com ele.
 */
function fistCells(wrist: Vec2, angleWorld: number, style: LimbStyle): { x: number; y: number; ch: string }[] {
  const f = dir(angleWorld);
  // Lado "de trás" da mão: a normal que aponta para a esquerda da tela (o polegar fica ali).
  let n = { x: -f.y, y: f.x };
  if (n.x > 0) n = { x: -n.x, y: -n.y };
  const out: { x: number; y: number; ch: string }[] = [];
  const cx = Math.floor(wrist.x) - 4;
  const cy = Math.floor(wrist.y) - 4;
  for (let y = cy; y <= cy + 8; y++) {
    for (let x = cx; x <= cx + 8; x++) {
      const px = x + 0.5 - wrist.x;
      const py = y + 0.5 - wrist.y;
      const a = px * f.x + py * f.y; // ao longo do antebraço, a partir do pulso
      const b = px * n.x + py * n.y; // para o lado de trás
      const inPalm = a >= -0.7 && a <= 3.0 && b >= -1.75 && b <= 1.75;
      const inThumb = a >= 0.0 && a <= 1.7 && b > 1.75 && b <= 2.7;
      if (!inPalm && !inThumb) continue;
      if (inPalm && a > 2.2 && Math.abs(b) > 1.25) continue; // ponta arredondada
      let ch = style.skin.lit;
      if (inThumb) ch = style.skin.lit;
      else if (b >= 1.2 && a >= 0.2 && a <= 1.7) ch = style.skin.line; // linha do polegar
      else if (a > 1.35 && a <= 2.2 && Math.abs(b) < 0.35) ch = style.skin.shade; // vão entre os dedos
      else if (b < -0.9) ch = style.skin.shade; // lado da frente, na sombra
      else if (a < 0.2) ch = style.skin.shade; // sombra do punho de manga
      out.push({ x, y, ch });
    }
  }
  return out;
}

function armLayer(joints: Record<JointName, Vec2>, angleWorld: number, side: 'Near' | 'Far', style: LimbStyle): Layer {
  const sh = joints[`shoulder${side}`];
  const el = joints[`elbow${side}`];
  const wr = joints[`wrist${side}`];
  const segs: Seg[] = [
    { a: sh, b: el, ra: ARM_R.shoulder, rb: ARM_R.elbow },
    { a: el, b: wr, ra: ARM_R.elbow, rb: ARM_R.wrist },
  ];
  const foreLen = Math.hypot(wr.x - el.x, wr.y - el.y);
  const cells = sample(segs).map((h) => {
    // Punho de manga claro nos últimos texels do antebraço.
    const cuff = h.seg === 1 && h.axial > foreLen - 1.2;
    return { x: h.x, y: h.y, ch: cuff ? style.cloth.light : tone(h, style.cloth) };
  });
  const layer = toLayer(cells);
  bendMarks(layer, sh, el, wr, style, 0.9);
  // Destaque de ombro: um texel claro no alto do braço.
  const shCell = layer.get(key(Math.floor(sh.x - 0.2), Math.floor(sh.y - 1.0)));
  if (shCell) shCell.ch = style.spec;

  for (const c of fistCells(wr, angleWorld, style)) layer.set(key(c.x, c.y), c);
  return layer;
}

function legLayer(joints: Record<JointName, Vec2>, footAngle: number, side: 'Near' | 'Far', style: LimbStyle): Layer {
  const hp = joints[`hip${side}`];
  const kn = joints[`knee${side}`];
  const an = joints[`ankle${side}`];
  const to = joints[`toe${side}`];
  const segs: Seg[] = [
    { a: hp, b: kn, ra: LEG_R.hip, rb: LEG_R.knee },
    { a: kn, b: an, ra: LEG_R.knee, rb: LEG_R.ankle },
  ];
  const layer = toLayer(sample(segs).map((h) => ({ x: h.x, y: h.y, ch: shadeOf(h) < -0.72 && style === NEAR ? style.cloth.mid : tone(h, style.cloth) })));
  bendMarks(layer, hp, kn, an, style, 1.0);

  // Sapato: do calcanhar (atrás do tornozelo) até a ponta.
  const fd = dir(footAngle);
  const heel = { x: an.x - fd.x * 0.6, y: an.y - fd.y * 0.6 };
  for (const h of sample([{ a: heel, b: to, ra: 1.15, rb: 0.95 }])) {
    layer.set(key(h.x, h.y), { x: h.x, y: h.y, ch: shadeOf(h) > 0.45 ? 's' : 'K' });
  }
  return layer;
}

function torsoLayer(joints: Record<JointName, Vec2>): Layer {
  const { hip, chest, neck } = joints;
  const segs: Seg[] = [
    { a: hip, b: chest, ra: 3.0, rb: 3.65 },
    { a: chest, b: neck, ra: 3.65, rb: 2.5 },
  ];
  const spine = dir(Math.atan2(chest.x - hip.x, chest.y - hip.y) * (180 / Math.PI));
  // Corta a ponta redonda de baixo: o cinto fica achatado, como no uniforme desenhado.
  const hits = sample(segs, (h) => h.seg !== 0 || h.axial >= -1.7);
  const cells = hits.map((h) => {
    const axial = h.seg === 0 ? h.axial : 3 + h.axial; // distância ao longo da coluna a partir do quadril
    const front = { x: -h.d.y, y: h.d.x }; // normal para a frente quando o tronco está de pé
    const v = h.off.x * front.x + h.off.y * front.y;
    let ch: string;
    if (axial < 0.35) ch = 'K'; // cinto
    else if (axial > 5.1) ch = 's'; // gola
    else if (v < -0.72) ch = 'y'; // luz fria da lua nas costas
    else if (v > 0.6) ch = 'n';
    else if (shadeOf(h) > 0.42) ch = 's';
    else if (axial < 1.6) ch = 'n';
    else ch = 'N';
    return { x: h.x, y: h.y, ch };
  });
  const layer = toLayer(cells);
  // Luz fria da lua: o texel mais ao fundo de cada linha do tronco, do cinto para cima.
  const back = new Map<number, { x: number; y: number; ch: string }>();
  for (const c of layer.values()) {
    const q = back.get(c.y);
    if (!q || c.x < q.x) back.set(c.y, c);
  }
  for (const c of back.values()) if (c.ch === 'N' || c.ch === 'n' || c.ch === 'y') c.ch = 'y';
  const up = { x: spine.x, y: spine.y };
  const front = { x: -up.y, y: up.x };
  const mark = (along: number, across: number, ch: string): void => {
    const px = hip.x + up.x * along + front.x * across;
    const py = hip.y + up.y * along + front.y * across;
    const cell = layer.get(key(Math.floor(px), Math.floor(py)));
    if (cell) cell.ch = ch;
  };
  mark(-0.4, 1.2, 'A'); // fivela
  mark(-0.4, 0.2, 'z');
  mark(-1.2, 1.2, 'z');
  mark(1.3, 1.9, 'A'); // botões
  mark(2.5, 1.9, 'A');
  mark(3.7, 1.7, 'A');
  return layer;
}

// ---------------------------------------------------------------- frame

export interface RasterOptions {
  /** Grade da cabeça carimbada no pescoço (padrão: `HEAD_FOCUS`, a do golpe). */
  head?: Grid;
}

/** Rasteriza a pose num frame de 30 linhas x 32 colunas. */
export function rasterize(pose: Pose, opts: RasterOptions = {}): RasterResult {
  const joints = solve(pose);
  const wa = worldAngles(pose);
  const canvas = new Canvas();

  paint(canvas, armLayer(joints, wa.foreArmFar, 'Far', FAR));
  paint(canvas, legLayer(joints, wa.footFar, 'Far', FAR));
  // As pernas ficam por baixo do tronco (o cinto cobre o quadril), como no uniforme desenhado.
  paint(canvas, legLayer(joints, wa.footNear, 'Near', NEAR));
  paint(canvas, torsoLayer(joints));

  const head = opts.head ?? HEAD_FOCUS;
  const hx = Math.round(joints.neck.x + HEAD_DX);
  const hy = Math.round(joints.neck.y + HEAD_DY);
  head.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch !== '.') canvas.set(hx + dx, hy + dy, ch);
    }),
  );

  paint(canvas, armLayer(joints, wa.foreArmNear, 'Near', NEAR));

  selOut(canvas.cells);
  return { frame: canvas.cells.map((r) => r.join('')), clipped: canvas.clipped, joints };
}

/** Texel do pulso (centro da mão) de perto, usado como ponto de golpe (RIG-06). */
export function wristTexel(joints: Record<JointName, Vec2>): { col: number; row: number } {
  return { col: Math.floor(joints.wristNear.x), row: Math.floor(joints.wristNear.y) };
}
