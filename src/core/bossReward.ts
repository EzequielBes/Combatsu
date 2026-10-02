/**
 * Slot da técnica que ganha o upgrade grátis da vitória sobre o chefe (BFX-09): a de menor nível abaixo do 3;
 * empate vai ao slot 0; sem nenhuma upável (slots vazios ou Nv3), `null`.
 */
export function bossRewardSlot(slots: readonly [{ level: number } | null, { level: number } | null]): 0 | 1 | null {
  let pick: 0 | 1 | null = null;
  let best = Infinity;
  for (const i of [0, 1] as const) {
    const s = slots[i];
    if (s && s.level < 3 && s.level < best) {
      pick = i;
      best = s.level;
    }
  }
  return pick;
}
