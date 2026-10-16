import { describe, expect, it, vi } from 'vitest';
import type { BodyPoints } from '../../src/core/cursedBody';
import type { StrikeMods } from '../../src/core/statSheet';
import { MOVES } from '../../src/data/moves';
import { BodyDirector } from '../../src/scenes/test/bodyDirector';
import type { TestScene } from '../../src/scenes/TestScene';

// O diretor importa classes do Phaser que o Node não carrega; o `strikeMods` não usa nenhuma delas.
vi.mock('../../src/game/Enemy', () => ({ Enemy: class {} }));
vi.mock('../../src/game/FuryAura', () => ({ FuryAura: class {}, furyAuraCenter: () => ({ x: 0, y: 0 }) }));
vi.mock('../../src/scenes/test/fistWaves', () => ({ boxOf: () => ({}), FistWaves: class {} }));

const ZERO: BodyPoints = { impacto: 0, peso: 0, ritmo: 0, alcance: 0, fluxo: 0, furia: 0 };
const BASE: StrikeMods = { damage: 10, force: 6, reachPx: 0, recoveryMul: 1, marks: {} };

/** Cena falsa com o mínimo que o `strikeMods` lê: os pontos do Corpo, sem ramo e sem Despertar. */
function director(peso: number): BodyDirector {
  const axes = { axesOf: () => ({ ...ZERO, peso }), branch: () => null, awakened: () => false };
  return new BodyDirector({ loadout: { axes } } as unknown as TestScene);
}

describe('BodyDirector.strikeMods: o Peso (CRP-03)', () => {
  it.each([
    [0, 6],
    [1, 7.2],
    [2, 8.4],
    [3, 9.6],
  ])('CRP-03.4: Peso %i leva a força 6 a %f (×1, 1,2, 1,4 ou 1,6)', (peso, force) => {
    const mods = director(peso).strikeMods(MOVES.cotovelada, BASE);
    expect(mods.force).toBeCloseTo(force, 10);
  });

  it('CRP-03.5 e CRP-03.6: o golpe forte derruba com Peso 2 e atordoa na parede com Peso 3', () => {
    expect(director(1).strikeMods(MOVES.cotovelada, BASE).marks).toEqual({});
    expect(director(2).strikeMods(MOVES.cotovelada, BASE).marks).toEqual({ knockdown: true });
    expect(director(3).strikeMods(MOVES.cotovelada, BASE).marks).toEqual({ knockdown: true, wallStun: true });
  });
});
