import type Phaser from 'phaser';
import type { ActiveCastView } from '../../core/cast';
import { Filters } from '../../core/collision';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Vec2 } from '../../core/hit';
import {
  RedOrbState,
  redGeometry,
  redOrbConfig,
  redReleaseEffects,
  repulseTargetsFor,
  type RedGeometry,
  type RepulseCandidate,
} from '../../core/redOrb';
import { newEntityId } from '../bodyTags';
import { Boss } from '../Boss';
import { setIgnoreGravity } from '../physics';
import { RedOrbFx } from '../techFx/RedOrb';
import { TEX } from '../textures';
import { RedFlight, strikeRed } from './redFlight';
import type { TechContext, TechTarget } from './shared';

/**
 * Textura do orbe em voo pelo `orbTexels` do stat (o sensor é pequeno; o orbe visual dá o tamanho percebido): 12 sem
 * ponto na Escala, 14, 16 e 18 com 1, 2 e 3 pontos (VRM-05).
 */
const ORB_TEX: Record<RedGeometry['orbTexels'], string> = {
  12: TEX.techOrbRed12,
  14: TEX.techOrbRed14,
  16: TEX.techOrbRed16,
  18: TEX.techOrbRed18,
};

/**
 * Reversão de Técnica: Vermelho (T25). Dona do seu estado puro (`RedOrbState`) e das vistas próprias em
 * `techFx/RedOrb.ts`: carga na ponta dos dedos, repulsão na soltura e nascimento do orbe. O voo e a detonação moram em
 * `redFlight.ts`.
 */
export class RedTech {
  private readonly fx: RedOrbFx;
  private readonly flight: RedFlight;

  constructor(
    private readonly ctx: TechContext,
    fx: FxTimeline,
    registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
  ) {
    this.fx = new RedOrbFx(ctx.scene, fx, registry, uiLayer);
    this.flight = new RedFlight(ctx, this.fx);
  }

  /** `fx.red` do snapshot (RDA-04/05/06/13): estado vivo das vistas do Vermelho. */
  get debugState(): ReturnType<RedOrbFx['debugState']> {
    return this.fx.debugState();
  }

  /** `techObjects` do snapshot (RED-14): o orbe vivo agora, se houver. */
  get snapshot(): { id: number; kind: 'red'; x: number; y: number; traveled: number } | null {
    const orb = this.flight.current;
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
    this.flight.update(dtMs, enemies);
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
      this.ctx.loadout.stats('vermelho').chargeMs,
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
      strikeRed(this.ctx, enemy, at, cast, {
        damage: r.damage,
        strength: r.strength,
        force: r.force,
        direction: r.direction,
      });
    }
  }

  /** Nascimento do orbe na ponta dos dedos, com o stat copiado na soltura; daí em diante o voo é do `RedFlight`. */
  private spawnOrb(facing: 1 | -1): void {
    const { scene, player } = this.ctx;
    const point = this.fx.fingertip(player.view.x, player.view.y, facing, player.frameName); // RDA-04
    const stats = this.ctx.loadout.stats('vermelho');
    const red = redGeometry(stats);
    const state = new RedOrbState(point.x, facing, redOrbConfig(stats));
    const body = scene.matter.add.circle(point.x, point.y, red.sensorPx, {
      isSensor: true,
      collisionFilter: { ...Filters.techOrb },
    });
    setIgnoreGravity(body, true);
    const view = scene.add.sprite(point.x, point.y, ORB_TEX[red.orbTexels], 'orb').setDepth(2);
    this.flight.launch({ cast: this.ctx.currentCast(), id: newEntityId(), stats, red, state, body, view });
  }
}
