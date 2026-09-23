import Phaser from 'phaser';
import { RUN_THRESHOLD, pickEnemyAnim } from '../core/animState';
import { Filters } from '../core/collision';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import { normalize, type Hit, type Vec2 } from '../core/hit';
import { ENEMY } from '../data/tuning';
import { enemyAnimKey } from './art';
import { PALETTE } from './art/palette';
import { ENEMY_ORIGIN } from './art/sprites/enemy';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import { applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE, TEX } from './textures';

/** Duração (ms) do flash branco do golpe leve. */
const HIT_FLASH_MS = 70;

/**
 * Corpo físico (retângulo Matter) separado do visual (sprite animado com a origem no pé, no centro do corpo).
 * A animação sai do pickEnemyAnim (CHR-03); em ragdoll o sprite some e as partes do ragdoll aparecem (CHR-04).
 */
export class Enemy implements Hittable {
  readonly id = newEntityId();
  readonly team = 'enemy';
  private readonly brain = new EnemyBrain(ENEMY);
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Sprite;
  private ragdoll: Ragdoll | null = null;
  private facing: 1 | -1 = 1;
  private _removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly spawn: Vec2,
    private readonly onRemoved: (enemy: Enemy) => void,
  ) {
    const { w, h } = SIZE.enemy;
    this.body = scene.matter.add.rectangle(spawn.x, spawn.y, w, h, {
      friction: 0.8,
      frictionAir: 0.02,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.enemy },
    });
    scene.matter.body.setInertia(this.body, Infinity); // não tomba
    tagBody(this.body, { kind: 'character', target: this });
    this.view = scene.add.sprite(spawn.x, spawn.y + h / 2, TEX.enemy, 'idle-0').setOrigin(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y);
  }

  get x(): number {
    return this.body.position.x;
  }

  get state(): EnemyState {
    return this.brain.state;
  }

  get removed(): boolean {
    return this._removed;
  }

  receiveHit(hit: Hit): void {
    this.handle(this.brain.receiveHit(hit));
  }

  update(dtMs: number, playerX: number): void {
    if (this._removed) return;
    this.handle(this.brain.update(dtMs));
    if (this._removed) return;
    if (this.ragdoll) {
      // Corpo escondido acompanha o tronco para o "levantar" nascer no lugar certo.
      this.scene.matter.body.setPosition(this.body, this.ragdoll.center);
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      return;
    }
    if (this.brain.state === 'idle' && playerX !== this.body.position.x) this.facing = playerX < this.body.position.x ? -1 : 1;
    this.animate();
  }

  private animate(): void {
    const vxPerS = this.body.velocity.x * 60;
    const anim = pickEnemyAnim({ brain: this.brain.state, ai: 'patrol', moving: Math.abs(vxPerS) > RUN_THRESHOLD });
    this.view.setPosition(this.body.position.x, this.body.position.y + SIZE.enemy.h / 2);
    // Escala negativa espelha em volta da origem (o pé no centro do corpo), não do centro do frame largo.
    this.view.setScale(this.facing, 1);
    this.view.anims.play(enemyAnimKey(anim), true);
  }

  private handle(events: EnemyEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitReaction') this.playHitReaction(ev.hit);
      else if (ev.type === 'hurtWhileDown') this.ragdoll?.flash();
      else if (ev.type === 'ragdoll') this.enterRagdoll(ev.hit);
      else if (ev.type === 'getUp') this.getUp();
      else if (ev.type === 'dissolve') this.ragdoll?.dissolve(ENEMY.dissolveMs);
      else if (ev.type === 'removed') this.remove();
    }
  }

  /** Golpe leve: animação `hurt` (pelo pickEnemyAnim, com o cérebro em hitstun) + flash branco, sem ragdoll. */
  private playHitReaction(hit: Hit): void {
    const d = normalize(hit.direction);
    this.scene.matter.body.setVelocity(this.body, { x: d.x * hit.force, y: -1 });
    this.view.setTintFill(PALETTE.w);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.view.active) this.view.clearTint();
    });
  }

  private enterRagdoll(hit: Hit): void {
    this.view.clearTint();
    if (!this.ragdoll) {
      this.ragdoll = new Ragdoll(this.scene, this.body.position.x, this.body.position.y - 3);
      for (const b of this.ragdoll.bodies) tagBody(b, { kind: 'character', target: this });
      this.view.setVisible(false);
      applyFilter(this.body, Filters.hidden);
      setIgnoreGravity(this.body, true);
    }
    this.ragdoll.impulse(hit.direction, hit.force);
    this.scene.cameras.main.shake(90, 0.004);
  }

  /** Levantar: o ragdoll some e o sprite volta tocando a animação `getup` (o cérebro fica em gettingUp). */
  private getUp(): void {
    if (!this.ragdoll) return;
    const c = this.ragdoll.center;
    this.ragdoll.destroy();
    this.ragdoll = null;
    const y = c.y - 12;
    this.scene.matter.body.setPosition(this.body, { x: c.x, y });
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    applyFilter(this.body, Filters.enemy);
    setIgnoreGravity(this.body, false);
    this.view.setVisible(true);
    this.animate();
  }

  private remove(): void {
    this.ragdoll?.destroy();
    this.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this._removed = true;
    this.onRemoved(this);
  }
}
