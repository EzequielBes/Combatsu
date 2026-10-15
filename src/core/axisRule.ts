import { TECH_RULE, type AxisTable } from '../data/techRule';

export type { AxisTable };

/** Tipo de corpo atingido, para o teto do componente proporcional. */
export type BodyKind = 'enemy' | 'boss';

/** Faixa de acerto do evento (plano, seção 4): sem `band` no `Hit`, o acerto é `normal`. */
export type HitBand = 'chip' | 'micro' | 'normal';

/**
 * Pontos de uma técnica já gastos (quem guarda e valida a compra é o `axisBuild` da F30). O Despertar não vem na
 * entrada: é derivado do ramo e do nível (TRL-04).
 */
export interface TechBuild<A extends string, B extends string> {
  axes: Readonly<Record<A, number>>;
  branch: B | null;
}

/** Nível, ramo válido e Despertar de uma técnica, resolvidos dos pontos. */
export interface ResolvedBuild<B extends string> {
  level: number;
  branch: B | null;
  awakened: boolean;
}

/**
 * TRL-01, TRL-02: nível = 1 + soma dos pontos. Ponto fora de 0..3, não inteiro, ou soma acima de 5 é erro de fiação
 * e lança `RangeError`.
 */
export function axisLevel(axes: Readonly<Record<string, number>>): number {
  let sum = 0;
  for (const [axis, points] of Object.entries(axes)) {
    if (!Number.isInteger(points) || points < 0 || points > TECH_RULE.axisCap) {
      throw new RangeError(`eixo ${axis} com ${points} pontos (0 a ${TECH_RULE.axisCap})`);
    }
    sum += points;
  }
  if (sum > TECH_RULE.pointCap) throw new RangeError(`${sum} pontos na técnica (teto ${TECH_RULE.pointCap})`);
  return 1 + sum;
}

/** TRL-01 a TRL-04: resolve nível, ramo e Despertar. Ramo abaixo do Nv 2 lança `RangeError` (TRL-03). */
export function resolveBuild<A extends string, B extends string>(build: TechBuild<A, B>): ResolvedBuild<B> {
  const level = axisLevel(build.axes);
  if (build.branch !== null && level < TECH_RULE.branchLevel) {
    throw new RangeError(`ramo ${build.branch} no Nv ${level} (abre no Nv ${TECH_RULE.branchLevel})`);
  }
  return { level, branch: build.branch, awakened: build.branch !== null && level >= TECH_RULE.awakenLevel };
}

/** Valor da tabela para os pontos do eixo (0 a 3). */
export function axisAt<T>(table: AxisTable<T>, points: number): T {
  return table[points];
}

/**
 * TRL-05: componente proporcional do Despertar. O comum toma `pct` do HP máximo; o chefe toma no máximo 1%.
 * Arredonda para inteiro, como todo dano do jogo.
 */
export function maxHpBite(maxHp: number, kind: BodyKind, pct: number = TECH_RULE.maxHpPct.enemy): number {
  const frac = kind === 'boss' ? Math.min(pct, TECH_RULE.maxHpPct.boss) : pct;
  return Math.max(0, Math.round(maxHp * frac));
}

/** Fração proporcional do Despertar para o tipo de corpo (4% no comum, 1% no chefe). */
export function bitePctFor(kind: BodyKind): number {
  return kind === 'boss' ? TECH_RULE.maxHpPct.boss : TECH_RULE.maxHpPct.enemy;
}

/** Caixa de colisão em px de mundo, com `x`/`y` no canto de cima à esquerda. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centro de uma caixa. */
export function boxCenter(box: Box): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
