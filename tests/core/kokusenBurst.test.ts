import { describe, expect, it } from 'vitest';
import { burstAlphaAt, burstFrameAt, burstTotalMs } from '../../src/core/kokusenBurst';
import { KOKUSEN } from '../../src/data/techniques';
import { BURST_FRAMES } from '../../src/game/art/hd/atlas/burstSheet';

const MS = [40, 60, 90];

describe('estouro do Kokusen', () => {
  it('cada quadro fica o tempo dele na tela, em ordem, e depois do último não há quadro', () => {
    expect(burstFrameAt(MS, 0)).toBe(0);
    expect(burstFrameAt(MS, 39)).toBe(0);
    expect(burstFrameAt(MS, 40)).toBe(1);
    expect(burstFrameAt(MS, 99)).toBe(1);
    expect(burstFrameAt(MS, 100)).toBe(2);
    expect(burstFrameAt(MS, 189)).toBe(2);
    expect(burstFrameAt(MS, 190)).toBeNull();
    expect(burstTotalMs(MS)).toBe(190);
  });

  it('o jogo tem um tempo para cada quadro desenhado, nenhum abaixo de dois quadros de tela', () => {
    expect(KOKUSEN.burstFrameMs).toHaveLength(BURST_FRAMES.length);
    for (const ms of KOKUSEN.burstFrameMs) expect(ms).toBeGreaterThanOrEqual(33);
  });

  it('os raios entram depois do negativo e do duotom, e ainda dentro do congelamento do golpe', () => {
    const core = KOKUSEN.burstFrameMs[0];
    expect(core).toBeGreaterThanOrEqual(KOKUSEN.invertMs + KOKUSEN.duotoneMs);
    expect(core).toBeLessThan(KOKUSEN.hitstopMs);
  });

  it('fica opaco até o último quadro, que apaga aos poucos até sumir', () => {
    expect(burstAlphaAt(MS, 0)).toBe(1);
    expect(burstAlphaAt(MS, 100)).toBe(1);
    expect(burstAlphaAt(MS, 145)).toBeCloseTo(0.5, 9);
    expect(burstAlphaAt(MS, 190)).toBe(0);
    expect(burstAlphaAt(MS, 500)).toBe(0);
  });

  it('a escala põe cada texel num número inteiro de px de tela no zoom 2', () => {
    expect((KOKUSEN.burstScale * 2) % 1).toBe(0);
  });
});
