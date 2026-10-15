import { describe, expect, it } from 'vitest';
import { bandPoiseDamage, bandStructureGain, MicroBudget, microHitstopMs } from '../../src/core/hitBand';
import type { Hit, HitBand, Strength } from '../../src/core/hit';
import { HIT_BAND_FEEL } from '../../src/data/feel';

function hit(damage: number, strength: Strength, band?: HitBand): Hit {
  return { ownerId: 1, damage, strength, direction: { x: 1, y: 0 }, force: 0, band };
}

describe('microHitstopMs (POW-03)', () => {
  it('15 ms no leve e 20 ms no forte', () => {
    expect(microHitstopMs('light')).toBe(15);
    expect(microHitstopMs('heavy')).toBe(20);
  });
});

describe('MicroBudget (POW-03, POW-14)', () => {
  it('concede 20+20+20 (60 ms) e recusa o próximo (61 ms)', () => {
    const b = new MicroBudget();
    expect(b.grant('heavy', 0)).toBe(20);
    expect(b.grant('heavy', 10)).toBe(20);
    expect(b.grant('heavy', 20)).toBe(20);
    expect(b.grant('heavy', 30)).toBe(0);
  });

  it('o leve que cabe exatamente no teto passa e o que passaria de 60 ms não', () => {
    const b = new MicroBudget();
    b.grant('heavy', 0);
    b.grant('heavy', 0);
    expect(b.grant('light', 0)).toBe(15); // 55 ms
    expect(b.grant('light', 0)).toBe(0); // seria 70 ms
  });

  it('a janela de 1000 ms: em 999 ms o primeiro ainda conta, em 1000 e 1001 já saiu', () => {
    const at999 = new MicroBudget();
    at999.grant('heavy', 0);
    at999.grant('heavy', 1);
    at999.grant('heavy', 2);
    expect(at999.grant('heavy', 999)).toBe(0);

    const at1000 = new MicroBudget();
    at1000.grant('heavy', 0);
    at1000.grant('heavy', 1);
    at1000.grant('heavy', 2);
    expect(at1000.grant('heavy', 1000)).toBe(20);
    expect(at1000.grant('heavy', 1000)).toBe(0); // os de 1 e 2 ms ainda contam

    const at1001 = new MicroBudget();
    at1001.grant('heavy', 0);
    at1001.grant('heavy', 1);
    at1001.grant('heavy', 2);
    expect(at1001.grant('heavy', 1001)).toBe(20);
    expect(at1001.grant('heavy', 1002)).toBe(20);
  });

  it('acerto recusado não ocupa a janela', () => {
    const b = new MicroBudget();
    b.grant('heavy', 0);
    b.grant('heavy', 0);
    b.grant('heavy', 0);
    expect(b.grant('heavy', 500)).toBe(0);
    expect(b.grant('heavy', 1000)).toBe(20);
  });

  it('reset libera a janela', () => {
    const b = new MicroBudget();
    b.grant('heavy', 0);
    b.grant('heavy', 0);
    b.grant('heavy', 0);
    b.reset();
    expect(b.grant('heavy', 1)).toBe(20);
  });

  it('usedMs soma o concedido na janela: em 999 ms o primeiro conta, em 1000 já saiu; recusado não entra', () => {
    const b = new MicroBudget();
    expect(b.usedMs(0)).toBe(0);
    b.grant('heavy', 0);
    b.grant('light', 10);
    b.grant('heavy', 20);
    expect(b.grant('heavy', 30)).toBe(0); // seria 75 ms
    expect(b.usedMs(30)).toBe(55);
    expect(b.usedMs(999)).toBe(55);
    expect(b.usedMs(1000)).toBe(35);
    expect(b.usedMs(1010)).toBe(20);
    expect(b.usedMs(1020)).toBe(0);
    b.reset();
    expect(b.usedMs(30)).toBe(0);
  });

  it('usa o teto e a janela do HIT_BAND_FEEL', () => {
    expect(HIT_BAND_FEEL.micro.capMs).toBe(60);
    expect(HIT_BAND_FEEL.micro.windowMs).toBe(1000);
    expect(HIT_BAND_FEEL.micro.sparkSize).toBe(10);
    expect(HIT_BAND_FEEL.chip.sparkSize).toBe(6);
  });
});

describe('bandPoiseDamage (POW-03.6)', () => {
  it('chip tira dano × chipMul', () => {
    expect(bandPoiseDamage(hit(4, 'light', 'chip'), 0.5)).toBe(2);
    expect(bandPoiseDamage(hit(4, 'heavy', 'chip'), 0.5)).toBe(2);
  });

  it('micro e normal seguem a regra de hoje: leve = dano, forte = 2 × dano', () => {
    expect(bandPoiseDamage(hit(6, 'light', 'micro'), 0.5)).toBe(6);
    expect(bandPoiseDamage(hit(6, 'heavy', 'micro'), 0.5)).toBe(12);
    expect(bandPoiseDamage(hit(6, 'light'), 0.5)).toBe(6);
    expect(bandPoiseDamage(hit(6, 'heavy'), 0.5)).toBe(12);
  });
});

describe('bandStructureGain (POW-15.8)', () => {
  it('0 no chip e metade no micro', () => {
    expect(bandStructureGain('chip', 10)).toBe(0);
    expect(bandStructureGain('micro', 10)).toBe(5);
  });
});
