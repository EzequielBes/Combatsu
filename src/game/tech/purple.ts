import type { ActiveCastView } from '../../core/cast';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit } from '../../core/hit';
import { PURPLE, PurpleSphere, type PurpleTarget } from '../../core/purple';
import { TECHNIQUES } from '../../data/techniques';
import type { Boss } from '../Boss';
import { PurpleOrbFx } from '../techFx/PurpleOrb';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** A esfera voa na altura do peito: acima do centro do corpo, para a borda de baixo não entrar no piso. */
const SPHERE_LIFT = 14;

/** Empurrão do golpe do Vazio Roxo (px/step), na direção do voo. */
const PURPLE_FORCE = 9;

/**
 * Vazio Roxo (EVO-05, EVO-06): a carga cresce na mão; ao soltar (`techCast:roxo`) nasce a esfera à frente do player,
 * que atravessa a fila e acerta cada inimigo e o chefe uma vez, com o dano de `TECHNIQUES.roxo` escalado pelo nível.
 */
export class PurpleTech {
  private readonly fx: PurpleOrbFx;
  private sphere: PurpleSphere | null = null;
  private cast: CastRef | null = null;
  private seq = 0;
  private sphereId = 0;

  constructor(
    private readonly ctx: TechContext,
    fx: FxTimeline,
    registry: FxRegistry,
  ) {
    this.fx = new PurpleOrbFx(ctx.scene, fx, registry);
  }

  /** `techObjects` do snapshot: a esfera viva, com a distância percorrida. */
  get snapshot(): { id: number; kind: 'purple'; x: number; y: number; traveled: number } | null {
    const s = this.sphere;
    if (!s) return null;
    return { id: this.sphereId, kind: 'purple', x: s.x, y: s.y, traveled: (PURPLE.speed * s.ageMs) / 1000 };
  }

  update(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    enemies: readonly TechTarget[],
    boss: Boss | null,
  ): void {
    const { player } = this.ctx;
    const charging = cast?.id === 'roxo' && (cast.state === 'sign' || cast.state === 'charge');
    if (charging && !this.sphere) {
      const total = TECHNIQUES.roxo.signMs + TECHNIQUES.roxo.chargeMs;
      this.fx.charge(player.sprite.x + player.facing * 14, player.sprite.y - 4, cast.elapsedMs / total);
    }
    if (castEvents.includes('techCast:roxo')) {
      this.sphere = new PurpleSphere(
        player.sprite.x + player.facing * PURPLE.spawnAhead,
        player.sprite.y - SPHERE_LIFT,
        player.facing,
      );
      this.sphereId = ++this.seq;
      this.cast = this.ctx.currentCast();
      this.ctx.emit('purpleLaunch');
    }
    if (!this.sphere) {
      if (!charging) this.fx.clear();
      return;
    }
    this.fly(dtMs, enemies, boss);
  }

  private fly(dtMs: number, enemies: readonly TechTarget[], boss: Boss | null): void {
    const sphere = this.sphere!;
    const targets: PurpleTarget[] = [...enemies, ...(boss ? [boss] : [])].map((t) => {
      const r = t.hurtRect();
      return { id: t.id, x: r.x, y: r.y, halfW: r.width / 2, halfH: r.height / 2 };
    });
    for (const id of sphere.update(dtMs, targets)) {
      const enemy = enemies.find((e) => e.id === id);
      const target = enemy ?? (boss && boss.id === id ? boss : null);
      if (target) this.strike(target, sphere.facing);
    }
    if (!sphere.alive) {
      this.sphere = null;
      this.fx.clear();
      this.ctx.emit('purpleEnd');
      return;
    }
    this.fx.flight(sphere.x, sphere.y, sphere.ageMs);
  }

  private strike(target: TechTarget | Boss, facing: 1 | -1): void {
    const dealt: Hit = {
      ownerId: this.ctx.player.id,
      damage: this.ctx.loadout.damage('roxo', TECHNIQUES.roxo.damage.hit), // EVO-06, TEC-06
      strength: 'heavy',
      force: PURPLE_FORCE,
      direction: { x: facing, y: -0.2 },
      ...techMarks('heavy'),
    };
    if (!target.receiveHit(dealt)) return;
    const at = { x: target.x, y: target.hurtRect().y };
    this.ctx.onTechHit(dealt, at);
    this.ctx.masteryHit(this.cast, target);
    this.ctx.emit('purpleHit');
    this.fx.hit(at.x, at.y);
  }
}
