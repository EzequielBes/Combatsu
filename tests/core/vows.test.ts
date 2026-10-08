import { describe, expect, it } from 'vitest';
import { drawVows, vowEffects, Vows } from '../../src/core/vows';
import { Rng } from '../../src/core/rng';
import { VOW_IDS, type VowId } from '../../src/data/vows';

describe('votos tomados (VOW-05, VOW-08)', () => {
  it('cada voto entra uma vez; reset limpa', () => {
    const vows = new Vows();
    expect(vows.take('furia')).toBe(true);
    expect(vows.take('furia')).toBe(false);
    expect(vows.list).toEqual(['furia']);
    vows.reset();
    expect(vows.list).toEqual([]);
    expect(vows.has('furia')).toBe(false);
  });
});

describe('sorteio do painel (VOW-05, VOW-06, VOW-07)', () => {
  it('3 votos distintos e nenhum já tomado, em 200 seeds', () => {
    const taken: VowId[] = ['corpoDeVidro', 'semGuarda'];
    for (let seed = 0; seed < 200; seed++) {
      const offers = drawVows(new Rng(seed), taken);
      expect(offers).toHaveLength(3);
      expect(new Set(offers).size).toBe(3);
      for (const id of offers) expect(taken).not.toContain(id);
    }
  });

  it('com 2 restantes oferece os 2; com 1, o 1; com 0, nada', () => {
    const left = (n: number): VowId[] => VOW_IDS.slice(0, VOW_IDS.length - n);
    expect(drawVows(new Rng(1), left(2)).sort()).toEqual(VOW_IDS.slice(-2).sort());
    expect(drawVows(new Rng(1), left(1))).toEqual(VOW_IDS.slice(-1));
    expect(drawVows(new Rng(1), left(0))).toEqual([]);
  });

  it('mesma seed e mesmos tomados dão o mesmo sorteio; seeds diferentes variam', () => {
    expect(drawVows(new Rng(42), ['furia'])).toEqual(drawVows(new Rng(42), ['furia']));
    const all = new Set(Array.from({ length: 30 }, (_, s) => drawVows(new Rng(s), []).join(',')));
    expect(all.size).toBeGreaterThan(1);
  });

  it('o catálogo tem os 8 votos da spec', () => {
    expect(VOW_IDS).toHaveLength(8);
  });
});

describe('efeitos dos votos (VOW-10..18)', () => {
  const none = vowEffects([], { kills: 0 });

  it('sem voto, nada muda', () => {
    expect(none).toEqual({
      maxHpMul: 1,
      damageMul: 1,
      heavyMul: 1,
      meleeMul: 1,
      techDamageMul: 1,
      techCostMul: 1,
      guardOff: false,
      rctOff: false,
      rctHealMul: 1,
      rctBelow: null,
      fragmentMul: 1,
      damageTakenMul: 1,
      regenOff: false,
    });
  });

  it('VOW-10 Corpo de vidro: vida máxima ×0,6 e todo dano ×1,35', () => {
    expect(vowEffects(['corpoDeVidro'], { kills: 0 })).toEqual({ ...none, maxHpMul: 0.6, damageMul: 1.35 });
  });

  it('VOW-11 Sem guarda: sem guarda e golpe forte ×1,6', () => {
    expect(vowEffects(['semGuarda'], { kills: 0 })).toEqual({ ...none, guardOff: true, heavyMul: 1.6 });
  });

  it('VOW-12 Pacto do feiticeiro: corpo a corpo ×0,7 e técnica ×1,5', () => {
    expect(vowEffects(['pactoDoFeiticeiro'], { kills: 0 })).toEqual({ ...none, meleeMul: 0.7, techDamageMul: 1.5 });
  });

  it('VOW-13 Fluxo selado: custo de técnica ×0,6 e a Reversa não cura', () => {
    expect(vowEffects(['fluxoSelado'], { kills: 0 })).toEqual({ ...none, techCostMul: 0.6, rctOff: true });
  });

  it('VOW-14 Cura proibida: Reversa ×2, só abaixo de 30% da vida', () => {
    expect(vowEffects(['curaProibida'], { kills: 0 })).toEqual({ ...none, rctHealMul: 2, rctBelow: 0.3 });
  });

  it('VOW-15 Ganância: fragmentos ×1,6 e dano sofrido ×1,25', () => {
    expect(vowEffects(['ganancia'], { kills: 0 })).toEqual({ ...none, fragmentMul: 1.6, damageTakenMul: 1.25 });
  });

  it('VOW-16 Fúria: +3% por abate até +45%, sem regeneração (0, 1, 15 e 16 abates)', () => {
    const at = (kills: number): number => vowEffects(['furia'], { kills }).damageMul;
    expect(at(0)).toBe(1);
    expect(at(1)).toBeCloseTo(1.03, 9);
    expect(at(15)).toBeCloseTo(1.45, 9);
    expect(at(16)).toBeCloseTo(1.45, 9);
    expect(vowEffects(['furia'], { kills: 3 }).regenOff).toBe(true);
  });

  it('VOW-17 Pele de pedra: dano sofrido ×0,7 e todo dano ×0,8', () => {
    expect(vowEffects(['peleDePedra'], { kills: 0 })).toEqual({ ...none, damageTakenMul: 0.7, damageMul: 0.8 });
  });

  it('VOW-18 votos no mesmo número multiplicam', () => {
    const fx = vowEffects(['corpoDeVidro', 'peleDePedra', 'ganancia'], { kills: 0 });
    expect(fx.damageMul).toBeCloseTo(1.35 * 0.8, 9);
    expect(fx.damageTakenMul).toBeCloseTo(1.25 * 0.7, 9);
    expect(vowEffects(['corpoDeVidro', 'furia'], { kills: 10 }).damageMul).toBeCloseTo(1.35 * 1.3, 9);
  });
});
