import { describe, expect, it } from 'vitest';
import { NEUTRAL_DOMAIN_MODS, domainStatMods, rectsOverlap } from '../../src/core/domainEffects';

const jackpot = { id: 'jackpot' as const, level: 1 as const };

describe('NEUTRAL_DOMAIN_MODS', () => {
  it('é 1, 1, 1 e todas as travas desligadas', () => {
    expect(NEUTRAL_DOMAIN_MODS).toEqual({
      meleeMul: 1,
      costMul: 1,
      cooldownMul: 1,
      techLocked: false,
      guardPierce: false,
      nullifyProjectiles: false,
      energyLock: false,
    });
  });
});

describe('domainStatMods: Jackpot (JAC-04, JAC-05)', () => {
  it('sem Domínio ativo dá o neutro', () => {
    expect(domainStatMods(null, null)).toEqual(NEUTRAL_DOMAIN_MODS);
  });

  it('Jackpot no giro (sem efeito) dá o neutro', () => {
    expect(domainStatMods(jackpot, null)).toEqual(NEUTRAL_DOMAIN_MODS);
  });

  it('jackpot: custo 0, recarga 0 e energia travada; o resto neutro', () => {
    expect(domainStatMods(jackpot, 'jackpot')).toEqual({
      ...NEUTRAL_DOMAIN_MODS,
      costMul: 0,
      cooldownMul: 0,
      energyLock: true,
    });
  });

  it('falha: custo 0,5 e recarga 0,5, sem energia travada', () => {
    expect(domainStatMods({ id: 'jackpot', level: 3 }, 'miss')).toEqual({
      ...NEUTRAL_DOMAIN_MODS,
      costMul: 0.5,
      cooldownMul: 0.5,
      energyLock: false,
    });
  });

  it('Santuário ativo dá o neutro', () => {
    expect(domainStatMods({ id: 'santuario', level: 3 }, null)).toEqual(NEUTRAL_DOMAIN_MODS);
  });
});

describe('domainStatMods: Amplificação (AMP-02 a AMP-05)', () => {
  const locks = { techLocked: true, guardPierce: true, nullifyProjectiles: true };

  it('Nv 1: as três travas ligadas e meleeMul 1', () => {
    expect(domainStatMods({ id: 'amplificacao', level: 1 }, null)).toEqual({ ...NEUTRAL_DOMAIN_MODS, ...locks });
  });

  it('Nv 2: as três travas ligadas e meleeMul ainda 1', () => {
    expect(domainStatMods({ id: 'amplificacao', level: 2 }, null)).toEqual({ ...NEUTRAL_DOMAIN_MODS, ...locks });
  });

  it('Nv 3: as três travas e meleeMul 1,25', () => {
    expect(domainStatMods({ id: 'amplificacao', level: 3 }, null)).toEqual({
      ...NEUTRAL_DOMAIN_MODS,
      ...locks,
      meleeMul: 1.25,
    });
  });

  it('Santuário e Jackpot não ligam trava nenhuma', () => {
    for (const mods of [
      domainStatMods({ id: 'santuario', level: 3 }, null),
      domainStatMods({ id: 'jackpot', level: 3 }, 'jackpot'),
      domainStatMods({ id: 'jackpot', level: 3 }, 'miss'),
    ]) {
      expect(mods.techLocked).toBe(false);
      expect(mods.guardPierce).toBe(false);
      expect(mods.nullifyProjectiles).toBe(false);
      expect(mods.meleeMul).toBe(1);
    }
  });
});

describe('rectsOverlap (pelo centro, bordas inclusas)', () => {
  // a: x de 0 a 20, y de 0 a 10.
  const a = { x: 10, y: 5, width: 20, height: 10 };

  it('sobreposição franca é verdadeira', () => {
    expect(rectsOverlap(a, { x: 12, y: 6, width: 4, height: 4 })).toBe(true);
  });

  it('eixo x: borda encostada é verdadeira; 1 px de folga é falso', () => {
    // b: x de 20 a 30 encosta; x de 21 a 31 fica a 1 px.
    expect(rectsOverlap(a, { x: 25, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 26, y: 5, width: 10, height: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: -5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: -6, y: 5, width: 10, height: 10 })).toBe(false);
  });

  it('eixo y: borda encostada é verdadeira; 1 px de folga é falso', () => {
    // b: y de 10 a 20 encosta; y de 11 a 21 fica a 1 px.
    expect(rectsOverlap(a, { x: 10, y: 15, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 10, y: 16, width: 10, height: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 10, y: -5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 10, y: -6, width: 10, height: 10 })).toBe(false);
  });

  it('é simétrico', () => {
    const b = { x: 25, y: 5, width: 10, height: 10 };
    expect(rectsOverlap(b, a)).toBe(rectsOverlap(a, b));
  });
});
