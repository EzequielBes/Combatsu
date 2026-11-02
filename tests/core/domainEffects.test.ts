import { describe, expect, it } from 'vitest';
import { NEUTRAL_DOMAIN_MODS, domainStatMods } from '../../src/core/domainEffects';

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
