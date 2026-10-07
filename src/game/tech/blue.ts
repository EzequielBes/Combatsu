import { BlueOrbState, blueOrbSpawn, type BlueOrbDamage, type BlueOrbTarget } from '../../core/blueOrb';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit } from '../../core/hit';
import { newEntityId } from '../bodyTags';
import type { Boss } from '../Boss';
import { bodyOf, PX_PER_S_TO_STEP } from '../physics';
import { BlueOrbFx } from '../techFx/BlueOrb';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** BLU-02: alcance da consulta de parede à frente do player (folga acima dos 110 px do orbe). */
const BLUE_WALL_QUERY_PX = 130;

interface BlueOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
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
    this.fx.update(dtMs, point.x, point.y); // BLU-08/09

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
      for (const dmg of orb.state.tickTargets(allTargets)) this.applyDamage(dmg, enemies, boss, orb.cast); // BLU-06
    }
    if (ended) {
      for (const dmg of orb.state.implosionTargets(allTargets)) this.applyDamage(dmg, enemies, boss, orb.cast); // BLU-07
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
    const point = blueOrbSpawn(center, facing, this.wallDistanceAhead(facing)); // BLU-02
    this.orb = { cast: this.ctx.currentCast(), id: newEntityId(), state: new BlueOrbState(point) };
  }

  /** BLU-02: distância (px) até a primeira parede à frente do player, `Infinity` se nenhuma dentro da consulta. */
  private wallDistanceAhead(facing: 1 | -1): number {
    const { sprite } = this.ctx.player;
    const { x, y } = bodyOf(sprite).position;
    const halfH = sprite.displayHeight / 2;
    const region =
      facing === 1
        ? { min: { x, y: y - halfH }, max: { x: x + BLUE_WALL_QUERY_PX, y: y + halfH } }
        : { min: { x: x - BLUE_WALL_QUERY_PX, y: y - halfH }, max: { x, y: y + halfH } };
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
  ): void {
    const hit: Hit = {
      ownerId: this.ctx.player.id,
      damage: this.ctx.loadout.damage('azul', dmg.damage), // BLU-06/07, TEC-06
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
      ...techMarks('light'),
    };
    const enemy = enemies.find((e) => e.id === dmg.targetId);
    if (enemy) {
      if (enemy.receiveHit(hit)) {
        this.ctx.onTechHit(hit, { x: enemy.x, y: enemy.hurtRect().y });
        this.ctx.masteryHit(cast, enemy);
      }
      return;
    }
    if (boss && boss.id === dmg.targetId && boss.receiveHit(hit)) {
      this.ctx.onTechHit(hit, { x: boss.x, y: boss.hurtRect().y });
      this.ctx.masteryHit(cast, boss);
    }
  }
}
