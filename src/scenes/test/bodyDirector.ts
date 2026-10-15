import { axisAt } from '../../core/axisRule';
import { bodyStrike, type BodyPoints } from '../../core/cursedBody';
import type { StrikeMods } from '../../core/statSheet';
import type { MoveDef } from '../../data/moves';
import { BODY_AXES } from '../../data/techAxes';
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

  /** CRP-05: px do Alcance, que alargam a caixa do golpe e o rastro dele. */
  get reachPx(): number {
    return axisAt(BODY_AXES.alcance.reachPx, this.points.alcance);
  }

  /**
   * Fase do golpe do player (chamada pelo `ImpactFx.onStrikePhase`). CRP-04: com Ritmo 3 a `recovery` deixa uma
   * pós-imagem do player, uma por golpe, e o evento `bodyEcho:<golpe>` só quando a cópia nasce de fato.
   */
  onStrikePhase(name: string, phase: 'startup' | 'active' | 'recovery' | 'end'): void {
    if (phase !== 'recovery' || this.points.ritmo < BODY_AXES.ritmo.afterimageAt) return;
    if (this.s.player.fx.afterimage(this.s.player.view, true)) this.s.snapshot.debugEvents.push(`bodyEcho:${name}`);
  }

  /** Run nova: os pontos já voltaram a 0 pelo `loadout.reset`; os contadores do combate nascem aqui. */
  reset(): void {}
}
