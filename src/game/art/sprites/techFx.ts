/**
 * Arte procedural dos efeitos de técnica (AD-002/AD-009): orbe vermelho (4/8/12 texels, núcleo `W`, borda carmim `t`),
 * orbe azul (núcleo `d`, borda `C`), chama da aura de conjuração (2 frames, por técnica) e faíscas. Dados puros
 * (sem `phaser` como valor): rodam no Vitest.
 */

/**
 * Disco com anéis concêntricos de cor por raio (não um quadrado): `stops` é uma lista, do núcleo para a borda,
 * de `[fração do raio, cor]` — o primeiro `stop` cujo raio cobre o texel vence. Texels fora do último raio ficam
 * transparentes ('.'), o que arredonda os cantos do quadro em vez de preenchê-los.
 */
function disc(size: number, stops: ReadonlyArray<readonly [number, string]>): string[] {
  const center = (size - 1) / 2;
  const maxRadius = size / 2;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const dx = x - center;
      const dy = y - center;
      const r = Math.sqrt(dx * dx + dy * dy) / maxRadius;
      for (const [threshold, color] of stops) if (r <= threshold) return color;
      return '.';
    }).join(''),
  );
}

/**
 * Tamanhos do orbe Vermelho por terço da carga (RED-02, RDA-02): 4, 8 e 12 texels, discos (não quadrados) com
 * núcleo branco `W` e borda carmim `t`; os de 8 e 12 passam por magenta `T` e vermelho vivo `R` no caminho. Sem
 * laranja nem âmbar (RDA-03): a técnica é o carmim da Reversão, não fogo.
 */
export const RED_ORB_SIZES = [4, 8, 12] as const;
export const RED_ORB_FRAMES: Record<(typeof RED_ORB_SIZES)[number], readonly string[]> = {
  4: disc(4, [
    [0.5, 'W'],
    [1, 't'],
  ]),
  8: disc(8, [
    [0.3, 'W'],
    [0.55, 'T'],
    [0.8, 'R'],
    [1, 't'],
  ]),
  12: disc(12, [
    [0.3, 'W'],
    [0.55, 'T'],
    [0.8, 'R'],
    [1, 't'],
  ]),
};

/**
 * Orbe Azul ativo: disco (não quadrado) com núcleo azul-profundo `d` (a massa densa sendo absorvida), um anel
 * ciano `C` e uma borda mais clara `W` (o brilho de contenção na borda, design.md "sprites/techFx.ts").
 */
export const BLUE_ORB_FRAME: readonly string[] = disc(10, [
  [0.4, 'd'],
  [0.75, 'C'],
  [1, 'W'],
]);

/** Cor de aura por técnica (Direção de arte de cada story): Divergente/Azul em azul, Vermelho em vermelho,
 * Desmantelar em branco. */
export type AuraColor = 'blue' | 'red' | 'white' | 'purple';

/** Corpo arredondado da chama (8 linhas), igual nos dois frames — só as pontas em cima variam (flicker). */
const FLAME_BODY: readonly string[] = [
  'oxoxoxoxo',
  'ooooooooo',
  'oxoxoxoxo',
  'ooooooooo',
  '.ooooooo.',
  '.ooooooo.',
  '..ooooo..',
  '...ooo...',
];

/** Altura (em linhas) de cada uma das 9 colunas da chama, por frame: irregular de propósito (silhueta orgânica,
 * não um triângulo/losango simétrico). Os dois frames deslocam os picos para tremular (CAST-14). */
const FLAME_TIP_ROWS = 6;
const FLAME_TIPS: Record<'a' | 'b', readonly number[]> = {
  a: [1, 3, 5, 4, 6, 3, 5, 2, 1],
  b: [2, 4, 2, 6, 3, 5, 2, 4, 1],
};

/** Pontas da chama sobre o corpo: cada coluna sobe `heights[x]` linhas: `o` no corpo da ponta, `x` só no topo. */
function flameTip(heights: readonly number[]): string[] {
  return Array.from({ length: FLAME_TIP_ROWS }, (_, row) => {
    const fromBottom = FLAME_TIP_ROWS - row;
    return heights.map((h) => (h < fromBottom ? '.' : h === fromBottom ? 'x' : 'o')).join('');
  });
}

/** Chama tremulando ao redor do corpo durante sign/charge (CAST-14): 2 frames com pontas em alturas diferentes. */
function flame(base: string, hi: string, variant: 'a' | 'b'): string[] {
  const rows = [...flameTip(FLAME_TIPS[variant]), ...FLAME_BODY];
  return rows.map((row) => row.replace(/x/g, hi).replace(/o/g, base));
}

const AURA_COLORS: Record<AuraColor, { base: string; hi: string }> = {
  blue: { base: 'c', hi: 'C' },
  red: { base: 'r', hi: 'R' },
  purple: { base: 'u', hi: 'U' },
  white: { base: 'w', hi: 'W' },
};

/** Chama da aura, 2 frames por cor (`<cor>-a`, `<cor>-b`), todas do mesmo tamanho (9x14 texels). */
export const AURA_FRAMES: Record<string, readonly string[]> = Object.fromEntries(
  (Object.entries(AURA_COLORS) as Array<[AuraColor, { base: string; hi: string }]>).flatMap(([color, { base, hi }]) => [
    [`${color}-a`, flame(base, hi, 'a')],
    [`${color}-b`, flame(base, hi, 'b')],
  ]),
);

/** Faíscas (2x2 texels): negras/vermelhas do Kokusen, vermelhas expelidas pelo Vermelho, azuis sugadas pelo Azul. */
export const TECH_SPARK_FRAMES: Record<'kokusen' | 'redOut' | 'blueIn', readonly string[]> = {
  kokusen: ['Rb', 'bR'],
  redOut: ['tT', 'Rt'], // RDA-03/14: carmim/magenta/vermelho, nunca a/A
  blueIn: ['cC', 'Cc'],
};
