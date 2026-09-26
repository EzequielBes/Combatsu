/**
 * Arte procedural dos efeitos de técnica (AD-002/AD-009): orbe vermelho (4/8/12 texels, núcleo `W`, borda `R`),
 * orbe azul (núcleo `d`, borda `C`), chama da aura de conjuração (2 frames, por técnica) e faíscas. Dados puros
 * (sem `phaser` como valor): rodam no Vitest.
 */

/** Quadrado com anéis concêntricos de cor, `colors[0]` na borda até `colors[last]` no núcleo. */
function ringedSquare(size: number, colors: readonly string[]): string[] {
  const last = colors.length - 1;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const ring = Math.min(x, y, size - 1 - x, size - 1 - y);
      return colors[Math.min(ring, last)];
    }).join(''),
  );
}

/** Tamanhos do orbe Vermelho por terço da carga (RED-02): 4, 8 e 12 texels, núcleo `W` e borda `R`. */
export const RED_ORB_SIZES = [4, 8, 12] as const;
export const RED_ORB_FRAMES: Record<(typeof RED_ORB_SIZES)[number], readonly string[]> = {
  4: ringedSquare(4, ['R', 'W']),
  8: ringedSquare(8, ['R', 'A', 'W']),
  12: ringedSquare(12, ['R', 'A', 'a', 'W']),
};

/** Orbe Azul ativo: núcleo `d` com borda ciano `C` (design.md, "sprites/techFx.ts"). */
export const BLUE_ORB_FRAME: readonly string[] = ringedSquare(10, ['C', 'd']);

/** Cor de aura por técnica (Direção de arte de cada story): Divergente/Azul em azul, Vermelho em vermelho,
 * Desmantelar em branco. */
export type AuraColor = 'blue' | 'red' | 'white';

/** Chama tremulando ao redor do corpo durante sign/charge (CAST-14): 2 frames que alternam a altura da chama. */
function flame(base: string, hi: string, tall: boolean): string[] {
  const rows = [
    '....o....',
    '...ooo...',
    '..oxoxo..',
    '.ooooooo.',
    '.oxoxoxo.',
    'ooooooooo',
    'oxoxoxoxo',
    'ooooooooo',
    '.ooooooo.',
    '.ooooooo.',
    '..ooooo..',
    '...ooo...',
  ];
  const padded = tall ? ['....o....', ...rows] : ['.........', ...rows];
  return padded.map((row) => row.replace(/x/g, hi).replace(/o/g, base));
}

const AURA_COLORS: Record<AuraColor, { base: string; hi: string }> = {
  blue: { base: 'c', hi: 'C' },
  red: { base: 'r', hi: 'R' },
  white: { base: 'w', hi: 'W' },
};

/** Chama da aura, 2 frames por cor (`<cor>-a`, `<cor>-b`), todas do mesmo tamanho (9x13 texels). */
export const AURA_FRAMES: Record<string, readonly string[]> = Object.fromEntries(
  (Object.entries(AURA_COLORS) as Array<[AuraColor, { base: string; hi: string }]>).flatMap(([color, { base, hi }]) => [
    [`${color}-a`, flame(base, hi, true)],
    [`${color}-b`, flame(base, hi, false)],
  ]),
);

/** Faíscas (2x2 texels): negras/vermelhas do Kokusen, vermelhas expelidas pelo Vermelho, azuis sugadas pelo Azul. */
export const TECH_SPARK_FRAMES: Record<'kokusen' | 'redOut' | 'blueIn', readonly string[]> = {
  kokusen: ['Rb', 'bR'],
  redOut: ['rA', 'Ra'],
  blueIn: ['cC', 'Cc'],
};
