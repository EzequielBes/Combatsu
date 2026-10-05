/*
 * Espíritos amaldiçoados (CHR-03/04, EVR-01): três aparências orgânicas, montadas como "boneco de papel" a partir de
 * um kit de partes (`EnemyKit`). Cada aparência tem silhueta, cor e assinatura próprias (design §2):
 *   corcunda   - corcunda atrás, um olho grande âmbar, boca de dentes tortos, veias; cinza-arroxeado `i`/`I`.
 *   rastejante - magro e alto, três olhos vermelhos, costelas aparentes, braços até o chão; verde `g`/`G`.
 *   bruto      - largo e baixo, ombros enormes, chifres, boca acesa, punhos; roxo `v`/`u`.
 * Rampa de 3 tons com luz de cima e sel-out: o `k` interno vira o tom escuro do material (regra de cada kit).
 * Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * Mesmo padrão de frame largo do player (ver SPEC_DEVIATION em player.ts): o spec fala em 18x24 texels, mas todos os
 * frames têm 32x24 texels (64x48 px) para caber a garra esticada do golpe, que chega à borda da hitbox do
 * ENEMY_ATTACK (offsetX 20 + largura/2 12 = 32 px à frente do centro). A origem fica no pé, no centro do corpo: a
 * linha de centro passa no meio da coluna 12 (12,5 texels = 25 px da borda esquerda, um número inteiro de px).
 *
 * `buildEnemyFrames(kit)` devolve os frames de uma aparência; novas poses (T8/T9) só acrescentam chamadas a `pose()`
 * com as partes do kit. '.' é transparente.
 */
import { selOut, type SelOutConfig } from '../selOut';
import type { AnimDef } from './player';

/** Tamanho final de todo frame da folha, em texels. */
export const ENEMY_FRAME_W = 32;
export const ENEMY_FRAME_H = 24;
/** Coluna (em texels, fracionária) da linha de centro do corpo. */
const CENTER_COL = 12.5;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico. */
export const ENEMY_ORIGIN = { x: CENTER_COL / ENEMY_FRAME_W, y: 1 } as const;

export type EnemyVariantId = 'corcunda' | 'rastejante' | 'bruto';

type Grid = readonly string[];
type Placed = readonly [Grid, number, number];

/** Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x24 e passa o sel-out da aparência. */
function compose(sel: SelOutConfig, ...parts: Placed[]): string[] {
  const canvas = Array.from({ length: ENEMY_FRAME_H }, () => Array<string>(ENEMY_FRAME_W).fill('.'));
  for (const [grid, x0, y0] of parts) {
    grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        const x = x0 + dx;
        const y = y0 + dy;
        if (ch === '.' || y < 0 || y >= ENEMY_FRAME_H || x < 0 || x >= ENEMY_FRAME_W) return;
        canvas[y][x] = ch;
      }),
    );
  }
  selOut(canvas, sel);
  return canvas.map((row) => row.join(''));
}

function recolor(grid: Grid, map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

function mirror(grid: Grid): string[] {
  const w = Math.max(...grid.map((r) => r.length));
  return grid.map((row) => [...row.padEnd(w, '.')].reverse().join(''));
}

/** Passa o sel-out numa parte solta (partes do ragdoll), com a mesma regra dos frames. */
function finishPart(grid: Grid, sel: SelOutConfig): string[] {
  const canvas = grid.map((row) => [...row]);
  selOut(canvas, sel);
  return canvas.map((row) => row.join(''));
}

/** Tudo de uma aparência: as partes, onde elas ficam e a regra de sel-out. */
export interface EnemyKit {
  sel: SelOutConfig;
  /** Troca de cor das partes de trás (um tom mais escuro). */
  farMap: Record<string, string>;
  /** Massa atrás do tronco (a corcunda) e posição relativa ao tronco. */
  back?: { grid: Grid; dx: number; dy: number };
  body: Grid;
  bodyX: number;
  bodyY: number;
  /** Cabeça/chifres sobre o tronco (o bruto) e posição relativa ao tronco. */
  front?: { grid: Grid; dx: number; dy: number };
  eye: Grid;
  eyeGlow: Grid;
  eyeSquint: Grid;
  /** Posição relativa ao tronco. */
  eyeAt: readonly [number, number];
  mouth: Grid;
  mouthOpen: Grid;
  mouthAt: readonly [number, number];
  armHang: Grid;
  armFwd: Grid;
  armWindup: Grid;
  armReach: Grid;
  leg: Grid;
  legUp: Grid;
  /** Linha do ombro e colunas dos braços caídos da frente e de trás. */
  yArm: number;
  xNear: number;
  xFar: number;
  /** Colunas das pernas em pé (de trás e da frente). */
  legFar: number;
  legNear: number;
  /** Onde fica o braço do preparo (canto da parte). */
  windupAt: readonly [number, number];
  /** Coluna da parte do braço do golpe (a ponta fica na coluna 28). */
  reachX: number;
  /** Linha do braço do golpe (padrão: `yArm`). */
  reachY?: number;
  /** Primeira linha do tronco que recebe a borda branca do impacto (padrão 3); abaixo dos chifres, quando há. */
  rimFrom?: number;
}

interface Pose {
  eye?: Grid;
  mouth?: Grid;
  /** Deslocamento horizontal do tronco, cabeça, olho e boca (inclinação). */
  lean?: number;
  /** Deslocamento vertical do tronco, cabeça, olho e boca (respiração, agachar). */
  drop?: number;
  near?: Placed;
  far?: Placed;
  legs?: Placed[];
  /** Partes extras por cima de tudo (rastro do golpe). */
  extra?: Placed[];
  /** Deslocamento extra do olho e da boca em relação ao tronco (cabeça que sobe, desce ou torce). */
  eyeAdj?: readonly [number, number];
  mouthAdj?: readonly [number, number];
  /** Borda branca `w` no lado do golpe (direita): o texel mais à direita de cada linha do tronco. */
  rim?: boolean;
}

/** Monta todos os frames de uma aparência a partir do seu kit. */
export function buildEnemyFrames(kit: EnemyKit): Record<string, readonly string[]> {
  const far = (g: Grid): string[] => recolor(g, kit.farMap);
  const armBack = mirror(kit.armFwd);
  const legY = ENEMY_FRAME_H - kit.leg.length;
  const legUpY = ENEMY_FRAME_H - kit.legUp.length;

  const pose = (p: Pose): string[] => {
    const lean = p.lean ?? 0;
    const drop = p.drop ?? 0;
    const bx = kit.bodyX + lean;
    const by = kit.bodyY + drop;
    const stand: Placed[] = [
      [far(kit.leg), kit.legFar, legY],
      [kit.leg, kit.legNear, legY],
    ];
    const parts: Placed[] = [];
    if (p.far) parts.push(p.far);
    parts.push(...(p.legs ?? stand));
    if (kit.back) parts.push([kit.back.grid, bx + kit.back.dx, by + kit.back.dy]);
    parts.push([kit.body, bx, by]);
    if (kit.front) parts.push([kit.front.grid, bx + kit.front.dx, by + kit.front.dy]);
    const [ex, ey] = p.eyeAdj ?? [0, 0];
    const [mx, my] = p.mouthAdj ?? [0, 0];
    parts.push([p.eye ?? kit.eye, bx + kit.eyeAt[0] + ex, by + kit.eyeAt[1] + ey]);
    parts.push([p.mouth ?? kit.mouth, bx + kit.mouthAt[0] + mx, by + kit.mouthAt[1] + my]);
    if (p.near) parts.push(p.near);
    if (p.extra) parts.push(...p.extra);
    const rows = compose(kit.sel, ...parts);
    if (!p.rim) return rows;
    return rows.map((row, y) => {
      if (y < by + (kit.rimFrom ?? 3) || y >= by + kit.body.length - 2) return row;
      const x = row.search(/[^.][.]*$/);
      return x < 0 ? row : row.slice(0, x) + 'w' + row.slice(x + 1);
    });
  };

  const { yArm, xNear, xFar, legFar, legNear } = kit;
  const hang = (dx: number, dy: number): { near: Placed; far: Placed } => ({
    near: [kit.armHang, xNear + dx, yArm + dy],
    far: [far(kit.armHang), xFar + dx, yArm + dy],
  });
  /** Pernas do passo: uma recua e a outra avança; `up` ergue a perna indicada (1 texel). */
  const step = (farX: number, nearX: number, up?: 'far' | 'near'): Placed[] => [
    [far(up === 'far' ? kit.legUp : kit.leg), farX, up === 'far' ? legUpY - 1 : legY],
    [up === 'near' ? kit.legUp : kit.leg, nearX, up === 'near' ? legUpY - 1 : legY],
  ];
  const crouchLegs: Placed[] = [
    [far(kit.legUp), legFar, legUpY],
    [kit.legUp, legNear, legUpY],
  ];

  // Rastro do golpe: dois riscos de luz acima e abaixo do braço esticado, atrás da ponta.
  const smearRow = '.ww.www.w';
  const reachY = kit.reachY ?? yArm;
  const smear: Placed[] = [
    [[smearRow], kit.reachX + 2, reachY - 1],
    [[smearRow], kit.reachX + 2, reachY + kit.armReach.length],
  ];
  // Passo de passagem: as pernas se cruzam sob o corpo e o corpo fica no ponto mais alto.
  const passArms = {
    near: [kit.armHang, xNear + 1, yArm] as Placed,
    far: [far(kit.armHang), xFar + 1, yArm] as Placed,
  };

  const frames: Record<string, string[]> = {
    'idle-0': pose({ ...hang(0, 0) }),
    'idle-1': pose({ drop: 1, ...hang(0, 1) }),
    'idle-2': pose({ ...hang(1, 0) }),
    'idle-3': pose({ drop: 1, ...hang(1, 1) }),

    'walk-0': pose({
      lean: 1,
      near: [kit.armFwd, xNear, yArm],
      far: [far(armBack), 0, yArm],
      legs: step(legFar - 2, legNear + 2),
    }),
    'walk-1': pose({ lean: 1, drop: 1, ...hang(1, 1), legs: step(legFar + 1, legNear - 1, 'far') }),
    'walk-2': pose({
      lean: 1,
      near: [kit.armHang, xNear, yArm],
      far: [far(kit.armFwd), 11, yArm],
      legs: step(legNear + 2, legFar - 2),
    }),
    'walk-3': pose({ lean: 1, drop: 1, ...hang(1, 1), legs: step(legFar + 1, legNear - 1, 'near') }),
    'walk-4': pose({ lean: 1, ...passArms, legs: step(legFar, legNear, 'near') }),
    'walk-5': pose({ lean: 1, ...passArms, legs: step(legFar, legNear, 'far') }),

    // Preparo (bem legível): corpo para trás, braço erguido pelas costas com as garras em cor de alerta acima da
    // cabeça, olho aceso e boca aberta. `windup-0` é o início (encolhe e levanta o braço), `windup-1` é o máximo.
    'windup-0': pose({
      lean: -1,
      drop: 1,
      eye: kit.eyeGlow,
      near: [kit.armHang, xNear - 1, yArm - 2],
      far: [far(kit.armHang), xFar - 1, yArm],
    }),
    'windup-1': pose({
      lean: -1,
      eye: kit.eyeGlow,
      mouth: kit.mouthOpen,
      near: [kit.armWindup, kit.windupAt[0], kit.windupAt[1]],
      far: [far(kit.armHang), xFar - 1, yArm],
    }),
    // Golpe: corpo para a frente e a garra do meio chega à coluna 28 = 16 texels (32 px) à frente do centro,
    // na altura do ombro (dentro da faixa vertical da hitbox). `attack-1` é a continuação: o braço recolhe.
    'attack-0': pose({
      lean: 2,
      eye: kit.eyeGlow,
      mouth: kit.mouthOpen,
      near: [kit.armReach, kit.reachX, reachY],
      far: [far(armBack), 1, yArm],
      legs: step(legFar - 1, legNear + 2),
      extra: smear,
    }),
    'attack-1': pose({
      lean: 3,
      drop: 1,
      mouth: kit.mouthOpen,
      near: [kit.armFwd, xNear + 2, yArm],
      far: [far(armBack), 1, yArm],
      legs: step(legFar - 2, legNear + 3),
    }),

    hurt: pose({
      lean: -2,
      eye: kit.eyeSquint,
      mouth: kit.mouthOpen,
      near: [kit.armHang, xNear - 2, yArm - 1],
      far: [far(kit.armFwd), xFar - 2, yArm - 2],
    }),

    // Levantar: agachado com as garras no chão, depois meio de pé, depois quase em pé.
    'getup-0': pose({ drop: 4, eye: kit.eyeSquint, ...hang(1, 3), legs: crouchLegs }),
    'getup-1': pose({ drop: 2, ...hang(0, 2) }),
    'getup-2': pose({ drop: 1, lean: -1, ...hang(0, 1) }),
  };

  // Reações ao golpe (HRX-03): frame 0 é o extremo (o corpo é jogado para trás, olho espremido, boca aberta), o 1
  // segura um pouco menos e o 2 volta a meio caminho do idle. `k` escala a pose: 1, 0.7 e 0.3.
  interface Recoil {
    lean: number;
    drop: number;
    eyeAdj: [number, number];
    mouthAdj: [number, number];
    /** Braço da frente e de trás: [dx, dy]; `fwdFar` usa o braço esticado no de trás. */
    near: [number, number];
    far: [number, number];
    fwdFar?: boolean;
    /** Pernas jogadas para trás (texels) e erguidas do chão (texels). */
    legBack: number;
    legLift?: number;
    rim?: boolean;
  }
  const react = (name: string, r: Recoil): void => {
    [1, 0.7, 0.3].forEach((k, i) => {
      const sc = (v: number): number => Math.round(v * k);
      const e = sc(r.eyeAdj[1]);
      const lift = sc(r.legLift ?? 0);
      const back = sc(r.legBack);
      const legs: Placed[] = [
        [far(kit.leg), legFar - back, legY - lift],
        [kit.leg, legNear - back - (i === 0 ? 1 : 0), legY - lift],
      ];
      frames[`${name}-${i}`] = pose({
        lean: sc(r.lean),
        drop: sc(r.drop),
        eye: i < 2 ? kit.eyeSquint : undefined,
        mouth: i < 2 ? kit.mouthOpen : undefined,
        eyeAdj: [sc(r.eyeAdj[0]), e],
        mouthAdj: [sc(r.mouthAdj[0]), sc(r.mouthAdj[1])],
        near: [kit.armHang, xNear + sc(r.near[0]), yArm + sc(r.near[1])],
        far: r.fwdFar
          ? [far(kit.armFwd), xFar + sc(r.far[0]), yArm + sc(r.far[1])]
          : [far(kit.armHang), xFar + sc(r.far[0]), yArm + sc(r.far[1])],
        legs,
        rim: r.rim && i === 0,
      });
    });
  };
  // Cabeça-a: cabeça jogada para trás e para cima, queixo à mostra, braço de trás esticado atrás.
  react('hurt-head-a', {
    lean: -3,
    drop: 0,
    eyeAdj: [-1, -1],
    mouthAdj: [-1, -1],
    near: [-3, -3],
    far: [-4, -3],
    fwdFar: true,
    legBack: 2,
  });
  // Cabeça-b: cabeça torcida para baixo, ombros afundam e o braço da frente fica solto.
  react('hurt-head-b', {
    lean: -2,
    drop: 2,
    eyeAdj: [0, 2],
    mouthAdj: [0, 1],
    near: [-1, 3],
    far: [-3, 0],
    legBack: 1,
  });
  // Gancho: queixo para cima e o corpo inteiro sai do chão, quase sem inclinar, com os braços soltos ao lado.
  react('hurt-uppercut', {
    lean: -1,
    drop: -3,
    eyeAdj: [-1, -1],
    mouthAdj: [-1, -1],
    near: [0, -3],
    far: [-1, -3],
    legBack: 1,
    legLift: 3,
  });
  // Corpo: dobrado para a frente (cai o tronco), braços na barriga.
  react('hurt-body', { lean: 1, drop: 4, eyeAdj: [0, 1], mouthAdj: [0, 1], near: [-4, 2], far: [-1, 3], legBack: 0 });
  // Impacto: o mais dramático; arqueado, jogado para trás, braços soltos e a borda branca do golpe à direita.
  react('impact', {
    lean: -4,
    drop: 2,
    eyeAdj: [-1, 0],
    mouthAdj: [-1, 0],
    near: [-5, -3],
    far: [-6, -2],
    fwdFar: true,
    legBack: 3,
    legLift: 1,
    rim: true,
  });
  frames.impact = frames['impact-0'];
  delete frames['impact-0'];
  delete frames['impact-1'];
  delete frames['impact-2'];
  // Nomes antigos (linha de base e testes de alcance): `windup` e `attack` são o máximo do preparo e o golpe.
  frames.windup = frames['windup-1'];
  frames.attack = frames['attack-0'];
  return frames;
}

// ================================================================ corcunda (cinza-arroxeado, um olho âmbar)
// Tronco 11x16: cabeça à frente (direita), olho grande; a corcunda é uma massa separada atrás, com veias.
const C_BODY: Grid = [
  '...kkkk....',
  '..kIIIIkk..',
  '.kIIIIIIIk.',
  'kIIiIIIIIIk',
  'kIivIiiIIIk',
  'kiivIIkkkkk',
  'kiiviKKKKKk',
  'kiiiiKKKKKk',
  'kHiiiKKKKKk',
  'kHiviiKKKik',
  'kHiiiiiiiik',
  'kHiiiiiiiik',
  'kHiiviiiiik',
  'kHHiiiiiiHk',
  '.kHHHHHHHk.',
  '..kkkkkkk..',
];
/** A corcunda: massa atrás do tronco, subindo acima da cabeça, com veias. 8x10. */
const C_HUMP: Grid = [
  '..w..w..',
  '.kkk.kk.',
  '.kIIiiIk',
  'kIIivviI',
  'kIivvIii',
  'kIiivvii',
  'kiiiivii',
  'kiiivivi',
  'kHiiiiii',
  'kHHiiiHi',
];
const C_EYE: Grid = ['.kkk.', 'kwAbk', 'kAAbk', 'kaAbk', '.kkk.'];
const C_EYE_GLOW: Grid = ['.kkk.', 'kwwrk', 'kwArk', 'kAArk', '.kkk.'];
const C_EYE_SQUINT: Grid = ['.....', '.....', 'kkkkk', 'kaAak', '.kkk.'];
const C_MOUTH: Grid = ['.kkkkkkkkkk', 'kwkwwkwkkwk', 'kiIIIIIIIIk', '.kHHHHHHkk.'];
const C_MOUTH_OPEN: Grid = ['.kkkkkkkkkk', 'kwrrrrrrrwk', 'krrrrrrrrrk', 'kwkwwkwwkIk', '.kHHHHHHkk.'];
const C_ARM_HANG: Grid = [
  '.kIIk',
  '.kiIk',
  '.kivk',
  '.kiIk',
  '.kiik',
  'kiiiIk',
  'kiHik.',
  'kiiiik',
  'kwkwkw',
  'w.ww.w',
];
const C_ARM_FWD: Grid = [
  'kIIk....',
  'kiIIk...',
  '.kivIk..',
  '..kiIIk.',
  '...kiIk.',
  '...kvik.',
  '...kiIk.',
  '...kHik.',
  '..kiiiik',
  '..kwkwkw',
  '..w.ww.w',
];
const C_ARM_WINDUP: Grid = [
  'A.A.A.....',
  'kakak.....',
  'kaaak.....',
  '.kiIk.....',
  '.kivIk....',
  '..kiIIk...',
  '...kivIk..',
  '....kiIIk.',
  '.....kiIIk',
  '......kIIk',
  '.......kk.',
];
const C_ARM_REACH: Grid = [
  'kkkkkkkkkk.....',
  'kIIIIIIIIkkww..',
  'kiiviiiiiiikwww',
  'kHHHHHHHHkkww..',
  'kkkkkkkkkk.....',
];
const C_LEG: Grid = ['kiik', 'kHik', 'kHik', 'kkkk'];
const C_LEG_UP: Grid = ['kiik', 'kHHk', 'kkkk'];

const CORCUNDA_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['I', 'i', 'H', 'v']), line: 'H' },
      { keys: new Set(['A', 'a', 'r', 'w', 'R']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { I: 'i', i: 'H', H: 'K', w: 'S' },
  back: { grid: C_HUMP, dx: -3, dy: 0 },
  body: C_BODY,
  bodyX: 7,
  bodyY: 4,
  eye: C_EYE,
  eyeGlow: C_EYE_GLOW,
  eyeSquint: C_EYE_SQUINT,
  eyeAt: [5, 5],
  mouth: C_MOUTH,
  mouthOpen: C_MOUTH_OPEN,
  mouthAt: [2, 10],
  armHang: C_ARM_HANG,
  armFwd: C_ARM_FWD,
  armWindup: C_ARM_WINDUP,
  armReach: C_ARM_REACH,
  leg: C_LEG,
  legUp: C_LEG_UP,
  yArm: 11,
  xNear: 15,
  xFar: 4,
  legFar: 8,
  legNear: 13,
  windupAt: [0, 0],
  reachX: 14,
};

/**
 * Membro diagonal de 3 texels de largura interna (contorno `k` por fora, luz `G` à esquerda, tom médio `g`, sombra
 * `n`), com garras finas `w` na ponta. `shift(row)` é o deslocamento horizontal de cada linha (cotovelo/inclinação).
 */
function limb(len: number, shift: (row: number) => number): string[] {
  const rows: string[] = [];
  let maxX = 0;
  for (let r = 0; r < len; r++) maxX = Math.max(maxX, shift(r));
  const w = maxX + 5;
  for (let r = 0; r < len; r++) {
    const x0 = shift(r);
    const inner = r < 2 ? 'GGg' : r % 2 ? 'Ggn' : 'Ggg';
    rows.push(('.'.repeat(x0) + 'k' + inner + 'k').padEnd(w, '.'));
  }
  const x0 = shift(len - 1);
  rows.push(('.'.repeat(x0) + 'kwkwk').padEnd(w, '.'));
  rows.push(('.'.repeat(x0) + 'w.w.w').padEnd(w, '.'));
  return rows;
}

// ================================================================ rastejante (verde, magro, inclinado, 3 olhos)
// De perfil, olhando para a direita: cabeça alongada à frente com os 3 olhos em fileira, coluna e costelas nas costas,
// quadril recuado. Braços longos de 3 texels de largura em 2 tons, com garras finas.
const R_BODY: Grid = [
  '........kkkkkk...',
  '.......kGGGGGggk.',
  '..kk...kGgggggggk',
  '.kGGk..kggggggggk',
  '.kGgGk.kggggggggk',
  '.kGGggkkggggggggk',
  '.kGGgggggggkkkkk.',
  'kwGgggggggggk....',
  'kGGGGGGgggggk....',
  'kwgnnnnnnggk.....',
  '.kGGGGGGggk......',
  'kwgnnnnnngk......',
  '.kGGGGGggk.......',
  '..kGgggnk.......',
  '..kgggggk.......',
  '...kkkkkk.......',
];
const R_EYE: Grid = ['RkRkR', 'rkrkr'];
const R_EYE_GLOW: Grid = ['wkwkw', 'RkRkR'];
const R_EYE_SQUINT: Grid = ['.....', 'rkrkr'];
const R_MOUTH: Grid = ['kkkkkkkk', 'kwkwkwkk', '.kkkkkk.'];
const R_MOUTH_OPEN: Grid = ['kwkwkwkk', 'krrrrrrk', 'kwkwkwkk', '.kkkkkk.'];
const R_ARM_HANG: Grid = limb(12, (r) => (r < 5 ? 0 : r < 9 ? 1 : 2));
const R_ARM_FWD: Grid = limb(11, (r) => Math.floor(r / 2));
const R_ARM_WINDUP: Grid = limb(10, (r) => Math.round((9 - r) * 0.9)).reverse();
const R_ARM_REACH: Grid = [
  'kkkkkkkkkkkkk..',
  'kGGGGGGGGGGGGkw',
  'kgggggggggggkww',
  'kgnnnnnnnnnnkw.',
  'kkkkkkkkkkkkk..',
];
const R_LEG: Grid = ['..kGk.', '.kGgk.', '.kggk.', '..kgk.', '..kggk', '.kkkkk'];
const R_LEG_UP: Grid = ['.kgk.', '.kGgk', '..kgk', '..kggk', '.kkkkk'];

const RASTEJANTE_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['G', 'g', 'n']), line: 'n' },
      { keys: new Set(['R', 'r', 'w']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { G: 'g', g: 'n', n: 'K', w: 'S' },
  body: R_BODY,
  bodyX: 6,
  bodyY: 3,
  eye: R_EYE,
  eyeGlow: R_EYE_GLOW,
  eyeSquint: R_EYE_SQUINT,
  eyeAt: [9, 3],
  mouth: R_MOUTH,
  mouthAt: [9, 5],
  mouthOpen: R_MOUTH_OPEN,
  armHang: R_ARM_HANG,
  armFwd: R_ARM_FWD,
  armWindup: R_ARM_WINDUP,
  armReach: R_ARM_REACH,
  leg: R_LEG,
  legUp: R_LEG_UP,
  yArm: 10,
  xNear: 13,
  xFar: 11,
  legFar: 5,
  legNear: 9,
  windupAt: [2, 0],
  reachX: 14,
};

// ================================================================ bruto (roxo, massa de ombros, cabeça baixa à frente)
// De perfil, olhando para a direita: ombros/costas enormes à esquerda, cabeça projetada e mais baixa que os ombros,
// chifres curvando para trás, olho pequeno e fundo, mandíbula pesada acesa e punho grande na frente.
const B_BODY: Grid = [
  '.......kwSSk........',
  '.........kSSsk......',
  '...........kSSsk....',
  '..kkkkkkk..kSSsk....',
  '.kUUUUUUUk..kSSsk...',
  'kUUUUuuuuuk.kSSsk...',
  'kUUuuuuuuuukkkkkkkk.',
  'kUuuuuvuuuukUuuuuuuk',
  'kuuuuuuuuuukuuuuuuuk',
  'kuuuvuuuuuukuuuuuuuk',
  'kvuuuuuuuuuuuk......',
  'kvuuuuuuuuuuuuk.....',
  'kvvuuuuuuuuuuuk.....',
  '.kvvuuuuuuuuuvk.....',
  '.kvvvuuuuuuvvvk.....',
  '..kvvvvvvvvvvk......',
  '...kkkkkkkkkk.......',
];
const B_EYE: Grid = ['kkk', 'aAk'];
const B_EYE_GLOW: Grid = ['kkk', 'AwA'];
const B_EYE_SQUINT: Grid = ['kkk', 'kkk'];
const B_MOUTH: Grid = ['kkkkkkkk', 'kAwAwAak', 'kaAAAAak', '.kkkkkk.'];
const B_MOUTH_OPEN: Grid = ['kkkkkkkk', 'kAwAwAAk', 'kaAAAAak', 'kaaAAaak', '.kkkkkk.'];
// Punho fechado de cantos arredondados, com a linha dos nós dos dedos.
const B_ARM_HANG: Grid = [
  '.kUUUk..',
  'kUUuuuk.',
  'kUuuuuk.',
  'kuuuvuk.',
  'kuuuuuk.',
  'kvuuuuk.',
  '.kuuuuk.',
  '.kUUUUk.',
  'kUUuUuUk',
  'kUuuuuuk',
  'kuvuvuvk',
  '.kkkkkk.',
];
const B_ARM_FWD: Grid = [
  'kUUk......',
  'kUuuk.....',
  '.kuuuk....',
  '..kuuuk...',
  '...kuuvk..',
  '....kvvk..',
  '....kUUUk.',
  '....kUuuuk',
  '....kuuvvk',
  '.....kkkk.',
];
const B_ARM_WINDUP: Grid = [
  '.kAAAAk.....',
  'kAwwAAAk....',
  'kAAAAAAk....',
  '.kkkkkk.....',
  '..kuuuuk....',
  '...kuuuuk...',
  '....kuuuuk..',
  '.....kUuuuk.',
  '......kUUuk.',
  '.......kkkk.',
];
// O punho tem a altura do braço e a ponta arredondada: só as 3 linhas do meio chegam à última coluna.
const B_ARM_REACH: Grid = [
  'kkkkkkkkkkkkkk.',
  'kUUUUUUUUkUUUUk',
  'kuuuuuuuukUuUuk',
  'kuuvvvvvukuuvvk',
  'kkkkkkkkkkkkkk.',
];
const B_LEG: Grid = ['kuuuk', 'kvuuk', 'kkkkk'];
const B_LEG_UP: Grid = ['kuuuk', 'kkkkk'];

const BRUTO_KIT: EnemyKit = {
  sel: {
    rules: [
      { keys: new Set(['U', 'u', 'v', 'S']), line: 'b' },
      { keys: new Set(['A', 'a', 'w']), line: 'b' },
    ],
    fallback: 'K',
  },
  farMap: { U: 'u', u: 'v', v: 'b', w: 'S', S: 's' },
  body: B_BODY,
  bodyX: 4,
  bodyY: 4,
  eye: B_EYE,
  eyeGlow: B_EYE_GLOW,
  eyeSquint: B_EYE_SQUINT,
  eyeAt: [15, 8],
  mouth: B_MOUTH,
  mouthAt: [12, 10],
  mouthOpen: B_MOUTH_OPEN,
  armHang: B_ARM_HANG,
  armFwd: B_ARM_FWD,
  armWindup: B_ARM_WINDUP,
  armReach: B_ARM_REACH,
  leg: B_LEG,
  legUp: B_LEG_UP,
  yArm: 11,
  xNear: 12,
  xFar: 7,
  legFar: 7,
  legNear: 12,
  windupAt: [2, 2],
  reachX: 14,
  reachY: 15,
  rimFrom: 6,
};

// ================================================================ exportações
export const ENEMY_VARIANT_FRAMES: Record<EnemyVariantId, Record<string, readonly string[]>> = {
  corcunda: buildEnemyFrames(CORCUNDA_KIT),
  rastejante: buildEnemyFrames(RASTEJANTE_KIT),
  bruto: buildEnemyFrames(BRUTO_KIT),
};

/** Compatibilidade: a folha da `corcunda` (linha de base de bbox, FxLab). */
export const ENEMY_FRAMES: Record<string, readonly string[]> = ENEMY_VARIANT_FRAMES.corcunda;

/** Animações do inimigo (CHR-03, EVR-08), com os nomes do pickEnemyAnim; os mesmos nomes de frame valem nas 3 aparências. */
export const ENEMY_ANIMS: Record<string, AnimDef> = {
  idle: { frames: ['idle-0', 'idle-1', 'idle-2', 'idle-3'], frameRate: 4, repeat: -1, durations: [300, 200, 300, 200] },
  walk: {
    frames: ['walk-0', 'walk-1', 'walk-4', 'walk-2', 'walk-3', 'walk-5'],
    frameRate: 10,
    repeat: -1,
    durations: [100, 100, 100, 100, 100, 100],
  },
  // O último frame (`windup-1`) segura 330 ms: cobre os últimos 200 ms do preparo de 450 ms (EVR-09).
  windup: { frames: ['windup-0', 'windup-1'], frameRate: 4, repeat: 0, durations: [120, 330] },
  attack: { frames: ['attack-0', 'attack-1'], frameRate: 16, repeat: 0, durations: [60, 60] },
  hurt: { frames: ['hurt'], frameRate: 1, repeat: 0 },
  'hurt-head-a': {
    frames: ['hurt-head-a-0', 'hurt-head-a-1', 'hurt-head-a-2'],
    frameRate: 12,
    repeat: 0,
    durations: [60, 90, 70],
  },
  'hurt-head-b': {
    frames: ['hurt-head-b-0', 'hurt-head-b-1', 'hurt-head-b-2'],
    frameRate: 12,
    repeat: 0,
    durations: [60, 90, 70],
  },
  'hurt-uppercut': {
    frames: ['hurt-uppercut-0', 'hurt-uppercut-1', 'hurt-uppercut-2'],
    frameRate: 12,
    repeat: 0,
    durations: [60, 90, 70],
  },
  'hurt-body': {
    frames: ['hurt-body-0', 'hurt-body-1', 'hurt-body-2'],
    frameRate: 12,
    repeat: 0,
    durations: [60, 90, 70],
  },
  impact: { frames: ['impact'], frameRate: 1, repeat: 0 },
  getup: { frames: ['getup-0', 'getup-1', 'getup-2'], frameRate: 8, repeat: 0, durations: [120, 120, 120] },
};

// ---------------------------------------------------------------- partes do ragdoll (CHR-04)
/**
 * Recortes do mesmo corpo de cada aparência, com as mesmas cores dos frames: cabeça (8x7 texels), tronco (8x10) e
 * membro com garra (3x8), usado para braços e pernas. Os tamanhos são iguais nas 3 aparências (corpos do Matter).
 */
export type EnemyRagParts = { head: Grid; torso: Grid; limb: Grid };

const sel = (k: EnemyKit) => k.sel;

export const ENEMY_RAG_VARIANTS: Record<EnemyVariantId, EnemyRagParts> = {
  corcunda: {
    head: finishPart(
      ['..kkk.k.', '.kIIIkIk', 'kIIkkkkk', 'kIkwAkAk', 'kikAAkAk', 'kikaAkak', '.kkkkkk.'],
      sel(CORCUNDA_KIT),
    ),
    torso: finishPart(
      [
        '.kkkkkk.',
        'kIIIIvIk',
        'kiivIiik',
        'kiiiiivk',
        'kkkkkkkk',
        'kwkwwkkk',
        'kiiiivik',
        'kHiiiiHk',
        'kHHHHHHk',
        '.kkkkkk.',
      ],
      sel(CORCUNDA_KIT),
    ),
    limb: finishPart(['kIk', 'kik', 'kvk', 'kik', 'kik', 'kHk', 'kik', 'wkw'], sel(CORCUNDA_KIT)),
  },
  rastejante: {
    head: finishPart(
      ['.kkkkk..', 'kGGgggk.', 'kgggggk.', 'kRkRkRk.', 'krkrkrk.', 'kwkkwkk.', '.kkkkk..'],
      sel(RASTEJANTE_KIT),
    ),
    torso: finishPart(
      [
        '.kkkkkk.',
        'kGGggggk',
        'kgnnnnnk',
        'kGGGGGgk',
        'kgnnnnnk',
        'kGGGGGgk',
        'kgnnnnnk',
        'kgggggnk',
        'kGgggnnk',
        '.kkkkkk.',
      ],
      sel(RASTEJANTE_KIT),
    ),
    limb: finishPart(['kGk', 'kgk', 'kgk', 'kgk', 'kgk', 'kgk', 'kgk', 'wkw'], sel(RASTEJANTE_KIT)),
  },
  bruto: {
    head: finishPart(
      ['wk...kw.', 'kSkkkSk.', 'kuUuUuk.', 'kuuuuuk.', 'kAwAwAk.', 'kaAAAak.', '.kkkkk..'],
      sel(BRUTO_KIT),
    ),
    torso: finishPart(
      [
        'kkkkkkkk',
        'kUUUUUUk',
        'kuuvuuuk',
        'kuuuuvbk',
        'kuvuuubk',
        'kuuuuubk',
        'kuuvuubk',
        'kvuuuvbk',
        'kvvvvvbk',
        'kkkkkkkk',
      ],
      sel(BRUTO_KIT),
    ),
    limb: finishPart(['kUk', 'kuk', 'kuk', 'kvk', 'kuk', 'kuk', 'kUk', 'kUk'].slice(0, 8), sel(BRUTO_KIT)),
  },
};

/** Compatibilidade: partes da `corcunda`. */
export const ENEMY_RAG_PARTS = ENEMY_RAG_VARIANTS.corcunda;
