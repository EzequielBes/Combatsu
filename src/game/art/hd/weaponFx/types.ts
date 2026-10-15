/*
 * Tipos dos efeitos das armas imbuídas (seção 5.4 do plano de builds): a arma fica guardada e aparece só como efeito,
 * no rastro e no impacto do golpe. Puro, sem `phaser`.
 */
import type { Pt } from './canvas';

/** Quadros de uma folha, pelo nome: todos do mesmo tamanho, grades de texto na paleta única. */
export type FxFrames = Record<string, string[]>;

/** Uma folha de efeito e o texel que o jogo prende ao ponto do golpe (o efeito é desenhado olhando para a direita). */
export interface WeaponFxSheet {
  frames: FxFrames;
  /** No rastro, o centro do gesto (de onde o arco gira, ou a raiz da estocada); no impacto, o ponto de contato. */
  anchor: Pt;
}

/** A arte de uma arma: o rastro do golpe que ela muda, o impacto no acerto e, se tiver, o marcador de cargas. */
export interface WeaponFxArt {
  trail: WeaponFxSheet;
  impact: WeaponFxSheet;
  charge?: WeaponFxSheet;
}

/** Nome dos quadros de uma sequência: `trail-0`, `trail-1`... */
export const seq = (prefix: string, frames: readonly string[][]): FxFrames =>
  Object.fromEntries(frames.map((rows, i) => [`${prefix}-${i}`, rows]));
