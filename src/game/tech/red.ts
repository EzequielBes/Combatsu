import type Phaser from 'phaser';
import type { ActiveCastView } from '../../core/cast';
import { Filters } from '../../core/collision';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { canDamage, normalize, type Hit, type Strength, type Vec2 } from '../../core/hit';
import {
  RedOrbState,
  redReleaseEffects,
  repulseTargetsFor,
  type RedOrbTarget,
  type RepulseCandidate,
} from '../../core/redOrb';
import { TECHNIQUES } from '../../data/techniques';
import { newEntityId, tagBody, type BodyTag, type Hittable } from '../bodyTags';
import { Boss } from '../Boss';
import { setIgnoreGravity } from '../physics';
import { RedOrbFx } from '../techFx/RedOrb';
import { TEX } from '../textures';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** Raio do sensor de voo do orbe Vermelho (px de mundo); pequeno, o orbe visual é que dá o tamanho percebido. */
const RED_ORB_RADIUS = 6;
/** RED-06/09/10: força (px/step) dos impactos do Vermelho - mesma escala do 2º impacto do Divergente. */
const RED_FORCE = 8;

interface RedOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  readonly state: RedOrbState;
  readonly body: MatterJS.BodyType;
  readonly view: Phaser.GameObjects.Sprite;
}

/**
 * Reversão de Técnica: Vermelho (T25). Dona do seu estado puro (`RedOrbState`) e das vistas próprias em
 * `techFx/RedOrb.ts`: carga na ponta dos dedos, repulsão na soltura, voo do orbe e detonação.
 */
export class RedTech {
  private readonly fx: RedOrbFx;
  private orb: RedOrbEntry | null = null;

  constructor(
    private readonly ctx: TechContext,
    fx: FxTimeline,
    registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
  ) {
    this.fx = new RedOrbFx(ctx.scene, fx, registry, uiLayer);
  }

  /** `fx.red` do snapshot (RDA-04/05/06/13): estado vivo das vistas do Vermelho. */
  get debugState(): ReturnType<RedOrbFx['debugState']> {
    return this.fx.debugState();
  }

  /** `techObjects` do snapshot (RED-14): o orbe vivo agora, se houver. */
  get snapshot(): { id: number; kind: 'red'; x: number; y: number; traveled: number } | null {
    const orb = this.orb;
    if (!orb) return null;
    return { id: orb.id, kind: 'red', x: orb.state.x, y: orb.body.position.y, traveled: orb.state.traveled };
  }

  update(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    enemies: readonly TechTarget[],
  ): void {
    this.updateCharge(dtMs, cast);
    if (castEvents.includes('techCast:vermelho')) this.release(enemies);
    this.updateFlight(dtMs, enemies);
  }

  private updateCharge(dtMs: number, cast: ActiveCastView | null): void {
    const { player } = this.ctx;
    const charging = cast?.id === 'vermelho' && (cast.state === 'sign' || cast.state === 'charge');
    if (!charging) {
      this.fx.hideCharge();
      return;
    }
    // RED-02/03/04: orbe crescendo + faíscas + anel + poeira, na ponta dos dedos.
    // RDA-04: a âncora é a ponta dos dedos do frame atual; o offset sai da origem do sprite (o pé), não do corpo.
    const { view } = player;
    this.fx.chargeUpdate(
      dtMs,
      view.x,
      view.y,
      player.facing,
      cast.elapsedMs,
      TECHNIQUES.vermelho.chargeMs,
      player.frameName,
    );
  }

  private release(enemies: readonly TechTarget[]): void {
    const { player } = this.ctx;
    // RED-15, EDG-02: recuo só no chão, oposto ao facing; a repulsão acontece no chão ou no ar.
    const effects = redReleaseEffects({ grounded: player.grounded });
    if (effects.pushPx > 0) player.pushHorizontal(player.facing === 1 ? -1 : 1, effects.pushPx);
    if (effects.repulse) this.repulse(enemies); // RDA-08/09
    this.spawnOrb(player.facing);
  }

  private updateFlight(dtMs: number, enemies: readonly TechTarget[]): void {
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

  /** Golpe do Vermelho em `target`. `point` só é lido se o golpe for aceito, já com o alvo reagindo a ele. */
  private strike(
    target: Hittable,
    point: () => Vec2,
    cast: CastRef | null,
    damage: number,
    strength: Strength,
    force: number,
    direction: Vec2,
  ): void {
    const hit: Hit = { ownerId: this.ctx.player.id, damage, strength, force, direction, ...techMarks(strength) };
    if (!target.receiveHit(hit)) return;
    this.ctx.onTechHit(hit, point());
    this.ctx.masteryHit(cast, target);
  }

  /**
   * RDA-08/09/10, EDG-03: na soltura, quem está à frente (até 80 px em x e 48 px em y do centro do player) leva 4 de
   * dano leve e é empurrado; quem está atrás não. O chefe fica de fora (só o orbe o atinge, RED-09).
   */
  private repulse(enemies: readonly TechTarget[]): void {
    const { player } = this.ctx;
    const origin = { x: player.sprite.x, y: player.sprite.y };
    this.fx.repulse(origin, player.facing);
    const candidates: RepulseCandidate[] = enemies.map((e) => ({
      id: e.id,
      kind: e instanceof Boss ? 'boss' : 'enemy',
      center: { x: e.x, y: e.hurtRect().y },
    }));
    for (const r of repulseTargetsFor(origin, player.facing, candidates)) {
      const enemy = enemies.find((e) => e.id === r.targetId);
      if (!enemy) continue;
      // MST-01: a repulsão faz parte da mesma conjuração do orbe (mesmo `castId`, então o alvo conta uma vez só).
      const cast = this.ctx.currentCast();
      const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
      this.strike(enemy, at, cast, r.damage, r.strength, r.force, r.direction);
    }
  }

  private spawnOrb(facing: 1 | -1): void {
    const { scene, player } = this.ctx;
    if (this.orb) {
      scene.matter.world.remove(this.orb.body);
      this.orb.view.destroy();
      this.orb = null;
    }
    const point = this.fx.fingertip(player.view.x, player.view.y, facing, player.frameName); // RDA-04
    const state = new RedOrbState(point.x, facing);
    const body = scene.matter.add.circle(point.x, point.y, RED_ORB_RADIUS, {
      isSensor: true,
      collisionFilter: { ...Filters.techOrb },
    });
    setIgnoreGravity(body, true);
    const view = scene.add.sprite(point.x, point.y, TEX.techOrbRed12, 'orb').setDepth(2);
    const entry: RedOrbEntry = { cast: this.ctx.currentCast(), id: newEntityId(), state, body, view };
    tagBody(body, { kind: 'active', onTouch: (other) => this.onTouch(entry, other) });
    this.orb = entry;
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
    const { loadout } = this.ctx;
    if (target instanceof Boss) {
      const direction = normalize({ x: center.x - orb.state.x, y: center.y - orb.body.position.y });
      const damage = loadout.damage('vermelho', TECHNIQUES.vermelho.damage.hit); // RED-09, TEC-06
      this.strike(target, () => center, orb.cast, damage, 'heavy', RED_FORCE, direction);
      orb.state.detonate(); // RED-08: toque no chefe também detona
      return;
    }
    const result = orb.state.hitTest({ id: target.id, center }, orb.body.position.y);
    if (!result) return; // já atingido por este orbe antes (edge case: não acerta de novo)
    const damage = loadout.damage('vermelho', result.damage); // RED-06, TEC-06
    this.strike(target, () => center, orb.cast, damage, 'heavy', RED_FORCE, result.direction);
  }

  private finishDetonation(orb: RedOrbEntry, enemies: readonly TechTarget[]): void {
    const point = { x: orb.state.x, y: orb.body.position.y };
    const targets: RedOrbTarget[] = enemies.map((e) => ({ id: e.id, center: { x: e.x, y: e.hurtRect().y } }));
    for (const splash of orb.state.detonationTargets(targets, point)) {
      const enemy = enemies.find((e) => e.id === splash.targetId);
      if (!enemy) continue;
      const damage = this.ctx.loadout.damage('vermelho', splash.damage); // RED-10, TEC-06
      const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
      this.strike(enemy, at, orb.cast, damage, 'heavy', RED_FORCE, splash.direction);
    }
    this.fx.detonate(point, this.ctx.player.facing); // RED-11/12/17
    this.ctx.emit('redDetonate'); // RED-16
    this.ctx.scene.matter.world.remove(orb.body);
    orb.view.destroy();
    if (this.orb === orb) this.orb = null;
  }
}
