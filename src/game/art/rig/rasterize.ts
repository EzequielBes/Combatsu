/*
 * Rasterizador do boneco articulado: transforma uma `Pose` numa grade de texto com as teclas da `PALETTE` (mesmo
 * formato dos frames do player, AD-002), no tamanho de um `RigFrame` (32x30 por padrão). Puro, sem `phaser`.
 *
 * Cada parte (braço e perna de cada lado, tronco) é uma camada própria com o seu contorno `k`, composta por profundidade:
 * braço e perna de longe (um tom mais escuro), tronco, perna de perto, cabeça, braço de perto. O contorno de uma parte
 * de cima cobre a de baixo, então a linha que separa braço, perna e tronco aparece sempre. Os membros são cápsulas
 * (segmentos com raio) amostradas no centro de cada texel, com sombreamento da luz de cima e de trás (`LIGHT`) em 3
 * tons; o tronco segue a forma do paletó. No fim roda o `selOut` do player, como na montagem manual.
 */
import { selOut } from '../selOut';
import { PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN, type Grid } from '../sprites/player';
import { headOf } from './presets';
import {
  CHIBI,
  SOLE,
  solve,
  worldAngles,
  dir,
  type JointName,
  type Pose,
  type Proportions,
  type Thickness,
  type Vec2,
} from './skeleton';

/** Grade do frame do rig: largura, altura e a coluna do eixo do corpo; a origem fica no pé, na última linha. */
export interface RigFrame {
  w: number;
  h: number;
  originCol: number;
}

/** O frame do player (32x30, eixo na coluna 10): o dos presets do estudo e do boneco chibi. */
export const RIG_FRAME_32: RigFrame = {
  w: PLAYER_FRAME_W,
  h: PLAYER_FRAME_H,
  originCol: PLAYER_ORIGIN.x * PLAYER_FRAME_W,
};
/** Frame do heroico alto (40x40, eixo na coluna 12): folga para o corpo de 32 texels e o punho acima da cabeça. */
export const RIG_FRAME_40: RigFrame = { w: 40, h: 40, originCol: 12 };

/** Linha do tornozelo com o pé no chão neste frame (o sapato e o contorno de baixo ocupam `SOLE`). */
export const groundOf = (frame: RigFrame): number => frame.h - SOLE;

/** Luz (de cima, um pouco de trás): o lado do texel voltado para cá pega o tom claro. */
const LIGHT: Vec2 = { x: -0.45, y: -0.89 };

export interface RasterResult {
  /** `h` linhas de `w` colunas do `RigFrame` (30 x 32 por padrão). */
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
  readonly cells: string[][];
  clipped = 0;
  private readonly w: number;
  private readonly h: number;
  /** Sem parameter properties: as ferramentas importam este .ts direto no Node (strip-only). */
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  }
  set(x: number, y: number, ch: string): void {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      this.clipped++;
      return;
    }
    this.cells[y][x] = ch;
  }
}

/** Texels de uma parte: tecla de cada um, indexada pela posição. */
type Layer = Map<number, { x: number; y: number; ch: string }>;

function paint(
  canvas: Canvas,
  layer: Layer,
  skipOutline?: (x: number, y: number, dx: number, dy: number) => boolean,
): void {
  for (const c of layer.values()) canvas.set(c.x, c.y, c.ch);
  // Contorno só nos vizinhos de 4 direções que não são da própria parte; cobre o que está atrás.
  const outline = new Set<number>();
  for (const c of layer.values()) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const k = key(nx, ny);
      if (layer.has(k) || outline.has(k) || skipOutline?.(nx, ny, dx, dy)) continue;
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

export type Ramp = { light: string; mid: string; dark: string };
const NEAR_CLOTH: Ramp = { light: 's', mid: 'N', dark: 'n' };
const FAR_CLOTH: Ramp = { light: 'N', mid: 'n', dark: 'K' };
const LEG_NEAR: Ramp = { light: 's', mid: 'N', dark: 'n' };
const LEG_FAR: Ramp = { light: 'N', mid: 'n', dark: 'K' };

/** Acabamento do corpo por preset (PRA-07). O `CLASSIC_STYLE` reproduz o chibi e os presets do estudo, texel a texel. */
export interface BodyStyle {
  /** Rampas da calça, perna de perto e de longe. */
  legNear: Ramp;
  legFar: Ramp;
  /** Barra do paletó abaixo do cinto (texels), em `n`, sobre a calça; 0 = o bloco do quadril é só o cinto `K`. */
  hem: number;
  /** Luz `S` no alto do ombro e peito claro `s`; a sombra `n` da frente fica só embaixo. */
  litChest: boolean;
  /** Pescoço de pele entre a gola e a cabeça. */
  neck: boolean;
  /** Nós dos dedos na ponta do punho. */
  knuckles: boolean;
  /** Brilho `S` em cima do sapato e sola `s` embaixo. */
  sole: boolean;
  /** Sem contorno entre a manga de perto e o tronco pelo lado da frente (tira a coluna escura do idle). */
  openSleeve: boolean;
  /** Borda fria `y` da lua na beirada de trás da manga de perto (a mesma luz das costas do paletó). */
  sleeveRim: boolean;
}

export const CLASSIC_STYLE: BodyStyle = {
  legNear: LEG_NEAR,
  legFar: LEG_FAR,
  hem: 0,
  litChest: false,
  neck: false,
  knuckles: false,
  sole: false,
  openSleeve: false,
  sleeveRim: false,
};
/** O acabamento do heroico alto: calça `K`/`n` separada do paletó, barra, luz no ombro, pescoço, dedos e sola. */
export const TAILORED_STYLE: BodyStyle = {
  legNear: { light: 'N', mid: 'n', dark: 'K' },
  legFar: { light: 'n', mid: 'K', dark: 'K' },
  hem: 1,
  litChest: true,
  neck: true,
  knuckles: true,
  sole: true,
  openSleeve: true,
  sleeveRim: true,
};

const STYLES: Record<string, BodyStyle> = { heroicoAlto: TAILORED_STYLE };

/** Acabamento do corpo (o clássico se o preset não tem o seu). */
export const styleOf = (body: Proportions): BodyStyle => STYLES[body.name] ?? CLASSIC_STYLE;

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
function fistCells(
  wrist: Vec2,
  angleWorld: number,
  style: LimbStyle,
  k = 1,
  knuckles = false,
): { x: number; y: number; ch: string }[] {
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
      else if (b >= 1.2 && a >= 0.2 && a <= 1.7)
        ch = style.skin.line; // linha do polegar
      else if (knuckles && a > 1.9 && Math.floor(b + 1.75) % 2 === 1)
        ch = style.skin.shade; // nós dos dedos alternados na ponta
      else if (!knuckles && a > 1.35 && a <= 2.2 && Math.abs(b) < 0.35)
        ch = style.skin.shade; // vão entre os dedos
      else if (b < -0.9)
        ch = style.skin.shade; // lado da frente, na sombra
      else if (a < 0.2) ch = style.skin.shade; // sombra do punho de manga
      out.push({ x, y, ch });
    }
  }
  return out;
}

/** Braço: manga (braço e antebraço), punho de manga claro e a mão fechada, numa camada só com o contorno `k`. */
function armLayer(
  joints: Record<JointName, Vec2>,
  angleWorld: number,
  side: 'Near' | 'Far',
  style: LimbStyle,
  th: Thickness,
  handScale = 1,
  knuckles = false,
  rim = false,
): Layer {
  const ARM_R = th.arm;
  const sh = joints[`shoulder${side}`];
  const el = joints[`elbow${side}`];
  const wr = joints[`wrist${side}`];
  const segs: Seg[] = [
    { a: sh, b: el, ra: ARM_R.shoulder, rb: ARM_R.elbow },
    { a: el, b: wr, ra: ARM_R.elbow, rb: ARM_R.wrist },
  ];
  const foreLen = Math.hypot(wr.x - el.x, wr.y - el.y);
  const cells = sample(segs).map((h) => {
    // Punho de manga claro nos últimos texels do antebraço; borda fria `y` na beirada de trás da manga.
    const cuff = h.seg === 1 && h.axial > foreLen - 1.2;
    const ch = cuff ? style.cloth.light : rim && h.off.x < -0.7 ? 'y' : tone(h, style.cloth);
    return { x: h.x, y: h.y, ch };
  });
  const layer = toLayer(cells);
  bendMarks(layer, sh, el, wr, style, 0.9);
  // Destaque de ombro: um texel claro no alto do braço.
  const shCell = layer.get(key(Math.floor(sh.x - 0.2), Math.floor(sh.y - 1.0)));
  if (shCell) shCell.ch = style.spec;

  for (const c of fistCells(wr, angleWorld, style, handScale, knuckles)) layer.set(key(c.x, c.y), c);
  return layer;
}

/** Perna: coxa e canela (cápsulas com dobra de joelho) e o sapato, tudo na camada da própria perna. */
function legLayer(
  joints: Record<JointName, Vec2>,
  footAngle: number,
  side: 'Near' | 'Far',
  style: LimbStyle,
  body: Proportions,
  look: BodyStyle,
): Layer {
  const LEG_R = body.thick.leg;
  const hp = joints[`hip${side}`];
  const kn = joints[`knee${side}`];
  const an = joints[`ankle${side}`];
  const to = joints[`toe${side}`];
  const ramp = side === 'Near' ? look.legNear : look.legFar;
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
  const back = side === 'Far' ? 0.8 + 0.4375 * (body.foot - body.footFar) : 0.8; // o pé de longe curto tem o calcanhar mais atrás, para caber o vão entre os pés
  const heel = { x: an.x - fd.x * back, y: an.y - fd.y * back };
  for (const h of sample([{ a: heel, b: to, ra: body.thick.shoe, rb: body.thick.shoe - 0.07 }])) {
    const sh = shadeOf(h);
    // Com `sole`: brilho `S` em cima, sola `s` na fileira de baixo, couro `K` no meio.
    const ch = look.sole ? (h.off.y < -0.3 ? 'S' : h.off.y > 0.3 ? 's' : 'K') : sh > 0.45 ? 's' : 'K';
    layer.set(key(h.x, h.y), { x: h.x, y: h.y, ch });
  }
  return layer;
}

/** Pescoço: cápsula de pele da gola ao queixo, na sombra (`P`) com o alto claro (`p`); o contorno vira `x` no sel-out. */
function neckLayer(joints: Record<JointName, Vec2>): Layer {
  const { chest, neck } = joints;
  const d = unit(chest, neck);
  const from = { x: chest.x + d.x * 0.6, y: chest.y + d.y * 0.6 };
  return toLayer(
    sample([{ a: from, b: neck, ra: 0.8, rb: 0.8 }]).map((h) => ({ x: h.x, y: h.y, ch: shadeOf(h) > 0.3 ? 'p' : 'P' })),
  );
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
function torsoLayer(joints: Record<JointName, Vec2>, shape: Thickness['torso'], look: BodyStyle): Layer {
  const { hip, neck } = joints;
  const len = Math.hypot(neck.x - hip.x, neck.y - hip.y);
  const up = unit(hip, neck);
  const front = { x: -up.y, y: up.x };
  const cells: { x: number; y: number; ch: string }[] = [];
  const halfAt = (u: number): number => {
    if (u > len - 1) return shape.collar;
    if (u >= shape.shoulderFrom) return shape.shoulder;
    if (u > 1.2)
      return shape.taper
        ? shape.waist + ((shape.shoulder - shape.waist) * (u - 1.2)) / (shape.shoulderFrom - 1.2)
        : shape.waist;
    return shape.hip;
  };
  const span = Math.ceil(len + 6);
  for (let y = Math.floor(hip.y) - span; y <= Math.ceil(hip.y) + 3; y++) {
    for (let x = Math.floor(hip.x) - span; x <= Math.ceil(hip.x) + span; x++) {
      const px = x + 0.5 - hip.x;
      const py = y + 0.5 - hip.y;
      const u = px * up.x + py * up.y;
      const v = px * front.x + py * front.y - TORSO_V;
      if (u < -1.0 - look.hem || u > len) continue;
      const w = halfAt(u);
      if (Math.abs(v) > w) continue;
      let ch: string;
      if (u < -1.0)
        ch = v < -w + 1 ? 'o' : 'n'; // barra do paletó sobre a calça, linha escura atrás
      else if (u < 1.0)
        ch = 'K'; // bloco do quadril e cinto
      else if (u > len - 1)
        ch = 's'; // gola
      else if (v < -w + 1)
        ch = 'y'; // luz fria da lua nas costas
      else if (look.litChest && u > len - 2.3)
        ch = v > w - 0.95 ? 's' : 'S'; // ombro e peito alto na luz
      else if (v > w - 0.95)
        ch = look.litChest && u > len - 4.2 ? 's' : 'n'; // lado da frente: claro no peito, sombra embaixo
      else if (u > len - 2.2 && v > 0)
        ch = 's'; // luz do ombro
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
  for (const u of shape.buttons) mark(u, shape.waist * 0.537, 'A'); // botões
  return layer;
}

// ---------------------------------------------------------------- frame

export interface RasterOptions {
  /** Grade da cabeça carimbada no pescoço (padrão: a do corpo da pose, `headOf`). */
  head?: { grid: Grid; neckCol: number };
  /** Tamanho do frame (padrão `RIG_FRAME_32`); a pose já vem em coordenadas deste frame. */
  frame?: RigFrame;
  /** A cabeça cobre o braço de perto (o braço do gancho sobe por trás do queixo, como num corpo de 3/4). */
  headOverNearArm?: boolean;
}

/** Rasteriza a pose num frame de `frame.h` linhas x `frame.w` colunas (30 x 32 por padrão). */
export function rasterize(pose: Pose, opts: RasterOptions = {}): RasterResult {
  const body = pose.body ?? CHIBI;
  const hand = Math.min(1, Math.max(0.55, pose.handScale ?? pose.armScale ?? 1)) * body.thick.hand;
  const joints = solve(pose);
  const wa = worldAngles(pose);
  const frame = opts.frame ?? RIG_FRAME_32;
  const canvas = new Canvas(frame.w, frame.h);
  const look = styleOf(body);

  // Profundidade: braço e perna de longe, tronco, perna de perto, cabeça no pescoço e o braço de perto por cima.
  // Com barra no paletó, a perna de perto entra antes do tronco: a barra e o contorno dele separam o paletó da calça.
  paint(canvas, armLayer(joints, wa.foreArmFar, 'Far', FAR, body.thick, hand, look.knuckles));
  paint(canvas, legLayer(joints, wa.footFar, 'Far', FAR, body, look), legTop(joints, 'Far'));
  if (look.hem > 0) paint(canvas, legLayer(joints, wa.footNear, 'Near', NEAR, body, look), legTop(joints, 'Near'));
  paint(canvas, torsoLayer(joints, body.thick.torso, look));
  if (look.hem === 0) paint(canvas, legLayer(joints, wa.footNear, 'Near', NEAR, body, look), legTop(joints, 'Near'));
  // O pescoço só tem contorno contra o fundo: contra a gola e o queixo ele se funde (sem linha dentro do colarinho).
  if (look.neck) paint(canvas, neckLayer(joints), (x, y) => (canvas.cells[y]?.[x] ?? '.') !== '.');

  const head = opts.head ?? headOf(body);
  const hx = Math.round(joints.neck.x - head.neckCol);
  // Com pescoço, a cabeça sobe um texel para a pele aparecer entre a gola e o queixo.
  const hy = Math.round(joints.neck.y - head.grid.length - (look.neck ? 1 : 0));
  const stampHead = (): void =>
    head.grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch !== '.') canvas.set(hx + dx, hy + dy, ch);
      }),
    );
  const nearArm = armLayer(joints, wa.foreArmNear, 'Near', NEAR, body.thick, hand, look.knuckles, look.sleeveRim);
  // Manga aberta: sem contorno pela frente (à direita da manga na sua linha) onde ela encosta no pano do tronco; a luz
  // separa a manga do tronco, não a linha, e some a coluna escura do idle.
  const skin = new Set(['p', 'P', 'q', 'x']);
  const rowMax = new Map<number, number>();
  for (const c of nearArm.values()) rowMax.set(c.y, Math.max(rowMax.get(c.y) ?? -Infinity, c.x));
  const openSleeve = look.openSleeve
    ? (x: number, y: number): boolean => {
        const under = canvas.cells[y]?.[x] ?? '.';
        return x > (rowMax.get(y) ?? Infinity) && under !== '.' && !skin.has(under);
      }
    : undefined;
  if (opts.headOverNearArm) {
    // O braço de perto sobe por trás do queixo e só o punho aparece acima do cabelo.
    paint(canvas, nearArm, openSleeve);
    stampHead();
  } else {
    // O braço de perto passa por cima da cabeça (o gancho sobe rente ao rosto).
    stampHead();
    paint(canvas, nearArm, openSleeve);
  }

  selOut(canvas.cells);
  return { frame: canvas.cells.map((r) => r.join('')), clipped: canvas.clipped, joints };
}

/** Texel do pulso (centro da mão) de perto, usado como ponto de golpe (RIG-06). */
export function wristTexel(joints: Record<JointName, Vec2>): { col: number; row: number } {
  return { col: Math.floor(joints.wristNear.x), row: Math.floor(joints.wristNear.y) };
}
