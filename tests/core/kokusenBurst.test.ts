import { describe, expect, it } from 'vitest';
import { burstFrameAt, burstTotalMs } from '../../src/core/kokusenBurst';
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

  it('os raios cheios aparecem ainda dentro do congelamento do golpe', () => {
    // Os três primeiros quadros (núcleo e os dois de raios) terminam antes do fim do hitstop.
    expect(burstTotalMs(KOKUSEN.burstFrameMs.slice(0, 3))).toBeLessThanOrEqual(KOKUSEN.hitstopMs);
  });
});
