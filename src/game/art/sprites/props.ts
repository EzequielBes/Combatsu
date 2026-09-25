/*
 * Objetos (PRP-01): cadeira escolar e garrafa em pixel art, com contorno `k`, e os estilhaços recortados do próprio
 * sprite. Dados puros (sem `phaser` como valor).
 *
 * Os corpos físicos dos objetos saem do tamanho da textura: a cadeira tem 13x13 texels (26x26 px) e a garrafa 4x10
 * texels (8x20 px), exatamente o tamanho dos placeholders que elas substituem, para a física não mudar.
 */

type Grid = readonly string[];

/** Cadeira escolar de perfil, virada para a direita: encosto atrás, assento e pernas em madeira de dois tons. */
const CHAIR: Grid = [
  'kkkk.........',
  'kMMk.........',
  'kMmk.........',
  'kMmk.........',
  'kMmk.........',
  'kMmk.........',
  'kMmkkkkkkkkkk',
  'kMMMMMMMMMMMk',
  'kmmmmmmmmmmmk',
  'kkkkkkkkkkkkk',
  '.kmk.....kmk.',
  '.kmk.....kmk.',
  '.kkk.....kkk.',
];

/** Garrafa verde em pé: tampa escura, gargalo, corpo em dois tons e um brilho branco. */
const BOTTLE: Grid = [
  '.kk.',
  '.Gg.',
  '.Gg.',
  'kGgk',
  'kwgk',
  'kwgk',
  'kGgk',
  'kGgk',
  'kGgk',
  'kkkk',
];

/** Sprite de cada objeto, pela chave do PropDef. */
export const PROP_SPRITES = { chair: CHAIR, bottle: BOTTLE } as const;

/** Fumaça (4x4 texels, 8x8 px como o placeholder): branca, tingida por quem usa com as cores da paleta. */
export const SMOKE: Grid = ['.ww.', 'wwww', 'wwww', '.ww.'];

/** Fumaça da dissolução: um frame por roxo da paleta, emitida sem tint (tint multiplicativo sai da paleta, ART-01). */
export const SMOKE_CURSE: Record<string, Grid> = {
  u: SMOKE.map((row) => row.replace(/w/g, 'u')),
  v: SMOKE.map((row) => row.replace(/w/g, 'v')),
  U: SMOKE.map((row) => row.replace(/w/g, 'U')),
};

/** Um estilhaço: um recorte quadrado do sprite, com a posição (texels) do canto superior esquerdo no sprite. */
export interface Shard {
  key: string;
  grid: string[];
  x: number;
  y: number;
}

/**
 * Recorta o sprite numa grade de quadrados `size x size` texels. Quadrados vazios ficam de fora e os da borda são
 * completados com '.', para todos terem o mesmo tamanho (uma folha só).
 */
export function cutShards(grid: Grid, size: number): Shard[] {
  const shards: Shard[] = [];
  const width = grid[0].length;
  for (let y = 0; y < grid.length; y += size) {
    for (let x = 0; x < width; x += size) {
      const piece = Array.from({ length: size }, (_, dy) => (grid[y + dy] ?? '').slice(x, x + size).padEnd(size, '.'));
      if (piece.every((row) => /^\.*$/.test(row))) continue;
      shards.push({ key: `s${shards.length}`, grid: piece, x, y });
    }
  }
  return shards;
}

/** Estilhaços de cada objeto (PRP-01): a cadeira em pedaços de 3x3 texels, a garrafa em cacos de 2x2. */
export const PROP_SHARDS: Record<keyof typeof PROP_SPRITES, Shard[]> = {
  chair: cutShards(CHAIR, 3),
  bottle: cutShards(BOTTLE, 2),
};
