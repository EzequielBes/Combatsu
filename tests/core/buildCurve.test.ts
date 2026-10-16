import { describe, expect, it } from 'vitest';
import { Arsenal } from '../../src/core/arsenal';
import { Perks } from '../../src/core/build';
import { multipliersFor, scaleFor } from '../../src/core/difficulty';
import { expectedIncome } from '../../src/core/economy';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { axisEligible, eligible } from '../../src/core/shopEligibility';
import { cardCost } from '../../src/core/shopPricing';
import { statSheet, traitsOf } from '../../src/core/statSheet';
import { vowEffects } from '../../src/core/vows';
import { MOVES, type MoveDef } from '../../src/data/moves';
import { FULL_SHOP_CATALOG, GAME_SHOP_CATALOG } from '../../src/data/shop';
import { DIFFICULTY, ECONOMY, ENEMY, ENEMY_AI, ENEMY_ATTACK, WAVE } from '../../src/data/tuning';
import { equipRed } from './redLevel';

const RED = GAME_SHOP_CATALOG.find((e) => e.id === 'vermelho')!;

/**
 * Simula as lojas das rodadas 1 a `lastRound` de uma build que só compra pontos do Vermelho (ESC-03.7): a renda
 * acumulada é `expectedIncome(r)`, cada ponto custa o `cardCost` da loja daquela rodada com a inflação, a trava por
 * rodada vem do `axisEligible`, e toda carta é suposta à venda. Devolve o nível do Vermelho ao fim de cada loja.
 */
function redLevelsByShop(lastRound: number): number[] {
  const loadout = new Loadout();
  equipRed(loadout, 0, 1);
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);
  const axes = ['potencia', 'potencia', 'potencia', 'escala', 'escala'] as const;
  let spent = 0;
  const levels: number[] = [];
  for (let round = 1; round <= lastRound; round++) {
    const wallet = expectedIncome(round, WAVE, ECONOMY) - spent;
    let left = wallet;
    while (axisEligible(RED, loadout, round)) {
      const price = cardCost(RED, { modifiers, loadout, round });
      if (price > left) break;
      left -= price;
      loadout.axes.add('vermelho', axes[loadout.axes.total('vermelho')]);
    }
    spent += wallet - left;
    levels.push(loadout.levelOf('vermelho'));
  }
  return levels;
}

describe('ESC-03.7: curva de build do Vermelho focado, com a renda esperada', () => {
  const levels = redLevelsByShop(10);

  it('Nv 2 até a loja da rodada 3', () => {
    expect(levels[2]).toBeGreaterThanOrEqual(2);
  });

  it('Nv 5 até a loja da rodada 10', () => {
    expect(levels[9]).toBeGreaterThanOrEqual(5);
  });

  it('a trava vale na curva: sem ponto na loja da rodada 1', () => {
    expect(levels[0]).toBe(1);
  });
});

/** O lutador comprado até a loja da rodada `lastRound`: Impacto, Força e Manoplas, na ordem, sem Fúria (ESC-03.8). */
function fighterBuild(lastRound: number): {
  modifiers: Modifiers;
  arsenal: Arsenal;
  loadout: Loadout;
  spent: number;
  doneAt: number | null;
} {
  const modifiers = new Modifiers(FULL_SHOP_CATALOG);
  const arsenal = new Arsenal();
  const loadout = new Loadout();
  const perks = new Perks();
  const pick = (id: string) => GAME_SHOP_CATALOG.find((e) => e.id === id)!;
  const done = (): boolean =>
    modifiers.level('forca') === 5 &&
    arsenal.levelOf('manoplas') === 3 &&
    loadout.axes.points('corpo', 'impacto') === 3;
  let spent = 0;
  let doneAt: number | null = null;
  for (let round = 1; round <= lastRound; round++) {
    let wallet = expectedIncome(round, WAVE, ECONOMY) - spent;
    for (let bought = true; bought;) {
      bought = false;
      const pool = eligible(GAME_SHOP_CATALOG, modifiers, round, loadout, perks, arsenal);
      const wants = [
        {
          entry: pick('corpo'),
          can: loadout.axes.points('corpo', 'impacto') < 3 && axisEligible(pick('corpo'), loadout, round),
        },
        { entry: pick('forca'), can: modifiers.level('forca') < 5 && pool.some((e) => e.id === 'forca') },
        { entry: pick('manoplas'), can: arsenal.levelOf('manoplas') < 3 && pool.some((e) => e.id === 'manoplas') },
      ];
      for (const { entry, can } of wants) {
        if (!can) continue;
        const price = cardCost(entry, { modifiers, loadout, arsenal, round });
        if (price > wallet) continue;
        wallet -= price;
        spent += price;
        if (entry.id === 'corpo') loadout.axes.add('corpo', 'impacto');
        else if (entry.id === 'forca') modifiers.apply('forca');
        else arsenal.buy('manoplas');
        bought = true;
        break;
      }
    }
    if (doneAt === null && done()) doneAt = round;
  }
  return { modifiers, arsenal, loadout, spent, doneAt };
}

/** Dano do golpe `move` com a build, a conta do `strikes.ts`: Força na base, depois o multiplicador da folha. */
function strikeDamage(move: MoveDef, build: ReturnType<typeof fighterBuild>): number {
  const sheet = statSheet({
    perks: new Perks(),
    arsenal: build.arsenal,
    vows: vowEffects([], { kills: 0 }),
    baseMaxHp: build.modifiers.maxHp,
    impact: build.loadout.axes.points('corpo', 'impacto'),
  });
  return Math.round(build.modifiers.meleeDamage(move.damage) * sheet.meleeMul(traitsOf(move, false)));
}

describe('ESC-03.8: curva do lutador na rodada 19 (Força 5, Manoplas Nv 3, Impacto 3, sem Fúria)', () => {
  const build = fighterBuild(19);
  const base = { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK };
  const hp19 = scaleFor(19, base, DIFFICULTY).brain.maxHp;
  const hp1 = scaleFor(1, base, DIFFICULTY).brain.maxHp;
  const bare = fighterBuild(0);

  it('o comum da r19 tem 125 de HP e o da r1 tem 60', () => {
    expect([hp1, hp19]).toEqual([60, 125]);
    expect(multipliersFor(19, DIFFICULTY).hp).toBeCloseTo(2.08);
  });

  it('a build chega ao fim: Força 5, Manoplas 3 e Impacto 3', () => {
    expect(build.modifiers.level('forca')).toBe(5);
    expect(build.arsenal.levelOf('manoplas')).toBe(3);
    expect(build.loadout.axes.points('corpo', 'impacto')).toBe(3);
  });

  it.each([MOVES.jab, MOVES.cotovelada])('%s: golpes para matar o comum da r19 <= os da r1 sem build', (move) => {
    const hitsNow = Math.ceil(hp19 / strikeDamage(move, build));
    const hitsBare = Math.ceil(hp1 / strikeDamage(move, bare));
    expect(hitsNow).toBeLessThanOrEqual(hitsBare);
  });

  it('o jab dá 15 e a cotovelada 35 (9 e 4 golpes contra 10 e 5 sem build)', () => {
    expect([strikeDamage(MOVES.jab, build), strikeDamage(MOVES.cotovelada, build)]).toEqual([15, 35]);
    expect([strikeDamage(MOVES.jab, bare), strikeDamage(MOVES.cotovelada, bare)]).toEqual([6, 14]);
  });

  it('as compras cabem na renda esperada da rodada 19', () => {
    expect(build.doneAt).not.toBeNull();
    expect(build.spent).toBeLessThanOrEqual(expectedIncome(19, WAVE, ECONOMY));
  });
});
