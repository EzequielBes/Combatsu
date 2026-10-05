/*
 * Chama de energia amaldiçoada (a aura em chamas de Jujutsu Kaisen): línguas em 4 tamanhos e 4 estágios de cor por
 * chama. O estágio 0 é o núcleo quente, colado à fonte; os seguintes esfriam e escurecem até a ponta, que some.
 * Dados puros, sem `phaser`: grades de texto com as teclas da `PALETTE`, todas no mesmo quadro de 7x9 texels com a
 * base da língua embaixo, no centro.
 */
import { FLAME_SIZES, FLAME_STAGES } from '../../../core/flame';

/** Cores de chama: azul (energia amaldiçoada), vermelha (Vermelho) e branca (Desmantelar). */
export type FlameColor = 'blue' | 'red' | 'white';

/**
 * Línguas com `O` na borda e `I` no miolo, do maior ao menor tamanho; todas em 7x9, apoiadas na base. São labaredas
 * estreitas e pontudas, com a ponta puxada para um lado: sobrepostas e balançando, leem como chama, não como gota.
 */
const SHAPES: readonly (readonly string[])[] = [
  ['....O..', '...OO..', '...OO..', '..OOO..', '..OIO..', '.OOIOO.', '.OIIIO.', '.OIIIO.', '..OOO..'],
  ['.......', '.......', '...O...', '...OO..', '..OOO..', '..OIO..', '.OOIOO.', '..OIO..', '..OOO..'],
  ['.......', '.......', '.......', '.......', '...O...', '...O...', '..OOO..', '..OIO..', '...O...'],
  ['.......', '.......', '.......', '.......', '.......', '.......', '...O...', '...O...', '...O...'],
];

/** Teclas da paleta por estágio: `[borda, miolo]`, do núcleo à ponta. */
const RAMPS: Record<FlameColor, readonly (readonly [string, string])[]> = {
  blue: [
    ['C', 'W'],
    ['c', 'C'],
    ['d', 'c'],
    ['d', 'd'],
  ],
  red: [
    ['T', 'W'],
    ['R', 'T'],
    ['t', 'R'],
    ['r', 'r'],
  ],
  white: [
    ['W', 'W'],
    ['C', 'W'],
    ['S', 'C'],
    ['s', 's'],
  ],
};

/** Nome do frame de uma língua: cor, estágio (0 = núcleo) e tamanho (0 = maior). */
export const flameFrame = (color: FlameColor, stage: number, size: number): string => `${color}-${stage}-${size}`;

/** Todos os frames da folha da chama. */
export const FLAME_FRAMES: Record<string, readonly string[]> = Object.fromEntries(
  (Object.keys(RAMPS) as FlameColor[]).flatMap((color) =>
    RAMPS[color]
      .slice(0, FLAME_STAGES)
      .flatMap(([edge, core], stage) =>
        SHAPES.slice(0, FLAME_SIZES).map((shape, size) => [
          flameFrame(color, stage, size),
          shape.map((row) => row.replaceAll('O', edge).replaceAll('I', core)),
        ]),
      ),
  ),
);
