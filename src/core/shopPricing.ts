import { PRICING } from '../data/tuning';

/** PRC-02: preço do próximo ponto de eixo do Vermelho ou do Corpo, 12 mais 4 por ponto já posto no item. */
export function axisPointPrice(points: number): number {
  return PRICING.axisPoint.base + PRICING.axisPoint.step * points;
}
