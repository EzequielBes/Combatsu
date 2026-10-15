import { describe, expect, it } from 'vitest';
import { BiteLedger, boxInRadius, boxesOverlap, KillRefund, nearestTarget, segmentEntry } from '../../src/core/techKit';

const box = (x: number, y: number, width = 20, height = 20) => ({ x, y, width, height });

describe('KIT-01: geometria', () => {
  it('caixas se tocam com a borda encostada, e não com 1 px de folga', () => {
    expect(boxesOverlap(box(0, 0), box(20, 0))).toBe(true);
    expect(boxesOverlap(box(0, 0), box(21, 0))).toBe(false);
    expect(boxesOverlap(box(20, 0), box(0, 0))).toBe(true);
    expect(boxesOverlap(box(0, 20), box(0, 0))).toBe(true);
    expect(boxesOverlap(box(21, 0), box(0, 0))).toBe(false);
    expect(boxesOverlap(box(0, 0), box(5, 20))).toBe(true);
    expect(boxesOverlap(box(0, 0), box(5, 21))).toBe(false);
  });

  it('círculo contra caixa usa o ponto mais perto da caixa', () => {
    expect(boxInRadius(box(10, 0), { x: 0, y: 10 }, 10)).toBe(true);
    expect(boxInRadius(box(10, 0), { x: 0, y: 10 }, 9.9)).toBe(false);
    expect(boxInRadius(box(10, 10), { x: 0, y: 0 }, Math.SQRT2 * 10)).toBe(true);
  });

  it('entrada de trecho horizontal: distância até a borda, 0 já dentro, null fora da altura ou do alcance', () => {
    expect(segmentEntry({ x: 0, y: 10 }, 1, 100, box(40, 0))).toBe(40);
    expect(segmentEntry({ x: 50, y: 10 }, 1, 100, box(40, 0))).toBe(0);
    expect(segmentEntry({ x: 100, y: 10 }, -1, 100, box(40, 0))).toBe(40);
    expect(segmentEntry({ x: 0, y: 21 }, 1, 100, box(40, 0))).toBeNull();
    expect(segmentEntry({ x: 0, y: 20 }, 1, 100, box(40, 0))).toBe(40); // borda de baixo inclusa
    expect(segmentEntry({ x: 0, y: 0 }, 1, 100, box(40, 0))).toBe(40); // borda de cima inclusa
    expect(segmentEntry({ x: 0, y: 10 }, 1, 39, box(40, 0))).toBeNull();
    expect(segmentEntry({ x: 0, y: 10 }, -1, 100, box(40, 0))).toBeNull();
  });
});

describe('KIT-02: o mais perto', () => {
  const ts = [
    { id: 3, box: box(90, -10) }, // centro (100, 0)
    { id: 1, box: box(-110, -10) }, // centro (-100, 0)
    { id: 2, box: box(40, -10) }, // centro (50, 0)
  ];

  it('mais perto dentro do raio (borda inclusa), fora do skip; empate pelo menor id', () => {
    expect(nearestTarget({ x: 0, y: 0 }, 200, ts, () => false)?.id).toBe(2);
    expect(nearestTarget({ x: 0, y: 0 }, 200, ts, (id) => id === 2)?.id).toBe(1);
    expect(nearestTarget({ x: 0, y: 0 }, 49, ts, () => false)).toBeNull();
    expect(nearestTarget({ x: 0, y: 0 }, 50, ts, () => false)?.id).toBe(2);
    expect(nearestTarget({ x: 0, y: 0 }, 200, ts, (id) => id === 2)?.id).toBe(1); // 1 e 3 a 100 px: menor id
    expect(nearestTarget({ x: 0, y: 0 }, 200, [...ts].reverse(), (id) => id === 2)?.id).toBe(1);
  });
});

describe('KIT-03: devolução de recarga e componente proporcional', () => {
  it('o 1º pedido devolve round(recarga × pct), os seguintes 0; pct 0 nunca devolve', () => {
    const r = new KillRefund(2300, 0.3);
    expect(r.claim()).toBe(690);
    expect(r.claim()).toBe(0);
    expect(new KillRefund(2300, 0).claim()).toBe(0);
  });

  it('a mordida sai uma vez por alvo: 4% no comum, 1% no chefe', () => {
    const l = new BiteLedger();
    expect(l.bite({ id: 1, kind: 'enemy', maxHp: 200 })).toBe(8);
    expect(l.bite({ id: 1, kind: 'enemy', maxHp: 200 })).toBe(0);
    expect(l.bite({ id: 2, kind: 'boss', maxHp: 3000 })).toBe(30);
  });
});
