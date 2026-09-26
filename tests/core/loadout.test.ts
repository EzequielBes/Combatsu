import { describe, expect, it } from 'vitest';
import { Loadout } from '../../src/core/loadout';

describe('TEC-01: uma run nova (sem ?tech=) começa com os dois slots vazios', () => {
  it('slotsView é [null, null] na criação', () => {
    const l = new Loadout();
    expect(l.slotsView).toEqual([null, null]);
  });

  it('reset volta os dois slots a vazio depois de equipar', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    l.reset();
    expect(l.slotsView).toEqual([null, null]);
  });
});

describe('TEC-03: equip(slot, id, level) válido guarda a técnica naquele slot e nível', () => {
  it('equip(0, "divergente", 2) faz slotsView[0] = { id: "divergente", level: 2 }', () => {
    const l = new Loadout();
    expect(l.equip(0, 'divergente', 2)).toBe(true);
    expect(l.slotsView[0]).toEqual({ id: 'divergente', level: 2 });
    expect(l.levelOf('divergente')).toBe(2);
  });

  it('equip no slot 1 não afeta o slot 0', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    l.equip(1, 'corte', 3);
    expect(l.slotsView).toEqual([
      { id: 'divergente', level: 1 },
      { id: 'corte', level: 3 },
    ]);
  });
});

describe('TEC-04, TEC-13: equip com id já no outro slot recusa e não muda nada', () => {
  it('equip(1, "divergente", 2) com divergente já no slot 0: devolve false e os dois slots ficam como antes', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    const result = l.equip(1, 'divergente', 2);
    expect(result).toBe(false);
    expect(l.slotsView).toEqual([{ id: 'divergente', level: 1 }, null]);
  });
});

describe('TEC-05: equip/upgrade fora de 1–3 recusa e não muda nada (nível 0 e 4, L-010)', () => {
  it('equip com level 0 devolve false e o slot continua vazio', () => {
    const l = new Loadout();
    expect(l.equip(0, 'divergente', 0 as never)).toBe(false);
    expect(l.slotsView[0]).toBe(null);
  });

  it('equip com level 4 devolve false e o slot continua vazio', () => {
    const l = new Loadout();
    expect(l.equip(0, 'divergente', 4 as never)).toBe(false);
    expect(l.slotsView[0]).toBe(null);
  });

  it('equip com level 1 e 3 (dentro do intervalo) funcionam', () => {
    const l = new Loadout();
    expect(l.equip(0, 'divergente', 1)).toBe(true);
    expect(l.equip(1, 'corte', 3)).toBe(true);
  });

  it('upgrade no nível 3 recusa e não muda nada (upgrade levaria a 4)', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 3);
    expect(l.upgrade('divergente')).toBe(false);
    expect(l.levelOf('divergente')).toBe(3);
  });

  it('upgrade de técnica não equipada recusa', () => {
    const l = new Loadout();
    expect(l.upgrade('vermelho')).toBe(false);
  });
});

describe('TSH-07 (upgrade via loadout): sobe exatamente 1 nível', () => {
  it('upgrade de nível 1 para 2', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    expect(l.upgrade('divergente')).toBe(true);
    expect(l.levelOf('divergente')).toBe(2);
  });
});

describe('TEC-06: dano escalado por nível, round(base × k), k = 1, 1.25, 1.5 (nível 1/2/3)', () => {
  it('base 18 (2º impacto do Divergente) no nível 1 → 18', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    expect(l.damage('divergente', 18)).toBe(18);
  });

  it('base 18 no nível 2 (18 × 1.25 = 22.5, arredonda meio para cima) → 23', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 2);
    expect(l.damage('divergente', 18)).toBe(23);
  });

  it('base 30 (Vermelho) no nível 3 (30 × 1.5 = 45) → 45', () => {
    const l = new Loadout();
    l.equip(0, 'vermelho', 3);
    expect(l.damage('vermelho', 30)).toBe(45);
  });

  it('técnica não equipada trata como nível 1 (fator 1.0)', () => {
    const l = new Loadout();
    expect(l.damage('corte', 10)).toBe(10);
  });
});

describe('TEC-14: custo de conjuração = baseCost − 5 × (n − 1)', () => {
  it('vermelho (base 45) nos níveis 1, 2 e 3: 45, 40, 35', () => {
    const l = new Loadout();
    l.equip(0, 'vermelho', 1);
    expect(l.cost('vermelho')).toBe(45);
    l.upgrade('vermelho');
    expect(l.cost('vermelho')).toBe(40);
    l.upgrade('vermelho');
    expect(l.cost('vermelho')).toBe(35);
  });

  it('técnica não equipada usa o custo de nível 1 (divergente: 20)', () => {
    const l = new Loadout();
    expect(l.cost('divergente')).toBe(20);
  });
});

describe('firstEmpty/hasAny: usados pela loja (TSH-03, TSH-06, TSH-09)', () => {
  it('vazio: firstEmpty = 0, hasAny = false', () => {
    const l = new Loadout();
    expect(l.firstEmpty()).toBe(0);
    expect(l.hasAny()).toBe(false);
  });

  it('slot 0 ocupado: firstEmpty = 1, hasAny = true', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    expect(l.firstEmpty()).toBe(1);
    expect(l.hasAny()).toBe(true);
  });

  it('os dois ocupados: firstEmpty = null', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    l.equip(1, 'corte', 1);
    expect(l.firstEmpty()).toBe(null);
  });
});

describe('cooldownOf/startCooldown/tick: recarga por slot (CAST-04, CAST-06)', () => {
  it('startCooldown arma o cooldown completo da técnica; tick reduz sem sair de 0', () => {
    const l = new Loadout();
    l.equip(0, 'divergente', 1);
    expect(l.cooldownOf(0)).toBe(0);
    l.startCooldown(0);
    expect(l.cooldownOf(0)).toBe(1200);
    l.tick(1199);
    expect(l.cooldownOf(0)).toBeCloseTo(1, 6);
    l.tick(1);
    expect(l.cooldownOf(0)).toBe(0);
    l.tick(500);
    expect(l.cooldownOf(0)).toBe(0); // nunca negativo
  });
});
