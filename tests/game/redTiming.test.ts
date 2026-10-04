import { describe, expect, it } from 'vitest';
import {
  DISTORT_PERIOD_MS,
  FRAME_MS,
  REPULSE_MS,
  TRAIL_EVERY_MS,
  TRAIL_FADE_MS,
} from '../../src/game/techFx/redTiming';

describe('tempos do efeito do Vermelho (RDA-07, RDA-10, RDA-12)', () => {
  it('RDA-10: o cone da repulsão dura 120 ms', () => {
    expect(REPULSE_MS).toBe(120);
  });

  it('RDA-12: um fantasma de rastro por frame (1000/60 ms) que some em 180 ms', () => {
    expect(FRAME_MS).toBeCloseTo(1000 / 60, 10);
    expect(TRAIL_EVERY_MS).toBe(FRAME_MS);
    expect(TRAIL_FADE_MS).toBe(180);
  });

  it('RDA-07: os arcos T dão uma volta a cada 400 ms', () => {
    expect(DISTORT_PERIOD_MS).toBe(400);
  });
});
