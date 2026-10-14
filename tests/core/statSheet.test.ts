import { describe, expect, it } from 'vitest';
import { Arsenal, relicStrikeMul, relicTechMul } from '../../src/core/arsenal';
import { Perks, strikeMultiplier } from '../../src/core/build';
import { maxHpAtLevel } from '../../src/core/modifiers';
import { PROP_TRAITS, statSheet, traitsOf, type MeleeTraits } from '../../src/core/statSheet';
import { vowEffects, type VowEffects } from '../../src/core/vows';
import type { RelicId } from '../../src/data/arsenal';
import { MOVES, type MoveDef } from '../../src/data/moves';
import { PERK_IDS, type PerkId } from '../../src/data/perks';
import { VOW_IDS, type VowId } from '../../src/data/vows';

/** Abates da rodada para a Fúria valer alguma coisa na grade (e um acima do teto). */
const KILLS = [5, 40];

const VOW_CASES: { label: string; list: VowId[] }[] = [
  { label: 'nenhum', list: [] },
  ...VOW_IDS.map((id) => ({ label: id, list: [id] })),
];
const RELIC_CASES: { id: RelicId; level: number }[] = (['manoplas', 'faixas', 'rosario'] as RelicId[]).flatMap((id) => [
  { id, level: 1 },
  { id, level: 3 },
]);
const PERK_CASES: (PerkId | null)[] = [null, ...PERK_IDS];
const STRIKES: MoveDef[] = [MOVES.jab, MOVES.cotovelada, MOVES.contra];

function arsenalWith(relic: { id: RelicId; level: number } | null): Arsenal {
  const arsenal = new Arsenal();
  arsenal.relic = relic;
  return arsenal;
}

function perksWith(id: PerkId | null): Perks {
  const perks = new Perks();
  if (id) perks.add(id);
  return perks;
}

/**
 * A fórmula literal de antes da folha (`TestScene.strikeMul`): `BuildDirector.strikeMul` × `ArsenalDirector.strikeMul`
 * × `VowDirector.strikeMul`, cada um com o corpo que tinha.
 */
function todayStrikeMul(perks: Perks, arsenal: Arsenal, fx: VowEffects, move: MoveDef, shadow: boolean): number {
  const build = strikeMultiplier(perks, { heavy: move.strength === 'heavy', counter: !!move.counter, shadow });
  const relic = relicStrikeMul(arsenal, move.strength === 'light');
  const vow = fx.damageMul * fx.meleeMul * (move.strength === 'heavy' ? fx.heavyMul : 1);
  return build * relic * vow;
}

describe('statSheet: equivalência com a composição de antes (POW-01.3)', () => {
  it.each(VOW_CASES)('voto $label × relíquias × passivas × golpes × Passo sombrio', ({ list }) => {
    const kills = list.includes('furia') ? KILLS : [0];
    let checked = 0;
    for (const k of kills) {
      const fx = vowEffects(list, { kills: k });
      for (const relic of [null, ...RELIC_CASES]) {
        const arsenal = arsenalWith(relic);
        for (const perkId of PERK_CASES) {
          const perks = perksWith(perkId);
          const sheet = statSheet({ perks, arsenal, vows: fx, baseMaxHp: 100 });
          for (const move of STRIKES) {
            for (const shadow of [false, true]) {
              expect(sheet.meleeMul(traitsOf(move, shadow))).toBe(todayStrikeMul(perks, arsenal, fx, move, shadow));
              checked++;
            }
          }
          // VowDirector.sync e ArsenalDirector.syncTechBonus de antes.
          expect(sheet.relicTechMul).toBe(relicTechMul(arsenal));
          expect(sheet.vowTechMul).toBe(fx.techDamageMul * fx.damageMul);
          expect(sheet.costMul).toBe(fx.techCostMul);
          expect(sheet.damageTakenMul).toBe(fx.damageTakenMul);
          expect(sheet.guardOff).toBe(fx.guardOff);
        }
      }
    }
    // 7 relíquias × 7 passivas × 3 golpes × 2 (com e sem Passo sombrio), por contagem de abates.
    expect(checked).toBe(kills.length * 7 * 7 * 3 * 2);
  });

  it('todos os votos juntos com a Fúria no teto, relíquia e passivas somadas', () => {
    const fx = vowEffects(VOW_IDS, { kills: 40 });
    const perks = new Perks();
    for (const id of PERK_IDS) perks.add(id);
    for (const relic of RELIC_CASES) {
      const arsenal = arsenalWith(relic);
      const sheet = statSheet({ perks, arsenal, vows: fx, baseMaxHp: 100 });
      for (const move of [...STRIKES, MOVES.contraGancho])
        for (const shadow of [false, true])
          expect(sheet.meleeMul(traitsOf(move, shadow))).toBe(todayStrikeMul(perks, arsenal, fx, move, shadow));
    }
  });
});

describe('statSheet: números da folha', () => {
  const none = (): ReturnType<typeof statSheet> =>
    statSheet({ perks: new Perks(), arsenal: new Arsenal(), vows: vowEffects([], { kills: 0 }), baseMaxHp: 100 });

  it('sem nada, tudo é 1 e a vida é a base', () => {
    const sheet = none();
    for (const move of STRIKES) expect(sheet.meleeMul(traitsOf(move, true))).toBe(1);
    expect(sheet.relicTechMul).toBe(1);
    expect(sheet.vowTechMul).toBe(1);
    expect(sheet.costMul).toBe(1);
    expect(sheet.damageTakenMul).toBe(1);
    expect(sheet.maxHp).toBe(100);
    expect(sheet.guardOff).toBe(false);
  });

  it('POW-01.5: com 1 nível de vida, 115 sem voto e 69 com Corpo de vidro', () => {
    const baseMaxHp = maxHpAtLevel(1);
    const make = (list: VowId[]): number =>
      statSheet({ perks: new Perks(), arsenal: new Arsenal(), vows: vowEffects(list, { kills: 0 }), baseMaxHp }).maxHp;
    expect(baseMaxHp).toBe(115);
    expect(make([])).toBe(115);
    expect(make(['corpoDeVidro'])).toBe(69);
  });

  it('Sem guarda pesa só no golpe forte e desliga a guarda', () => {
    const sheet = statSheet({
      perks: new Perks(),
      arsenal: new Arsenal(),
      vows: vowEffects(['semGuarda'], { kills: 0 }),
      baseMaxHp: 100,
    });
    expect(sheet.meleeMul(traitsOf(MOVES.jab, false))).toBe(1);
    expect(sheet.meleeMul(traitsOf(MOVES.cotovelada, false))).toBe(1.6);
    expect(sheet.guardOff).toBe(true);
  });

  it('Passo sombrio só vale com a passiva e o traço armado', () => {
    const perks = perksWith('passoSombrio');
    const sheet = statSheet({ perks, arsenal: new Arsenal(), vows: vowEffects([], { kills: 0 }), baseMaxHp: 100 });
    expect(sheet.meleeMul(traitsOf(MOVES.jab, false))).toBe(1);
    expect(sheet.meleeMul(traitsOf(MOVES.jab, true))).toBe(1.5);
  });
});

describe('traitsOf e PROP_TRAITS', () => {
  it('lê força, contra e Passo sombrio do golpe', () => {
    expect(traitsOf(MOVES.jab, false)).toEqual({ heavy: false, light: true, counter: false, shadow: false });
    expect(traitsOf(MOVES.cotovelada, true)).toEqual({ heavy: true, light: false, counter: false, shadow: true });
    expect(traitsOf(MOVES.contra, false)).toEqual({ heavy: true, light: false, counter: true, shadow: false });
  });

  it('POW-11: o objeto bate como golpe forte, sem contra nem Passo sombrio', () => {
    expect(PROP_TRAITS).toEqual({ heavy: true, light: false, counter: false, shadow: false } satisfies MeleeTraits);
    expect(Object.isFrozen(PROP_TRAITS)).toBe(true);
  });

  it('o objeto com Manoplas Nv 3 e Punho pesado leva os dois bônus (fórmula de antes com golpe forte)', () => {
    const perks = perksWith('punhoPesado');
    const arsenal = arsenalWith({ id: 'manoplas', level: 3 });
    const fx = vowEffects([], { kills: 0 });
    const sheet = statSheet({ perks, arsenal, vows: fx, baseMaxHp: 100 });
    expect(sheet.meleeMul(PROP_TRAITS)).toBe(todayStrikeMul(perks, arsenal, fx, MOVES.cotovelada, false));
    expect(sheet.meleeMul(PROP_TRAITS)).toBeCloseTo(1.25 * 1.3, 12);
  });
});
