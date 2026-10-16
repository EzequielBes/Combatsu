import { describe, expect, it } from 'vitest';
import { Loadout } from '../../src/core/loadout';
import { Modifiers } from '../../src/core/modifiers';
import { axisPreview, previewText } from '../../src/core/shopPreview';
import { GAME_SHOP_CATALOG, type ShopEntry } from '../../src/data/shop';
import { ITEM_AXES, type AxisId } from '../../src/data/techAxes';

const entryOf = (id: string): ShopEntry => {
  const found = GAME_SHOP_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`entrada ausente do catálogo: ${id}`);
  return found;
};

const lineOf = (text: string, i: number): string => text.split('\n')[i];

/** Loadout com o Vermelho equipado e `points` pontos por eixo, na ordem dada. */
const redWith = (points: readonly (readonly [AxisId, number])[]): Loadout => {
  const loadout = new Loadout();
  loadout.equip(0, 'vermelho');
  for (const [axis, n] of points) for (let i = 0; i < n; i++) loadout.axes.add('vermelho', axis as 'potencia');
  return loadout;
};

const bodyWith = (axis: AxisId, n: number): Loadout => {
  const loadout = new Loadout();
  for (let i = 0; i < n; i++) loadout.axes.add('corpo', axis as 'impacto');
  return loadout;
};

describe('axisPreview: duas linhas e a marca da escolhida (CRD-05)', () => {
  it('›Escala 120→144 na escolhida e " Potência 35→40" na outra', () => {
    const loadout = redWith([
      ['potencia', 1],
      ['escala', 1],
    ]);
    const text = axisPreview('vermelho', ['escala', 'potencia'], 0, loadout);
    expect(lineOf(text, 0)).toBe('›Escala 120→144');
    expect(lineOf(text, 1)).toBe(' Potência 35→40');
    const swapped = axisPreview('vermelho', ['escala', 'potencia'], 1, loadout);
    expect(lineOf(swapped, 0)).toBe(' Escala 120→144');
    expect(lineOf(swapped, 1)).toBe('›Potência 35→40');
  });

  it('o valor é o que o jogo usa: a Potência segue o multiplicador de dano da relíquia', () => {
    const loadout = redWith([['potencia', 0]]);
    loadout.damageMul = 1.5;
    expect(lineOf(axisPreview('vermelho', ['potencia'], 0, loadout), 0)).toBe('›Potência 45→53');
  });

  it('os outros eixos do Vermelho mostram o valor de agora e o do próximo ponto', () => {
    const loadout = redWith([]);
    const show = (axis: AxisId): string => lineOf(axisPreview('vermelho', [axis], 0, loadout), 0);
    expect(show('conjuracao')).toBe('›Conjuração 600→480');
    expect(show('eficiencia')).toBe('›Eficiência 30→26');
    expect(show('recarga')).toBe('›Recarga 4500→3600');
    expect(show('perfuracao')).toBe('›Perfuração 0→6');
  });

  it('os eixos do Corpo seguem o formato da spec', () => {
    const loadout = new Loadout();
    const show = (axis: AxisId): string => lineOf(axisPreview('corpo', [axis], 0, loadout), 0);
    expect(show('impacto')).toBe('›Impacto ×1→×1,1');
    expect(show('peso')).toBe('›Peso +0%→+20%');
    expect(show('ritmo')).toBe('›Ritmo -0%→-8%');
    expect(show('alcance')).toBe('›Alcance +0→+6');
    expect(show('fluxo')).toBe('›Fluxo +0→+1');
    expect(show('furia')).toBe('›Fúria +0%→+15%');
  });

  it('com 1 e 2 pontos o próximo valor sobe pela tabela', () => {
    expect(lineOf(axisPreview('corpo', ['impacto'], 0, bodyWith('impacto', 1)), 0)).toBe('›Impacto ×1,1→×1,2');
    expect(lineOf(axisPreview('corpo', ['peso'], 0, bodyWith('peso', 2)), 0)).toBe('›Peso +40%→+60%');
    expect(lineOf(axisPreview('corpo', ['ritmo'], 0, bodyWith('ritmo', 1)), 0)).toBe('›Ritmo -8%→-15%');
  });

  it('toda linha de todo eixo dos dois itens, com 0, 1 e 2 pontos, cabe em 20 caracteres', () => {
    for (const item of ['vermelho', 'corpo'] as const) {
      for (const axis of ITEM_AXES[item] as readonly AxisId[]) {
        for (const points of [0, 1, 2]) {
          const loadout = item === 'vermelho' ? redWith([[axis, points]]) : bodyWith(axis, points);
          for (const selected of [0, 1]) {
            const text = axisPreview(item, [axis, axis], selected, loadout);
            for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(20);
          }
        }
      }
    }
  });
});

describe('axisPreview: a 3ª linha avisa o ramo e o Despertar (CRD-05)', () => {
  const extra = (total: number): string | undefined => {
    const loadout = redWith([
      ['potencia', Math.min(total, 3)],
      ['escala', Math.max(0, total - 3)],
    ]);
    const lines = axisPreview('vermelho', ['recarga'], 0, loadout).split('\n');
    return lines[1];
  };

  it('+ ramo só no 1º ponto (leva ao Nv 2)', () => {
    expect(extra(0)).toBe('+ ramo');
    for (const total of [1, 2, 3, 4]) expect(extra(total)).not.toBe('+ ramo');
  });

  it('+ Despertar só no 4º ponto (leva ao Nv 5)', () => {
    expect(extra(3)).toBe('+ Despertar');
    for (const total of [0, 1, 2, 4]) expect(extra(total)).not.toBe('+ Despertar');
  });

  it('o Corpo também avisa', () => {
    expect(axisPreview('corpo', ['impacto'], 0, new Loadout()).split('\n')[1]).toBe('+ ramo');
    const loadout = new Loadout();
    for (const axis of ['impacto', 'impacto', 'peso'] as const) loadout.axes.add('corpo', axis);
    expect(axisPreview('corpo', ['ritmo'], 0, loadout).split('\n')[1]).toBe('+ Despertar');
  });
});

describe('previewText: a carta do Azul fica igual a hoje (CRD-10)', () => {
  it('Dano ×a → ×b pelo LEVEL_FACTOR, no nível 1', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul');
    const text = previewText(entryOf('azul'), new Modifiers(), 100, 100, loadout);
    expect(text).toBe('Dano ×1,0 → ×1,25');
  });
});
