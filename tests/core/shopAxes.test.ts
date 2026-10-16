import { describe, expect, it } from 'vitest';
import { Run } from '../../src/core/run';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { axisEligible, eligible } from '../../src/core/shopEligibility';
import { GAME_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import { drawCards, axesFor, focusItem, type Offer } from '../../src/core/shopDraw';
import type { AxisBuild } from '../../src/core/axisBuild';
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

describe('axisEligible: trava por rodada do ponto (PRC-04)', () => {
  const corpoWith = (points: number): Loadout => {
    const loadout = new Loadout();
    const axes = ['impacto', 'impacto', 'impacto', 'peso'] as const;
    for (let i = 0; i < points; i++) loadout.axes.add('corpo', axes[i]);
    return loadout;
  };

  it.each([
    [0, 1, false],
    [0, 2, true],
    [1, 1, false],
    [1, 2, true],
    [2, 3, false],
    [2, 4, true],
    [3, 3, false],
    [3, 4, true],
  ])('Corpo com %i pontos na loja da rodada %i: %s', (points, round, expected) => {
    expect(axisEligible(entryOf('corpo'), corpoWith(points), round)).toBe(expected);
  });

  it('o 5º ponto: recusado na rodada 5, oferecido na 6', () => {
    const loadout = corpoWith(4);
    expect(axisEligible(entryOf('corpo'), loadout, 5)).toBe(false);
    expect(axisEligible(entryOf('corpo'), loadout, 6)).toBe(true);
  });

  it('o Vermelho equipado segue a mesma trava', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 3);
    expect(axisEligible(entryOf('vermelho'), loadout, 3)).toBe(false);
    expect(axisEligible(entryOf('vermelho'), loadout, 4)).toBe(true);
  });
});

describe('axisEligible: itens com eixo na loja (CRD-02, CRD-04)', () => {
  it('o Vermelho entra no catálogo até o Nv 6', () => {
    expect(entryOf('vermelho').maxLevel).toBe(6);
  });

  it('o Corpo é elegível sem compra e sem técnica equipada, mas não sem loadout', () => {
    const loadout = new Loadout();
    expect(axisEligible(entryOf('corpo'), loadout, 2)).toBe(true);
    expect(inPool('corpo', loadout, 2)).toBe(true);
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
    expect(axisEligible(entryOf('corpo'), loadout, 6)).toBe(true);
    loadout.axes.add('corpo', 'peso');
    expect(loadout.axes.total('corpo')).toBe(5);
    expect(axisEligible(entryOf('corpo'), loadout, 6)).toBe(false);
    expect(inPool('corpo', loadout, 6)).toBe(false);
  });

  it('o Vermelho não equipado segue como técnica nova se há slot vazio', () => {
    const loadout = new Loadout();
    expect(inPool('vermelho', loadout)).toBe(true);
    loadout.equip(0, 'divergente');
    loadout.equip(1, 'azul');
    expect(inPool('vermelho', loadout)).toBe(false);
  });
});

/** Rng falso: devolve os valores dados na ordem e depois repete o último. */
const fakeRng = (...values: number[]): Rng => {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)] } as unknown as Rng;
};

const poolOf = (loadout: Loadout, round = 10): ShopEntry[] =>
  eligible(GAME_SHOP_CATALOG, new Modifiers(), round, loadout);

const cardIds = (cards: (Offer | null)[]): (string | undefined)[] => cards.map((c) => c?.id);

/** Vermelho Nv 2 no slot 0 e Azul Nv 1 no slot 1: o foco é o Vermelho (maior nível). */
const redFocusLoadout = (): Loadout => {
  const loadout = new Loadout();
  equipRed(loadout, 0, 2);
  loadout.equip(1, 'azul');
  return loadout;
};

describe('focusItem: o item de maior nível (CRD-02)', () => {
  it('o maior nível vence', () => {
    const loadout = redFocusLoadout();
    expect(focusItem(loadout)).toBe('vermelho');
    loadout.axes.add('corpo', 'impacto');
    loadout.axes.add('corpo', 'impacto');
    expect(focusItem(loadout)).toBe('corpo'); // Corpo Nv 3 contra Vermelho Nv 2
  });

  it('o empate vai ao slot 0, depois ao slot 1, depois ao Corpo', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente');
    loadout.equip(1, 'azul');
    expect(focusItem(loadout)).toBe('divergente');
    const second = new Loadout();
    second.equip(1, 'azul');
    expect(focusItem(second)).toBe('azul');
    expect(focusItem(new Loadout())).toBe('corpo');
  });
});

describe('drawCards: carta 0 (CRD-02)', () => {
  it('a evolução pronta vence o foco (CRD-02.2)', () => {
    const loadout = redFocusLoadout();
    const evolution = GAME_SHOP_CATALOG.find((e) => e.kind === 'evolution')!;
    const pool = [...poolOf(loadout), evolution];
    const cards = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0), loadout });
    expect(cards[0]?.id).toBe(evolution.id);
  });

  it('axisRng 0,59 dá o foco e 0,60 dá outro item dono', () => {
    const loadout = redFocusLoadout();
    const pool = poolOf(loadout);
    const at059 = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.59), loadout });
    const at060 = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.6, 0), loadout });
    expect(at059[0]?.id).toBe('vermelho');
    expect(at060[0]?.id).not.toBe('vermelho');
    expect(['azul', 'corpo']).toContain(at060[0]?.id);
  });

  it('o outro item sai do axisRng entre os donos que podem subir', () => {
    const loadout = redFocusLoadout();
    const pool = poolOf(loadout);
    const low = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.6, 0), loadout });
    const high = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.6, 0.99), loadout });
    expect(low[0]?.id).toBe('azul');
    expect(high[0]?.id).toBe('corpo');
  });

  it('foco no teto de 5 pontos cai para outro item (edge case)', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 4);
    loadout.axes.add('vermelho', 'escala');
    loadout.axes.add('vermelho', 'escala');
    expect(focusItem(loadout)).toBe('vermelho');
    const cards = drawCards({ pool: poolOf(loadout), rng: fakeRng(0), axisRng: fakeRng(0), loadout });
    expect(cards[0]?.id).toBe('corpo');
  });

  it('foco travado fora do pool cai para outro item (edge case)', () => {
    const loadout = redFocusLoadout();
    const pool = poolOf(loadout).filter((e) => e.id !== 'vermelho');
    const cards = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0), loadout });
    expect(cards[0]?.id).not.toBe('vermelho');
    expect(['azul', 'corpo']).toContain(cards[0]?.id);
  });

  it('sem item que suba, a carta 0 vem do sorteio por peso (CRD-02.4)', () => {
    const loadout = redFocusLoadout();
    const pool = poolOf(loadout).filter((e) => e.kind === 'modifier');
    const cards = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0), loadout });
    expect(cards[0]?.id).toBe(pool[0].id);
  });

  it('só o foco sobe e o axisRng dá 0,60 ou mais: sorteio por peso (CRD-02.4)', () => {
    const loadout = new Loadout();
    const pool = [...poolOf(loadout).filter((e) => e.kind === 'modifier'), entryOf('corpo')];
    const weighted = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.6), loadout });
    expect(weighted[0]?.id).toBe(pool[0].id);
    const focus = drawCards({ pool, rng: fakeRng(0), axisRng: fakeRng(0.59), loadout });
    expect(focus[0]?.id).toBe('corpo');
  });
});

describe('drawCards: carta 1 e unicidade (CRD-03)', () => {
  it('com slot vazio a carta 1 é uma técnica nova, em toda seed', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const loadout = new Loadout();
      equipRed(loadout, 0, 2);
      const cards = drawCards({ pool: poolOf(loadout), rng: new Rng(seed), axisRng: new Rng(seed + 1), loadout });
      const card = cards[1]!;
      expect(card.entry.kind).toBe('technique');
      expect(loadout.levelOf(card.id as 'azul')).toBe(0);
      expect(card.axes).toBeUndefined();
    }
  });

  it('sem slot vazio nenhuma carta é técnica nova', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const loadout = redFocusLoadout();
      const cards = drawCards({ pool: poolOf(loadout), rng: new Rng(seed), axisRng: new Rng(seed + 1), loadout });
      for (const card of cards) {
        if (card?.entry.kind === 'technique') expect(loadout.levelOf(card.id as 'azul')).toBeGreaterThan(0);
      }
    }
  });

  it('nunca duas cartas do mesmo item, com 4 cartas pedidas', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const loadout = seed % 2 ? redFocusLoadout() : new Loadout();
      const cards = drawCards({
        pool: poolOf(loadout),
        rng: new Rng(seed),
        axisRng: new Rng(seed * 7),
        loadout,
        count: 4,
      });
      expect(cards).toHaveLength(4);
      expect(new Set(cardIds(cards)).size).toBe(4);
    }
  });

  it('a mesma seed dá as mesmas cartas e os mesmos eixos (CRD-06)', () => {
    const run = (): unknown => {
      const loadout = redFocusLoadout();
      return drawCards({ pool: poolOf(loadout), rng: new Rng(42), axisRng: new Rng(43), loadout, count: 4 }).map(
        (c) => [c?.id, c?.axes],
      );
    };
    expect(run()).toEqual(run());
  });
});

describe('axesFor: um ou dois eixos (CRD-04)', () => {
  it('dois eixos com o foco primeiro', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 2); // 1 ponto em potência: o foco
    const [focus, other] = axesFor('vermelho', loadout.axes, fakeRng(0));
    expect(focus).toBe(loadout.axes.focusAxis('vermelho'));
    expect(focus).toBe('potencia');
    expect(other).toBe('escala');
    expect(axesFor('vermelho', loadout.axes, fakeRng(0.99))[1]).toBe('perfuracao');
  });

  it('o outro eixo nunca é um eixo no teto de 3 pontos', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 4); // potência com 3 pontos
    expect(loadout.axes.points('vermelho', 'potencia')).toBe(3);
    for (const x of [0, 0.5, 0.99]) {
      const axes = axesFor('vermelho', loadout.axes, fakeRng(x));
      expect(axes).toHaveLength(2);
      expect(axes).not.toContain('potencia');
    }
  });

  it('um eixo só quando só um cabe (edge case)', () => {
    const stub = {
      focusAxis: () => 'impacto',
      points: (_item: string, axis: string) => (axis === 'impacto' ? 0 : 3),
    } as unknown as AxisBuild;
    expect(axesFor('corpo', stub, fakeRng(0))).toEqual(['impacto']);
  });

  it('item no teto de 5 pontos não oferece eixo', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 4);
    loadout.axes.add('vermelho', 'escala');
    loadout.axes.add('vermelho', 'escala');
    expect(axesFor('vermelho', loadout.axes, fakeRng(0))).toEqual([]);
  });

  it('a carta do Vermelho equipado sai com axes; a de técnica comum, sem', () => {
    const loadout = redFocusLoadout();
    const cards = drawCards({ pool: poolOf(loadout), rng: fakeRng(0), axisRng: fakeRng(0.59), loadout });
    expect(cards[0]?.axes?.[0]).toBe('potencia');
    const azul = drawCards({ pool: [entryOf('azul')], rng: fakeRng(0), axisRng: fakeRng(0), loadout });
    expect(azul[0]?.axes).toBeUndefined();
  });
});

describe('CRD-07: o foco do Vermelho aparece em pelo menos 60% das lojas', () => {
  it('em 1000 seeds, com o Vermelho no maior nível, o Corpo e outra técnica', () => {
    let shown = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const loadout = new Loadout();
      equipRed(loadout, 0, 3);
      loadout.equip(1, 'azul');
      const cards = drawCards({
        pool: poolOf(loadout),
        rng: new Rng(seed),
        axisRng: new Rng(seed ^ SHOP.axisSalt),
        loadout,
        count: 4,
      });
      const focus = loadout.axes.focusAxis('vermelho');
      if (cards.some((c) => c?.id === 'vermelho' && c.axes?.[0] === focus)) shown++;
    }
    expect(shown).toBeGreaterThanOrEqual(600);
  });
});
