/*
 * Oni do Portão / Tecelã de Maldições (BTIER-04/06, BAT-05): silhueta grande e arredondada, com chifres, um olho
 * e boca largos, braços que sobem no preparo e se esticam no ataque. A Tecelã reaproveita a mesma grade com outro
 * mapa de cores (TECELA_COLOR_MAP), sem tint multiplicativo (AD-002): o adaptador registra duas texturas (uma por
 * arquétipo), nunca aplica `setTint` sobre a mesma folha. Dados puros (sem `phaser` como valor).
 *
 * Frames desenhados com blocos de contorno arredondado (mesmo estilo de `art/hud.ts`), montados num canvas do
 * tamanho final: isso garante linhas de largura uniforme (exigência do `parseSheet`) sem contar caracteres à mão.
 */

/** Tamanho final de todo frame do chefe, em texels: maior que o do inimigo (32x24) nas duas dimensões. */
export const BOSS_FRAME_W = 40;
export const BOSS_FRAME_H = 32;
/** Coluna do centro do corpo (metade da largura do frame). */
const CENTER_COL = 20;

/** Origem do sprite: no pé (base do frame), no centro do corpo físico (BOSS.ts usa corpo de 40 px de largura). */
export const BOSS_ORIGIN = { x: CENTER_COL / BOSS_FRAME_W, y: 1 } as const;

type Canvas = string[][];

function makeCanvas(w: number, h: number): Canvas {
  return Array.from({ length: h }, () => Array<string>(w).fill('.'));
}

function toRows(canvas: Canvas): string[] {
  return canvas.map((row) => row.join(''));
}

/** Pinta uma célula; nunca deixa uma pintura anterior virar transparente (mantém a ordem de camadas). */
function paint(canvas: Canvas, x: number, y: number, ch: string): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[0].length) return;
  if (ch === '.' && canvas[y][x] !== '.') return;
  canvas[y][x] = ch;
}

/** Bloco preenchido com contorno escuro e cantos cortados (mesmo estilo de `frame()` em `art/hud.ts`). */
function block(canvas: Canvas, x0: number, y0: number, w: number, h: number, fill: string): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      paint(canvas, x0 + x, y0 + y, corner ? '.' : border ? 'k' : fill);
    }
  }
}

/** Troca cores mantendo as que não estão no mapa (mesma regra do `recolor` de `sprites/enemy.ts`). */
function recolor(grid: readonly string[], map: Record<string, string>): string[] {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

interface FigureOptions {
  arm: 'down' | 'raised' | 'forward';
  eye: 'normal' | 'glow' | 'squint';
  mouth: 'closed' | 'open';
  /** Corpo mais baixo (atordoado, rugido). */
  drop?: number;
}

/** Monta uma pose de pé: chifres, cabeça, olho, boca, torso, cinto, pernas e braços (por último, por cima). */
function figure(opts: FigureOptions): string[] {
  const canvas = makeCanvas(BOSS_FRAME_W, BOSS_FRAME_H);
  const drop = opts.drop ?? 0;

  block(canvas, 6, 1 + drop, 4, 5, 's');
  block(canvas, 30, 1 + drop, 4, 5, 's');
  block(canvas, 12, 4 + drop, 16, 10, 'a');

  if (opts.eye === 'squint') {
    block(canvas, 17, 9 + drop, 6, 2, 'k');
  } else {
    block(canvas, 17, 7 + drop, 6, 4, opts.eye === 'glow' ? 'w' : 'r');
    paint(canvas, 19, 8 + drop, opts.eye === 'glow' ? 'r' : 'w');
  }
  block(canvas, 15, 11 + drop, 10, 2, opts.mouth === 'open' ? 'w' : 'k');

  block(canvas, 8, 13 + drop, 24, 12, 'a');
  block(canvas, 8, 22 + drop, 24, 3, 'v');
  block(canvas, 10, 25, 8, 7, 'a');
  block(canvas, 22, 25, 8, 7, 'a');

  if (opts.arm === 'down') {
    block(canvas, 2, 14 + drop, 6, 14, 'a');
    block(canvas, 32, 14 + drop, 6, 14, 'a');
  } else if (opts.arm === 'raised') {
    block(canvas, 2, 2 + drop, 6, 13, 'a');
    block(canvas, 32, 2 + drop, 6, 13, 'a');
  } else {
    block(canvas, 2, 14 + drop, 6, 14, 'a');
    block(canvas, 29, 15 + drop, 11, 6, 'A');
  }

  return toRows(canvas);
}

/** Derrotado: silhueta baixa e larga, caído perto do chão (bem diferente de qualquer pose de pé). */
function deadFigure(): string[] {
  const canvas = makeCanvas(BOSS_FRAME_W, BOSS_FRAME_H);
  block(canvas, 4, 22, 32, 10, 'a');
  block(canvas, 10, 24, 6, 4, 's');
  block(canvas, 20, 26, 8, 3, 'k');
  return toRows(canvas);
}

/**
 * Frames do chefe (design: idle, preparo/ataque de cada padrão, rugido, atordoado, morto). Preparo e ataque
 * sempre mudam braço/olho/boca em relação ao idle (BAT-05: telegrafado e visualmente distinto).
 */
export const BOSS_FRAMES: Record<string, readonly string[]> = {
  idle: figure({ arm: 'down', eye: 'normal', mouth: 'closed' }),
  'windup-charge': figure({ arm: 'raised', eye: 'glow', mouth: 'open' }),
  charge: figure({ arm: 'forward', eye: 'glow', mouth: 'open' }),
  'windup-leap': figure({ arm: 'raised', eye: 'glow', mouth: 'open', drop: 1 }),
  leap: figure({ arm: 'forward', eye: 'glow', mouth: 'open', drop: 1 }),
  'windup-volley': figure({ arm: 'raised', eye: 'glow', mouth: 'closed' }),
  volley: figure({ arm: 'forward', eye: 'glow', mouth: 'closed' }),
  roar: figure({ arm: 'raised', eye: 'glow', mouth: 'open', drop: 2 }),
  stagger: figure({ arm: 'down', eye: 'squint', mouth: 'closed', drop: 2 }),
  dead: deadFigure(),
};

/** Mapa de cores da Tecelã (BTIER-06): pele e chifres do Oni (laranja/cinza) viram tons roxos da mesma paleta. */
export const TECELA_COLOR_MAP: Record<string, string> = {
  a: 'u',
  A: 'U',
  s: 'i',
  S: 'I',
  v: 'n',
};

/** Mesma grade do Oni, com `TECELA_COLOR_MAP` aplicado (BTIER-06): nenhuma cor fora da paleta, sem tint. */
export const TECELA_FRAMES: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(BOSS_FRAMES).map(([key, grid]) => [key, recolor(grid, TECELA_COLOR_MAP)]),
);

export interface BossAnimDef {
  frames: readonly string[];
  frameRate: number;
  /** -1 = repete sempre; 0 = toca uma vez. */
  repeat: number;
}

/** Uma animação de um frame só por estado; `idle` repete, o resto toca uma vez (o adaptador troca o estado). */
export const BOSS_ANIMS: Record<string, BossAnimDef> = Object.fromEntries(
  Object.keys(BOSS_FRAMES).map((name) => [name, { frames: [name], frameRate: 1, repeat: name === 'idle' ? -1 : 0 }]),
);

/** Chave da animação do chefe no AnimationManager: uma por arquétipo, para não compartilhar frames entre eles. */
export const bossAnimKey = (archetype: 'oni' | 'tecela', name: string): string => `boss-${archetype}-${name}`;

/** Projétil da rajada (BAT-04): orbe roxo pequeno, 8x8 texels (16x16 px). */
export const PROJECTILE_FRAME: readonly string[] = toRows(
  (() => {
    const canvas = makeCanvas(8, 8);
    block(canvas, 0, 0, 8, 8, 'u');
    block(canvas, 2, 2, 4, 4, 'U');
    return canvas;
  })(),
);

/**
 * Onda de choque do pouso (BAT-03): 16x10 texels, 20 px de altura de mundo com ART_SCALE 2 (BAT-07 exige menos
 * que o ápice do pulo do player, 49 px).
 */
export const SHOCKWAVE_FRAME: readonly string[] = toRows(
  (() => {
    const canvas = makeCanvas(16, 10);
    block(canvas, 0, 1, 16, 8, 'a');
    block(canvas, 2, 3, 12, 4, 'A');
    return canvas;
  })(),
);
