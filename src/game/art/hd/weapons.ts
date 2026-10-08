/*
 * Armas na densidade HD (1 texel = 1 px de mundo), no tamanho do corpo de ~60 texels: a faca e o porrete
 * amaldiçoados e as duas armas vinculadas do arsenal (a lâmina e o bastão). Grades de texto com a ponta para cima e
 * o cabo embaixo, nas cores da paleta única; o jogo prende a arma à mão pelo `grip`. Dados puros, sem `phaser`.
 */
type Grid = readonly string[];

const times = (n: number, ...rows: string[]): string[] => Array.from({ length: n }, () => rows).flat();

/** Troca o contorno `k` pela cor dada (o âmbar da versão rara); as outras cores ficam. */
const withOutline = (grid: Grid, color: string): string[] => grid.map((row) => row.replaceAll('k', color));

/** Ponta de lâmina de 5 texels de largura, numa folha de 7. */
const BLADE_TIP = ['...k...', '..kwk..', '..kwSk.'];
/** Trecho de lâmina: fio claro à esquerda, corpo e dorso na sombra. */
const BLADE = '.kwSsk.';
/** O roxo amaldiçoado que sobe da guarda. */
const BLADE_CURSE = ['.kUusk.', '.kuUvk.'];

/**
 * Faca amaldiçoada (7x24): lâmina reta de um fio, guarda dourada mais larga que a lâmina e cabo de madeira com o
 * pomo dourado escuro.
 */
const KNIFE: Grid = [
  ...BLADE_TIP,
  ...times(11, BLADE),
  ...BLADE_CURSE,
  'kzAAAzk',
  'kkzzzkk',
  ...times(2, '..kMk..', '..kmk..'),
  '..kzk..',
  '...k...',
];

/**
 * Lâmina vinculada (7x41): espada curta, com a veia roxa aparecendo de espaço em espaço ao longo do fio, guarda
 * dourada e cabo enfaixado de roxo. É a arma do slot: bem mais comprida que a faca.
 */
const BLADE_WEAPON: Grid = [
  ...BLADE_TIP,
  ...times(4, ...times(5, BLADE), '.kwUsk.'),
  ...BLADE_CURSE,
  'kAAzAAk',
  'kkzzzkk',
  ...times(4, '..kuk..', '..kvk..'),
  '..kAk..',
  '...k...',
];

/**
 * Porrete amaldiçoado (11x28): cabeça roxa larga com cravos de osso, afinando até o cabo de madeira com duas
 * cintas douradas.
 */
const CLUB: Grid = [
  '...kkkkk...',
  '..kUUlUUk..',
  '.kUuulluUk.',
  'kUuuluuulvk',
  'klluuuuuvvk',
  'kUuuuluuvvk',
  'kuuuuuuullk',
  'kuuluuuvvvk',
  '.kuuuuvvvk.',
  '.kvuuvvvvk.',
  '..kvvvvvk..',
  '...kvvvk...',
  ...times(3, '...kMMmk...'),
  '...kzAzk...',
  ...times(6, '...kMMmk...'),
  '...kzAzk...',
  ...times(3, '...kMMmk...'),
  '...kmmmk...',
  '....kkk....',
];

/** Trecho da haste de madeira do bastão. */
const SHAFT = 'kMMmk';
/** Talismã de papel enrolado na haste, com o traço vermelho do selo. */
const SEAL = ['kwwlk', 'kwrlk', 'kwwlk'];

/**
 * Bastão selado (5x46): haste comprida com ponteiras douradas, dois talismãs de papel e um anel de energia
 * amaldiçoada no meio. É a arma de maior alcance.
 */
const STAFF: Grid = [
  '.kkk.',
  'kzAzk',
  'kAzzk',
  ...times(6, SHAFT),
  ...SEAL,
  'kwrlk',
  'kwwlk',
  ...times(8, SHAFT),
  'kUuvk',
  'kuUvk',
  ...times(8, SHAFT),
  ...SEAL,
  ...times(8, SHAFT),
  'kAzzk',
  'kzAzk',
  '.kkk.',
];

export interface HdWeaponArt {
  /** Quadros da folha: `common` e `rare` (contorno âmbar), como nas ferramentas da densidade antiga. */
  frames: Record<string, string[]>;
  /** Distância, em px a partir da base, do ponto onde a mão segura. */
  grip: number;
}

const art = (grid: Grid, grip: number): HdWeaponArt => ({
  frames: { common: [...grid], rare: withOutline(grid, 'A') },
  grip,
});

/** Sufixo da textura HD de uma ferramenta que também existe na densidade antiga (`cursed-knife` → `cursed-knife-hd`). */
export const HD_WEAPON_SUFFIX = '-hd';

/** Folhas das armas HD, pela chave de textura. As armas vinculadas só existem nesta densidade. */
export const HD_WEAPONS: Record<string, HdWeaponArt> = {
  [`cursed-knife${HD_WEAPON_SUFFIX}`]: art(KNIFE, 4),
  [`cursed-club${HD_WEAPON_SUFFIX}`]: art(CLUB, 3),
  'bound-blade': art(BLADE_WEAPON, 6),
  // A haste tem 5 texels, mas a folha leva uma coluna vazia de cada lado: com 2 quadros de 5 px (textura de 10 px de
  // largura) o Phaser 4 não desenhou o sprite; com 7, a largura das lâminas, desenha.
  'bound-staff': art(
    STAFF.map((row) => `.${row}.`),
    15,
  ),
};
