import type Phaser from 'phaser';
import type { ActiveCastView } from '../../core/cast';
import { Filters } from '../../core/collision';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { RedOrbState, redGeometry, redOrbConfig, redReleaseEffects, type RedGeometry } from '../../core/redOrb';
import { newEntityId } from '../bodyTags';
import { setIgnoreGravity } from '../physics';
import { KillRefund } from '../../core/techKit';
import type { TechStats } from '../../core/techStats';
import type { RedObjectSnapshot } from '../debugApi';
import { redPlan } from '../../core/redBranch';
import { RED_AWAKENINGS } from '../../data/techAxes';
import type { Boss } from '../Boss';
import { RedOrbFx } from '../techFx/RedOrb';
import { TEX } from '../textures';
import { RedFlight } from './redFlight';
import { redRepulse } from './redRepulse';
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
    this.flight = new RedFlight(ctx, this.fx, registry);
  }

  /** `fx.red` do snapshot (RDA-04/05/06/13): estado vivo das vistas do Vermelho. */
  get debugState(): ReturnType<RedOrbFx['debugState']> {
    return this.fx.debugState();
  }

  /**
   * `techObjects` do snapshot (RED-14): o orbe vivo agora, se houver. `sensorPx` e `texture` saem do motor (o raio do
   * corpo do Matter e a chave do sprite vivo), não do stat, para o smoke provar que a Escala chegou ao orbe (VRM-05, L-043).
   */
  get snapshot(): RedObjectSnapshot | null {
    const orb = this.flight.current;
    if (!orb) return null;
    return {
      id: orb.id,
      kind: 'red',
      x: orb.state.x,
      y: orb.body.position.y,
      traveled: orb.state.traveled,
      sensorPx: orb.body.circleRadius ?? 0,
      texture: orb.view.texture.key,
    };
  }

  update(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    enemies: readonly TechTarget[],
    slotHeld: readonly [boolean, boolean],
    boss: Boss | null,
  ): void {
    this.updateCharge(dtMs, cast);
    if (castEvents.includes('techCast:vermelho')) this.release(enemies);
    this.flight.update(dtMs, enemies, slotHeld, boss);
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
    // VRM-06: as texturas trocam a cada terço da carga resolvida e a última é a do orbe que vai nascer. No sinal o
    // orbe fica no menor (RED-02 conta os terços só na carga): contar o tempo do sinal o fazia crescer até o tamanho
    // cheio e voltar ao de 4 texels na entrada da carga.
    const { view } = player;
    const stats = this.ctx.loadout.stats('vermelho');
    const elapsedMs = cast.state === 'charge' ? cast.elapsedMs : 0;
    const charge = { elapsedMs, chargeMs: stats.chargeMs, orbTexels: redGeometry(stats).orbTexels };
    this.fx.chargeUpdate(dtMs, view.x, view.y, player.facing, charge, player.frameName);
  }

  private release(enemies: readonly TechTarget[]): void {
    const { player } = this.ctx;
    // O stat da soltura vale para a repulsão, a pós-imagem e o orbe inteiro (TST-02).
    const stats = this.ctx.loadout.stats('vermelho');
    const red = redGeometry(stats);
    // VRM-06: com 3 pontos de Conjuração, uma pós-imagem do player no quadro da soltura.
    if (red.afterimage && player.fx.afterimage(player.view)) this.ctx.emit('redEcho'); // só quando a cópia nasce
    if (red.awakened) this.ctx.emit('awakenCast:vermelho'); // VRM-17: banner e câmera lenta, na 1ª soltura da rodada
    // RED-15, EDG-02: recuo só no chão, oposto ao facing; a repulsão acontece no chão ou no ar.
    const effects = redReleaseEffects({ grounded: player.grounded });
    if (effects.pushPx > 0) player.pushHorizontal(player.facing === 1 ? -1 : 1, effects.pushPx);
    // VRM-07: um reembolso por conjuração, para a repulsão e o orbe; só o 1º abate dela devolve 30% da recarga.
    const cast = this.ctx.currentCast();
    const refund = new KillRefund(stats.cooldownMs, red.killRefundPct);
    const onKill = (): void => {
      if (cast) this.ctx.loadout.refundCooldown(cast.slot, refund.claim());
    };
    if (effects.repulse) redRepulse(this.ctx, this.fx, enemies, red.repulseDamage, onKill); // RDA-08/09, VRM-04
    this.spawnOrb(player.facing, stats, red, onKill);
  }

  /** Nascimento do orbe na ponta dos dedos, com o stat copiado na soltura; daí em diante o voo é do `RedFlight`. */
  private spawnOrb(facing: 1 | -1, stats: TechStats, red: RedGeometry, onKill: () => void): void {
    const { scene, player } = this.ctx;
    const point = this.fx.fingertip(player.view.x, player.view.y, facing, player.frameName); // RDA-04
    const state = new RedOrbState(point.x, facing, redOrbConfig(stats));
    const body = scene.matter.add.circle(point.x, point.y, red.sensorPx, {
      isSensor: true,
      collisionFilter: { ...Filters.techOrb },
    });
    setIgnoreGravity(body, true);
    const view = scene.add.sprite(point.x, point.y, ORB_TEX[red.orbTexels], 'orb').setDepth(2);
    const cast = this.ctx.currentCast();
    const plan = redPlan(red.branch, red.awakened); // VRM-12 a VRM-15
    const fieldChip = this.ctx.loadout.damage('vermelho', RED_AWAKENINGS.vermelhoMaximo.fieldChip); // VRM-15
    this.flight.launch({ cast, id: newEntityId(), stats, red, plan, fieldChip, state, body, view, onKill });
  }
}
