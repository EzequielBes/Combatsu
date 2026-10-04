import { describe, expect, it } from 'vitest';
import type { Hit } from '../../src/core/hit';
import { impactSpikes, impactTier } from '../../src/core/impactTier';
import { IMPACT_FEEL } from '../../src/data/feel';

const NONE = { brokePosture: false };
const hit = (over: Partial<Hit> = {}): Pick<Hit, 'strength' | 'counter' | 'knockdown'> => ({
  strength: 'light',
  ...over,
});

describe('impactTier', () => {
  it('IMP-01: counter dá decisive', () => {
    expect(impactTier(hit({ counter: true }), NONE)).toBe('decisive');
  });
  it('IMP-01: counter com golpe leve ainda dá decisive', () => {
    expect(impactTier(hit({ strength: 'light', counter: true }), NONE)).toBe('decisive');
  });
  it('IMP-02: knockdown dá decisive', () => {
    expect(impactTier(hit({ strength: 'heavy', knockdown: true }), NONE)).toBe('decisive');
  });
  it('IMP-03: quebra de postura dá decisive', () => {
    expect(impactTier(hit(), { brokePosture: true })).toBe('decisive');
  });
  it('IMP-04: heavy sem nada decisivo dá heavy', () => {
    expect(impactTier(hit({ strength: 'heavy', counter: false, knockdown: false }), NONE)).toBe('heavy');
  });
  it('IMP-05: light sem nada decisivo dá light', () => {
    expect(impactTier(hit({ strength: 'light', counter: false, knockdown: false }), NONE)).toBe('light');
  });
});

describe('impactSpikes', () => {
  it('IMP-10: mesma seed e contagem dão a mesma saída', () => {
    expect(impactSpikes(7, 6)).toEqual(impactSpikes(7, 6));
  });
  it('seeds diferentes dão saídas diferentes', () => {
    expect(impactSpikes(1, 6)).not.toEqual(impactSpikes(2, 6));
  });
  it('respeita a contagem pedida', () => {
    expect(impactSpikes(3, 6)).toHaveLength(6);
    expect(impactSpikes(3, 0)).toHaveLength(0);
    expect(impactSpikes(3, 11)).toHaveLength(11);
  });
  it('IMP-09: todo comprimento fica em [18, 30] em 200 seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const s of impactSpikes(seed, IMPACT_FEEL.spikeCount)) {
        expect(s.length).toBeGreaterThanOrEqual(IMPACT_FEEL.spikeMinPx);
        expect(s.length).toBeLessThanOrEqual(IMPACT_FEEL.spikeMaxPx);
      }
    }
  });
  it('os ângulos cobrem a volta toda (não ficam todos do mesmo lado)', () => {
    const angles = impactSpikes(5, 6).map((s) => s.angle);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(Math.PI);
  });
});
