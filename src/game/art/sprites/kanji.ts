/**
 * Kanji das técnicas em pixel art, 24x24 texels (KOK-29): 黒 (kuro, Kokusen), 閃 (sen, só no cartão 黒閃), 赫
 * (aka, Vermelho), 蒼 (ao, Azul), 解 (kai, Desmantelar) e 拳 (ken, Punho Divergente, de "逕庭拳").
 *
 * As grades vêm de uma rasterização real: cada glifo foi desenhado com uma fonte japonesa do Windows (Yu Gothic
 * UI para 黒/閃/赫/蒼/拳, MS Gothic para 解 — a única que manteve os traços finos de 解 contínuos em 24x24), em
 * negrito, amostrado com supersampling e um limiar de alfa por caractere, depois centralizado com 1 texel de
 * margem. Por cima da máscara resultante, cada texel de traço vira a cor da própria técnica e cada texel de fundo colado a
 * um texel de traço (8 vizinhos) vira o contorno de 1 texel: `b`/`R` para 黒/閃 (duotom do Kokusen, KOK-22),
 * `R`/`b` para 赫 (Vermelho), `C`/`d` para 蒼 (Azul), `W`/`k` para 解 (Desmantelar) e `C`/`d` para 拳 (Punho
 * Divergente — mesma dupla do orbe/aura azul-ciano da técnica, TECHNIQUES.divergente.aura = 'c'). Dados puros
 * (sem `phaser` como valor): rodam no Vitest.
 */
export type KanjiId = 'kuro' | 'sen' | 'aka' | 'ao' | 'kai' | 'ken';

/** 黒 (kuro, "preto"), traço `b` com contorno `R`. */
const KURO: readonly string[] = [
  '..RRRRRRRRRRRRRRRRRRRR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RbbbRRRRbbbRRRRRbbbR..',
  '..RbbbRRRRbbbbRRRRbbbR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RbbbRRRRRbbRRRRRbbbR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RbbbbbbbbbbbbbbbbbbR..',
  '..RRRRRRRRbbbbRRRRRRRR..',
  '.RRRRRRRRRbbbRRRRRRRRRR.',
  '.RbbbbbbbbbbbbbbbbbbbbR.',
  '.RbbbbbbbbbbbbbbbbbbbbR.',
  'RRRRRRRRRRRbbRRRRRRRRRRR',
  'RbbbbbbbbbbbbbbbbbbbbbbR',
  'RbbbbbbbbbbbbbbbbbbbbbbR',
  'RbbbbbbbbbbbbbbbbbbbbbbR',
  'RRRbbbRRbbRRRbbRRRbbbRRR',
  '.RRbbbRRbbbRRbbbRRbbbbR.',
  'RRbbbRRRbbbRRbbbRRRbbbRR',
  'RbbbbR.RbbbRRRbbbRRRbbbR',
  'RRbbRR.RbbbR.RbbRR.RbbRR',
  '.RRRR..RRRRR.RRRR..RRRR.',
];

/** 閃 (sen, "clarão"), traço `b` com contorno `R`. */
const SEN: readonly string[] = [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbRRRRbbbRRbbRRRRRbbbR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbRRRRbbbRRbbRRRRRbbbR',
  'RbbbRRRRbbbRRbbbRRRRbbbR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbbbbbbbbRRbbbbbbbbbbR',
  'RbbbRRRRRRRRRRRRRRRRbbbR',
  'RbbbR....RbbbR.....RbbbR',
  'RbbbR....RbbbR.....RbbbR',
  'RbbbR....RbbbRR....RbbbR',
  'RbbbR...RRbbbbRR...RbbbR',
  'RbbbR..RRbbbbbbR...RbbbR',
  'RbbbR.RRbbbRbbbRRR.RbbbR',
  'RbbbRRRbbbbRRbbbbRRRbbbR',
  'RbbbRRbbbbRRRRbbbbRRbbbR',
  'RbbbRbbbbRR..RRbbbRRbbbR',
  'RbbbRbbbRR....RRbbbbbbbR',
  'RbbbRRRRR......RRbbbbbbR',
  'RbbbR...........RRbbbbRR',
  'RRRRR............RRRRRR.',
];

/** 赫 (aka, "rubro"), traço `R` com contorno `b`. */
const AKA: readonly string[] = [
  '....bbbbb......bbbb.....',
  '....bRRRb......bRRb.....',
  '....bRRRb......bRRb.....',
  '.bbbbbRRbbbbbbbbRRbbbbb.',
  '.bRRRRRRRRRbRRRRRRRRRRb.',
  '.bRRRRRRRRRbRRRRRRRRRRb.',
  '.bbbbRRRbbbbbbbbRRbbbbb.',
  'bbbbbbRRbbbbbbbbRRbbbbbb',
  'bRRRRRRRRRRbRRRRRRRRRRRb',
  'bRRRRRRRRRRRRRRRRRRRRRRb',
  'bRRRRRRRRRRbRRRRRRRRRRRb',
  'bbbbRRRRRbbbbbbRRRRRbbbb',
  '.bRRRRbRRRRbRRRRRRRRRRb.',
  '.bRRRRbRRRRRRRbRRRRRRRb.',
  'bbRRRRbRRbRRRRRRRRRRRRbb',
  'bRRbRRbRRbRRRRRRRRRRRRRb',
  'bRRbRRbRRbbRRbRRbRRRbRRb',
  'bRRbRRbRRbbRRbRRbRRRbRRb',
  'bbbRRRbRRbbbbRRRbRRRbRbb',
  '.bbRRbbRRRbbbRRRbRRRbbb.',
  'bbRRRbbRRRbbRRRbbRRRb...',
  'bRRRbbRRRbbRRRbbRRRRb...',
  'bbRRbbRRRbbbRRbbRRRbb...',
  '.bbbbbbbbb.bbbbbbbbb....',
];

/** 蒼 (ao, "azul-pálido"), traço `C` com contorno `d`. */
const AO: readonly string[] = [
  '......ddddd..ddddd......',
  '......dCCCd..dCCCd......',
  'dddddddCCCddddCCCddddddd',
  'dCCCCCCCCCCCCCCCCCCCCCCd',
  'dCCCCCCCCCCCCCCCCCCCCCCd',
  'dddddddCCCCCCdCCCddddddd',
  '......ddCCCCCCdddd......',
  '.....dddCCCCCCCCddd.....',
  '...dddCCCCCddCCCCCdddd..',
  'ddddCCCCCCCCCCCCCCCCCddd',
  'dCCCCCCCddddddddCCCCCCCd',
  'dCCCCCCCCCCCCCCCCCCdCCCd',
  'dddddCCCddddddddCCCddddd',
  '....dCCCCCCCCCCCCCCd....',
  '....dCCCddddddddCCCd....',
  '....dCCCCCCCCCCCCCCd....',
  '...ddCCCCCCCCCCCCCCdd...',
  '...dCCCCCCCCCCCCCCCCd...',
  '..ddCCCCCCCCCCCCCCCCd...',
  '.ddCCCdCCddddddddCCCd...',
  '.dCCCddCCCCCCCCCCCCCd...',
  '.ddCdddCCCCCCCCCCCCCd...',
  '..ddd.dCCdddddddddCCd...',
  '......dddd.......dddd...',
];

/** 解 (kai, "desmantelar"), traço `W` com contorno `k`. */
const KAI: readonly string[] = [
  '....kkkkk...............',
  '...kkWWWkkkkkkkkkkkkkkkk',
  '...kWWWWWWWkWWWWWWWWWWWk',
  '...kWWWWWWWkWWWWWWWWWWWk',
  '..kkWWWWWWWkkkkWWWkkWWkk',
  '..kWWWkkWWkkkkkWWWkkWWk.',
  '.kkWWWWWWWWWkkWWWkkkWWk.',
  'kkWWWWWWWWWWkWWWWWWWWWk.',
  'kWWWWWWWWWWWWWWWkWWWWWk.',
  'kWWWWkWWWkWWWWWkkWWWWkk.',
  'kWWWWWWWWWWWkkWWWWWkkk..',
  'kkkWWWWWWWWWkkWWWWWkkkkk',
  '..kWWWWWWWWWkWWWWWWWWWWk',
  '..kWWkWWWkWWkWWWWWWWWWWk',
  '..kWWWWWWWWWWWWWWWWWWWWk',
  '..kWWWWWWWWWkWWkkWWkkkkk',
  '..kWWWWWWWWWWWWWWWWWWWWk',
  '.kkWWkkkkkWWWWWWWWWWWWWk',
  '.kWWWk...kWWWWWWWWWWWWWk',
  '.kWWWk..kkWWkkkkkWWkkkkk',
  'kkWWWkkkkWWWk...kWWk....',
  'kWWWkkkWWWWWk...kWWk....',
  'kkWWk.kkWWWWk...kWWk....',
  '.kkkk..kkkkkk...kkkk....',
];

/** 拳 (ken, "punho", Punho Divergente), traço `C` com contorno `d`. */
const KEN: readonly string[] = [
  '..........ddd...........',
  '.....ddd..dCdd.dddd.....',
  '.....dCdd.dCCd.dCCd.....',
  '.....dCCdddCddddCCd.....',
  '...ddddCddCCdddCCddddd..',
  '..ddCCCCCCCCCCCCCCCCCd..',
  '..dCCCCCCCCCCCCCCCCCCd..',
  '..dddddddCCdddCddddddd..',
  '.dddddddCCddddCCddddddd.',
  '.dCCCCCCCCCCCCCCCCCCCCd.',
  '.ddddddCCdddddddCCddddd.',
  '...ddCCCddddddCCdCCdd...',
  '.dddCCCdCCCCCCCCddCCddd.',
  'ddCCCddddddCCddddddCCCdd',
  'dCCCdddddddCCddddddddCCd',
  'dddddCCCCCCCCCCCCCCCdddd',
  '....dddddddCCdddddddd...',
  '.ddddddddddCCdddddddddd.',
  '.dCCCCCCCCCCCCCCCCCCCCd.',
  '.ddddddddddCCdddddddddd.',
  '.......ddddCCd..........',
  '.......dCCCCCd..........',
  '.......ddCCCdd..........',
  '........ddddd...........',
];

export const KANJI_FRAMES: Record<KanjiId, readonly string[]> = {
  kuro: KURO,
  sen: SEN,
  aka: AKA,
  ao: AO,
  kai: KAI,
  ken: KEN,
};
