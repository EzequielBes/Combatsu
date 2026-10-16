import { describe, expect, it } from 'vitest';
import { Arsenal } from '../../src/core/arsenal';
import { Perks } from '../../src/core/build';
import { Loadout } from '../../src/core/loadout';
import { PROP_TRAITS, statSheet } from '../../src/core/statSheet';
import { resolveTechStats } from '../../src/core/techStats';
import { vowEffects } from '../../src/core/vows';
import type { TechId } from '../../src/data/techniques';

const ONE = { damageMul: 1, vowDamageMul: 1, costMul: 1 };
const BARE = { forca: 0, meleeMul: 1, hpMul: 1 };

describe('ESC-02: o Kokusen no stat do Divergente', () => {
  it('escala 1 dá 45 no Nv 1, e sem escala nenhuma também', () => {
    expect(resolveTechStats({ id: 'divergente', level: 1, ...ONE, kokusenScale: BARE }).kokusenDamage).toBe(45);
    expect(resolveTechStats({ id: 'divergente', level: 1, ...ONE }).kokusenDamage).toBe(45);
  });

  it('o voto e a relíquia (damageMul e vowDamageMul 1,35) não mexem no Kokusen: não contam duas vezes', () => {
    const s = resolveTechStats({
      id: 'divergente',
      level: 1,
      damageMul: 1.35,
      vowDamageMul: 1.35,
      costMul: 1,
      kokusenScale: BARE,
    });
    expect(s.damage.second).toBeGreaterThan(18);
    expect(s.kokusenDamage).toBe(45);
  });

  it('Força 5 dá 68', () => {
    const s = resolveTechStats({ id: 'divergente', level: 1, ...ONE, kokusenScale: { ...BARE, forca: 5 } });
    expect(s.kokusenDamage).toBe(68);
  });

  it('o 2º impacto cresce com o nível do Divergente: Nv 2 parte de round(18 × 1,25) = 23, Nv 3 de 27', () => {
    const at = (level: 1 | 2 | 3) =>
      resolveTechStats({ id: 'divergente', level, ...ONE, kokusenScale: BARE }).kokusenDamage;
    expect([at(1), at(2), at(3)]).toEqual([45, 58, 68]);
  });

  it('o meleeMul da folha com os traços do objeto (Impacto 3 já dentro, contado uma vez) sobe o Kokusen', () => {
    const sheet = statSheet({
      perks: new Perks(),
      arsenal: new Arsenal(),
      vows: vowEffects([], { kills: 0 }),
      baseMaxHp: 100,
      impact: 3,
    });
    const meleeMul = sheet.meleeMul(PROP_TRAITS);
    expect(meleeMul).toBeGreaterThan(1);
    const s = resolveTechStats({ id: 'divergente', level: 1, ...ONE, kokusenScale: { ...BARE, meleeMul } });
    expect(s.kokusenDamage).toBe(Math.round(2.5 * 18 * meleeMul));
    expect(s.kokusenDamage).toBeGreaterThan(45);
  });

  it('as outras quatro técnicas têm kokusenDamage 0', () => {
    const others: TechId[] = ['vermelho', 'azul', 'corte', 'roxo'];
    for (const id of others) {
      const s = resolveTechStats({ id, level: 1, ...ONE, kokusenScale: { forca: 5, meleeMul: 2, hpMul: 2 } });
      expect(s.kokusenDamage, id).toBe(0);
    }
  });

  it('o Loadout guarda a escala, a repassa ao stat e a zera no reset', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(loadout.kokusenScale).toEqual(BARE);
    expect(loadout.stats('divergente').kokusenDamage).toBe(45);
    loadout.kokusenScale = { forca: 5, meleeMul: 1, hpMul: 1 };
    expect(loadout.stats('divergente').kokusenDamage).toBe(68);
    loadout.reset();
    expect(loadout.kokusenScale).toEqual(BARE);
  });
});
