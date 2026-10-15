import { describe, expect, it } from 'vitest';
import { RedOrbState, redOrbConfig, repulseTargets, repulseTargetsFor } from '../../src/core/redOrb';
import { resolveTechStats } from '../../src/core/techStats';

/** O orbe do Vermelho Nv 1 sem multiplicadores, como o adaptador o constrói na soltura (TST-02). */
const RED_LV1 = redOrbConfig(resolveTechStats({ id: 'vermelho', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 }));

/** Config redondo para as contas: 400 px/s, 320 px de alcance, raio 100. */
const CFG = { speed: 400, rangePx: 320, radius: 100, touch: 20, detonation: 30 };

const at = (id: number, x: number, y = 0) => ({ id, center: { x, y } });

describe('VRM-09: o voo reto acaba aos 320 px da saída', () => {
  it('o config resolvido do Nv 1 tem alcance 320', () => {
    expect(RED_LV1.rangePx).toBe(320);
  });

  it('o voo para no 320º px, e não antes', () => {
    const state = new RedOrbState(100, 1, RED_LV1);
    const almost = ((320 - 1) / RED_LV1.speed) * 1000;
    expect(state.update(almost)).toBe(false);
    expect(state.update((2 / RED_LV1.speed) * 1000)).toBe(true);
    expect(state.traveled).toBeCloseTo(320, 5);
    expect(state.x).toBeCloseTo(420, 5);
    expect(state.detonated).toBe(true);
  });
});

describe('VRM-12, VRM-13: rebound recria o movedor', () => {
  it('depois da detonação, relança de x na direção, alcance e velocidade dados, e conta a detonação', () => {
    const state = new RedOrbState(0, 1, CFG);
    expect(state.update(800)).toBe(true);
    expect(state.detonations).toBe(0);

    state.rebound(320, -1, 200, 500);
    expect(state.detonated).toBe(false);
    expect(state.detonations).toBe(1);
    expect(state.traveled).toBe(0);
    expect(state.x).toBe(320);

    expect(state.update(200)).toBe(false);
    expect(state.x).toBeCloseTo(220, 5);
    expect(state.update(200)).toBe(true);
    expect(state.x).toBeCloseTo(120, 5);
    expect(state.traveled).toBeCloseTo(200, 5);
  });

  it('dir é a direção do voo atual: a do lançamento e, depois do rebote, a dele (VRM-12.5 volta pelo oposto)', () => {
    const state = new RedOrbState(0, -1, CFG);
    expect(state.dir).toBe(-1);
    state.rebound(0, 1, 200, 400);
    expect(state.dir).toBe(1);
    state.rebound(0, -1, 200, 400);
    expect(state.dir).toBe(-1);
  });

  it('cada rebote soma uma detonação (Fliperama: até 3)', () => {
    const state = new RedOrbState(0, 1, CFG);
    for (let n = 1; n <= 3; n++) {
      state.detonate();
      state.rebound(state.x, n % 2 === 0 ? 1 : -1, 200, 400 * 1.15 ** n);
      expect(state.detonations).toBe(n);
    }
  });

  it('a 2ª detonação pega de novo o alvo da 1ª', () => {
    const state = new RedOrbState(0, 1, CFG);
    const point = { x: 0, y: 0 };
    expect(state.detonationTargets([at(1, 50)], point).map((h) => h.targetId)).toEqual([1]);
    expect(state.detonationTargets([at(1, 50)], point)).toEqual([]);

    state.rebound(0, -1, 200, 400);
    const second = state.detonationTargets([at(1, 50)], point);
    expect(second.map((h) => [h.targetId, h.damage])).toEqual([[1, 30]]);
  });

  it('hitByCurrent lista quem a detonação atual pegou e zera no rebote', () => {
    const state = new RedOrbState(0, 1, CFG);
    state.hitTest(at(1, 10), 0);
    state.detonationTargets([at(2, 40), at(3, 500)], { x: 0, y: 0 });
    expect([...state.hitByCurrent].sort()).toEqual([1, 2]);
    state.rebound(0, -1, 200, 400);
    expect(state.hitByCurrent.size).toBe(0);
  });
});

describe('VRM-12: o toque continua 1 vez por orbe', () => {
  it('o alvo tocado antes do rebote não leva outro toque depois dele', () => {
    const state = new RedOrbState(0, 1, CFG);
    expect(state.hitTest(at(1, 10), 0)?.damage).toBe(20);
    state.rebound(0, -1, 200, 400);
    expect(state.hitTest(at(1, 10), 0)).toBeNull();
    expect(state.hitTest(at(2, -10), 0)?.damage).toBe(20);
  });

  it('o alvo tocado fica fora da explosão do mesmo trecho, mas a do trecho seguinte o pega', () => {
    const state = new RedOrbState(0, 1, CFG);
    state.hitTest(at(1, 10), 0);
    expect(state.detonationTargets([at(1, 10)], { x: 0, y: 0 })).toEqual([]);
    state.rebound(0, -1, 200, 400);
    expect(state.detonationTargets([at(1, 10)], { x: 0, y: 0 })).toHaveLength(1);
  });
});

describe('VRM-14: hover para o voo sem detonar', () => {
  it('parado no ar, o update não anda nem detona, até o detonate', () => {
    const state = new RedOrbState(0, 1, CFG);
    state.update(400);
    state.hover();
    expect(state.hovering).toBe(true);
    expect(state.update(5000)).toBe(false);
    expect(state.x).toBeCloseTo(160, 5);
    expect(state.detonated).toBe(false);

    state.detonate();
    expect(state.detonated).toBe(true);
  });

  it('pairar no fim do alcance não vira detonação', () => {
    const state = new RedOrbState(0, 1, CFG);
    state.update(799);
    state.hover();
    expect(state.update(100)).toBe(false);
    expect(state.detonated).toBe(false);
  });

  it('o rebote solta o orbe que pairava', () => {
    const state = new RedOrbState(0, 1, CFG);
    state.hover();
    state.rebound(0, 1, 200, 400);
    expect(state.hovering).toBe(false);
    state.update(250);
    expect(state.x).toBeCloseTo(100, 5);
  });
});

describe('VRM-04: a repulsão usa o dano passado', () => {
  const origin = { x: 0, y: 0 };

  it('repulseTargets leva o dano da conjuração (4, 5, 5 e 6 pela Potência)', () => {
    for (const damage of [4, 5, 6]) {
      expect(repulseTargets(origin, 1, [at(1, 40)], damage).map((h) => h.damage)).toEqual([damage]);
    }
  });

  it('repulseTargetsFor repassa o dano e segue sem o chefe', () => {
    const hits = repulseTargetsFor(
      origin,
      1,
      [
        { ...at(1, 10), kind: 'boss' },
        { ...at(2, 40), kind: 'enemy' },
      ],
      6,
    );
    expect(hits.map((h) => [h.targetId, h.damage])).toEqual([[2, 6]]);
  });

  it('sem dano, os 4 da base', () => {
    expect(repulseTargets(origin, 1, [at(1, 40)])[0]?.damage).toBe(4);
    expect(repulseTargetsFor(origin, 1, [{ ...at(1, 40), kind: 'enemy' }])[0]?.damage).toBe(4);
  });
});
