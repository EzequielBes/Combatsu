/*
 * Paleta do player HD: rampas de 5 tons por material (do mais escuro ao mais claro) mais a luz de recorte fria da
 * lua. O índice 0 é transparente; o último é o contorno externo. Puro, sem `phaser`.
 */

/** Materiais do boneco; o valor é a posição da rampa em `RAMPS`. */
export const MAT = { jacket: 1, pants: 2, skin: 3, hair: 4, shoe: 5, gold: 6, white: 7 } as const;
export type Mat = (typeof MAT)[keyof typeof MAT];

/** Tom da luz de recorte (o sexto de cada rampa). */
export const RIM = 5;
const TONES = 6;

/** Rampas na ordem de `MAT`: 5 tons do escuro ao claro e a luz de recorte. */
const RAMPS: readonly (readonly number[])[] = [
  [0x121731, 0x1c2444, 0x2b3663, 0x435184, 0x6877a8, 0x9fb4dc], // paletó (marinho do uniforme)
  [0x0f1329, 0x171d38, 0x232b4f, 0x343f6b, 0x4e5b8a, 0x8fa3c9], // calça (um tom abaixo do paletó)
  [0x6b3a2e, 0x9a5f47, 0xcf9670, 0xf0c8a0, 0xffe3c6, 0xdfe2f2], // pele
  [0x140e19, 0x221827, 0x33263b, 0x4a3a55, 0x6d5a7b, 0x9fa9cf], // cabelo
  [0x110c14, 0x1e1722, 0x322633, 0x4b3b49, 0x75626f, 0x8fa3c9], // sapato
  [0x5e3c10, 0x9c6a1f, 0xd9822b, 0xffc857, 0xffe9ad, 0xffe9ad], // dourado (botão)
  [0x7f8fb4, 0xaab6d2, 0xd6d9e2, 0xfff4e0, 0xffffff, 0xffffff], // branco (olho, sola)
];

/** Contorno externo: quase preto azulado, o mesmo `k` da paleta do jogo. */
const OUTLINE_COLOR = 0x0b0d1a;

/** Índice de cor de um material num tom (0..4, ou `RIM`). */
export const colorIndex = (mat: number, tone: number): number => (mat - 1) * TONES + tone + 1;

/** Índice do contorno externo. */
export const OUTLINE_INDEX = RAMPS.length * TONES + 1;

/** Tabela de cores 0xRRGGBB por índice (o 0 é transparente). */
export const HD_COLORS: readonly number[] = [0, ...RAMPS.flat(), OUTLINE_COLOR];
