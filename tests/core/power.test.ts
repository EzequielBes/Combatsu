import { describe, expect, it } from 'vitest';
import { atRest, powerLook, powerPoints, powerTier, type RestState } from '../../src/core/power';

describe('powerPoints (POW-07.1)', () => {
  it('soma Força + 2 × Manoplas + 2 com o Punho Pesado', () => {
    expect(powerPoints({ forca: 0, manoplas: 0, punhoPesado: false })).toBe(0);
    expect(powerPoints({ forca: 3, manoplas: 0, punhoPesado: false })).toBe(3);
    expect(powerPoints({ forca: 0, manoplas: 2, punhoPesado: false })).toBe(4);
    expect(powerPoints({ forca: 0, manoplas: 0, punhoPesado: true })).toBe(2);
    expect(powerPoints({ forca: 5, manoplas: 3, punhoPesado: true })).toBe(13);
  });
});

describe('powerTier (POW-07.2)', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [4, 1],
    [5, 2],
    [7, 2],
    [8, 3],
    [13, 3],
  ])('%i pontos -> patamar %i', (points, tier) => {
    expect(powerTier(points)).toBe(tier);
  });

  it('a Força 5 sozinha chega ao patamar 2', () => {
    expect(powerTier(powerPoints({ forca: 5, manoplas: 0, punhoPesado: false }))).toBe(2);
  });
});

describe('powerLook (POW-08)', () => {
  it('13 pontos reportam 13 e usam p = 10 (teto)', () => {
    const look = powerLook(13);
    expect(look.points).toBe(13);
    expect(look.p).toBe(10);
    expect(look.impactScale).toBeCloseTo(1.5, 10);
    expect(look.kickPx).toBeCloseTo(7, 10);
  });

  it.each([
    [0, 1, 4, 1, 0],
    [1, 1.05, 4.3, 1.03, 0],
    [10, 1.5, 7, 1.3, 5],
  ])('p %i: escala %f, tranco %f px, força/deslize %f, rastro +%i', (p, scale, kick, mul, trail) => {
    const look = powerLook(p);
    expect(look.p).toBe(p);
    expect(look.impactScale).toBeCloseTo(scale, 10);
    expect(look.kickPx).toBeCloseTo(kick, 10);
    expect(look.forceMul).toBeCloseTo(mul, 10);
    expect(look.slideMul).toBeCloseTo(mul, 10);
    expect(look.trailBonusPx).toBe(trail);
  });

  it('rastro cresce 1 px a cada 2 pontos', () => {
    expect([2, 3, 4, 9].map((p) => powerLook(p).trailBonusPx)).toEqual([1, 1, 2, 4]);
  });

  it('hitstop por patamar: forte +0/+10/+20/+30, leve +0/+0/+5/+10', () => {
    const byTier = [0, 2, 5, 8].map((points) => powerLook(points).hitstopBonusMs);
    expect(byTier.map((h) => h.heavy)).toEqual([0, 10, 20, 30]);
    expect(byTier.map((h) => h.light)).toEqual([0, 0, 5, 10]);
  });

  it('tremor a partir do patamar 2', () => {
    expect([0, 2, 4, 5, 8].map((points) => powerLook(points).shakes)).toEqual([false, false, false, true, true]);
  });

  it('tom por patamar (POW-09): azul, azul claro, vermelho, preto e vermelho', () => {
    const keys = [0, 2, 5, 8].map((points) => {
      const t = powerLook(points).tone;
      return `${t.shadow}${t.body}${t.core}${t.altBody}${t.altCore}`;
    });
    expect(keys).toEqual(['dcCuU', 'dCwcW', 'rRwtT', 'RbRrW']);
  });

  it('o tom devolvido é uma cópia (mexer nele não muda o próximo)', () => {
    powerLook(0).tone.body = 'k';
    expect(powerLook(0).tone.body).toBe('c');
  });

  it('aura por patamar (POW-10): nada, nada, brasas, chama', () => {
    expect([0, 2, 5, 8].map((points) => powerLook(points).aura)).toEqual(['off', 'off', 'embers', 'flame']);
  });
});

describe('atRest (POW-10.14)', () => {
  const rest: RestState = {
    movePhase: 'idle',
    grounded: true,
    casting: false,
    channeling: false,
    dead: false,
    idleFrame: true,
  };

  it('parado no chão, vivo e no quadro do idle: em repouso', () => {
    expect(atRest(rest)).toBe(true);
  });

  it.each<[string, Partial<RestState>]>([
    ['andando (quadro da corrida)', { idleFrame: false }],
    ['golpeando', { movePhase: 'startup' }],
    ['no ar', { grounded: false }],
    ['castLock', { casting: true }],
    ['channeling', { channeling: true }],
    ['morto', { dead: true }],
    ['quadro fora do idle no fim do golpe', { movePhase: 'recovery', idleFrame: false }],
  ])('%s: fora do repouso', (_name, change) => {
    expect(atRest({ ...rest, ...change })).toBe(false);
  });
});
