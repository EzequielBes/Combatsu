/** Ajudantes dos testes da Ressonância (`resonance.test.ts` e `resonanceBranches.test.ts`). */
import type { ResTarget, ResonanceBuild, ResonanceState } from '../../src/core/resonance';
import type { ResonanceAxisId, ResonanceBranchId } from '../../src/data/resonance';

const ZERO: Record<ResonanceAxisId, number> = {
  pregos: 0,
  detonacao: 0,
  marca: 0,
  propagacao: 0,
  eficiencia: 0,
  recarga: 0,
};
export const build = (
  axes: Partial<Record<ResonanceAxisId, number>> = {},
  branch: ResonanceBranchId | null = null,
): ResonanceBuild => ({ axes: { ...ZERO, ...axes }, branch });

/** Alvo de 20×60 com centro em (x, y). */
export const tgt = (
  id: number,
  x: number,
  o: Partial<Omit<ResTarget, 'id' | 'box'>> & { y?: number } = {},
): ResTarget => ({
  id,
  kind: o.kind ?? 'enemy',
  box: { x: x - 10, y: (o.y ?? 0) - 30, width: 20, height: 60 },
  hp: o.hp ?? 1000,
  maxHp: o.maxHp ?? 1000,
});

export const ORIGIN = { x: 0, y: 0 };

/** Lança e deixa os pregos voarem até cravar ou cair. */
export function throwAndLand(r: ResonanceState, targets: ResTarget[], facing: 1 | -1 = 1) {
  r.throwNails(ORIGIN, facing);
  return r.update(400, targets);
}
