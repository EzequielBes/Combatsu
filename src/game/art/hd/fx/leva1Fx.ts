/*
 * Folha `tech-fx-leva1`: as vistas novas das 3 técnicas da leva 1 do JJK (F34), em quadros de 16x16 texels, 1 texel =
 * 1 px de mundo. Boogie Woogie: o lampejo âmbar da palma na troca (`palm-0` a palma, `palm-1` o estouro que se
 * desfaz). Ressonância: o prego em voo (`nail`, 8x3 no meio do quadro, ponta para a direita) e o prego cravado
 * que marca o alvo (`nailHead`, inclinado, a cabeça de fora). Fala Amaldiçoada: o olho de serpente com as presas,
 * selo dos Inumaki (`seal`), e o marcador de atordoado (`stun-0` a `stun-3`, 3 estrelas girando numa órbita). Grades de texto, 1 caractere = 1 chave
 * da paleta única, '.' transparente; as estrelas do atordoado são carimbadas na órbita por código. Puro, sem `phaser`.
 */
import { PALETTE } from '../../palette';
import type { HdSheet } from '../sheet';

/** Lado do quadro em texels. */
export const LEVA1_FX_SIZE = 16;

/** Quadros da folha, na ordem em que entram na textura. */
export const LEVA1_FX_FRAMES = [
  'palm-0',
  'palm-1',
  'nail',
  'nailHead',
  'seal',
  'stun-0',
  'stun-1',
  'stun-2',
  'stun-3',
] as const;
export type Leva1FxFrame = (typeof LEVA1_FX_FRAMES)[number];

const KEYS: readonly string[] = Object.keys(PALETTE);
const COLORS: readonly number[] = [0, ...KEYS.map((k) => PALETTE[k])];

const indexOf = (key: string): number => {
  const i = KEYS.indexOf(key);
  if (i < 0) throw new Error(`Cor '${key}' fora da paleta única`);
  return i + 1;
};

/** Grade de 16 linhas de 16 caracteres em índices de `COLORS`. */
function fromGrid(name: string, rows: readonly string[]): Uint8Array {
  const n = LEVA1_FX_SIZE;
  if (rows.length !== n || rows.some((r) => r.length !== n)) throw new Error(`Quadro '${name}' não é ${n}x${n}`);
  const px = new Uint8Array(n * n);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && (px[y * n + x] = indexOf(ch))));
  return px;
}

// Palma aberta, dedos para cima e polegar à esquerda, branca com a borda âmbar: o instante da troca. Dedos de 2 px
// com o vão âmbar só no topo (embaixo eles se fundem na palma), polegar de 2 px na diagonal saindo da palma, e as
// cintilas longe da mão, para o polegar não ler como mais uma.
const PALM_0 = [
  '..A.............',
  '.AwA...AA.......',
  '..A...AwwAAA....',
  '....AAAwwAwwA...',
  '...AwwAwwAwwAAA.',
  'AA.AwwAwwAwwAwwA',
  'AwAAwwAwwAwwAwwA',
  'AwwAwwwwwwwwwwwA',
  '.AwwwwwwwwwwwwwA',
  '..AwwwwwwwwwwwwA',
  '...AwwwwwwwwwwA.',
  '....AwwwwwwwwA..',
  '.....AAAAAAAA...',
  '..............A.',
  '.............AwA',
  '..............A.',
];

// O estouro que sobra da palma: anel oco e 8 raios com a ponta branca correndo para fora.
const PALM_1 = [
  '.......w........',
  '.......A........',
  '.......A........',
  '..w.........w...',
  '...A.......A....',
  '......AAA.......',
  '.....A...A......',
  'wAA..A.w.A..AAw.',
  '.....A...A......',
  '......AAA.......',
  '...A.......A....',
  '..w.........w...',
  '.......A........',
  '.......A........',
  '.......w........',
  '................',
];

// Prego em voo, 8x3 nas colunas 4 a 11 e linhas 7 a 9: a cabeça chata à esquerda, branca com o cinza só no lado de
// trás (sem marinho, que some no cenário noturno), a haste branca e a ponta com o brilho ciano.
const NAIL = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....SW..........',
  '....SWWWWWWC....',
  '....SW..........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// Prego cravado no alvo, inclinado a 45 graus (cabeça em cima à esquerda): a cabeça chata de 5 texels na diagonal,
// branca na face da luz e cinza embaixo, 2 texels de haste e o furo escuro com a borda vermelha onde ela entra.
// Na escala do prego em voo, contornado em k para ler sobre o inimigo; 8x8 no meio do quadro.
const NAIL_HEAD = [
  '................',
  '................',
  '................',
  '................',
  '.........k......',
  '........kWk.....',
  '.......kWSk.....',
  '......kWSk......',
  '.....kWSWk......',
  '....kWSkkSk.....',
  '.....kk..kkr....',
  '..........r.....',
  '................',
  '................',
  '................',
  '................',
];

// O selo da Fala: o olho de serpente (janome) dos brasões, um anel grosso roxo de miolo vazado com o ponto claro no
// centro, e as duas presas brancas embaixo. 10x13, deixando sobra no quadro; o contorno k só aparece sobre fundo claro.
const SEAL = [
  '................',
  '.....kkkkkk.....',
  '....kUUUUuuk....',
  '...kUUuuuuuvk...',
  '...kUu....uvk...',
  '...kUu.ww.uvk...',
  '...kuu.ww.uvk...',
  '...kuu....vvk...',
  '...kuuuuuvvvk...',
  '....kuvvvvvk....',
  '....kWWkkWWk....',
  '.....kWkkWk.....',
  '.....kWkkWk.....',
  '......k..k......',
  '................',
  '................',
];

/**
 * Estrelas do atordoado, da frente para trás: a cruz 3x3 (branca com as pontas âmbar), a de 2x2 dos lados e o ponto
 * âmbar de trás. O tamanho anda um degrau por quadro, nunca de uma vez.
 */
const STARS = [['.A.', 'AwA', '.A.'], ['wA', 'AA'], ['A']];

/** Quadros do giro: 4 passos de 30 graus fecham os 120 graus entre as estrelas, e o loop emenda sem salto. */
export const STUN_STEPS = 4;

/** Texel do ponto a `d` do centro do quadro, espelhado: o lado esquerdo da órbita é o reflexo exato do direito. */
const snap = (d: number): number => {
  const r = Math.round((LEVA1_FX_SIZE - 1) / 2 + Math.abs(d));
  return d >= 0 ? r : LEVA1_FX_SIZE - 1 - r;
};

/** Degrau da estrela pela profundidade na órbita (o seno do ângulo; positivo é a frente, embaixo). */
const starOf = (depth: number): readonly string[] => STARS[depth > 0.6 ? 0 : depth > -0.3 ? 1 : 2];

/**
 * Marcador de atordoado no passo `step`: a órbita achatada, pontilhada em roxo a cada 30 graus, e 3 estrelas a 120
 * graus que andam 30 graus por passo, no sentido anti-horário da tela (a da frente vai para a direita). As de trás são desenhadas
 * primeiro, para a da frente ficar por cima.
 */
export function stunFrame(step: number): Uint8Array {
  const n = LEVA1_FX_SIZE;
  const px = new Uint8Array(n * n);
  const [rx, ry] = [6, 2.5];
  const put = (x: number, y: number, key: string): void => {
    if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = indexOf(key);
  };
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 2 * Math.PI;
    put(snap(rx * Math.cos(a)), snap(ry * Math.sin(a)), 'u');
  }
  const angles = [0, 1, 2].map((s) => Math.PI / 2 - (step * Math.PI) / 6 + (s * 2 * Math.PI) / 3);
  angles.sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of angles) {
    const x = snap(rx * Math.cos(a));
    const y = snap(ry * Math.sin(a));
    const stamp = starOf(Math.sin(a));
    const h = Math.floor((stamp.length - 1) / 2);
    stamp.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && put(x + i - h, y + j - h, ch)));
  }
  return px;
}

let cached: HdSheet | undefined;

/** A folha `tech-fx-leva1` (calculada uma vez, na primeira chamada). */
export function leva1FxSheet(): HdSheet {
  if (cached) return cached;
  const frames: Record<Leva1FxFrame, Uint8Array> = {
    'palm-0': fromGrid('palm-0', PALM_0),
    'palm-1': fromGrid('palm-1', PALM_1),
    nail: fromGrid('nail', NAIL),
    nailHead: fromGrid('nailHead', NAIL_HEAD),
    seal: fromGrid('seal', SEAL),
    'stun-0': stunFrame(0),
    'stun-1': stunFrame(1),
    'stun-2': stunFrame(2),
    'stun-3': stunFrame(3),
  };
  cached = { frameW: LEVA1_FX_SIZE, frameH: LEVA1_FX_SIZE, colors: COLORS, frames };
  return cached;
}
