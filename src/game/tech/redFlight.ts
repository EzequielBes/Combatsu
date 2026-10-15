import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import { canDamage, normalize, type Hit, type HitBand, type Strength, type Vec2 } from '../../core/hit';
import {
  ContidoHold,
  detonationMul,
  pickRebound,
  shardTargets,
  shouldRebound,
  speedAfter,
  type DetonationSite,
  type RedPlan,
  type RedTarget,
} from '../../core/redBranch';
import type { RedGeometry, RedOrbState, RedOrbTarget } from '../../core/redOrb';
import type { TechStats } from '../../core/techStats';
import { RED_AXES, RED_BRANCHES } from '../../data/techAxes';
import { TECH_RULE } from '../../data/techRule';
import type { Rect } from '../bodyTags';
import { tagBody, type BodyTag, type Hittable } from '../bodyTags';
import { Boss } from '../Boss';
import type { RedOrbFx } from '../techFx/RedOrb';
import { RedFieldRunner } from './redField';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** Um orbe do Vermelho já nascido: o que a soltura (`red.ts`) entrega ao voo. */
export interface RedOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  /** TST-02: o stat do Vermelho na soltura (sensor, sprite, força, raio e danos deste orbe). */
  readonly stats: TechStats;
  readonly red: RedGeometry;
  /** VRM-12 a VRM-15: o que o ramo e o Despertar mudam neste orbe (copiado na soltura). */
  readonly plan: RedPlan;
  readonly state: RedOrbState;
  readonly body: MatterJS.BodyType;
  readonly view: Phaser.GameObjects.Sprite;
  /** VRM-15: o chip do campo do Vermelho Máximo, `round(3 × damageMul × vowDamageMul)` na soltura. */
  readonly fieldChip: number;
  /** VRM-07: avisa um abate da conjuração (o reembolso dela, criado na soltura; só o 1º abate devolve a recarga). */
  readonly onKill: () => void;
}

/** Os números de um golpe do Vermelho (repulsão, toque, detonação). */
export interface RedBlow {
  readonly damage: number;
  readonly strength: Strength;
  readonly force: number;
  readonly direction: Vec2;
  /** Hitstop a mais (VRM-04): só a detonação leva o da Potência; o toque e a repulsão não. */
  readonly hitstopBonusMs?: number;
  /** Faixa do acerto (POW-03): o estilhaço da Perfuração é `micro` (VRM-08). */
  readonly band?: HitBand;
  /** VRM-13, VRM-15: fração do HP máximo do alvo somada ao dano (o chefe fica no teto de 1 %). */
  readonly maxHpBonus?: number;
  /** VRM-15, VRM-16: o comum derrubado pela detonação do Vermelho Máximo fica atordoado se bater numa parede. */
  readonly wallStun?: boolean;
}

/** A detonação `n` do orbe (1 na 1ª): o toque do trecho atual conta para ela. */
const detonationNo = (orb: RedOrbEntry): number => orb.state.detonations + 1;

/**
 * VRM-12.4, VRM-13: o dano `base` do toque ou da detonação `n`: 70 % depois da 1ª no Ricochete e no Fliperama (o
 * orbe sem ramo e o Contido nunca passam da 1ª) e o componente proporcional na detonação que o plano marca.
 */
function scaled(orb: RedOrbEntry, base: number, n: number): Pick<RedBlow, 'damage' | 'maxHpBonus'> {
  const damage = Math.round(base * detonationMul(n));
  return orb.plan.pctOnDetonation(n) ? { damage, maxHpBonus: TECH_RULE.maxHpPct.enemy } : { damage };
}

/** O alvo do estilhaço (VRM-08): a caixa de acerto do alvo, do centro (`Rect`) para o canto (`Box`). */
function shardTarget(target: { id: number; hurtRect(): Rect }): RedTarget {
  const r = target.hurtRect();
  return { id: target.id, box: { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height } };
}

/**
 * Golpe do Vermelho em `target`. `point` só é lido se o golpe for aceito, já com o alvo reagindo a ele. Devolve se o
 * alvo aceitou o golpe. VRM-07: se o golpe abate o alvo, avisa o `onKill` da conjuração (o `KillRefund` dela).
 */
export function strikeRed(
  ctx: TechContext,
  target: Hittable,
  point: () => Vec2,
  cast: CastRef | null,
  blow: RedBlow,
  onKill: () => void,
): boolean {
  const hit: Hit = { ownerId: ctx.player.id, ...blow, ...techMarks(blow.strength, 'vermelho') };
  if (!target.receiveHit(hit)) return false;
  ctx.onTechHit(hit, point(), target);
  ctx.masteryHit(cast, target);
  if (target.isDead?.()) onKill();
  return true;
}

/**
 * O voo do orbe do Vermelho depois de nascer (VRM-12, preparo): o toque (piercing nos comuns, detonação na parede e
 * no chefe), o alcance máximo e a detonação. Tudo sai do `TechStats` copiado na soltura: um ponto comprado no meio do
 * voo não muda o orbe que já está no ar.
 */
export class RedFlight {
  private orb: RedOrbEntry | null = null;
  /** Os alvos do último quadro: o toque vem do Matter, que não traz a lista, e o estilhaço procura os vizinhos nela. */
  private targets: readonly TechTarget[] = [];
  /** VRM-08: quem já levou estilhaço nesta conjuração (um orbe por conjuração); cada um leva no máximo um. */
  private shardHit = new Set<number>();
  /**
   * Eventos do toque: o toque vem do passo do Matter, depois de o `TechRunner` já ter lido os eventos do quadro (e antes
   * de zerá-los no próximo), então saem no começo do `update` seguinte.
   */
  private touchEvents: string[] = [];
  /** Onde a detonação pendente aconteceu (VRM-12, VRM-13: o fim do voo no ar só rebate no Fliperama). */
  private site: DetonationSite = 'end';
  /**
   * VRM-14: o orbe do Contido, armado no 1º quadro do voo com a tecla do slot daquele quadro (o da soltura: o `red.ts`
   * lança antes de chamar o `update`); `null` fora do Contido.
   */
  private hold: ContidoHold | null = null;
  private armPending = false;
  /** VRM-15: o campo do Vermelho Máximo vive além do orbe. */
  private readonly field: RedFieldRunner;

  constructor(
    private readonly ctx: TechContext,
    private readonly fx: RedOrbFx,
    registry: FxRegistry,
  ) {
    this.field = new RedFieldRunner(ctx, registry);
  }

  /** O orbe vivo agora, se houver. */
  get current(): RedOrbEntry | null {
    return this.orb;
  }

  /** Assume um orbe recém-nascido; o anterior, se ainda voava, some sem detonar. */
  launch(entry: RedOrbEntry): void {
    if (this.orb) this.discard(this.orb);
    tagBody(entry.body, { kind: 'active', onTouch: (other) => this.onTouch(entry, other) });
    this.orb = entry;
    this.shardHit = new Set();
    this.site = 'end';
    this.hold = null;
    this.armPending = entry.plan.holdable;
  }

  /** `slotHeld`: a tecla de cada slot segurada neste quadro (VRM-14: o orbe do Contido detona ao soltar). */
  update(dtMs: number, enemies: readonly TechTarget[], slotHeld: readonly [boolean, boolean], boss: Boss | null): void {
    this.targets = enemies;
    for (const event of this.touchEvents.splice(0)) this.ctx.emit(event);
    this.field.update(dtMs, enemies, boss);
    const orb = this.orb;
    if (!orb) return;
    const held = orb.cast !== null && slotHeld[orb.cast.slot];
    if (this.armPending) {
      this.armPending = false;
      this.hold = new ContidoHold(held, orb.red.speed, orb.red.rangePx);
    }
    // VRM-14: soltar a tecla ou passar 1,2 s detona o orbe segurado onde estiver (voando ou pairando).
    if (!orb.state.detonated && this.hold?.update(dtMs, held) === 'detonate') this.detonate(orb, 'end');
    if (!orb.state.detonated) {
      // RED-08: alcance máximo (320 px); o orbe segurado paira ali em vez de detonar.
      const expired = orb.state.update(dtMs, this.hold?.armed ?? false);
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

  /**
   * RED-06/08/09: toque em parede/chefe detona; toque em inimigo comum acerta e o orbe segue voando (piercing). VRM-12:
   * sem piercing (Ricochete, Fliperama), o comum também detona, menos quem a detonação atual já pegou.
   */
  private onTouch(orb: RedOrbEntry, other: BodyTag): void {
    if (orb !== this.orb || orb.state.detonated) return;
    if (other.kind === 'terrain') {
      this.detonate(orb, 'wall'); // RED-08; VRM-13: a parede e o chão contam como rebote
      return;
    }
    if (other.kind !== 'character') return;
    const target = other.target;
    if (!canDamage('player', target.team)) return;
    const rect = target.hurtRect?.();
    const center = rect ? { x: rect.x, y: rect.y } : { x: orb.state.x, y: orb.body.position.y };
    const n = detonationNo(orb);
    if (target instanceof Boss) {
      const direction = normalize({ x: center.x - orb.state.x, y: center.y - orb.body.position.y });
      // RED-09, TEC-06: já escalado no stat da soltura
      this.touch(orb, target, center, { ...scaled(orb, orb.stats.damage.hit, n), direction });
      this.detonate(orb, 'boss'); // RED-08: toque no chefe também detona
      return;
    }
    if (!orb.plan.pierce && orb.state.hitByCurrent.has(target.id)) return;
    const result = orb.state.hitTest({ id: target.id, center }, orb.body.position.y);
    // RED-06, TEC-06: o dano do toque já vem escalado do `RedOrbConfig`.
    if (result) this.touch(orb, target, center, { ...scaled(orb, result.damage, n), direction: result.direction });
    if (!orb.plan.pierce)
      this.detonate(orb, 'enemy'); // VRM-12.2
    else if (result) this.shard(orb, target.id, center);
  }

  /** O toque do orbe em `target` (forte, com a força do orbe); emite `redTouch:<n>:<alvo>:<dano levado>`. */
  private touch(orb: RedOrbEntry, target: Hittable, center: Vec2, part: Omit<RedBlow, 'strength' | 'force'>): void {
    const blow: RedBlow = { ...part, strength: 'heavy', force: orb.red.force };
    if (!strikeRed(this.ctx, target, () => center, orb.cast, blow, orb.onKill)) return;
    this.touchEvents.push(`redTouch:${detonationNo(orb)}:${target.id}:${target.lastDamageTaken ?? blow.damage}`);
  }

  private detonate(orb: RedOrbEntry, site: DetonationSite): void {
    this.site = site;
    orb.state.detonate();
  }

  /**
   * VRM-08: ao atravessar um comum, a Perfuração acerta os 1/2/2 comuns mais perto dele (a até 60 px) com um estilhaço
   * `micro` do `red.shard`, cada um no máximo uma vez por conjuração. Emite `redShard:<atravessado>:<alvo>:<dano>` com
   * o dano que o alvo levou de fato (o número na tela se funde com o do toque quando o orbe chega nele depois).
   */
  private shard(orb: RedOrbEntry, passedId: number, from: Vec2): void {
    const count = orb.red.shardNeighbors;
    const passed = this.targets.find((e) => e.id === passedId);
    if (count === 0 || !passed) return;
    const others = this.targets.map(shardTarget);
    const reach = RED_AXES.perfuracao.shardReachPx;
    for (const id of shardTargets(shardTarget(passed), others, count, this.shardHit, reach)) {
      const enemy = this.targets.find((e) => e.id === id);
      if (!enemy) continue;
      const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
      const direction = normalize({ x: enemy.x - from.x, y: 0 });
      const blow: RedBlow = { damage: orb.red.shard, strength: 'light', force: 0, direction, band: 'micro' };
      if (!strikeRed(this.ctx, enemy, at, orb.cast, blow, orb.onKill)) continue;
      this.touchEvents.push(`redShard:${passedId}:${id}:${enemy.lastDamageTaken ?? blow.damage}`);
    }
  }

  private finishDetonation(orb: RedOrbEntry, enemies: readonly TechTarget[]): void {
    const point = { x: orb.state.x, y: orb.body.position.y };
    const n = detonationNo(orb);
    // VRM-14: o orbe segurado do Contido detona com o raio × 1,4, seja ao soltar, aos 1,2 s, na parede ou no chefe.
    const radius = orb.red.radius * (this.hold?.armed ? orb.plan.radiusMul : 1);
    const targets: RedOrbTarget[] = enemies.map((e) => ({ id: e.id, center: { x: e.x, y: e.hurtRect().y } }));
    for (const splash of orb.state.detonationTargets(targets, point, radius)) {
      const enemy = enemies.find((e) => e.id === splash.targetId);
      if (!enemy) continue;
      const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
      // RED-10, TEC-06: o dano da detonação já vem escalado do `RedOrbConfig`; VRM-12.4 e VRM-13 por cima.
      const blow: RedBlow = {
        ...scaled(orb, splash.damage, n),
        strength: 'heavy',
        force: orb.red.force,
        direction: splash.direction,
        hitstopBonusMs: orb.red.hitstopBonusMs, // VRM-04: 10 ms por ponto de Potência
        ...(orb.plan.field ? { wallStun: true } : {}), // VRM-16
      };
      if (!strikeRed(this.ctx, enemy, at, orb.cast, blow, orb.onKill)) continue;
      this.ctx.emit(`redBlast:${n}:${enemy.id}:${enemy.lastDamageTaken ?? blow.damage}`);
    }
    this.fx.detonate(point, this.ctx.player.facing, { radius, rings: orb.red.rings }); // RED-11/12/17
    this.ctx.emit('redDetonate'); // RED-16
    if (orb.plan.field) {
      // VRM-15: o campo do Vermelho Máximo, do mesmo raio da detonação
      this.field.open({ center: point, radius, cast: orb.cast, chip: orb.fieldChip, onKill: orb.onKill });
    }
    if (shouldRebound(orb.plan, n, this.site)) this.rebound(orb, point, n);
    else this.discard(orb);
  }

  /**
   * VRM-12.3, VRM-12.5, VRM-13: o orbe rebate do ponto da detonação `n` rumo ao comum mais perto a até 200 px que ela não
   * pegou (e a até 320 px do player), ou volta pelo lado oposto; voa até 200 px e detona no 1º toque ou no fim. O
   * Fliperama acelera 15 % por detonação.
   */
  private rebound(orb: RedOrbEntry, point: Vec2, n: number): void {
    const candidates: RedTarget[] = this.targets.map((t) => ({
      ...shardTarget(t),
      ...(t instanceof Boss ? { kind: 'boss' as const } : {}),
    }));
    const pick = pickRebound(point, orb.state.dir, candidates, orb.state.hitByCurrent, this.ctx.player.sprite.x);
    const speed = orb.plan.reboundAny ? speedAfter(n, orb.red.speed) : orb.red.speed;
    orb.state.rebound(point.x, pick.dir, RED_BRANCHES.ricochete.reboundRangePx, speed);
    this.site = 'end';
  }
}
