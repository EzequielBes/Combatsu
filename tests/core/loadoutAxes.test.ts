import { describe, expect, it } from 'vitest';
import { Loadout } from '../../src/core/loadout';
import { TECHNIQUES } from '../../src/data/techniques';

/** Loadout com o Vermelho no slot 0, sem ponto (Nv 1). */
function withRed(): Loadout {
  const loadout = new Loadout();
  loadout.equip(0, 'vermelho');
  return loadout;
}

describe('VRM-02: o nível do Vermelho sai dos pontos de eixo do Loadout', () => {
  it('levelOf vai de 1 a 6 com os pontos, e o slotsView mostra o mesmo nível', () => {
    const loadout = withRed();
    loadout.equip(1, 'azul', 2);
    expect(loadout.levelOf('vermelho')).toBe(1);
    for (let lv = 2; lv <= 6; lv++) {
      expect(loadout.upgrade('vermelho')).toBe(true);
      expect(loadout.levelOf('vermelho')).toBe(lv);
    }
    expect(loadout.axes.total('vermelho')).toBe(5);
    expect(loadout.slotsView).toEqual([
      { id: 'vermelho', level: 6 },
      { id: 'azul', level: 2 },
    ]);
  });

  it('não equipado vale 0, mesmo com o outro slot ocupado', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul');
    expect(loadout.levelOf('vermelho')).toBe(0);
  });

  it('as outras técnicas seguem no nível do slot, de 1 a 3', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul');
    expect(loadout.upgrade('azul')).toBe(true);
    expect(loadout.upgrade('azul')).toBe(true);
    expect(loadout.upgrade('azul')).toBe(false);
    expect(loadout.levelOf('azul')).toBe(3);
    expect(loadout.axes.total('vermelho')).toBe(0);
  });

  it('o stats do Vermelho lê os pontos do Loadout', () => {
    const loadout = withRed();
    loadout.axes.add('vermelho', 'recarga');
    loadout.axes.add('vermelho', 'recarga');
    loadout.axes.add('vermelho', 'recarga');
    expect(loadout.stats('vermelho').level).toBe(4);
    expect(loadout.stats('vermelho').cooldownMs).toBeLessThan(4500);
  });
});

describe('VRM-19: maestria e prêmio do chefe dão 1 ponto no eixo-foco', () => {
  it('sem ponto, o foco é o 1º eixo da tabela (Potência)', () => {
    const loadout = withRed();
    expect(loadout.upgrade('vermelho')).toBe(true);
    expect(loadout.axes.points('vermelho', 'potencia')).toBe(1);
  });

  it('o ponto vai ao eixo com mais pontos abaixo do teto', () => {
    const loadout = withRed();
    loadout.axes.add('vermelho', 'recarga');
    expect(loadout.upgrade('vermelho')).toBe(true);
    expect(loadout.axes.points('vermelho', 'recarga')).toBe(2);
    expect(loadout.upgrade('vermelho')).toBe(true);
    expect(loadout.axes.points('vermelho', 'recarga')).toBe(3);
    // Recarga no teto (3): o foco passa ao 1º eixo da tabela com 0 pontos.
    expect(loadout.upgrade('vermelho')).toBe(true);
    expect(loadout.axes.points('vermelho', 'potencia')).toBe(1);
  });

  it('com 5 pontos nada muda', () => {
    const loadout = withRed();
    for (let i = 0; i < 5; i++) loadout.upgrade('vermelho');
    const before = loadout.axes.axesOf('vermelho');
    expect(loadout.upgrade('vermelho')).toBe(false);
    expect(loadout.axes.axesOf('vermelho')).toEqual(before);
    expect(loadout.levelOf('vermelho')).toBe(6);
  });

  it('não equipado: recusa sem dar ponto', () => {
    const loadout = new Loadout();
    expect(loadout.upgrade('vermelho')).toBe(false);
    expect(loadout.axes.total('vermelho')).toBe(0);
  });

  it('o ponto que leva ao Nv 2 põe o Vermelho na fila do ramo (VRM-11)', () => {
    const loadout = withRed();
    loadout.upgrade('vermelho');
    expect(loadout.axes.pending).toEqual(['vermelho']);
  });
});

describe('Vermelho que sai do slot leva os pontos (evolução)', () => {
  it('clear zera os pontos; equipar de novo volta ao Nv 1', () => {
    const loadout = withRed();
    loadout.upgrade('vermelho');
    loadout.upgrade('vermelho');
    loadout.clear(0);
    expect(loadout.axes.total('vermelho')).toBe(0);
    expect(loadout.levelOf('vermelho')).toBe(0);
    loadout.equip(0, 'vermelho');
    expect(loadout.levelOf('vermelho')).toBe(1);
  });

  it('clear do outro slot não mexe nos pontos do Vermelho', () => {
    const loadout = withRed();
    loadout.equip(1, 'azul');
    loadout.upgrade('vermelho');
    loadout.clear(1);
    expect(loadout.levelOf('vermelho')).toBe(2);
  });

  it('outra técnica equipada por cima do Vermelho também zera os pontos', () => {
    const loadout = withRed();
    loadout.upgrade('vermelho');
    loadout.equip(0, 'azul');
    expect(loadout.axes.total('vermelho')).toBe(0);
  });
});

describe('VRM-02: o equip grava o Vermelho no Nv 1 e ignora o nível pedido (o nível é o dos eixos)', () => {
  it.each([1, 2, 3] as const)('equip no Nv %i', (lv) => {
    const loadout = new Loadout();
    expect(loadout.equip(0, 'vermelho', lv)).toBe(true);
    expect(loadout.levelOf('vermelho')).toBe(1);
    expect(loadout.axes.total('vermelho')).toBe(0);
  });

  it('equipar no outro slot recusa sem mudar os pontos (TEC-04)', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'vermelho');
    loadout.axes.add('vermelho', 'potencia');
    expect(loadout.equip(1, 'vermelho', 3)).toBe(false);
    expect(loadout.levelOf('vermelho')).toBe(2);
  });
});

describe('VRM-07: refundCooldown corta o que resta da recarga, sem passar de 0', () => {
  /** Slot 0 com `remaining` ms de recarga do Vermelho. */
  function cooling(remaining: number): Loadout {
    const loadout = withRed();
    loadout.startCooldown(0);
    loadout.tick(loadout.cooldownOf(0) - remaining);
    expect(loadout.cooldownOf(0)).toBe(remaining);
    return loadout;
  }

  it('690 ms com 2300 restantes tiram 690', () => {
    const loadout = cooling(2300);
    loadout.refundCooldown(0, 690);
    expect(loadout.cooldownOf(0)).toBe(1610);
  });

  it('690 ms com 500 restantes param em 0', () => {
    const loadout = cooling(500);
    loadout.refundCooldown(0, 690);
    expect(loadout.cooldownOf(0)).toBe(0);
  });

  it('só mexe no slot pedido', () => {
    const loadout = withRed();
    loadout.equip(1, 'azul');
    loadout.startCooldown(0);
    loadout.startCooldown(1);
    const other = loadout.cooldownOf(1);
    loadout.refundCooldown(0, 690);
    expect(loadout.cooldownOf(1)).toBe(other);
  });
});

describe('VRM-20: lastSlot', () => {
  it('nasce null e grava o slot de cada startCooldown', () => {
    const loadout = withRed();
    loadout.equip(1, 'azul');
    expect(loadout.lastSlot).toBeNull();
    loadout.startCooldown(1);
    expect(loadout.lastSlot).toBe(1);
    loadout.startCooldown(0);
    expect(loadout.lastSlot).toBe(0);
  });

  it('slot vazio não conjura e não muda o lastSlot', () => {
    const loadout = withRed();
    loadout.startCooldown(0);
    loadout.startCooldown(1);
    expect(loadout.lastSlot).toBe(0);
  });
});

describe('reset (run nova)', () => {
  it('zera os pontos, o ramo pendente e o lastSlot', () => {
    const loadout = withRed();
    loadout.upgrade('vermelho');
    loadout.startCooldown(0);
    loadout.reset();
    expect(loadout.axes.total('vermelho')).toBe(0);
    expect(loadout.axes.pending).toEqual([]);
    expect(loadout.lastSlot).toBeNull();
    expect(loadout.slotsView).toEqual([null, null]);
  });
});

describe('PRC-05: piso de 60% do custo de energia, depois do eixo, do nível e do costMul', () => {
  const IDS = ['divergente', 'vermelho', 'azul', 'corte', 'roxo'] as const;

  it('Divergente no Nv 3 custa 12 (20 − 10 = 10 cairia abaixo do piso)', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 3);
    expect(loadout.cost('divergente')).toBe(12);
  });

  it('Vermelho com Eficiência 3 e o Fluxo selado custa 18, não 11 (18 × 0,6 = 10,8)', () => {
    const loadout = withRed();
    for (let i = 0; i < 3; i++) loadout.axes.add('vermelho', 'eficiencia');
    expect(loadout.cost('vermelho')).toBe(18);
    loadout.costMul = 0.6;
    expect(loadout.cost('vermelho')).toBe(18);
  });

  it('o Fluxo selado ainda dá os 40% de desconto no Nv 1 (20 → 12, o próprio piso)', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'divergente', 1);
    expect(loadout.cost('divergente')).toBe(20);
    loadout.costMul = 0.6;
    expect(loadout.cost('divergente')).toBe(12);
  });

  it.each(IDS)('%s no Nv 1: abaixo do piso sobe a ele, no piso e acima dele não muda', (id) => {
    const base = TECHNIQUES[id].cost;
    const floor = Math.ceil(0.6 * base);
    const costWith = (target: number): number => {
      const loadout = new Loadout();
      loadout.equip(0, id, 1);
      loadout.costMul = target / base;
      return loadout.cost(id);
    };
    expect(costWith(floor - 1)).toBe(floor);
    expect(costWith(floor)).toBe(floor);
    expect(costWith(floor + 1)).toBe(floor + 1);
    expect(costWith(base)).toBe(base);
  });
});
