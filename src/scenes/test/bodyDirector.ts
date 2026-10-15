import { axisAt } from '../../core/axisRule';
import { bodyStrike, CadenceCounter, FuryCounter, type BodyPoints } from '../../core/cursedBody';
import type { Hit, Vec2 } from '../../core/hit';
import type { StrikeMods } from '../../core/statSheet';
import type { MoveDef } from '../../data/moves';
import { BODY_AXES } from '../../data/techAxes';
import type { Hittable } from '../../game/bodyTags';
import { FuryAura, furyAuraCenter } from '../../game/FuryAura';
import type { TestScene } from '../TestScene';

/**
 * O Corpo Amaldiçoado no combate (CRP-03 a CRP-13): lê os pontos do `loadout.axes` e muda o golpe do player pelo
 * `StatsDirector.strikeMods`. Campo `body` do `BuildDirector`, zerado no `reset` da run nova.
 */
export class BodyDirector {
  /** CRP-07: acúmulos da Fúria (um por golpe do moveset que acerta). */
  readonly fury = new FuryCounter();
  /** CRP-08: golpes seguidos que acertam (o ramo Cadência lê). */
  readonly cadence = new CadenceCounter();
  /** Vida e vida máxima do player no último quadro de jogo, para achar a perda de HP; `null` antes do 1º quadro. */
  private lastHp: { hp: number; max: number } | null = null;
  /** CRP-07.11: aura laranja da Fúria, criada com o 1º acúmulo e largada quando eles zeram (ou no `R`). */
  private aura: FuryAura | null = null;

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
    // CRP-07: a Fúria soma a fração dos acúmulos ao dano do golpe.
    const damage = base.damage * (1 + this.fury.bonus(this.points.furia));
    return { ...base, damage, force: base.force * b.forceMul, reachPx: b.reachPx, recoveryMul: b.recoveryMul, marks };
  }

  /** CRP-06: energia a mais por golpe corpo a corpo que acerta (os pontos do Fluxo). */
  get flowBonus(): number {
    return axisAt(BODY_AXES.fluxo.energyBonus, this.points.fluxo);
  }

  /**
   * Golpe corpo a corpo do player que acertou (chamado pelo `BuildDirector.onMeleeHit`). CRP-07: o golpe do moveset
   * soma um acúmulo da Fúria e um da Cadência, uma vez por golpe (vários alvos do mesmo golpe contam um); o objeto na
   * mão não é golpe do moveset.
   */
  onMeleeHit(hit: Hit, _point: Vec2, _target?: Hittable): void {
    if (hit.moveName === undefined || hit.swingId === undefined) return;
    this.fury.onConnect(hit.swingId);
    this.cadence.onConnect(hit.swingId);
  }

  /**
   * A cada quadro de jogo (fora do hitstop e da loja, pelo `TechDirector`). CRP-07, CRP-08.3: a perda de HP zera a
   * Fúria e a Cadência. A vida que a vida máxima menor recorta (o voto Corpo de vidro tomado na loja) não é perda.
   */
  update(_dtMs: number): void {
    const { hp, maxHp } = this.s.player;
    const last = this.lastHp;
    this.lastHp = { hp, max: maxHp };
    if (last !== null && hp < Math.min(last.hp, maxHp)) {
      this.fury.onHpLoss();
      this.cadence.onHpLoss();
    }
    this.updateAura();
  }

  /**
   * CRP-07.11: com pontos na Fúria e acúmulos a aura acende e cresce com eles; sem acúmulo ela some e sai do
   * `FxRegistry`. A aura do `R` anterior já foi destruída no `SHUTDOWN` e nasce de novo aqui.
   */
  private updateAura(): void {
    const stacks = this.points.furia > 0 ? this.fury.stacks : 0;
    if (stacks === 0) {
      this.dropAura();
      return;
    }
    if (!this.aura || this.aura.destroyed) this.aura = new FuryAura(this.s, this.s.fxRegistry);
    const p = this.s.player;
    this.aura.update(furyAuraCenter(p.renderPos, p.facing, p.move.vx), stacks);
  }

  private dropAura(): void {
    if (!this.aura) return;
    this.aura.update(this.s.player.renderPos, 0);
    this.s.fxRegistry.scheduleDestroy(this.aura, 0);
    this.aura = null;
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

  /** Run nova: os pontos já voltaram a 0 pelo `loadout.reset`; os contadores do combate zeram aqui. */
  reset(): void {
    this.fury.reset();
    this.cadence.reset();
    this.lastHp = null;
    this.dropAura();
  }

  /** Fúria, Cadência e o raio desenhado da aura (0 apagada) para o `build.corpo` do snapshot (CRP-14). */
  snapshot(): { fury: { stacks: number; bonus: number }; cadence: number; aura: number } {
    const fury = { stacks: this.fury.stacks, bonus: this.fury.bonus(this.points.furia) };
    return { fury, cadence: this.cadence.count, aura: this.aura?.view ?? 0 };
  }
}
