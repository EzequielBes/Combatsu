import type Phaser from 'phaser';
import { canDamage, normalize, type Hit, type Strength, type Vec2 } from '../../core/hit';
import type { RedGeometry, RedOrbState, RedOrbTarget } from '../../core/redOrb';
import type { TechStats } from '../../core/techStats';
import { tagBody, type BodyTag, type Hittable } from '../bodyTags';
import { Boss } from '../Boss';
import type { RedOrbFx } from '../techFx/RedOrb';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** Um orbe do Vermelho já nascido: o que a soltura (`red.ts`) entrega ao voo. */
export interface RedOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  /** TST-02: o stat do Vermelho na soltura (sensor, sprite, força, raio e danos deste orbe). */
  readonly stats: TechStats;
  readonly red: RedGeometry;
  readonly state: RedOrbState;
  readonly body: MatterJS.BodyType;
  readonly view: Phaser.GameObjects.Sprite;
}

/** Os números de um golpe do Vermelho (repulsão, toque, detonação). */
export interface RedBlow {
  readonly damage: number;
  readonly strength: Strength;
  readonly force: number;
  readonly direction: Vec2;
  /** Hitstop a mais (VRM-04): só a detonação leva o da Potência; o toque e a repulsão não. */
  readonly hitstopBonusMs?: number;
}

/** Golpe do Vermelho em `target`. `point` só é lido se o golpe for aceito, já com o alvo reagindo a ele. */
export function strikeRed(
  ctx: TechContext,
  target: Hittable,
  point: () => Vec2,
  cast: CastRef | null,
  blow: RedBlow,
): void {
  const hit: Hit = { ownerId: ctx.player.id, ...blow, ...techMarks(blow.strength, 'vermelho') };
  if (!target.receiveHit(hit)) return;
  ctx.onTechHit(hit, point(), target);
  ctx.masteryHit(cast, target);
}

/**
 * O voo do orbe do Vermelho depois de nascer (VRM-12, preparo): o toque (piercing nos comuns, detonação na parede e
 * no chefe), o alcance máximo e a detonação. Tudo sai do `TechStats` copiado na soltura: um ponto comprado no meio do
 * voo não muda o orbe que já está no ar.
 */
export class RedFlight {
  private orb: RedOrbEntry | null = null;

  constructor(
    private readonly ctx: TechContext,
    private readonly fx: RedOrbFx,
  ) {}

  /** O orbe vivo agora, se houver. */
  get current(): RedOrbEntry | null {
    return this.orb;
  }

  /** Assume um orbe recém-nascido; o anterior, se ainda voava, some sem detonar. */
  launch(entry: RedOrbEntry): void {
    if (this.orb) this.discard(this.orb);
    tagBody(entry.body, { kind: 'active', onTouch: (other) => this.onTouch(entry, other) });
    this.orb = entry;
  }

  update(dtMs: number, enemies: readonly TechTarget[]): void {
    const orb = this.orb;
    if (!orb) return;
    if (!orb.state.detonated) {
      const expired = orb.state.update(dtMs); // RED-08: alcance máximo (420 px)
      if (!expired) {
        this.ctx.scene.matter.body.setPosition(orb.body, { x: orb.state.x, y: orb.body.position.y });
        orb.view.setPosition(orb.state.x, orb.body.position.y);
        this.fx.flightUpdate(dtMs, orb.state.x, orb.body.position.y);
      }
    }
    if (orb.state.detonated) this.finishDetonation(orb, enemies);
  }

  private discard(orb: RedOrbEntry): void {
    this.ctx.scene.matter.world.remove(orb.body);
    orb.view.destroy();
    if (this.orb === orb) this.orb = null;
  }

  /** RED-06/08/09: toque em parede/chefe detona; toque em inimigo comum acerta e o orbe segue voando (piercing). */
  private onTouch(orb: RedOrbEntry, other: BodyTag): void {
    if (orb !== this.orb || orb.state.detonated) return;
    if (other.kind === 'terrain') {
      orb.state.detonate(); // RED-08
      return;
    }
    if (other.kind !== 'character') return;
    const target = other.target;
    if (!canDamage('player', target.team)) return;
    const rect = target.hurtRect?.();
    const center = rect ? { x: rect.x, y: rect.y } : { x: orb.state.x, y: orb.body.position.y };
    const force = orb.red.force;
    if (target instanceof Boss) {
      const direction = normalize({ x: center.x - orb.state.x, y: center.y - orb.body.position.y });
      const damage = orb.stats.damage.hit; // RED-09, TEC-06: já escalado no stat da soltura
      strikeRed(this.ctx, target, () => center, orb.cast, { damage, strength: 'heavy', force, direction });
      orb.state.detonate(); // RED-08: toque no chefe também detona
      return;
    }
    const result = orb.state.hitTest({ id: target.id, center }, orb.body.position.y);
    if (!result) return; // já atingido por este orbe antes (edge case: não acerta de novo)
    // RED-06, TEC-06: o dano do toque já vem escalado do `RedOrbConfig`.
    const blow: RedBlow = { damage: result.damage, strength: 'heavy', force, direction: result.direction };
    strikeRed(this.ctx, target, () => center, orb.cast, blow);
  }

  private finishDetonation(orb: RedOrbEntry, enemies: readonly TechTarget[]): void {
    const point = { x: orb.state.x, y: orb.body.position.y };
    const targets: RedOrbTarget[] = enemies.map((e) => ({ id: e.id, center: { x: e.x, y: e.hurtRect().y } }));
    for (const splash of orb.state.detonationTargets(targets, point)) {
      const enemy = enemies.find((e) => e.id === splash.targetId);
      if (!enemy) continue;
      const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
      // RED-10, TEC-06: o dano da detonação já vem escalado do `RedOrbConfig`.
      const blow: RedBlow = {
        damage: splash.damage,
        strength: 'heavy',
        force: orb.red.force,
        direction: splash.direction,
        hitstopBonusMs: orb.red.hitstopBonusMs, // VRM-04: 10 ms por ponto de Potência
      };
      strikeRed(this.ctx, enemy, at, orb.cast, blow);
    }
    this.fx.detonate(point, this.ctx.player.facing, { radius: orb.red.radius, rings: orb.red.rings }); // RED-11/12/17
    this.ctx.emit('redDetonate'); // RED-16
    this.discard(orb);
  }
}
