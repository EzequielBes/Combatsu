import { describe, expect, it } from 'vitest';
import { RED_AXES } from '../../src/data/techAxes';
import { axisAt } from '../../src/core/axisRule';
import {
  ContidoHold,
  detonationMul,
  pickRebound,
  pushVelocity,
  RedField,
  redPlan,
  shardTargets,
  shouldRebound,
  speedAfter,
  type RedTarget,
} from '../../src/core/redBranch';

/** Alvo 20×20 com o centro em (cx, cy). */
const at = (id: number, cx: number, cy = 0, kind?: 'boss'): RedTarget => ({
  id,
  box: { x: cx - 10, y: cy - 10, width: 20, height: 20 },
  ...(kind ? { kind } : {}),
});

describe('VRM-08: estilhaço da Perfuração', () => {
  const passed = at(1, 0);
  const others = [at(2, 59), at(3, 60), at(4, 61), at(5, -30)];
  const count = (points: number) => axisAt(RED_AXES.perfuracao.shardNeighbors, points);

  it('1, 2 e 2 vizinhos com 1, 2 e 3 pontos, o mais perto primeiro, a 59 e 60 px sim e a 61 não', () => {
    expect(shardTargets(passed, others, count(1), new Set())).toEqual([5]);
    expect(shardTargets(passed, others, count(2), new Set())).toEqual([5, 2]);
    expect(shardTargets(passed, others, count(3), new Set())).toEqual([5, 2]);
    expect(shardTargets(passed, [at(2, 59), at(3, 60), at(4, 61)], 3, new Set())).toEqual([2, 3]);
    expect(count(0)).toBe(0);
    expect(shardTargets(passed, others, count(0), new Set())).toEqual([]);
  });

  it('cada inimigo leva um estilhaço por conjuração e o atravessado nunca leva', () => {
    const hit = new Set<number>();
    expect(shardTargets(passed, [passed, ...others], 2, hit)).toEqual([5, 2]);
    expect(shardTargets(at(9, 40), [passed, ...others], 2, hit)).toEqual([3, 4]);
    expect(shardTargets(at(9, 40), [passed, ...others], 2, hit)).toEqual([1]);
    expect([...hit].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('o chefe não leva estilhaço e o empate vai ao menor id', () => {
    expect(shardTargets(passed, [at(8, 30), at(7, -30), at(6, 10, 0, 'boss')], 1, new Set())).toEqual([7]);
  });
});

describe('VRM-09, VRM-12.3, VRM-12.5: rebote', () => {
  const point = { x: 0, y: 0 };

  it('alvo a 199 e 200 px do ponto serve; a 201 não', () => {
    expect(pickRebound(point, 1, [at(2, -199)], new Set(), 0).targetId).toBe(2);
    expect(pickRebound(point, 1, [at(2, -200)], new Set(), 0).targetId).toBe(2);
    expect(pickRebound(point, 1, [at(2, -201)], new Set(), 0).targetId).toBeNull();
  });

  it('alvo a 319 e 320 px do player serve; a 321 não', () => {
    expect(pickRebound(point, 1, [at(2, 150)], new Set(), -169).targetId).toBe(2);
    expect(pickRebound(point, 1, [at(2, 150)], new Set(), -170).targetId).toBe(2);
    expect(pickRebound(point, 1, [at(2, 150)], new Set(), -171).targetId).toBeNull();
  });

  it('fica fora quem a detonação já atingiu, o mais perto vence e a direção vai até ele', () => {
    const cs = [at(2, 30), at(3, -80), at(4, 120)];
    expect(pickRebound(point, 1, cs, new Set([2]), 0)).toEqual({ targetId: 3, dir: -1 });
    expect(pickRebound(point, -1, cs, new Set([2, 3]), 0)).toEqual({ targetId: 4, dir: 1 });
  });

  it('sem alvo volta na direção horizontal oposta', () => {
    expect(pickRebound(point, 1, [], new Set(), 0)).toEqual({ targetId: null, dir: -1 });
    expect(pickRebound(point, -1, [at(2, 300)], new Set(), 0)).toEqual({ targetId: null, dir: 1 });
  });

  it('chefe primeiro conta como a 1ª e o rebote procura um comum', () => {
    const boss = at(9, 20, 0, 'boss');
    expect(detonationMul(1)).toBe(1);
    expect(pickRebound(point, 1, [boss, at(2, -90)], new Set(), 0)).toEqual({ targetId: 2, dir: -1 });
    expect(pickRebound(point, 1, [boss], new Set(), 0).targetId).toBeNull();
  });
});

describe('VRM-12: Ricochete', () => {
  const plan = redPlan('ricochete', false);

  it('detona no 1º inimigo e rebate uma vez, só de contato', () => {
    expect(plan.pierce).toBe(false);
    expect(plan.maxRebounds).toBe(1);
    for (const site of ['enemy', 'wall', 'floor', 'boss'] as const) expect(shouldRebound(plan, 1, site)).toBe(true);
    expect(shouldRebound(plan, 1, 'end')).toBe(false);
    expect(shouldRebound(plan, 2, 'enemy')).toBe(false);
    expect(plan.pctOnDetonation(1)).toBe(false);
    expect(plan.field).toBe(false);
  });

  it('1ª detonação 1,0 e as seguintes 0,7', () => {
    expect([1, 2, 3, 4].map(detonationMul)).toEqual([1, 0.7, 0.7, 0.7]);
  });
});

describe('VRM-13: Fliperama', () => {
  const plan = redPlan('ricochete', true);

  it('3 rebotes em qualquer alvo, a parede conta como rebote e o fim do voo também rebate', () => {
    expect(plan.maxRebounds).toBe(3);
    expect(shouldRebound(plan, 1, 'wall')).toBe(true);
    expect(shouldRebound(plan, 2, 'end')).toBe(true);
    expect(shouldRebound(plan, 3, 'floor')).toBe(true);
    expect(shouldRebound(plan, 4, 'enemy')).toBe(false);
  });

  it('+15% de velocidade por detonação e o componente proporcional só na 3ª', () => {
    expect(speedAfter(0, 760)).toBe(760);
    expect(speedAfter(1, 760)).toBeCloseTo(874, 6);
    expect(speedAfter(3, 760)).toBeCloseTo(760 * 1.15 ** 3, 6);
    expect([1, 2, 3, 4].map(plan.pctOnDetonation)).toEqual([false, false, true, false]);
  });
});

describe('Sem ramo, Contido e Vermelho Máximo', () => {
  it('sem ramo é o orbe de hoje', () => {
    const plan = redPlan(null, false);
    expect(plan).toMatchObject({ pierce: true, maxRebounds: 0, holdable: false, radiusMul: 1, field: false });
    expect(shouldRebound(plan, 1, 'enemy')).toBe(false);
  });

  it('Contido segura, atravessa e não rebate; o Máximo deixa o campo e dá o proporcional em toda detonação', () => {
    const contido = redPlan('contido', false);
    expect(contido).toMatchObject({ pierce: true, maxRebounds: 0, holdable: true, radiusMul: 1.4, field: false });
    expect(contido.pctOnDetonation(1)).toBe(false);
    const maximo = redPlan('contido', true);
    expect(maximo).toMatchObject({ holdable: true, radiusMul: 1.4, field: true, maxRebounds: 0 });
    expect([1, 2].map(maximo.pctOnDetonation)).toEqual([true, true]);
  });
});

describe('VRM-14: ContidoHold', () => {
  // 760 px/s: os 320 px acabam em ~421 ms.
  it('voa, paira no fim dos 320 px e detona aos 1200 ms', () => {
    const hold = new ContidoHold(true, 760, 320);
    expect(hold.update(400, true)).toBe('fly');
    expect(hold.update(22, true)).toBe('hover');
    expect(hold.update(777, true)).toBe('hover'); // 1199 ms
    expect(hold.update(1, true)).toBe('detonate'); // 1200 ms
    expect(hold.update(16, true)).toBe('detonate');
  });

  it('detona ao soltar, em voo ou pairando', () => {
    const flying = new ContidoHold(true, 760, 320);
    expect(flying.update(100, true)).toBe('fly');
    expect(flying.update(16, false)).toBe('detonate');
    const hovering = new ContidoHold(true, 760, 320);
    expect(hovering.update(600, true)).toBe('hover');
    expect(hovering.update(16, false)).toBe('detonate');
  });

  it('nasce solto e voa normal, mesmo segurando depois e passando de 1200 ms', () => {
    const hold = new ContidoHold(false, 760, 320);
    expect(hold.armed).toBe(false);
    expect(hold.update(16, false)).toBe('fly');
    expect(hold.update(2000, true)).toBe('fly');
  });
});

describe('VRM-15: campo do Vermelho Máximo', () => {
  it('6 tiques de 200 ms em 1200 ms e acaba no fim', () => {
    const field = new RedField({ x: 0, y: 0 }, 96);
    let ticks = 0;
    let ended = false;
    let frames = 0;
    while (!ended && frames < 1000) {
      const r = field.update(16);
      ticks += r.ticks;
      ended = r.ended;
      frames++;
    }
    expect(ticks).toBe(6);
    expect(frames).toBe(75);
    expect(field.update(500)).toEqual({ ticks: 0, ended: true });
  });

  it('tique em 200 ms, não em 199', () => {
    const field = new RedField({ x: 0, y: 0 }, 96);
    expect(field.update(199)).toEqual({ ticks: 0, ended: false });
    expect(field.update(1)).toEqual({ ticks: 1, ended: false });
    expect(field.update(999)).toEqual({ ticks: 4, ended: false });
    expect(field.update(1)).toEqual({ ticks: 1, ended: true });
  });

  it('cobre pelo raio e empurra para fora a 150 px/s', () => {
    const field = new RedField({ x: 0, y: 0 }, 96);
    expect(field.covers(at(1, 106).box)).toBe(true);
    expect(field.covers(at(1, 107).box)).toBe(false);
    expect(pushVelocity({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ x: 90, y: 120 });
    expect(pushVelocity({ x: 0, y: 0 }, { x: -10, y: 0 })).toEqual({ x: -150, y: 0 });
  });
});
