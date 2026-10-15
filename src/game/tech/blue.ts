import {
  BlueOrbState,
  blueGeometry,
  blueOrbConfig,
  blueOrbSpawn,
  type BlueGeometry,
  type BlueOrbDamage,
  type BlueOrbTarget,
} from '../../core/blueOrb';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit, HitBand } from '../../core/hit';
import { newEntityId } from '../bodyTags';
import type { Boss } from '../Boss';
import { bodyOf, PX_PER_S_TO_STEP } from '../physics';
import { BlueOrbFx } from '../techFx/BlueOrb';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

interface BlueOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  /** TST-02: a geometria do Azul no nascimento (raio da vista; o `state` leva raio, tempos e danos deste orbe). */
  readonly blue: BlueGeometry;
  readonly state: BlueOrbState;
}

/** Azul (T26): orbe parado à frente do player que puxa os inimigos comuns, dá dano em ticks e implode no fim. */
export class BlueTech {
  private readonly fx: BlueOrbFx;
  private orb: BlueOrbEntry | null = null;

  constructor(
    private readonly ctx: TechContext,
    fx: FxTimeline,
    registry: FxRegistry,
    /** BAT-06/terreno: mesma lista do `Player`, para achar a distância até a parede à frente (BLU-02). */
    private readonly terrain: MatterJS.BodyType[],
  ) {
    this.fx = new BlueOrbFx(ctx.scene, fx, registry);
  }

  /** `techObjects` do snapshot (BLU-10): o orbe vivo agora, se houver. */
  get snapshot(): { id: number; kind: 'blue'; x: number; y: number; traveled: number } | null {
    const orb = this.orb;
    if (!orb) return null;
    return { id: orb.id, kind: 'blue', x: orb.state.position.x, y: orb.state.position.y, traveled: 0 };
  }

  update(dtMs: number, castEvents: readonly string[], enemies: readonly TechTarget[], boss: Boss | null): void {
    if (castEvents.includes('techCast:azul')) this.spawnOrb(this.ctx.player.facing);

    const orb = this.orb;
    if (!orb) return;
    const point = orb.state.position;
    this.fx.update(dtMs, point.x, point.y, orb.blue.radius); // BLU-08/09, TST-03

    const enemyTargets: BlueOrbTarget[] = enemies.map((e) => ({
      id: e.id,
      center: { x: e.x, y: e.hurtRect().y },
      kind: 'enemy',
    }));
    const allTargets: BlueOrbTarget[] = boss
      ? [...enemyTargets, { id: boss.id, center: { x: boss.x, y: boss.hurtRect().y }, kind: 'boss' }] // BLU-05: chefe nunca puxado, só listado para o tick/implosão.
      : enemyTargets;

    // BLU-04/05: puxão reaplicado a cada frame (L-001), só em inimigo comum, dentro do raio.
    const pulls = orb.state.pullTargets(enemyTargets);
    for (const e of enemies) {
      const pull = pulls.find((p) => p.targetId === e.id);
      e.setPull(pull ? { x: pull.velocity.x * PX_PER_S_TO_STEP, y: pull.velocity.y * PX_PER_S_TO_STEP } : null);
    }

    const { ticksCrossed, ended } = orb.state.update(dtMs);
    for (let i = 0; i < ticksCrossed; i++) {
      // BLU-06, POW-04: o tique é chip (só dano, sem hitstop nem reação), para a luta seguir enquanto o orbe puxa.
      for (const dmg of orb.state.tickTargets(allTargets)) this.applyDamage(dmg, enemies, boss, orb.cast, 'chip');
    }
    if (ended) {
      // BLU-07, POW-04: a implosão é o golpe que fecha a técnica, sem banda (hitstop e reação de sempre).
      for (const dmg of orb.state.implosionTargets(allTargets)) this.applyDamage(dmg, enemies, boss, orb.cast);
      this.fx.implode(point.x, point.y); // BLU-11
      this.ctx.emit('blueImplode'); // BLU-11
      for (const e of enemies) e.setPull(null);
      this.orb = null;
    }
  }

  private spawnOrb(facing: 1 | -1): void {
    if (this.orb) {
      this.fx.hide();
      this.orb = null;
    }
    const { sprite } = this.ctx.player;
    const center = { x: sprite.x, y: sprite.y };
    const stats = this.ctx.loadout.stats('azul'); // TST-02: raio, tempos e danos deste orbe, fixos no nascimento
    const blue = blueGeometry(stats);
    const point = blueOrbSpawn(center, facing, this.wallDistanceAhead(facing, blue.wallQueryPx), blue); // BLU-02
    const state = new BlueOrbState(point, blueOrbConfig(stats));
    this.orb = { cast: this.ctx.currentCast(), id: newEntityId(), blue, state };
  }

  /**
   * BLU-02: distância (px) até a primeira parede à frente do player, `Infinity` se nenhuma dentro dos `queryPx` da
   * consulta (folga acima da distância de nascimento do orbe).
   */
  private wallDistanceAhead(facing: 1 | -1, queryPx: number): number {
    const { sprite } = this.ctx.player;
    const { x, y } = bodyOf(sprite).position;
    const halfH = sprite.displayHeight / 2;
    const region =
      facing === 1
        ? { min: { x, y: y - halfH }, max: { x: x + queryPx, y: y + halfH } }
        : { min: { x: x - queryPx, y: y - halfH }, max: { x, y: y + halfH } };
    const hits = this.ctx.scene.matter.query.region(this.terrain, region);
    let closest = Infinity;
    for (const body of hits) {
      const edge = facing === 1 ? body.bounds.min.x : body.bounds.max.x;
      const dist = facing === 1 ? edge - x : x - edge;
      // Desvio (fix(fx) do lote de polimento): o chão (uma faixa larga por linha, parseLevel) sempre entra no
      // resultado da `query.region` porque os pés do player tocam o topo dele - a borda esquerda dessa faixa fica
      // muito atrás do player (`edge` bem menor que `x`), o que dava `dist` bem negativo. Como o laço só guardava
      // o menor `dist` (sem checar o sinal), esse negativo sempre vencia qualquer parede real e o `Math.max(0, …)`
      // final zerava tudo - o orbe Azul nascia sempre colado no player (BLU-02 quebrado sempre, não só perto de
      // parede). Só um corpo cuja borda relevante está à frente do player (`dist >= 0`) conta como parede real.
      if (dist >= 0 && dist < closest) closest = dist;
    }
    return Math.max(0, closest);
  }

  private applyDamage(
    dmg: BlueOrbDamage,
    enemies: readonly TechTarget[],
    boss: Boss | null,
    cast: CastRef | null,
    band?: HitBand,
  ): void {
    const hit: Hit = {
      ownerId: this.ctx.player.id,
      damage: dmg.damage, // BLU-06/07, TEC-06: já escalado no stat do nascimento
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
      ...techMarks('light', 'azul'),
      ...(band ? { band } : {}),
    };
    const enemy = enemies.find((e) => e.id === dmg.targetId);
    if (enemy) {
      if (enemy.receiveHit(hit)) {
        this.ctx.onTechHit(hit, { x: enemy.x, y: enemy.hurtRect().y }, enemy);
        this.ctx.masteryHit(cast, enemy);
      }
      return;
    }
    if (boss && boss.id === dmg.targetId && boss.receiveHit(hit)) {
      this.ctx.onTechHit(hit, { x: boss.x, y: boss.hurtRect().y }, boss);
      this.ctx.masteryHit(cast, boss);
    }
  }
}
