import { bodyStrike, type BodyPoints } from '../../core/cursedBody';
import type { StrikeMods } from '../../core/statSheet';
import type { MoveDef } from '../../data/moves';
import type { TestScene } from '../TestScene';

/**
 * O Corpo Amaldiçoado no combate (CRP-03 a CRP-13): lê os pontos do `loadout.axes` e muda o golpe do player pelo
 * `StatsDirector.strikeMods`. Campo `body` do `BuildDirector`, zerado no `reset` da run nova.
 */
export class BodyDirector {
  constructor(readonly s: TestScene) {}

  /** Pontos do Corpo por eixo, lidos na hora (o `loadout.reset` da run nova os zera). */
  private get points(): BodyPoints {
    return this.s.loadout.axes.axesOf('corpo');
  }

  /**
   * CRP-03: o Peso multiplica a força do golpe; com Peso 2 ou mais o golpe forte leva `knockdown` e com Peso 3, a
   * parede que atordoa (`wallStun`). Também preenche o alcance e o ritmo que o `strikes.ts` lê (CRP-04, CRP-05, CRP-15).
   * As marcas só entram quando ligadas, para não apagar o `knockdown` próprio do golpe.
   */
  strikeMods(move: MoveDef, base: StrikeMods): StrikeMods {
    const b = bodyStrike(this.points, move);
    const marks = { ...base.marks };
    if (b.knockdown) marks.knockdown = true;
    if (b.wallStun) marks.wallStun = true;
    return { ...base, force: base.force * b.forceMul, reachPx: b.reachPx, recoveryMul: b.recoveryMul, marks };
  }

  /** Run nova: os pontos já voltaram a 0 pelo `loadout.reset`; os contadores do combate nascem aqui. */
  reset(): void {}
}
