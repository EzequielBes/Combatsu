import type Phaser from 'phaser';

/**
 * Pontos simples `{ x, y }` para os desenhos de polígono do `Graphics` (`fillPoints`, `strokePoints`). O Phaser 4
 * declara que eles recebem `Vector2[]`, mas em execução só lê `x` e `y` de cada ponto.
 */
export const pts = (points: readonly { x: number; y: number }[]): Phaser.Math.Vector2[] =>
  points as unknown as Phaser.Math.Vector2[];
