/*
 * Estudante de jujutsu (CHR-01): uniforme azul-marinho de gola alta com botões dourados, cabelo escuro espetado,
 * olhando para a direita. Luz de cima: 1 tom mais claro no topo das formas, 1 mais escuro embaixo; contorno `k`.
 * Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * SPEC_DEVIATION: o spec fixa o player em 16x24 texels; aqui todos os frames têm 32x30 texels (64x60 px): 32x24 de desenho
 * mais 6 linhas de folga no topo (`PLAYER_TOP_PAD`) para o punho do gancho ascendente subir acima da cabeça.
 * Reason: o golpe esticado precisa alcançar a borda da hitbox (soco ~35 px e chute 42 px à frente do centro);
 * 16 texels só dão 16 px para cada lado. O personagem continua ocupando ~16 texels de largura nos frames sem
 * golpe, e a origem (PLAYER_ORIGIN) fica no pé, no centro do corpo, não no centro do frame.
 *
 * Os frames são montados como "boneco de papel": partes em texto (cabeça, tronco, braços, pernas) sobrepostas em
 * posições fixas; '.' é transparente. O centro do corpo fica na coluna 8 da área de desenho (entre as colunas 7
 * e 8), que vira a coluna 10 do frame final (FRAME_PAD à esquerda).
 */

import { selOut } from '../selOut';

/** Tamanho final de todo frame da folha, em texels. */
export const PLAYER_FRAME_W = 32;
export const PLAYER_FRAME_H = 30;
/** Linhas vazias no topo do frame (folga para o punho do gancho subir acima da cabeça); as partes são montadas como se
 * o frame ainda tivesse 24 linhas e descem esta folga, então a origem (no pé) não muda no mundo. */
export const PLAYER_TOP_PAD = 6;
/** Colunas vazias à esquerda da área de desenho. */
const FRAME_PAD = 2;
/** Coluna (no frame final) da linha de centro do corpo. */
const CENTER_COL = 8 + FRAME_PAD;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico. */
export const PLAYER_ORIGIN = { x: CENTER_COL / PLAYER_FRAME_W, y: 1 } as const;

export type Grid = readonly string[];
export type Placed = readonly [Grid, number, number];

export { selOut };

/** Pixels cortados de cada frame montado por `compose`/`pose` (e preservados por `smear`), para os testes medirem SPF-02. */
const CLIPPED = new WeakMap<readonly string[], number>();

/** Quantos pixels opacos o `compose` descartou ao montar este frame; `undefined` se o frame não veio do `compose`. */
export function clippedOf(frame: readonly string[]): number | undefined {
  return CLIPPED.get(frame);
}

/**
 * Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x30 (as partes descem `PLAYER_TOP_PAD` linhas); '.' não pinta. Além do frame,
 * devolve `clipped`: quantos pixels opacos caíram fora da grade e foram descartados (SPF-02).
 */
export function composeWithStats(...parts: Placed[]): { frame: string[]; clipped: number } {
  const w = PLAYER_FRAME_W - FRAME_PAD;
  const canvas = Array.from({ length: PLAYER_FRAME_H }, () => Array<string>(w).fill('.'));
  let clipped = 0;
  for (const [grid, x0, y0] of parts) {
    grid.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === '.') return;
        const x = x0 + dx;
        const y = y0 + dy + PLAYER_TOP_PAD;
        if (y < 0 || y >= PLAYER_FRAME_H || x < 0 || x >= w) {
          clipped++;
          return;
        }
        canvas[y][x] = ch;
      }),
    );
  }
  selOut(canvas);
  const frame = canvas.map((row) => '.'.repeat(FRAME_PAD) + row.join(''));
  CLIPPED.set(frame, clipped);
  return { frame, clipped };
}

/** Sobrepõe as partes na ordem dada (a última fica por cima) num frame de 32x30; '.' não pinta. */
export function compose(...parts: Placed[]): string[] {
  return composeWithStats(...parts).frame;
}

/**
 * Corta linhas de baixo e colunas da esquerda de uma parte que já ficariam fora da grade, mantendo o resto no mesmo
 * lugar. O frame final é idêntico ao do `compose` sem o corte, mas sem pixels descartados em silêncio (SPF-02).
 */
export function cropPart([grid, x0, y0]: Placed, edges: { left?: number; bottom?: number }): Placed {
  const left = edges.left ?? 0;
  const bottom = edges.bottom ?? 0;
  return [grid.slice(0, grid.length - bottom).map((row) => row.slice(left)), x0 + left, y0];
}

/** Troca cores de uma parte (ex.: braço de trás mais escuro). */
export function recolor(grid: Grid, map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/** Espelha uma parte na horizontal (usado também por `playerTech` para a perna de trás esticada do release). */
export function mirror(grid: Grid): string[] {
  return grid.map((row) => [...row].reverse().join(''));
}

/** O braço/perna de trás fica um tom mais escuro. */
const FAR = { s: 'N', N: 'n', n: 'K', p: 'P', P: 'q' };

// ---------------------------------------------------------------- cabeça (13x11)
// Rampa de cabelo em 3 tons (h base, j meio-tom, H brilho), orelha em x/P, olho com branco `w` e pupila `b`,
// luz de borda `y` na nuca. Linhas 0-2: mechas espetadas.
const HEAD: Grid = [
  '...k..k..k...',
  '..kHk.kHkjk..',
  '.kjHjkjHjHjk.',
  'kjjjHjjHjjjjk',
  'kjhjjhjjhjjhk',
  'khhhhhhjhhjk.',
  'kjhhhhpphhpk.',
  'khhhxPpwbppk.',
  'khhhxPppppppk',
  '.khhhxPppxpk.',
  '.knnNkxPPxk..',
];
/** Olho fechado, sobrancelha torta e boca aberta (dor). */
const HEAD_HURT: Grid = [
  '...k..k..k...',
  '..kHk.kHkjk..',
  '.kjHjkjHjHjk.',
  'kjjjHjjHjjjjk',
  'kjhjjhjjhjjhk',
  'khhhhhhjhhjk.',
  'kjhhhhhpphpk.',
  'khhhxPpbbppk.',
  'khhhxPppppppk',
  '.khhhxPpprpk.',
  '.knnNkxPPxk..',
];
/** Cabeça concentrada no golpe: sobrancelha desce sobre o olho e a boca cerra os dentes. */
export const HEAD_FOCUS: Grid = [
  '...k..k..k...',
  '..kHk.kHkjk..',
  '.kjHjkjHjHjk.',
  'kjjjHjjHjjjjk',
  'kjhjjhjjhjjhk',
  'khhhhhhjhhjk.',
  'kjhhhhphhhpk.',
  'khhhxPpwbppk.',
  'khhhxPppppppk',
  '.khhhxPpbbpk.',
  '.knnNkxPPxk..',
];
/** Igual à cabeça base, com as pontas das mechas das linhas 0-1 1 texel para trás (overlap do idle e da queda). */
export const HEAD_SWAY: Grid = [
  '..k..k..k....',
  '.kHk.kHkjk...',
  ...HEAD.slice(2),
];

// ---------------------------------------------------------------- tronco (8x7), gakuran
// Gola alta com luz `s`, botões `A`/`z` na coluna 5, luz de borda `y` nas costas, sombra `n` e cinto `K` com fivela.
const BODY: Grid = [
  'koyNNsNk',
  'kysNNANk',
  'kyNNNNnk',
  'kyNsNANk',
  'kyNNNNnk',
  'konnnnnk',
  'kKKzAKKk',
];

// ---------------------------------------------------------------- braços (o da frente; o de trás via recolor)
// Manga com punho claro (`s`) antes da mão; mão com sombra `P`.
/** Caído ao lado do corpo. */
const ARM_DOWN: Grid = ['ksNk', 'kNNk', 'kNnk', 'ksnk', 'kppk', 'kPPk', '.kk.'];
/** Balançando para trás (corrida). */
export const ARM_BACK: Grid = ['...ksNk', '..kNNk.', '.kNnk..', 'ksnk...', 'kpPk...', '.kk....'];
/** Balançando para a frente (corrida). */
const ARM_FWD: Grid = ['ksNk...', '.kNNk..', '..kNnk.', '...kspk', '...kpPk', '....kk.'];
/** Guarda: cotovelo embaixo, punho na altura do queixo. */
export const ARM_GUARD: Grid = ['...kkk', '..kppk', 'ksNpPk', 'kNNsk.', 'knNk..', '.kk...'];
/** Punho puxado para trás do ombro (preparo do soco). */
export const ARM_COCK: Grid = ['kkksNk', 'kppNnk', 'kPpnk.', '.kkk..'];
/** Para cima segurando (carregar / preparo do arremesso). Também vira a mão erguida da Azul via `recolor`
 * (troca `p` pelo núcleo de energia): `playerTech` reusa esta peça em vez de desenhar um braço novo. */
export const ARM_UP: Grid = ['.kk.', 'kppk', 'kPpk', 'ksnk', 'kNnk', 'ksNk'];

/** A partir deste comprimento o membro esticado tem colunas para afinar (antebraço e canela); abaixo, fica reto. */
const TAPER_MIN_LEN = 12;

/**
 * Braço esticado na horizontal: manga com luz em cima e dobra no cotovelo, antebraço um texel mais fino (o contorno
 * de baixo sobe), punho de manga claro (`s`) e punho 3x3 com sombra na ponta. `len` = colunas do ombro até o
 * contorno da ponta do punho, inclusive. Com `len` < 12 não há colunas para afinar e a manga fica reta.
 */
export function armStraight(len: number): string[] {
  const sleeve = len - 7;
  if (len < TAPER_MIN_LEN) {
    return [
      'k'.repeat(len - 1) + '.',
      'k' + 's'.repeat(sleeve) + 'skpppk',
      'k' + 'N'.repeat(sleeve) + 'skppPk',
      'k' + 'n'.repeat(sleeve) + 'NkPPxk',
      'k'.repeat(len - 1) + '.',
    ];
  }
  const upper = Math.ceil(sleeve / 2);
  const fore = sleeve - upper;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(upper) + 'N'.repeat(fore) + 'skpppk',
    'k' + 'N'.repeat(upper - 1) + 'o' + 'n'.repeat(fore) + 'NkppPk',
    'k' + 'n'.repeat(upper) + 'k'.repeat(fore + 2) + 'PPxk',
    'k'.repeat(upper + 1) + '.'.repeat(fore + 2) + 'kkk.',
  ];
}

// ---------------------------------------------------------------- pernas (16x6, na base do frame)
// Dobra de joelho `s` na perna da frente, sombra `n` na de trás, sapato `K` com brilho `s` em cima.
const LEGS_STAND: Grid = [
  '....knNNNNNk',
  '....kKnkknNk',
  '....kKnk.ksNk',
  '....kKnk.knNk',
  '...kKKKk.kKsKk',
  '...kkkkk.kkkkkk',
];
/** Base firme, pés afastados (golpes). */
export const LEGS_WIDE: Grid = [
  '....knNNNNNk',
  '...kKnkkknNk',
  '..kKnk...ksNk',
  '.kKnk....knNk',
  'kKKKk....kKsKk',
  'kkkkk....kkkkkk',
];
// Ciclo de corrida (6 poses): perna da frente em N, a de trás em n/K.
const RUN_LEGS: Grid[] = [
  // 0: contato, perna da frente esticada à frente
  ['....knNNNNk', '...kKnkknNNk', '..kKnk...ksNk', '.kKnk.....knNk', 'kKKk......kKsKk', 'kkk.......kkkkk'],
  // 1: apoio, perna da frente dobrada
  ['....knNNNNk', '...kKnkknNk', '...kKnkksNk', '..kKnk.knNk', '.kKKk..kKsKk', '.kkk...kkkkk'],
  // 2: passagem, perna de trás subindo atrás
  ['....knNNNNk', '..kKKknNNk', '.kKKk.ksNk', '.kkk..knNk', '......kKsKk', '......kkkkk'],
  // 3: contato, perna de trás esticada à frente
  ['....knNNNNk', '...ksNkkKnNk', '..knNk...kKnk', '.knNk.....kKnk', 'kKKk......kKKKk', 'kkk.......kkkkk'],
  // 4: apoio, perna de trás dobrada
  ['....knNNNNk', '...knNkkKnk', '...ksNkkKnk', '..knNk.kKnk', '.kKKk..kKKKk', '.kkk...kkkkk'],
  // 5: passagem, perna da frente subindo atrás
  ['....knNNNNk', '..ksNkkKnk', '.kKKk.kKnk', '.kkk..kKnk', '......kKKKk', '......kkkkk'],
];
/** Pulo: joelhos recolhidos. */
const LEGS_TUCK: Grid = ['....knNNNNNk', '...kKnkknNNk', '...kKKk.ksNNk', '....kkk.kKsKk', '.........kkkk', ''];
/** Queda: pernas soltas, uma à frente. */
const LEGS_DANGLE: Grid = ['....knNNNNNk', '....kKnk.knNk', '...kKnk..ksNk', '...kKKk...knNk', '...kkk....kKsKk', '...........kkkk'];
/** Queda, segundo tempo: a outra perna vai à frente (alterna com LEGS_DANGLE). */
const LEGS_DANGLE_B: Grid = ['....knNNNNNk', '...kKnkknNNk', '...kKnk.ksNk', '..kKKk...knNk', '..kkk....kKsKk', '..........kkkk'];
/** Agachado do pouso (4 linhas): joelhos para fora, pés afastados. */
const LEGS_CROUCH: Grid = ['...knNNNNNk', '.kKnskkknNk', 'kKKKk...kKsKk', 'kkkkk...kkkkk'];
/**
 * Chute: perna da frente esticada na horizontal, com dobra no joelho, canela um texel mais fina (o contorno de baixo
 * sobe) e o sapato na ponta, de sola clara (`s`) virada para o alvo. `len` = colunas do quadril até o contorno da
 * ponta do pé, inclusive. Com `len` < 12 a perna fica reta.
 */
export function legStraight(len: number): string[] {
  const leg = len - 6;
  if (len < TAPER_MIN_LEN) {
    return [
      'k'.repeat(len - 1) + '.',
      'k' + 's'.repeat(leg) + 'kKsKk',
      'k' + 'N'.repeat(leg) + 'kKKKk',
      'k' + 'n'.repeat(leg) + 'kKKKk',
      'k'.repeat(len),
    ];
  }
  const thigh = Math.ceil(leg / 2);
  const shin = leg - thigh;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(thigh) + 'N'.repeat(shin) + 'kKKsk',
    'k' + 'N'.repeat(thigh - 1) + 'o' + 'n'.repeat(shin) + 'kKKsk',
    'k' + 'n'.repeat(thigh) + 'k'.repeat(shin + 1) + 'KKsk',
    'k'.repeat(thigh + 1) + '.'.repeat(shin + 1) + 'kkkk',
  ];
}
/**
 * Perna do chute: sai do quadril, embaixo à esquerda, e termina no pé, `rise` linhas acima (0 = horizontal), com a
 * coxa grossa (4 linhas de cor), a canela fina (2 linhas, no meio da coxa) e o sapato de sola clara (`s`) na ponta.
 * `len` = colunas do quadril até o contorno da ponta do pé, inclusive; a ponta do pé fica nas 5 primeiras linhas da
 * parte, que tem `rise + 6` linhas. Contorno `k` só nos vizinhos, sem as linhas `S` soltas do rastro antigo.
 */
export function legKick(len: number, rise = 0): string[] {
  const leg = len - 6;
  const thigh = Math.ceil(leg / 2);
  const cells = Array.from({ length: rise + 6 }, () => Array<string>(len).fill('.'));
  for (let x = 1; x <= leg; x++) {
    const top = 1 + Math.round(rise * (1 - (x - 1) / (leg - 1)));
    if (x <= thigh) {
      cells[top][x] = 's';
      cells[top + 1][x] = 'N';
      cells[top + 2][x] = x === thigh ? 'o' : 'N';
      cells[top + 3][x] = 'n';
    } else {
      cells[top + 1][x] = 'N';
      cells[top + 2][x] = 'n';
    }
  }
  for (let y = 1; y <= 3; y++) cells[y].splice(leg + 2, 3, 'K', 'K', 's');
  const filled = cells.map((row) => row.map((c) => c !== '.'));
  const near = (x: number, y: number): boolean => filled[y]?.[x] === true;
  return cells.map((row, y) =>
    row.map((c, x) => (c === '.' && (near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1)) ? 'k' : c)).join(''),
  );
}

/**
 * Tronco inclinado para trás: cada linha desliza para a esquerda, 0 na de baixo (o cinto) e `cols` na de cima (a gola).
 * A parte devolvida tem `cols` colunas a mais; quem a posiciona recua o `x` em `cols`.
 */
export function leanBack(grid: Grid, cols: number): string[] {
  const last = grid.length - 1;
  return grid.map((row, y) => {
    const shift = Math.round((cols * (last - y)) / last);
    return '.'.repeat(cols - shift) + row + '.'.repeat(shift);
  });
}

/** Joelho da frente dobrado para cima (preparo e volta do chute). Também usado por `playerMoves`. */
export const LEG_CHAMBER: Grid = ['kkkkkk.', 'ksNNNNk', 'knnnnNk', '.kkkkNk', '....ksKk', '....kkkk'];
/** Só a perna de trás, de apoio (usada também por `playerTech` no release: perna da frente plantada e curta,
 * enquanto a de trás esticada carrega o avanço do golpe). */
export const LEG_SUPPORT: Grid = ['knNk', 'kKnk', 'kKnk', 'kKnk', 'kKnk', 'kKsKk', 'kkkkk'];

// ---------------------------------------------------------------- montagem
const Y_HEAD = 0;
const Y_BODY = 11;
export const Y_LEGS = 18;

export interface Pose {
  head?: Grid;
  /** Deslocamento horizontal de cabeça + tronco (inclinação). */
  lean?: number;
  /** Deslocamento vertical de cabeça + tronco (respiração, agachar). */
  drop?: number;
  /** Colunas de inclinação para trás da gola e da cabeça em relação ao cinto (chutes: tronco para trás). */
  tilt?: number;
  near?: Placed;
  far?: Placed;
  legs?: Placed[];
}

export function pose(p: Pose): string[] {
  const lean = p.lean ?? 0;
  const drop = p.drop ?? 0;
  const parts: Placed[] = [];
  if (p.far) parts.push(p.far);
  parts.push(...(p.legs ?? [[LEGS_STAND, 0, Y_LEGS] as const]));
  const tilt = p.tilt ?? 0;
  parts.push(tilt > 0 ? [leanBack(BODY, tilt), 4 + lean - tilt, Y_BODY + drop] : [BODY, 4 + lean, Y_BODY + drop]);
  parts.push([p.head ?? HEAD, 3 + lean - tilt, Y_HEAD + drop]);
  if (p.near) parts.push(p.near);
  return compose(...parts);
}

/**
 * Rastro de movimento (SPR-14): duas linhas curtas de `S`, uma logo acima e outra logo abaixo do membro esticado
 * (que ocupa `limbRows` linhas a partir de `limbY`), começando atrás do punho (5 texels antes da ponta) (`tipCol`, coluna da área de
 * desenho) e indo para trás. Só pinta texels vazios e nunca chega à ponta, então o alcance medido não muda.
 */
export function smear(frame: readonly string[], tipCol: number, limbY: number, limbRows: number, lengths: readonly [number, number]): string[] {
  const rows = frame.map((r) => [...r]);
  const lines: Array<[number, number]> = [
    [limbY - 1, lengths[0]],
    [limbY + limbRows, lengths[1]],
  ];
  for (const [y, n] of lines) {
    for (let i = 0; i < n; i++) {
      const x = tipCol - 5 - i + FRAME_PAD;
      if (y >= 0 && y < rows.length && rows[y][x] === '.') rows[y][x] = 'S';
    }
  }
  const out = rows.map((r) => r.join(''));
  const clipped = CLIPPED.get(frame);
  if (clipped !== undefined) CLIPPED.set(out, clipped);
  return out;
}

export const far = (g: Grid): string[] => recolor(g, FAR);

export const PLAYER_FRAMES: Record<string, readonly string[]> = {
  'idle-0': pose({ near: [ARM_DOWN, 5, 12] }),
  'idle-1': pose({ drop: 1, near: [ARM_DOWN, 5, 13] }),
  'idle-2': pose({ drop: 1, head: HEAD_SWAY, near: [ARM_DOWN, 5, 13] }),
  'idle-3': pose({ head: HEAD_SWAY, near: [ARM_DOWN, 5, 12] }),

  'run-0': pose({ lean: 1, near: [ARM_BACK, 2, 12], far: [far(ARM_FWD), 8, 12], legs: [[RUN_LEGS[0], 0, Y_LEGS]] }),
  'run-1': pose({ lean: 1, drop: 1, near: [ARM_DOWN, 6, 13], far: [far(ARM_DOWN), 8, 13], legs: [[RUN_LEGS[1], 0, Y_LEGS]] }),
  'run-2': pose({ lean: 1, near: [ARM_FWD, 6, 12], far: [far(ARM_BACK), 2, 12], legs: [[RUN_LEGS[2], 0, Y_LEGS]] }),
  'run-3': pose({ lean: 1, near: [ARM_FWD, 6, 12], far: [far(ARM_BACK), 2, 12], legs: [[RUN_LEGS[3], 0, Y_LEGS]] }),
  'run-4': pose({ lean: 1, drop: 1, near: [ARM_DOWN, 6, 13], far: [far(ARM_DOWN), 8, 13], legs: [[RUN_LEGS[4], 0, Y_LEGS]] }),
  'run-5': pose({ lean: 1, near: [ARM_BACK, 2, 12], far: [far(ARM_FWD), 8, 12], legs: [[RUN_LEGS[5], 0, Y_LEGS]] }),

  // Decolagem: pernas esticadas, braços para cima; depois a subida (pose antiga do jump-0).
  // `drop` 0: com `drop` negativo a cabeça saía da grade (mechas cortadas). Os ombros dos braços erguidos ficam na linha do tronco.
  'jump-0': pose({ near: [ARM_UP, 1, 6], far: [far(ARM_UP), 3, 5], legs: [[LEGS_STAND, 0, Y_LEGS - 1]] }),
  'jump-1': pose({ near: [ARM_FWD, 7, 11], far: [far(ARM_BACK), 1, 11], legs: [[LEGS_TUCK, 0, Y_LEGS - 1]] }),
  // Ápice: joelhos bem recolhidos, braços abertos.
  'apex-0': pose({ near: [ARM_FWD, 8, 10], far: [far(ARM_BACK), 0, 10], legs: [[LEGS_TUCK, 0, Y_LEGS - 2]] }),
  'fall-0': pose({ near: [mirror(ARM_BACK), 8, 10], far: [far(ARM_BACK), 1, 10], legs: [[LEGS_DANGLE, 0, Y_LEGS]] }),
  'fall-1': pose({ head: HEAD_SWAY, near: [mirror(ARM_BACK), 8, 9], far: [far(ARM_BACK), 1, 9], legs: [[LEGS_DANGLE_B, 0, Y_LEGS]] }),
  // Pouso: agacha fundo (squash) e levanta.
  'land-0': pose({ drop: 2, near: [ARM_FWD, 8, 13], far: [far(ARM_BACK), 1, 13], legs: [[LEGS_CROUCH, 0, Y_LEGS + 2]] }),
  'land-1': pose({ drop: 1, near: [ARM_DOWN, 5, 13] }),

  // Jab (braço da frente). No hit, o punho chega à coluna 25 = 18 texels (36 px) à frente do centro,
  // a borda da hitbox do jab (offsetX 22 + largura/2 13 = 35 px).
  'jab-wind': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_COCK, 3, 12], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'jab-hit': smear(pose({ lean: 2, head: HEAD_FOCUS, near: [armStraight(17), 9, 11], far: [far(ARM_GUARD), 9, 11], legs: [[LEGS_WIDE, 1, Y_LEGS]] }), 25, 11, 5, [5, 3]),
  'jab-recover': pose({ lean: 1, head: HEAD_FOCUS, near: [armStraight(10), 9, 11], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Direto (braço de trás, mais escuro), com o tronco girado para a frente.
  'cross-wind': pose({ lean: -1, head: HEAD_FOCUS, near: [ARM_GUARD, 8, 11], far: [far(ARM_COCK), 1, 12], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'cross-hit': smear(pose({ lean: 3, head: HEAD_FOCUS, near: [ARM_GUARD, 9, 12], far: [far(armStraight(16)), 10, 11], legs: [[LEGS_WIDE, 2, Y_LEGS]] }), 25, 11, 5, [5, 3]),
  'cross-recover': pose({ lean: 1, head: HEAD_FOCUS, near: [ARM_GUARD, 8, 11], far: [far(armStraight(10)), 9, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Chute: no hit, a ponta do pé chega à coluna 28 = 21 texels (42 px) à frente do centro,
  // a borda da hitbox do chute (offsetX 26 + largura/2 16 = 42 px).
  // Tronco inclinado para trás (`tilt`), perna de apoio plantada sob o corpo e perna do chute subindo 3 linhas até a
  // ponta, com coxa grossa e canela fina (`legKick`). Sem as linhas `S` do rastro antigo: o rastro agora é procedural.
  'kick-wind': pose({ lean: -1, tilt: 1, head: HEAD_FOCUS, near: [ARM_GUARD, 6, 11], far: [far(ARM_GUARD), 2, 11], legs: [[LEG_SUPPORT, 4, 17], [LEG_CHAMBER, 7, 15]] }),
  'kick-hit': pose({ lean: -1, tilt: 2, head: HEAD_FOCUS, near: [ARM_GUARD, 4, 11], far: [far(ARM_BACK), 0, 11], legs: [[LEG_SUPPORT, 5, 17], [legKick(20, 3), 9, 12]] }),
  'kick-recover': pose({ lean: -1, tilt: 1, head: HEAD_FOCUS, near: [ARM_GUARD, 6, 11], far: [far(ARM_GUARD), 2, 11], legs: [[LEG_SUPPORT, 4, 17], [LEG_CHAMBER, 7, 16]] }),

  // Carregando objeto: braços para cima segurando.
  'carry-idle-0': pose({ near: [ARM_GUARD, 8, 10], far: [far(ARM_UP), 1, 3] }),
  'carry-idle-1': pose({ drop: 1, near: [ARM_GUARD, 8, 11], far: [far(ARM_UP), 1, 4] }),
  'carry-run-0': pose({ lean: 1, near: [ARM_GUARD, 9, 10], far: [far(ARM_UP), 2, 3], legs: [[RUN_LEGS[0], 0, Y_LEGS]] }),
  'carry-run-1': pose({ lean: 1, drop: 1, near: [ARM_GUARD, 9, 11], far: [far(ARM_UP), 2, 4], legs: [[RUN_LEGS[1], 0, Y_LEGS]] }),
  'carry-run-2': pose({ lean: 1, near: [ARM_GUARD, 9, 10], far: [far(ARM_UP), 2, 3], legs: [[RUN_LEGS[3], 0, Y_LEGS]] }),
  'carry-run-3': pose({ lean: 1, drop: 1, near: [ARM_GUARD, 9, 11], far: [far(ARM_UP), 2, 4], legs: [[RUN_LEGS[4], 0, Y_LEGS]] }),

  // Golpe com objeto: ergue, desce à frente, volta.
  'swing-wind': pose({ lean: -1, near: [ARM_COCK, 3, 12], far: [far(ARM_UP), 1, 3], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'swing-hit': pose({ lean: 2, near: [armStraight(12), 9, 12], far: [far(armStraight(11)), 9, 10], legs: [[LEGS_WIDE, 1, Y_LEGS]] }),
  'swing-recover': pose({ lean: 1, near: [armStraight(9), 9, 12], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),

  // Arremesso: braço para trás e para cima, depois solta à frente.
  'throw-0': pose({ lean: -1, near: [ARM_UP, 0, 3], far: [far(ARM_GUARD), 8, 11], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  'throw-1': pose({ lean: 2, near: [armStraight(13), 9, 11], far: [far(ARM_BACK), 1, 12], legs: [[LEGS_WIDE, 1, Y_LEGS]] }),

  // Levando golpe: tronco para trás, braços soltos.
  'hurt-1': pose({ lean: -3, head: HEAD_HURT, near: [ARM_DOWN, 3, 13], far: [far(ARM_DOWN), 7, 13], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
  hurt: pose({ lean: -2, head: HEAD_HURT, near: [mirror(ARM_FWD), 0, 12], far: [far(ARM_BACK), 5, 12], legs: [[LEGS_WIDE, 0, Y_LEGS]] }),
};

export interface AnimDef {
  frames: readonly string[];
  frameRate: number;
  /** -1 = repete sempre; 0 = toca uma vez. */
  repeat: number;
  /** Duração em ms de cada frame (um por frame, todas > 0). Sem isso, vale 1000 / frameRate para todos. */
  durations?: readonly number[];
}

/** Configuração de um frame de animação para o Phaser: `duration` só existe quando a animação declara `durations`. */
export interface AnimFrameConfig {
  frame: string;
  duration?: number;
}

/** Frames de uma animação com a duração de cada um (SPR-08). Lança erro com o nome da animação se `durations` for inválido. */
export function animFrameConfigs(name: string, def: AnimDef): AnimFrameConfig[] {
  const { durations } = def;
  if (!durations) return def.frames.map((frame) => ({ frame }));
  if (durations.length !== def.frames.length) {
    throw new Error(`Animação '${name}' tem ${durations.length} durations para ${def.frames.length} frames`);
  }
  return def.frames.map((frame, i) => {
    const duration = durations[i];
    if (!(duration > 0)) throw new Error(`Animação '${name}' tem a duration ${duration} no frame '${frame}'; precisa ser > 0`);
    return { frame, duration };
  });
}

/**
 * Animações do player (CHR-01). Os golpes (jab, cross, kick, swing) têm os frames wind/hit/recover, trocados
 * pela fase do combo com setFrame; a animação registrada serve de sequência de referência.
 */
export const PLAYER_ANIMS: Record<string, AnimDef> = {
  idle: { frames: ['idle-0', 'idle-1', 'idle-2', 'idle-3'], frameRate: 2, repeat: -1, durations: [520, 160, 520, 160] },
  run: { frames: ['run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5'], frameRate: 12, repeat: -1, durations: [70, 90, 80, 70, 90, 80] },
  jump: { frames: ['jump-0', 'jump-1'], frameRate: 1, repeat: 0, durations: [70, 1000] },
  apex: { frames: ['apex-0'], frameRate: 1, repeat: 0 },
  fall: { frames: ['fall-0', 'fall-1'], frameRate: 7, repeat: -1, durations: [140, 140] },
  land: { frames: ['land-0', 'land-1'], frameRate: 16, repeat: 0, durations: [60, 60] },
  jab: { frames: ['jab-wind', 'jab-hit', 'jab-recover'], frameRate: 12, repeat: 0 },
  cross: { frames: ['cross-wind', 'cross-hit', 'cross-recover'], frameRate: 12, repeat: 0 },
  kick: { frames: ['kick-wind', 'kick-hit', 'kick-recover'], frameRate: 10, repeat: 0 },
  'carry-idle': { frames: ['carry-idle-0', 'carry-idle-1'], frameRate: 2, repeat: -1 },
  'carry-run': { frames: ['carry-run-0', 'carry-run-1', 'carry-run-2', 'carry-run-3'], frameRate: 10, repeat: -1 },
  swing: { frames: ['swing-wind', 'swing-hit', 'swing-recover'], frameRate: 10, repeat: 0 },
  throw: { frames: ['throw-0', 'throw-1'], frameRate: 10, repeat: 0 },
  hurt: { frames: ['hurt', 'hurt-1'], frameRate: 8, repeat: 0, durations: [90, 220] },
};
