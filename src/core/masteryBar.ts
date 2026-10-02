/**
 * Largura (px) da barra de maestria sob o slot (MST-08): `round(slotW × pontos / limiar)`; `null` quando o
 * limiar é `null` (Nv3), caso em que a barra fica oculta.
 */
export function masteryBarWidth(slotW: number, points: number, threshold: number | null): number | null {
  if (threshold === null) return null;
  return Math.round((slotW * points) / threshold);
}
