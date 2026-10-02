import { describe, expect, it } from 'vitest';
import { expectedIncome } from '../../src/core/economy';
import { ECONOMY, WAVE, type EconomyTuning } from '../../src/data/tuning';
import type { WaveTuning } from '../../src/core/waves';

describe('expectedIncome (ECN-03, ECN-04)', () => {
  it('rodada 1: 6 inimigos × média 3 × valor 1 = 18, acima do mínimo de 15 (ECN-03)', () => {
    expect(expectedIncome(1, WAVE, ECONOMY)).toBe(18);
    expect(expectedIncome(1, WAVE, ECONOMY)).toBeGreaterThanOrEqual(15);
  });

  it('até a rodada 4: 18 + 24 + 30 + 36 = 108, acima do mínimo de 100 (ECN-04)', () => {
    expect(expectedIncome(4, WAVE, ECONOMY)).toBe(108);
    expect(expectedIncome(4, WAVE, ECONOMY)).toBeGreaterThanOrEqual(100);
  });

  it('a rodada 5 (chefe) não soma inimigos comuns', () => {
    expect(expectedIncome(5, WAVE, ECONOMY)).toBe(expectedIncome(4, WAVE, ECONOMY));
  });

  it('o valor do fragmento sobe a cada 5 rodadas: a rodada 6 vale 1 + floor(5/5) = 2 por fragmento', () => {
    // rodada 6: waveSize 16 × 3 × 2 = 96
    expect(expectedIncome(6, WAVE, ECONOMY) - expectedIncome(5, WAVE, ECONOMY)).toBe(96);
  });

  it('com tuning não padrão usa o ponto médio do drop e o tamanho da onda dados', () => {
    const wave: WaveTuning = { ...WAVE, base: 4, perRound: 1, max: 10 };
    const econ: EconomyTuning = { ...ECONOMY, fragmentsMin: 1, fragmentsMax: 2 };
    // r1: 4 × 1,5 = 6; r2: 5 × 1,5 = 7,5
    expect(expectedIncome(2, wave, econ)).toBe(13.5);
  });
});
