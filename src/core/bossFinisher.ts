/** Parâmetros do finalizador do chefe: fração do HP máximo e alcance (px) até o centro do chefe (BFX-06). */
export interface BossFinisherTuning {
  hpFraction: number;
  rangePx: number;
}

/**
 * Dano do finalizador do chefe (BFX-06..08): `round(hpFraction × maxHp)` só com o chefe em `stagger`, o finalizador
 * pronto e a distância horizontal `dist` até o player de no máximo `rangePx` (48 px vale, 49 não). Fora disso, 0.
 */
export function bossFinisherDamage(o: {
  dist: number;
  state: string;
  finisherReady: boolean;
  maxHp: number;
  t: BossFinisherTuning;
}): number {
  if (o.state !== 'stagger' || !o.finisherReady) return 0;
  if (o.dist > o.t.rangePx) return 0;
  return Math.round(o.t.hpFraction * o.maxHp);
}
