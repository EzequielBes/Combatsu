/*
 * Rasterizador do boneco articulado: transforma uma `Pose` numa grade de texto 32x30 com as teclas da `PALETTE`
 * (mesmo formato dos frames do player, AD-002). Puro, sem `phaser`.
 *
 * Cada parte (braço e perna de cada lado, tronco) é uma camada própria com o seu contorno `k`, composta por profundidade:
 * braço e perna de longe (um tom mais escuro), tronco, perna de perto, cabeça, braço de perto. O contorno de uma parte
 * de cima cobre a de baixo, então a linha que separa braço, perna e tronco aparece sempre. Os membros são cápsulas
 * (segmentos com raio) amostradas no centro de cada texel, com sombreamento da luz de cima e de trás (`LIGHT`) em 3
 * tons; o tronco segue a forma do paletó. No fim roda o `selOut` do player, como na montagem manual.
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

function paint(canvas: Canvas, layer: Layer, skipOutline?: (x: number, y: number) => boolean): void {
  for (const c of layer.values()) canvas.set(c.x, c.y, c.ch);
  // Contorno só nos vizinhos de 4 direções que não são da própria parte; cobre o que está atrás.
  const outline = new Set<number>();
  for (const c of layer.values()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const k = key(nx, ny);
      if (layer.has(k) || outline.has(k) || skipOutline?.(nx, ny)) continue;
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
const LEG_NEAR: Ramp = { light: 's', mid: 'N', dark: 'n' };
const LEG_FAR: Ramp = { light: 'n', mid: 'K', dark: 'K' };

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
}
const NEAR: LimbStyle = { cloth: NEAR_CLOTH, skin: { lit: 'p', shade: 'P', line: 'x' }, spec: 's', crease: 'o' };
const FAR: LimbStyle = { cloth: FAR_CLOTH, skin: { lit: 'P', shade: 'q', line: 'q' }, spec: 's', crease: 'K' };

/** Raios (de dentro do contorno) de cada parte: braço e perna do `idle-0` têm 2 texels de miolo. */
const ARM_R = { shoulder: 1.55, elbow: 1.3, wrist: 1.15 };
const LEG_R = { hip: 1.5, knee: 1.25, ankle: 1.05 };

const unit = (a: Vec2, b: Vec2): Vec2 => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
};

/**
 * Dobra e luz de uma junta de dois ossos: o texel por dentro da dobra vira a linha de dobra (cotovelo e joelho).
 * Só marca se a dobra passa de ~25 graus, onde há pixels para mostrar.
 */
function bendMarks(layer: Layer, from: Vec2, joint: Vec2, to: Vec2, style: LimbStyle, reach: number): void {
  const u1 = unit(from, joint);
  const u2 = unit(joint, to);
  const dx = u2.x - u1.x;
  const dy = u2.y - u1.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.45) return;
  const inner = { x: dx / mag, y: dy / mag };
  const cell = layer.get(key(Math.floor(joint.x + inner.x * reach), Math.floor(joint.y + inner.y * reach)));
  if (cell) cell.ch = style.crease;
}

/**
 * Punho de verdade: palma de ~4x3 com os nós dos dedos na ponta (vãos em sombra), o polegar ao lado e a sombra do
 * lado da frente. Montado no eixo do antebraço, então gira com ele.
 */
function fistCells(wrist: Vec2, angleWorld: number, style: LimbStyle, k = 1): { x: number; y: number; ch: string }[] {
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
      // `k` encolhe a mão junto com o braço encurtado por perspectiva (a mão do `idle-0` tem 2x2).
      const a = (px * f.x + py * f.y) / k; // ao longo do antebraço, a partir do pulso
      const b = (px * n.x + py * n.y) / k; // para o lado de trás
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

/** Braço: manga (braço e antebraço), punho de manga claro e a mão fechada, numa camada só com o contorno `k`. */
function armLayer(joints: Record<JointName, Vec2>, angleWorld: number, side: 'Near' | 'Far', style: LimbStyle, handScale = 1): Layer {
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

  for (const c of fistCells(wr, angleWorld, style, handScale)) layer.set(key(c.x, c.y), c);
  return layer;
}

/** Perna: coxa e canela (cápsulas com dobra de joelho) e o sapato, tudo na camada da própria perna. */
function legLayer(joints: Record<JointName, Vec2>, footAngle: number, side: 'Near' | 'Far', style: LimbStyle): Layer {
  const hp = joints[`hip${side}`];
  const kn = joints[`knee${side}`];
  const an = joints[`ankle${side}`];
  const to = joints[`toe${side}`];
  const ramp = side === 'Near' ? LEG_NEAR : LEG_FAR;
  const segs: Seg[] = [
    { a: hp, b: kn, ra: LEG_R.hip, rb: LEG_R.knee },
    { a: kn, b: an, ra: LEG_R.knee, rb: LEG_R.ankle },
  ];
  // Corta a ponta redonda de cima da coxa: o topo da perna é reto, na cintura.
  const hits = sample(segs, (h) => h.seg !== 0 || h.axial >= 0.2);
  const layer = toLayer(hits.map((h) => ({ x: h.x, y: h.y, ch: tone(h, ramp) })));
  bendMarks(layer, hp, kn, an, style, 1.0);

  // Sapato: do calcanhar (atrás do tornozelo) até a ponta.
  const fd = dir(footAngle);
  const back = side === 'Far' ? 1.5 : 0.8; // o pé de longe tem o calcanhar mais atrás, para caber o vão entre os pés
  const heel = { x: an.x - fd.x * back, y: an.y - fd.y * back };
  for (const h of sample([{ a: heel, b: to, ra: 0.62, rb: 0.55 }])) {
    layer.set(key(h.x, h.y), { x: h.x, y: h.y, ch: shadeOf(h) > 0.45 ? 's' : 'K' });
  }
  return layer;
}

/** Sem contorno no topo da perna: ali ela se funde ao bloco do quadril do tronco, como no uniforme desenhado. */
function legTop(joints: Record<JointName, Vec2>, side: 'Near' | 'Far'): (x: number, y: number) => boolean {
  const hp = joints[`hip${side}`];
  const d = unit(hp, joints[`knee${side}`]);
  return (x, y) => (x + 0.5 - hp.x) * d.x + (y + 0.5 - hp.y) * d.y < 0.3;
}

/** Deslocamento do centro do tronco em relação à vertical do quadril (zero: o tronco do `idle-0` é centrado no quadril). */
const TORSO_V = 0;

/**
 * Tronco do paletó, no sistema local da coluna (u para cima a partir do quadril, v para a frente): ombro um pouco mais
 * largo, cintura mais estreita, bloco do quadril abaixo do cinto, gola no alto, fileira de botões na frente, luz fria
 * nas costas e cinto com fivela.
 */
function torsoLayer(joints: Record<JointName, Vec2>): Layer {
  const { hip, neck } = joints;
  const len = Math.hypot(neck.x - hip.x, neck.y - hip.y);
  const up = unit(hip, neck);
  const front = { x: -up.y, y: up.x };
  const cells: { x: number; y: number; ch: string }[] = [];
  const halfAt = (u: number): number => (u > len - 1 ? 2.7 : u > 3.4 ? 3.1 : u > 1.2 ? 2.7 : 2.9);
  const span = Math.ceil(len + 6);
  for (let y = Math.floor(hip.y) - span; y <= Math.ceil(hip.y) + 3; y++) {
    for (let x = Math.floor(hip.x) - span; x <= Math.ceil(hip.x) + span; x++) {
      const px = x + 0.5 - hip.x;
      const py = y + 0.5 - hip.y;
      const u = px * up.x + py * up.y;
      const v = px * front.x + py * front.y - TORSO_V;
      if (u < -1.0 || u > len) continue;
      const w = halfAt(u);
      if (Math.abs(v) > w) continue;
      let ch: string;
      if (u < 1.0) ch = 'K'; // bloco do quadril e cinto
      else if (u > len - 1) ch = 's'; // gola
      else if (v < -w + 1) ch = 'y'; // luz fria da lua nas costas
      else if (v > w - 0.95) ch = 'n'; // lado da frente, na sombra
      else if (u > len - 2.2 && v > 0) ch = 's'; // luz do ombro
      else if (u < 2.2) ch = 'n';
      else ch = 'N';
      cells.push({ x, y, ch });
    }
  }
  const layer = toLayer(cells);
  const mark = (u: number, v: number, ch: string): void => {
    const px = hip.x + up.x * u + front.x * (v + TORSO_V);
    const py = hip.y + up.y * u + front.y * (v + TORSO_V);
    const cell = layer.get(key(Math.floor(px), Math.floor(py)));
    if (cell) cell.ch = ch;
  };
  mark(0.5, 0.5, 'A'); // fivela
  mark(0.5, -0.5, 'z');
  for (const u of [1.9, 3.4, 4.9]) mark(u, 1.45, 'A'); // botões
  return layer;
}

// ---------------------------------------------------------------- frame

export interface RasterOptions {
  /** Grade da cabeça carimbada no pescoço (padrão: `HEAD_FOCUS`, a do golpe). */
  head?: Grid;
}

/** Rasteriza a pose num frame de 30 linhas x 32 colunas. */
export function rasterize(pose: Pose, opts: RasterOptions = {}): RasterResult {
  const hand = Math.min(1, Math.max(0.6, pose.armScale ?? 1));
  const joints = solve(pose);
  const wa = worldAngles(pose);
  const canvas = new Canvas();

  // Profundidade: braço e perna de longe, tronco, perna de perto, cabeça no pescoço e o braço de perto por cima.
  paint(canvas, armLayer(joints, wa.foreArmFar, 'Far', FAR, hand));
  paint(canvas, legLayer(joints, wa.footFar, 'Far', FAR), legTop(joints, 'Far'));
  paint(canvas, torsoLayer(joints));
  paint(canvas, legLayer(joints, wa.footNear, 'Near', NEAR), legTop(joints, 'Near'));

  const head = opts.head ?? HEAD_FOCUS;
  const hx = Math.round(joints.neck.x + HEAD_DX);
  const hy = Math.round(joints.neck.y + HEAD_DY);
  head.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch !== '.') canvas.set(hx + dx, hy + dy, ch);
    }),
  );

  // O braço de perto passa por cima da cabeça (o gancho sobe rente ao rosto).
  paint(canvas, armLayer(joints, wa.foreArmNear, 'Near', NEAR, hand));

  selOut(canvas.cells);
  return { frame: canvas.cells.map((r) => r.join('')), clipped: canvas.clipped, joints };
}

/** Texel do pulso (centro da mão) de perto, usado como ponto de golpe (RIG-06). */
export function wristTexel(joints: Record<JointName, Vec2>): { col: number; row: number } {
  return { col: Math.floor(joints.wristNear.x), row: Math.floor(joints.wristNear.y) };
}
