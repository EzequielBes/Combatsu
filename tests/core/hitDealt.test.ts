import { describe, expect, it } from 'vitest';
import { TECH_RULE } from '../../src/data/techRule';
import { dealtDamage, type Hit } from '../../src/core/hit';

const BONUS = TECH_RULE.maxHpPct.enemy;

function hit(over: Partial<Hit> = {}): Hit {
  return { ownerId: 1, damage: 10, strength: 'heavy', direction: { x: 1, y: 0 }, force: 4, ...over };
}

describe('VRM-13, CRP-09: dano com a fração do HP máximo', () => {
  it('sem bônus é só o damage, no comum e no chefe', () => {
    expect(dealtDamage(hit(), 100, 'enemy')).toBe(10);
    expect(dealtDamage(hit(), 2000, 'boss')).toBe(10);
  });

  it('bônus 0 também é só o damage', () => {
    expect(dealtDamage(hit({ maxHpBonus: 0 }), 100, 'enemy')).toBe(10);
  });

  it('o comum toma 4% do HP máximo a mais', () => {
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 100, 'enemy')).toBe(14);
  });

  it('o chefe fica no teto de 1% mesmo com o bônus de 4%', () => {
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 1000, 'boss')).toBe(20);
  });

  it('bônus abaixo do teto do chefe passa inteiro', () => {
    expect(dealtDamage(hit({ maxHpBonus: 0.005 }), 1000, 'boss')).toBe(15);
  });
});

describe('VRM-15: arredondamento nos dois lados', () => {
  it('no comum: 4,48 vira 4 e 4,52 vira 5', () => {
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 112, 'enemy')).toBe(14);
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 113, 'enemy')).toBe(15);
  });

  it('no chefe: 12,4 vira 12 e 12,5 vira 13', () => {
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 1240, 'boss')).toBe(22);
    expect(dealtDamage(hit({ maxHpBonus: BONUS }), 1250, 'boss')).toBe(23);
  });
});
