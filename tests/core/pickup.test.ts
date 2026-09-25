import { describe, expect, it } from 'vitest';
import { createPickup, lifetimeMs, stepPickup, visible, type PickupContext, type PickupPlayer, type PickupState } from '../../src/core/pickup';
import { PICKUP } from '../../src/data/tuning';
import type { Rect } from '../../src/core/level';

const ALIVE_PLAYER: PickupPlayer = { x: 1000, y: 1000, w: 20, h: 36, alive: true, canHeal: true };

function ctxWith(overrides: Partial<PickupContext> = {}): PickupContext {
  return { solids: [], player: ALIVE_PLAYER, t: PICKUP, ...overrides };
}

function overlapsSolid(p: PickupState, s: Rect): boolean {
  const half = PICKUP.size / 2;
  return p.x - half < s.x + s.width && p.x + half > s.x && p.y - half < s.y + s.height && p.y + half > s.y;
}

describe('lifetimeMs (ECO-09, HEAL-05)', () => {
  it('fragmento 15000 ms, gota 10000 ms', () => {
    expect(lifetimeMs('fragment', PICKUP)).toBe(15000);
    expect(lifetimeMs('heal', PICKUP)).toBe(10000);
  });
});

describe('stepPickup: vida (ECO-09, HEAL-05)', () => {
  it('fragmento: 14999 ms fica, 15000 ms expira', () => {
    const p = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p.resting = true; // sem física: só a idade importa aqui
    expect(stepPickup(p, 14999, ctxWith())).not.toBe('expired');
    expect(stepPickup(p, 1, ctxWith())).toBe('expired'); // ageMs chega a 15000
  });

  it('gota: 9999 ms fica, 10000 ms expira', () => {
    const p = createPickup(1, 'heal', 8, 0, 0, 0, 0);
    p.resting = true;
    expect(stepPickup(p, 9999, ctxWith())).not.toBe('expired');
    expect(stepPickup(p, 1, ctxWith())).toBe('expired');
  });
});

describe('stepPickup: gravidade e chão (ECO-07, ECO-24)', () => {
  it('cai, quica uma vez com fator 0,35 e depois para no topo do sólido, nunca sobrepondo', () => {
    const floor: Rect = { x: 0, y: 300, width: 400, height: 2000 }; // bem grosso: nunca atravessa por completo
    const p = createPickup(1, 'fragment', 1, 50, 0, 0, 0);
    let bounces = 0;
    let restingReached = false;
    for (let i = 0; i < 400 && !restingReached; i++) {
      const vyBeforeGravity = p.vy;
      const wasBounced = p.bounced;
      stepPickup(p, 16, ctxWith({ solids: [floor] }));
      // nunca termina o passo sobrepondo o sólido (ECO-24)
      expect(overlapsSolid(p, floor)).toBe(false);
      if (!wasBounced && p.bounced) {
        bounces++;
        const expectedVyAfterGravity = vyBeforeGravity + PICKUP.gravity * (16 / 1000);
        expect(p.vy).toBeCloseTo(-PICKUP.bounce * expectedVyAfterGravity, 5);
      }
      if (p.resting) restingReached = true;
    }
    expect(bounces).toBe(1);
    expect(restingReached).toBe(true);
    expect(p.vy).toBe(0);
    expect(p.vx).toBe(0);
    expect(p.y).toBeCloseTo(floor.y - PICKUP.size / 2, 5);
  });

  it('nasce sobreposto a um sólido (morte encostada na parede): o primeiro passo já não sobrepõe (edge case)', () => {
    const wall: Rect = { x: 40, y: -1000, width: 20, height: 3000 };
    const p = createPickup(1, 'fragment', 1, 45, 0, 0, 0); // x=45 já dentro da parede [40,60]
    stepPickup(p, 16, ctxWith({ solids: [wall] }));
    expect(overlapsSolid(p, wall)).toBe(false);
  });

  it('bate numa parede vertical e reflete vx com o fator 0,5 (ECO-24, edge case "morre contra a parede")', () => {
    const wall: Rect = { x: 100, y: -1000, width: 20, height: 3000 };
    const p = createPickup(1, 'fragment', 1, 50, 0, 100, 0); // vx positivo, indo em direção à parede
    let hit = false;
    for (let i = 0; i < 50 && !hit; i++) {
      const vxBefore = p.vx;
      stepPickup(p, 16, ctxWith({ solids: [wall] }));
      expect(overlapsSolid(p, wall)).toBe(false);
      if (p.vx < 0 && vxBefore > 0) {
        hit = true;
        expect(p.vx).toBeCloseTo(-PICKUP.wallBounce * vxBefore, 3);
      }
    }
    expect(hit).toBe(true);
  });
});

describe('stepPickup: ímã (ECO-10, ECO-18, ECO-25, HEAL-09)', () => {
  function playerAt(x: number, y: number): PickupPlayer {
    return { x, y, w: 0, h: 0, alive: true, canHeal: true };
  }

  it('idade 299 ms não liga o ímã; 300 ms liga (a 0 px de distância)', () => {
    const p299 = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p299.resting = true;
    p299.ageMs = 298;
    stepPickup(p299, 1, ctxWith({ player: playerAt(0, 0) })); // ageMs -> 299
    expect(p299.magnet).toBe(false);

    const p300 = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p300.resting = true;
    p300.ageMs = 299;
    stepPickup(p300, 1, ctxWith({ player: playerAt(0, 0) })); // ageMs -> 300
    expect(p300.magnet).toBe(true);
  });

  it('distância 72 px liga o ímã; 73 px não liga', () => {
    const p72 = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p72.resting = true;
    p72.ageMs = 300;
    stepPickup(p72, 0, ctxWith({ player: playerAt(72, 0) }));
    expect(p72.magnet).toBe(true);

    const p73 = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p73.resting = true;
    p73.ageMs = 300;
    stepPickup(p73, 0, ctxWith({ player: playerAt(73, 0) }));
    expect(p73.magnet).toBe(false);
  });

  it('uma vez em ímã, fica, mesmo que o player se afaste', () => {
    const p = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p.resting = true;
    p.ageMs = 300;
    stepPickup(p, 0, ctxWith({ player: playerAt(10, 0) })); // liga o ímã
    expect(p.magnet).toBe(true);
    stepPickup(p, 16, ctxWith({ player: playerAt(5000, 5000) })); // player longe agora
    expect(p.magnet).toBe(true);
  });

  it('velocidade do ímã começa em 120 px/s, cresce 1200 px/s² e tem teto 600 px/s, atravessando sólidos', () => {
    const wallBetween: Rect = { x: 40, y: -10, width: 20, height: 20 };
    const player = playerAt(1000, 0);
    const p = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p.resting = true;
    p.ageMs = 300;
    // liga o ímã a 0 px de distância do player (mesma posição), sem deslocar neste passo
    stepPickup(p, 0, ctxWith({ solids: [wallBetween], player: { ...player, x: 0, y: 0 } }));
    expect(p.magnet).toBe(true);
    expect(p.speed).toBe(PICKUP.magnetSpeed0);

    const ctx = ctxWith({ solids: [wallBetween], player });
    const x0 = p.x;
    stepPickup(p, 16, ctx); // 1º passo do ímã: usa a velocidade base (120)
    const moved1 = p.x - x0;
    expect(moved1).toBeCloseTo(PICKUP.magnetSpeed0 * (16 / 1000), 3);
    expect(p.speed).toBeCloseTo(PICKUP.magnetSpeed0 + PICKUP.magnetAccel * (16 / 1000), 3);

    for (let i = 0; i < 2000; i++) stepPickup(p, 16, ctx);
    expect(p.speed).toBe(PICKUP.magnetSpeedMax);
    // atravessou a parede entre a origem e o player (ECO-18: ignora terreno)
    expect(p.x).toBeGreaterThan(wallBetween.x + wallBetween.width);
  });

  it('player morto: não liga o ímã (ECO-25)', () => {
    const p = createPickup(1, 'fragment', 1, 0, 0, 0, 0);
    p.resting = true;
    p.ageMs = 300;
    stepPickup(p, 0, ctxWith({ player: { ...ALIVE_PLAYER, x: 0, y: 0, alive: false } }));
    expect(p.magnet).toBe(false);
  });

  it('gota com vida cheia: não liga o ímã (HEAL-09)', () => {
    const p = createPickup(1, 'heal', 8, 0, 0, 0, 0);
    p.resting = true;
    p.ageMs = 300;
    stepPickup(p, 0, ctxWith({ player: { ...ALIVE_PLAYER, x: 0, y: 0, canHeal: false } }));
    expect(p.magnet).toBe(false);
  });
});

describe('stepPickup: coleta (ECO-08, ECO-11, HEAL-03, HEAL-04)', () => {
  it('sobreposto ao player vivo: coletado', () => {
    const p = createPickup(1, 'fragment', 1, 5, 5, 0, 0);
    p.resting = true;
    const result = stepPickup(p, 16, ctxWith({ player: { x: 0, y: 0, w: 20, h: 20, alive: true, canHeal: true } }));
    expect(result).toBe('collected');
  });

  it('player morto: não coleta mesmo sobreposto (ECO-11)', () => {
    const p = createPickup(1, 'fragment', 1, 5, 5, 0, 0);
    p.resting = true;
    const result = stepPickup(p, 16, ctxWith({ player: { x: 0, y: 0, w: 20, h: 20, alive: false, canHeal: true } }));
    expect(result).not.toBe('collected');
  });

  it('gota com vida cheia: não coleta mesmo sobreposta (HEAL-04)', () => {
    const p = createPickup(1, 'heal', 8, 5, 5, 0, 0);
    p.resting = true;
    const result = stepPickup(p, 16, ctxWith({ player: { x: 0, y: 0, w: 20, h: 20, alive: true, canHeal: false } }));
    expect(result).not.toBe('collected');
  });

  it('gota com vida faltando: coleta normalmente', () => {
    const p = createPickup(1, 'heal', 8, 5, 5, 0, 0);
    p.resting = true;
    const result = stepPickup(p, 16, ctxWith({ player: { x: 0, y: 0, w: 20, h: 20, alive: true, canHeal: true } }));
    expect(result).toBe('collected');
  });
});

describe('visible (ECO-21)', () => {
  it('sempre visível enquanto restam mais de 3000 ms', () => {
    expect(visible({ kind: 'fragment', ageMs: 0 }, PICKUP)).toBe(true);
    expect(visible({ kind: 'fragment', ageMs: 11999 }, PICKUP)).toBe(true); // faltam 3001 ms
  });

  it('alterna a cada 150 ms nos últimos 3000 ms', () => {
    // faltam 3000 ms exatos: ageMs = 12000 (fragmento)
    const a = visible({ kind: 'fragment', ageMs: 12000 }, PICKUP);
    const b = visible({ kind: 'fragment', ageMs: 12150 }, PICKUP);
    const c = visible({ kind: 'fragment', ageMs: 12300 }, PICKUP);
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });
});
