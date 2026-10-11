import { describe, expect, it } from 'vitest';
import { hopOffset } from '../../src/core/moveHop';
import { MOVES } from '../../src/data/moves';
import { MOVE_HOP } from '../../src/data/feel';

const HOP = { fromActive: 0.5, toRecovery: 0.5, peakPx: 16 };
const MOVE = { activeMs: 90, recoveryMs: 260 };

describe('salto desenhado do golpe', () => {
  it('fica no chão na antecipação, antes de sair e depois de pousar', () => {
    expect(hopOffset(HOP, 'startup', 40, MOVE)).toBe(0);
    expect(hopOffset(HOP, 'active', 45, MOVE)).toBe(0);
    expect(hopOffset(HOP, 'recovery', 130, MOVE)).toBe(0);
    expect(hopOffset(HOP, 'recovery', 250, MOVE)).toBe(0);
    expect(hopOffset(HOP, 'window', 10, MOVE)).toBe(0);
  });

  it('chega à altura máxima no meio do trecho no ar e é contínuo na troca de fase', () => {
    // No ar de 45 ms do `active` a 130 ms do `recovery`: o meio cai 42,5 ms dentro do `recovery`.
    expect(hopOffset(HOP, 'recovery', 42.5, MOVE)).toBeCloseTo(16, 9);
    expect(hopOffset(HOP, 'active', 90, MOVE)).toBeCloseTo(hopOffset(HOP, 'recovery', 0, MOVE), 9);
  });

  it('sobe e desce sem degrau: de um quadro de 60 Hz para o outro anda menos de metade da altura', () => {
    let prev = 0;
    for (let t = 0; t <= 350; t += 1000 / 60) {
      const h = t < 90 ? hopOffset(HOP, 'active', t, MOVE) : hopOffset(HOP, 'recovery', t - 90, MOVE);
      expect(Math.abs(h - prev)).toBeLessThan(HOP.peakPx / 2);
      prev = h;
    }
  });

  it('todo salto configurado é de um golpe que existe e sobe pelo menos 8 px', () => {
    for (const [name, hop] of Object.entries(MOVE_HOP)) {
      expect(MOVES[name], name).toBeDefined();
      expect(hop.peakPx, name).toBeGreaterThanOrEqual(8);
    }
  });
});
