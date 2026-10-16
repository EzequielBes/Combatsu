import { describe, expect, it } from 'vitest';
import { Run } from '../../src/core/run';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { axisEligible, eligible } from '../../src/core/shopEligibility';
import { GAME_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import { equipRed } from './redLevel';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

const startedWith = (seed: number): Run => {
  const run = new Run(RUN, WAVE);
  run.startPressed();
  run.update(0, () => seed);
  return run;
};

describe('Run: stream da carta de eixo (CRD-06)', () => {
  it('axisRng é null antes do primeiro start', () => {
    expect(new Run(RUN, WAVE).axisRng).toBeNull();
  });

  it('a mesma seed dá a mesma sequência, igual à de new Rng(seed ^ SHOP.axisSalt)', () => {
    const a = startedWith(7);
    const b = startedWith(7);
    const expected = new Rng(7 ^ SHOP.axisSalt);
    for (let i = 0; i < 20; i++) {
      const v = a.axisRng!.next();
      expect(v).toBe(b.axisRng!.next());
      expect(v).toBe(expected.next());
    }
  });

  it('sorteios no axisRng não deslocam o shopRng', () => {
    const quiet = startedWith(5);
    const busy = startedWith(5);
    for (let i = 0; i < 50; i++) busy.axisRng!.next();
    for (let i = 0; i < 10; i++) expect(busy.shopRng!.next()).toBe(quiet.shopRng!.next());
  });

  it('o sal não repete nenhum dos outros streams', () => {
    const others = [
      0x9e3779b9,
      SHOP.rngSalt,
      0x2545f491,
      0x6a09e667,
      0x3c6ef372,
      0x510e527f,
      0x1f83d9ab,
      0x5be0cd19,
      0x13198a2e,
      0x3243f6a8,
      0x9b05688c,
    ];
    expect(others).not.toContain(SHOP.axisSalt);
  });

  it('uma nova run cria outro Rng, com a seed nova', () => {
    const run = startedWith(1);
    const first = run.axisRng;
    first!.next();
    run.playerDied();
    run.update(0, () => 1);
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2);
    expect(run.axisRng).not.toBe(first);
    expect(run.axisRng!.next()).toBe(new Rng(2 ^ SHOP.axisSalt).next());
  });
});

const entryOf = (id: string): ShopEntry => {
  const found = GAME_SHOP_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`entrada ausente do catálogo: ${id}`);
  return found;
};

const inPool = (id: string, loadout?: Loadout, round = 10): boolean =>
  eligible(GAME_SHOP_CATALOG, new Modifiers(), round, loadout).some((e) => e.id === id);

describe('axisEligible: itens com eixo na loja (CRD-02, CRD-04)', () => {
  it('o Vermelho entra no catálogo até o Nv 6', () => {
    expect(entryOf('vermelho').maxLevel).toBe(6);
  });

  it('o Corpo é elegível sem compra e sem técnica equipada, mas não sem loadout', () => {
    const loadout = new Loadout();
    expect(axisEligible(entryOf('corpo'), loadout, 1)).toBe(true);
    expect(inPool('corpo', loadout, 1)).toBe(true);
    expect(inPool('corpo')).toBe(false);
  });

  it('o Vermelho fora do slot não é elegível como eixo', () => {
    const loadout = new Loadout();
    expect(axisEligible(entryOf('vermelho'), loadout, 10)).toBe(false);
  });

  it('o Vermelho equipado é elegível com 0, 1 e 4 pontos, e some com 5 (limite do item)', () => {
    for (const points of [0, 1, 4]) {
      const loadout = new Loadout();
      equipRed(loadout, 0, 1);
      for (const axis of ['potencia', 'escala', 'conjuracao', 'eficiencia'].slice(0, points)) {
        loadout.axes.add('vermelho', axis as 'potencia');
      }
      expect(loadout.axes.total('vermelho')).toBe(points);
      expect(axisEligible(entryOf('vermelho'), loadout, 10)).toBe(true);
      expect(inPool('vermelho', loadout)).toBe(true);
    }
    const full = new Loadout();
    equipRed(full, 0, 4);
    full.axes.add('vermelho', 'escala');
    full.axes.add('vermelho', 'escala');
    expect(full.axes.total('vermelho')).toBe(5);
    expect(axisEligible(entryOf('vermelho'), full, 10)).toBe(false);
    expect(inPool('vermelho', full)).toBe(false);
  });

  it('o Corpo com 5 pontos não é elegível; com 4 ainda é', () => {
    const loadout = new Loadout();
    for (const axis of ['impacto', 'impacto', 'impacto', 'peso'] as const) loadout.axes.add('corpo', axis);
    expect(axisEligible(entryOf('corpo'), loadout, 1)).toBe(true);
    loadout.axes.add('corpo', 'peso');
    expect(loadout.axes.total('corpo')).toBe(5);
    expect(axisEligible(entryOf('corpo'), loadout, 1)).toBe(false);
    expect(inPool('corpo', loadout, 1)).toBe(false);
  });

  it('o Vermelho não equipado segue como técnica nova se há slot vazio', () => {
    const loadout = new Loadout();
    expect(inPool('vermelho', loadout)).toBe(true);
    loadout.equip(0, 'divergente');
    loadout.equip(1, 'azul');
    expect(inPool('vermelho', loadout)).toBe(false);
  });
});
