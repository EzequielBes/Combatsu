import { describe, expect, it } from 'vitest';
import {
  ResonanceState,
  nailHeights,
  resonanceStats,
  type ResTarget,
  type ResonanceBuild,
} from '../../src/core/resonance';
import { Rng } from '../../src/core/rng';
import type { ResonanceAxisId, ResonanceBranchId } from '../../src/data/resonance';

const ZERO: Record<ResonanceAxisId, number> = {
  pregos: 0,
  detonacao: 0,
  marca: 0,
  propagacao: 0,
  eficiencia: 0,
  recarga: 0,
};
const build = (
  axes: Partial<Record<ResonanceAxisId, number>> = {},
  branch: ResonanceBranchId | null = null,
): ResonanceBuild => ({ axes: { ...ZERO, ...axes }, branch });

/** Alvo de 20×60 com centro em (x, y). */
const tgt = (id: number, x: number, o: Partial<Omit<ResTarget, 'id' | 'box'>> & { y?: number } = {}): ResTarget => ({
  id,
  kind: o.kind ?? 'enemy',
  box: { x: x - 10, y: (o.y ?? 0) - 30, width: 20, height: 60 },
  hp: o.hp ?? 1000,
  maxHp: o.maxHp ?? 1000,
});

const ORIGIN = { x: 0, y: 0 };

/** Lança e deixa os pregos voarem até cravar ou cair. */
function throwAndLand(r: ResonanceState, targets: ResTarget[], facing: 1 | -1 = 1) {
  r.throwNails(ORIGIN, facing);
  return r.update(400, targets);
}

describe('RES-01: números base', () => {
  it('3 pregos, 20 por marca, marca 6 s, sem propagação, custo 25, recarga 3000', () => {
    expect(resonanceStats(build())).toMatchObject({
      level: 1,
      nails: 3,
      detonationDamage: 20,
      markMs: 6000,
      propagationPx: 0,
      cost: 25,
      cooldownMs: 3000,
      branch: null,
      awakened: false,
    });
  });
});

describe('RES-02: cada eixo no 3', () => {
  it.each([
    ['pregos', { nails: 6 }],
    ['detonacao', { detonationDamage: 44 }],
    ['marca', { markMs: 12000 }],
    ['propagacao', { propagationPx: 100 }],
    ['eficiencia', { cost: 15 }],
    ['recarga', { cooldownMs: 1500 }],
  ] as const)('%s', (axis, expected) => {
    expect(resonanceStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });
});

describe('RES-03: o 1º toque crava os pregos', () => {
  it('cada prego crava no 1º alvo do caminho, dá 3 micro e marca', () => {
    const r = new ResonanceState(build());
    expect(r.nextTap).toBe('throw');
    expect(r.throwNails(ORIGIN, 1)).toEqual({ cost: 25 });
    expect(r.nextTap).toBe('detonate');
    const events = r.update(400, [tgt(1, 50), tgt(2, 100)]);
    expect(events).toEqual([
      { type: 'nail', targetId: 1, damage: 3, band: 'micro' },
      { type: 'nail', targetId: 1, damage: 3, band: 'micro' },
      { type: 'nail', targetId: 1, damage: 3, band: 'micro' },
    ]);
    expect(r.marksOn(1)).toBe(3);
    expect(r.marksOn(2)).toBe(0);
    expect(r.nailsInFlight).toBe(0);
  });

  it('o prego anda 900 px/s: em 50 ms ainda não chega a 50 px', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    expect(r.update(40, [tgt(1, 60)])).toEqual([]); // 36 px, a caixa começa em 50
    expect(r.nailsInFlight).toBe(3);
    expect(r.update(20, [tgt(1, 60)])).toHaveLength(3); // 54 px
  });

  it('cada prego acerta quem está na altura dele', () => {
    const r = new ResonanceState(build());
    // alvo baixo só pega o prego de baixo (y = 18): caixa de y 10 a 70
    throwAndLand(r, [tgt(1, 50, { y: 40 }), tgt(2, 150)]);
    expect(r.marksOn(1)).toBe(1);
    expect(r.marksOn(2)).toBe(2);
  });

  it('olhando para a esquerda, crava à esquerda', () => {
    const r = new ResonanceState(build());
    throwAndLand(r, [tgt(1, 50), tgt(2, -80)], -1);
    expect(r.marksOn(2)).toBe(3);
  });

  it('a marca dura o stat e some sozinha', () => {
    const r = new ResonanceState(build({ marca: 1 }));
    throwAndLand(r, [tgt(1, 50)]);
    r.update(7999, []);
    expect(r.marksOn(1)).toBe(3);
    r.update(1, []);
    expect(r.marksOn(1)).toBe(0);
  });

  it('fora da fase de lançar, o toque não lança', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    expect(r.throwNails(ORIGIN, 1)).toBeNull();
  });
});

describe('RES-04: o 2º toque detona', () => {
  it('dano por marca, limpa as marcas e começa a recarga', () => {
    const r = new ResonanceState(build({ detonacao: 3 }));
    throwAndLand(r, [tgt(1, 50, { y: 40 }), tgt(2, 150)]);
    const d = r.detonate([tgt(1, 50, { y: 40 }), tgt(2, 150)]);
    expect(d).toEqual({
      hits: [
        { targetId: 1, damage: 44, marks: 1, killed: false, propagated: false, band: 'normal' },
        { targetId: 2, damage: 88, marks: 2, killed: false, propagated: false, band: 'normal' },
      ],
      crown: null,
    });
    expect(r.totalMarks).toBe(0);
    expect(r.phase).toBe('cooldown');
    expect(r.nextTap).toBe('none');
    r.update(2999, []);
    expect(r.nextTap).toBe('none');
    r.update(1, []);
    expect(r.nextTap).toBe('throw');
  });

  it('marcado que não está mais vivo fica de fora; quem a detonação mata sai com `killed`', () => {
    const r = new ResonanceState(build());
    throwAndLand(r, [tgt(1, 50)]);
    expect(r.detonate([])).toEqual({ hits: [], crown: null });
    const s = new ResonanceState(build());
    throwAndLand(s, [tgt(1, 50)]);
    expect(s.detonate([tgt(1, 50, { hp: 60 })])?.hits[0]).toMatchObject({ damage: 60, killed: true });
  });

  it('detonar fora da fase armada devolve null', () => {
    expect(new ResonanceState(build()).detonate([tgt(1, 50)])).toBeNull();
  });
});

describe('RES-05: a janela fecha sem nada vivo', () => {
  it('todos os pregos erram: ao cair (320 px), começa a recarga', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    r.update(300, [tgt(1, 400)]); // 270 px
    expect(r.phase).toBe('armed');
    r.update(100, [tgt(1, 400)]);
    expect(r.nailsInFlight).toBe(0);
    expect(r.phase).toBe('cooldown');
    expect(r.cooldownLeftMs).toBe(3000);
  });

  it('as marcas vencem: a janela fecha', () => {
    const r = new ResonanceState(build());
    throwAndLand(r, [tgt(1, 50)]);
    r.update(6000, []);
    expect(r.phase).toBe('cooldown');
  });
});

describe('RES-06: propagação ao matar na detonação', () => {
  const field = (): ResTarget[] => [tgt(1, 50, { hp: 10 }), tgt(2, -50, { hp: 5 }), tgt(3, -130), tgt(4, -400)];

  it('o abate passa 1 marca ao vivo mais perto no raio, que detona na mesma cascata', () => {
    const r = new ResonanceState(build({ propagacao: 3 }));
    throwAndLand(r, field());
    const d = r.detonate(field());
    expect(d?.hits).toEqual([
      { targetId: 1, damage: 60, marks: 3, killed: true, propagated: false, band: 'normal' },
      { targetId: 2, damage: 20, marks: 1, killed: true, propagated: true, band: 'normal' }, // 100 px de 1
      { targetId: 3, damage: 20, marks: 1, killed: false, propagated: true, band: 'normal' }, // 80 px de 2
    ]);
  });

  it('com propagação 0, ninguém herda marca', () => {
    const r = new ResonanceState(build());
    throwAndLand(r, field());
    expect(r.detonate(field())?.hits.map((h) => h.targetId)).toEqual([1]);
  });

  it('o raio limita: com 40 px, o vizinho a 100 px fica de fora', () => {
    const r = new ResonanceState(build({ propagacao: 1 }));
    throwAndLand(r, field());
    expect(r.detonate(field())?.hits.map((h) => h.targetId)).toEqual([1]);
  });
});

describe('RES-07: propagação ao matar por outra fonte', () => {
  it('as marcas do morto pulam inteiras para o vivo mais perto no raio', () => {
    const r = new ResonanceState(build({ propagacao: 3 }));
    throwAndLand(r, [tgt(1, 50)]);
    expect(r.onTargetDied({ id: 1, center: { x: 50, y: 0 } }, [tgt(2, -45), tgt(3, 140)])).toEqual({
      toId: 3,
      marks: 3,
    });
    expect(r.marksOn(1)).toBe(0);
    expect(r.marksOn(3)).toBe(3);
  });

  it('sem propagação, as marcas morrem junto', () => {
    const r = new ResonanceState(build());
    throwAndLand(r, [tgt(1, 50)]);
    expect(r.onTargetDied({ id: 1, center: { x: 50, y: 0 } }, [tgt(2, 60)])).toBeNull();
    expect(r.totalMarks).toBe(0);
  });

  it('morto sem marca não propaga nada', () => {
    const r = new ResonanceState(build({ propagacao: 3 }));
    expect(r.onTargetDied({ id: 9, center: ORIGIN }, [tgt(2, 10)])).toBeNull();
  });
});

describe('RES-08: Grampo', () => {
  it('cada prego explode ao cravar: 6 micro em 32 px do ponto', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'grampo')); // 4 pregos: y −18, −6, 6, 18
    const above = { ...tgt(5, 40), box: { x: 30, y: -80, width: 20, height: 30 } }; // fundo em y −50
    const events = throwAndLand(r, [tgt(1, 50), above]);
    expect(events).toHaveLength(8);
    expect(events[1]).toEqual({
      type: 'grampo',
      center: { x: 40, y: -18 },
      hits: [
        { targetId: 1, damage: 6, band: 'micro' },
        { targetId: 5, damage: 6, band: 'micro' }, // 32 px acima do ponto
      ],
    });
    expect(events[3]).toMatchObject({ type: 'grampo', hits: [{ targetId: 1 }] }); // y −6: 44 px do vizinho
  });

  it('sem o ramo, o prego não explode', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'boneco'));
    expect(throwAndLand(r, [tgt(1, 50)]).every((e) => e.type === 'nail')).toBe(true);
  });
});

describe('RES-09: Boneco', () => {
  it('o chefe detonado toma um eco de 50% 250 ms depois; o comum não', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'boneco'));
    const field = [tgt(1, 50, { kind: 'boss' }), tgt(2, -50)];
    throwAndLand(r, field);
    r.detonate(field);
    expect(r.update(249, field)).toEqual([]);
    expect(r.update(1, field)).toEqual([{ type: 'echo', targetId: 1, damage: 40, band: 'micro' }]);
    expect(r.update(1000, field)).toEqual([]);
  });

  it('com o Grampo, nada de eco', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'grampo'));
    const field = [tgt(1, 50, { kind: 'boss' })];
    throwAndLand(r, field);
    r.detonate(field);
    expect(r.update(250, field).some((e) => e.type === 'echo')).toBe(false);
  });
});

describe('RES-10: Coroa de Pregos (Despertar do Grampo)', () => {
  const awake = (): ResonanceState => new ResonanceState(build({ pregos: 3, detonacao: 1 }, 'grampo'));

  it('5+ marcas na mesma detonação: 2ª detonação no centro do grupo, 1 marca + 4% (chefe 1%)', () => {
    const r = awake();
    expect(r.stats).toMatchObject({ level: 5, awakened: true });
    const field = [tgt(1, 50), tgt(2, -20, { kind: 'boss', maxHp: 2000 }), tgt(3, -200)];
    throwAndLand(r, field); // 6 pregos no alvo 1
    const d = r.detonate(field);
    expect(d?.crown).toEqual({
      center: { x: 50, y: 0 },
      hits: [
        { targetId: 1, damage: 28 + 40, band: 'normal' },
        { targetId: 2, damage: 28 + 20, band: 'normal' }, // caixa a 60 px do centro
      ],
    });
  });

  it('quem a 1ª detonação matou fica fora da coroa', () => {
    const r = awake();
    throwAndLand(r, [tgt(1, 50)]);
    expect(r.detonate([tgt(1, 50, { hp: 10 })])?.crown?.hits).toEqual([]);
  });

  it('menos de 5 marcas, ou sem o Despertar, não há coroa', () => {
    const r = awake();
    throwAndLand(r, [tgt(1, 50, { y: 40 }), tgt(2, 150, { y: 200 })]); // 2 pregos cravam
    expect(r.detonate([tgt(1, 50, { y: 40 })])?.crown).toBeNull();
    const s = new ResonanceState(build({ pregos: 3 }, 'grampo'));
    throwAndLand(s, [tgt(1, 50)]);
    expect(s.detonate([tgt(1, 50)])?.crown).toBeNull();
  });
});

describe('RES-11: Boneco de Palha (Despertar do Boneco)', () => {
  const awake = (): ResonanceState => new ResonanceState(build({ pregos: 3, marca: 1 }, 'boneco'));
  const field = [tgt(1, 50, { kind: 'boss' }), tgt(2, -50)];

  it('por 3 s, o chefe marcado repete 50% de todo dano, com postura; o 1º eco tira 1%', () => {
    const r = awake();
    throwAndLand(r, field);
    r.detonate(field);
    expect(r.strawDollEcho(1, 30, 1000)).toEqual({ targetId: 1, damage: 15, bite: 10, poise: true, band: 'micro' });
    expect(r.strawDollEcho(1, 30, 1000)).toMatchObject({ damage: 15, bite: 0 });
    r.update(2999, field);
    expect(r.strawDollEcho(1, 9, 1000)).toMatchObject({ damage: 5 });
    r.update(1, field);
    expect(r.strawDollEcho(1, 30, 1000)).toBeNull();
  });

  it('o comum não tem janela; dano 0 não ecoa', () => {
    const r = awake();
    throwAndLand(r, field);
    r.detonate(field);
    expect(r.strawDollEcho(2, 30, 60)).toBeNull();
    expect(r.strawDollEcho(1, 0, 1000)).toBeNull();
  });

  it('sem o Despertar, não há janela', () => {
    const r = new ResonanceState(build({ pregos: 3 }, 'boneco'));
    throwAndLand(r, field);
    r.detonate(field);
    expect(r.strawDollEcho(1, 30, 1000)).toBeNull();
  });
});

describe('RES-12: leque dos pregos', () => {
  it('sem Rng, leque regular de 36 px centrado na saída', () => {
    expect(nailHeights(3, 0)).toEqual([-18, 0, 18]);
    expect(nailHeights(4, 10)).toEqual([-8, 4, 16, 28]);
    expect(nailHeights(1, 5)).toEqual([5]);
  });

  it('com Rng, cada prego desvia até 4 px, e a mesma seed repete', () => {
    const a = nailHeights(6, 0, new Rng(7));
    const b = nailHeights(6, 0, new Rng(7));
    expect(a).toEqual(b);
    nailHeights(6, 0).forEach((y, i) => expect(Math.abs(a[i] - y)).toBeLessThanOrEqual(4));
  });
});
