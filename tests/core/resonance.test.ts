import { describe, expect, it } from 'vitest';
import { ResonanceState, nailHeights, resonanceStats, type ResTarget, type WallProbe } from '../../src/core/resonance';
import { Rng } from '../../src/core/rng';
import { ORIGIN, build, tgt, throwAndLand } from './resonanceFixtures';

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
    expect(r.nextTap).toBe('none'); // pregos no ar, nada cravado ainda
    const events = r.update(400, [tgt(1, 50), tgt(2, 100)]);
    expect(r.nextTap).toBe('detonate');
    expect(events).toEqual([
      { type: 'nail', targetId: 1, damage: 3, band: 'micro', point: { x: 40, y: -18 } },
      { type: 'nail', targetId: 1, damage: 3, band: 'micro', point: { x: 40, y: 0 } },
      { type: 'nail', targetId: 1, damage: 3, band: 'micro', point: { x: 40, y: 18 } },
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
    expect(r.nailsView.map((n) => `${n.x},${n.y},${n.dir}`)).toEqual(['36,-18,1', '36,0,1', '36,18,1']);
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

  it('o prego voa 320 px: a caixa que começa em 320 é cravada, a que começa em 321 não', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    expect(r.update(400, [tgt(1, 330)])).toHaveLength(3);
    const s = new ResonanceState(build());
    s.throwNails(ORIGIN, 1);
    expect(s.update(400, [tgt(1, 331)])).toEqual([]);
    expect(s.phase).toBe('cooldown');
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

  it('cada alvo detona uma vez: a marca do 2º abate não volta para quem já detonou', () => {
    // 1 morre e passa a 2 (70 px); 2 morre com 1 a 70 px e 3 a 90 px: a marca vai para 3
    const f = (): ResTarget[] => [tgt(1, 50, { hp: 10 }), tgt(2, -20, { hp: 5 }), tgt(3, -110)];
    const r = new ResonanceState(build({ propagacao: 3 }));
    throwAndLand(r, f());
    expect(r.detonate(f())?.hits.map((h) => [h.targetId, h.marks, h.propagated])).toEqual([
      [1, 3, false],
      [2, 1, true],
      [3, 1, true],
    ]);
  });

  it('o vizinho marcado que ainda não detonou recebe +1 marca na mesma detonação', () => {
    // o prego de cima crava em 1 (caixa de y −70 a −10), os outros dois em 2; centros a 64 px
    const f = (): ResTarget[] => [tgt(1, 50, { y: -40, hp: 10 }), tgt(2, 100)];
    const r = new ResonanceState(build({ propagacao: 2 }));
    throwAndLand(r, f());
    expect(r.detonate(f())?.hits).toEqual([
      { targetId: 1, damage: 20, marks: 1, killed: true, propagated: false, band: 'normal' },
      { targetId: 2, damage: 60, marks: 3, killed: false, propagated: false, band: 'normal' },
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
    expect(r.onTargetDied({ id: 1, center: { x: 50, y: 0 } }, [tgt(2, 50)])).toBeNull(); // vivo no mesmo ponto
    expect(r.totalMarks).toBe(0);
  });

  it('o vivo fora do raio não herda: as marcas morrem junto', () => {
    const r = new ResonanceState(build({ propagacao: 3 }));
    throwAndLand(r, [tgt(1, 50)]);
    expect(r.onTargetDied({ id: 1, center: { x: 50, y: 0 } }, [tgt(2, 151)])).toBeNull(); // 101 px
    expect(r.totalMarks).toBe(0);
  });

  it('morto sem marca não propaga nada', () => {
    const r = new ResonanceState(build({ propagacao: 3 }));
    expect(r.onTargetDied({ id: 9, center: ORIGIN }, [tgt(2, 10)])).toBeNull();
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

  it('com Rng, o leque sai do regular, e o 1º toque usa o Rng recebido', () => {
    const jittered = nailHeights(6, 0, new Rng(7));
    expect(jittered).not.toEqual(nailHeights(6, 0));
    const r = new ResonanceState(build({ pregos: 3 }));
    r.throwNails(ORIGIN, 1, new Rng(7));
    expect(r.nailsView.map((n) => n.y)).toEqual(jittered);
  });
});

describe('RES-13: o prego para na parede', () => {
  /** Parede vertical em x = `at`, vista pela sonda do adaptador. */
  const wallAt =
    (at: number): WallProbe =>
    (from, dir, maxDist) => {
      const d = (at - from.x) * dir;
      return d >= 0 && d <= maxDist ? d : null;
    };

  it('a parede antes do alvo derruba os pregos ali; sem marca, a janela fecha', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    const events = r.update(400, [tgt(1, 50)], wallAt(30));
    expect(events.map((e) => e.type === 'nailBlocked' && `${e.point.x},${e.point.y}`)).toEqual([
      '30,-18',
      '30,0',
      '30,18',
    ]);
    expect(r.totalMarks).toBe(0);
    expect(r.phase).toBe('cooldown');
  });

  it('o alvo antes da parede é cravado', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    r.update(400, [tgt(1, 50)], wallAt(70));
    expect(r.marksOn(1)).toBe(3);
  });
});

describe('RES-14: o 2º toque com os pregos no ar e nada cravado não detona', () => {
  it('devolve null, os pregos seguem e cravam depois', () => {
    const r = new ResonanceState(build());
    r.throwNails(ORIGIN, 1);
    r.update(20, [tgt(1, 100)]);
    expect(r.detonate([tgt(1, 100)])).toBeNull();
    expect(r.nailsInFlight).toBe(3);
    expect(r.phase).toBe('armed');
    r.update(200, [tgt(1, 100)]);
    expect(r.detonate([tgt(1, 100)])?.hits).toHaveLength(1);
  });
});

describe('TRL-06: abate na detonação com Recarga no 3 corta 30% da recarga', () => {
  it('1500 vira 1050 com abate; sem abate, ou sem o teto, a recarga é inteira', () => {
    const kill = new ResonanceState(build({ recarga: 3 }));
    throwAndLand(kill, [tgt(1, 50)]);
    kill.detonate([tgt(1, 50, { hp: 10 })]);
    expect(kill.cooldownLeftMs).toBe(1050);
    const noKill = new ResonanceState(build({ recarga: 3 }));
    throwAndLand(noKill, [tgt(1, 50)]);
    noKill.detonate([tgt(1, 50)]);
    expect(noKill.cooldownLeftMs).toBe(1500);
    const base = new ResonanceState(build({ recarga: 2 }));
    throwAndLand(base, [tgt(1, 50)]);
    base.detonate([tgt(1, 50, { hp: 10 })]);
    expect(base.cooldownLeftMs).toBe(1900);
  });
});
