import { describe, expect, it } from 'vitest';
import { ResonanceState } from '../../src/core/resonance';
import { build, tgt, throwAndLand } from './resonanceFixtures';

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

  it('o comum detonado não ganha eco', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'boneco'));
    const field = [tgt(1, 50)];
    throwAndLand(r, field);
    expect(r.detonate(field)?.hits[0]).toMatchObject({ targetId: 1, killed: false });
    expect(r.update(250, field)).toEqual([]);
  });

  it('o chefe que a detonação mata não ganha eco', () => {
    const r = new ResonanceState(build({ pregos: 1 }, 'boneco'));
    const field = [tgt(1, 50, { kind: 'boss', hp: 10 })];
    throwAndLand(r, field);
    expect(r.detonate(field)?.hits[0].killed).toBe(true);
    expect(r.update(250, field)).toEqual([]);
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
    // 4 e 5 ficam atrás do alvo 1 (os pregos param nele): caixas a 80 e a 81 px do centro
    const field = [tgt(1, 50), tgt(2, -20, { kind: 'boss', maxHp: 2000 }), tgt(3, -200), tgt(4, 140), tgt(5, 141)];
    throwAndLand(r, field); // 6 pregos no alvo 1
    const d = r.detonate(field);
    expect(d?.crown).toEqual({
      center: { x: 50, y: 0 },
      hits: [
        { targetId: 1, damage: 28 + 40, band: 'normal' },
        { targetId: 2, damage: 28 + 20, band: 'normal' }, // caixa a 60 px do centro
        { targetId: 4, damage: 28 + 40, band: 'normal' },
      ],
    });
  });

  it('4 marcas não soltam a coroa; 5 soltam', () => {
    // 6 pregos em y −18, −10,8, −3,6, 3,6, 10,8, 18
    const four = awake();
    throwAndLand(four, [tgt(1, 50, { y: -22 })]); // caixa de −52 a 8
    expect(four.totalMarks).toBe(4);
    expect(four.detonate([tgt(1, 50, { y: -22 })])?.crown).toBeNull();
    const five = awake();
    throwAndLand(five, [tgt(1, 50, { y: -15 })]); // caixa de −45 a 15
    expect(five.totalMarks).toBe(5);
    expect(five.detonate([tgt(1, 50, { y: -15 })])?.crown).not.toBeNull();
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
