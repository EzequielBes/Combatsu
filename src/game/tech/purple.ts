import type { ActiveCastView } from '../../core/cast';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit } from '../../core/hit';
import { PurpleSphere, purpleGeometry, type PurpleGeometry, type PurpleTarget } from '../../core/purple';
import type { Boss } from '../Boss';
import { PurpleOrbFx } from '../techFx/PurpleOrb';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** O que a esfera em voo guarda do stat do disparo (TST-02): a geometria e o dano já escalado. */
interface PurpleShot {
  geometry: PurpleGeometry;
  damage: number;
}

/**
 * Vazio Roxo (EVO-05, EVO-06): a carga cresce na mão; ao soltar (`techCast:roxo`) nasce a esfera à frente do player,
 * que atravessa a fila e acerta cada inimigo e o chefe uma vez. Raio, voo, altura, força e dano saem do
 * `Loadout.stats('roxo')` do disparo (TST-02).
 */
export class PurpleTech {
  private readonly fx: PurpleOrbFx;
  private sphere: PurpleSphere | null = null;
  private shot: PurpleShot | null = null;
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
    return { id: this.sphereId, kind: 'purple', x: s.x, y: s.y, traveled: s.traveled };
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
      const stats = this.ctx.loadout.stats('roxo');
      const t = cast.elapsedMs / (stats.signMs + stats.chargeMs);
      this.fx.charge(player.sprite.x + player.facing * 14, player.sprite.y - 4, t, purpleGeometry(stats).radius);
    }
    if (castEvents.includes('techCast:roxo')) this.launch();
    if (!this.sphere) {
      if (!charging) this.fx.clear();
      return;
    }
    this.fly(dtMs, enemies, boss);
  }

  private launch(): void {
    const { player } = this.ctx;
    const stats = this.ctx.loadout.stats('roxo'); // TST-02: geometria e dano fixos no disparo
    const geometry = purpleGeometry(stats);
    this.shot = { geometry, damage: stats.damage.hit };
    this.sphere = new PurpleSphere(
      player.sprite.x + player.facing * geometry.spawnAhead,
      player.sprite.y - geometry.lift,
      player.facing,
      geometry,
    );
    this.sphereId = ++this.seq;
    this.cast = this.ctx.currentCast();
    this.ctx.emit('purpleLaunch');
  }

  private fly(dtMs: number, enemies: readonly TechTarget[], boss: Boss | null): void {
    const sphere = this.sphere!;
    const shot = this.shot!;
    const targets: PurpleTarget[] = [...enemies, ...(boss ? [boss] : [])].map((t) => {
      const r = t.hurtRect();
      return { id: t.id, x: r.x, y: r.y, halfW: r.width / 2, halfH: r.height / 2 };
    });
    for (const id of sphere.update(dtMs, targets)) {
      const enemy = enemies.find((e) => e.id === id);
      const target = enemy ?? (boss && boss.id === id ? boss : null);
      if (target) this.strike(target, sphere.facing, shot);
    }
    if (!sphere.alive) {
      this.sphere = null;
      this.shot = null;
      this.fx.clear();
      this.ctx.emit('purpleEnd');
      return;
    }
    this.fx.flight(sphere.x, sphere.y, sphere.ageMs, shot.geometry.radius);
  }

  private strike(target: TechTarget | Boss, facing: 1 | -1, shot: PurpleShot): void {
    const dealt: Hit = {
      ownerId: this.ctx.player.id,
      damage: shot.damage, // EVO-06, TEC-06: já escalado no stat do disparo
      strength: 'heavy',
      force: shot.geometry.force,
      direction: { x: facing, y: -0.2 },
      ...techMarks('heavy', 'roxo'),
    };
    if (!target.receiveHit(dealt)) return;
    const at = { x: target.x, y: target.hurtRect().y };
    this.ctx.onTechHit(dealt, at, target);
    this.ctx.masteryHit(this.cast, target);
    this.ctx.emit('purpleHit');
    this.fx.hit(at.x, at.y);
  }
}
