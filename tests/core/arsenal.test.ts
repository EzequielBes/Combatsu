import { describe, expect, it } from 'vitest';
import {
  Arsenal,
  arsenalCost,
  arsenalEligible,
  arsenalPreview,
  relicStrikeMul,
  relicTechMul,
  weaponDef,
} from '../../src/core/arsenal';
import { buildOfEntry, buildPoints, Perks } from '../../src/core/build';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { PropMachine } from '../../src/core/props';
import type { Rng } from '../../src/core/rng';
import { eligible, Shop, type BuyContext } from '../../src/core/shop';
import { Wallet } from '../../src/core/wallet';
import { ARSENAL_IDS, ARSENAL_TUNING as T } from '../../src/data/arsenal';
import { TOOL_DEFS } from '../../src/data/props';
import { ARSENAL_SHOP_ENTRIES, FULL_SHOP_CATALOG, GAME_SHOP_CATALOG } from '../../src/data/shop';

/** Rng falso: devolve os valores de `next()` na ordem dada (mesmo padrão de tests/core/shop.test.ts). */
const fakeRng = (values: number[]): Rng => {
  let i = 0;
  return { next: () => values[i++] ?? 0.99 } as unknown as Rng;
};
const arsenalIds = (arsenal: Arsenal | undefined, round: number) =>
  eligible(GAME_SHOP_CATALOG, new Modifiers(FULL_SHOP_CATALOG), round, new Loadout(), new Perks(), arsenal)
    .map((e) => e.id)
    .filter((id) => (ARSENAL_IDS as string[]).includes(id));

describe('ARS-01/02: slots do arsenal', () => {
  it('comprar equipa no nível 1 e comprar de novo sobe até o teto', () => {
    const a = new Arsenal();
    a.buy('manoplas');
    expect(a.relic).toEqual({ id: 'manoplas', level: 1 });
    for (let i = 0; i < 5; i++) a.buy('manoplas');
    expect(a.levelOf('manoplas')).toBe(T.maxLevel);
    expect(a.levelOf('faixas')).toBe(0);
  });

  it('a ferramenta fica pendente até ser entregue, uma vez só', () => {
    const a = new Arsenal();
    a.buy('faca');
    expect(a.pendingTool).toBe('faca');
    expect(a.takePendingTool()).toBe('faca');
    expect(a.takePendingTool()).toBeNull();
  });

  it('comprar a arma vinculada descarta a ferramenta ainda não entregue; o reset zera tudo', () => {
    const a = new Arsenal();
    a.buy('porrete');
    a.buy('lamina');
    expect([a.pendingTool, a.weapon]).toEqual([null, { id: 'lamina', level: 1 }]);
    a.buy('rosario');
    a.reset();
    expect([a.relic, a.weapon, a.pendingTool]).toEqual([null, null, null]);
  });
});

describe('ARS-03: o que a loja oferece', () => {
  it('sem `arsenal` nada entra; antes da rodada mínima também não', () => {
    expect(arsenalIds(undefined, 9)).toEqual([]);
    expect(arsenalIds(new Arsenal(), T.minRound[0] - 1)).toEqual([]);
    expect(arsenalIds(new Arsenal(), T.minRound[0])).toEqual(ARSENAL_IDS);
  });

  it('com uma relíquia equipada, só o próximo nível dela aparece, e só na rodada do nível', () => {
    const a = new Arsenal();
    a.buy('faixas');
    expect(arsenalEligible('manoplas', a, 9)).toBe(false);
    expect(arsenalEligible('faixas', a, T.minRound[1] - 1)).toBe(false);
    expect(arsenalEligible('faixas', a, T.minRound[1])).toBe(true);
    a.buy('faixas');
    a.buy('faixas');
    expect(arsenalEligible('faixas', a, 99)).toBe(false);
  });

  it('ferramenta só aparece de mãos livres', () => {
    const a = new Arsenal();
    a.buy('faca');
    expect(arsenalEligible('porrete', a, 9)).toBe(false);
    a.takePendingTool();
    expect(arsenalEligible('porrete', a, 9)).toBe(true);
    a.buy('bastao');
    expect(arsenalEligible('porrete', a, 9)).toBe(false);
    expect(arsenalEligible('lamina', a, 9)).toBe(false);
  });
});

describe('ARS-04..08: custo, bônus e textos', () => {
  it('o custo sobe um degrau por nível; a ferramenta tem preço fixo', () => {
    const a = new Arsenal();
    expect(arsenalCost('rosario', a)).toBe(T.relicCost.base);
    a.buy('rosario');
    expect(arsenalCost('rosario', a)).toBe(T.relicCost.base + T.relicCost.step);
    expect(arsenalCost('bastao', a)).toBe(T.weaponCost.base);
    expect(arsenalCost('faca', a)).toBe(T.toolCost);
  });

  it('manoplas valem em todo golpe, faixas só no leve e o rosário só nas técnicas', () => {
    const a = new Arsenal();
    expect([relicStrikeMul(a, true), relicTechMul(a)]).toEqual([1, 1]);
    a.buy('manoplas');
    a.buy('manoplas');
    expect([relicStrikeMul(a, true), relicStrikeMul(a, false)]).toEqual([1.2, 1.2]);
    a.reset();
    a.buy('faixas');
    expect([relicStrikeMul(a, true), relicStrikeMul(a, false), relicTechMul(a)]).toEqual([1.15, 1, 1]);
    a.reset();
    a.buy('rosario');
    expect([relicStrikeMul(a, true), relicTechMul(a)]).toEqual([1, 1.1]);
  });

  it('o rosário entra no dano da técnica pelo `damageMul` do loadout', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(loadout.damage('divergente', 20)).toBe(20);
    loadout.damageMul = 1.3;
    expect(loadout.damage('divergente', 20)).toBe(26);
    loadout.reset();
    expect(loadout.damageMul).toBe(1);
  });

  it('a arma vinculada é a ferramenta base com o dano do nível e nunca quebra', () => {
    const def = weaponDef('bastao', 3);
    expect(def.damage).toBe(Math.round(TOOL_DEFS.cursedClub.damage * 1.5));
    expect([def.texture, def.unbreakable, def.key.startsWith('cursed')]).toEqual(['bound-staff', true, false]);
    const machine = new PropMachine(def);
    machine.pickUp(1);
    for (let i = 0; i < 20; i++) {
      machine.startSwing();
      expect(machine.registerImpact()).toBe('continue');
      machine.endSwing();
    }
    expect([machine.state, machine.impacts]).toEqual(['held', 0]);
  });

  it('a carta mostra o efeito do nível que a compra dá', () => {
    const a = new Arsenal();
    expect(arsenalPreview('manoplas', a)).toBe('todo golpe +10%');
    a.buy('manoplas');
    expect(arsenalPreview('manoplas', a)).toBe('todo golpe +20%');
    expect(arsenalPreview('lamina', a)).toBe(`não quebra · dano ${TOOL_DEFS.cursedKnife.damage}`);
    expect(arsenalPreview('faca', a)).toBe(`na próxima rodada · ${TOOL_DEFS.cursedKnife.durability} usos`);
  });
});

describe('ARS-11: arsenal na loja e na build', () => {
  it('o catálogo tem uma carta por item: relíquia e arma raras com 3 níveis, ferramenta comum sem nível', () => {
    expect(ARSENAL_SHOP_ENTRIES.map((e) => e.id)).toEqual(ARSENAL_IDS);
    const shape = (id: string) => {
      const e = ARSENAL_SHOP_ENTRIES.find((x) => x.id === id)!;
      return [e.kind, e.rarity, e.maxLevel];
    };
    expect(shape('rosario')).toEqual(['relic', 'rare', 3]);
    expect(shape('bastao')).toEqual(['weapon', 'rare', 3]);
    expect(shape('faca')).toEqual(['tool', 'common', 0]);
  });

  it('relíquia e arma somam o próprio nível na build delas', () => {
    const a = new Arsenal();
    a.buy('manoplas');
    a.buy('manoplas');
    a.buy('lamina');
    const points = buildPoints(new Modifiers(FULL_SHOP_CATALOG), new Loadout(), new Perks(), a);
    expect(points).toEqual({ lutador: 2, feiticeiro: 0, veloz: 1 });
    expect([buildOfEntry('rosario'), buildOfEntry('porrete')]).toEqual(['feiticeiro', 'lutador']);
  });

  it('comprar pela loja cobra o custo do nível e chama `applyArsenal`', () => {
    const a = new Arsenal();
    a.buy('bastao');
    const entry = ARSENAL_SHOP_ENTRIES.find((e) => e.id === 'bastao')!;
    const modifiers = new Modifiers(FULL_SHOP_CATALOG);
    const shop = new Shop([entry], modifiers, fakeRng([0]), 9, new Loadout(), new Perks(), a);
    const wallet = new Wallet();
    wallet.add(100);
    const card = shop.view(wallet, 100, 100).offers[0];
    const cost = T.weaponCost.base + T.weaponCost.step;
    expect([card.name, card.levelText, card.cost]).toEqual(['Bastão selado', 'Nv 2/3', cost]);
    const ctx: BuyContext = {
      wallet,
      hp: 100,
      maxHp: 100,
      applyModifier: () => {},
      healPlayer: () => {
        throw new Error('arsenal não é cura');
      },
      applyTechnique: () => {},
      applyArsenal: (id) => a.buy(id),
    };
    expect(shop.buy(0, ctx)).toEqual({ ok: true, id: 'bastao', cost });
    expect(a.levelOf('bastao')).toBe(2);
    expect(wallet.fragments).toBe(100 - cost);
  });
});
