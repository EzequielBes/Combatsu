import type { EconomyTuning } from '../data/tuning';
import { fragmentValue } from './loot';
import { isBossRound, waveSize, type WaveTuning } from './waves';

/**
 * Renda esperada acumulada até o fim da rodada `round` (ECN-03, ECN-04): soma, nas rodadas que não são de
 * chefe, `waveSize × média do drop × valor do fragmento`. A média do drop é o ponto médio de
 * `fragmentsMin..fragmentsMax`. Serve de régua para calibrar os preços da loja contra o ritmo da onda.
 */
export function expectedIncome(round: number, waveT: WaveTuning, econ: EconomyTuning): number {
  const meanDrop = (econ.fragmentsMin + econ.fragmentsMax) / 2;
  let total = 0;
  for (let i = 1; i <= round; i++) {
    if (isBossRound(i)) continue;
    total += waveSize(i, waveT) * meanDrop * fragmentValue(i, econ);
  }
  return total;
}
