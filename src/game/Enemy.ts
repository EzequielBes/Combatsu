import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import { normalize, type Hit, type Vec2 } from '../core/hit';
import { ENEMY } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import { applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE, TEX } from './textures';

/**
 * Corpo físico (retângulo Matter) separado do visual (imagem comum), para
 * poder esticar/achatar o visual em tweens sem mexer na física.
 */
export class Enemy implements Hittable {
  readonly id = newEntityId();
  private readonly brain = new EnemyBrain(ENEMY);
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Image;
  private ragdoll: Ragdoll | null = null;
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
    this.view = scene.add.image(spawn.x, spawn.y + h / 2, TEX.enemy).setOrigin(0.5, 1);
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
    if (this.brain.state === 'idle') this.view.setFlipX(playerX < this.body.position.x);
    this.view.setPosition(this.body.position.x, this.body.position.y + SIZE.enemy.h / 2);
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

  private resetView(): void {
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(1).clearTint();
  }

  /** Golpe leve: só "animação" (flash + achatar), sem ragdoll. */
  private playHitReaction(hit: Hit): void {
    this.resetView();
    const d = normalize(hit.direction);
    this.scene.matter.body.setVelocity(this.body, { x: d.x * hit.force, y: -1 });
    this.view.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.view.active) this.view.clearTint();
    });
    this.scene.tweens.add({ targets: this.view, scaleX: 0.75, duration: 60, yoyo: true });
  }

  private enterRagdoll(hit: Hit): void {
    this.resetView();
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

  /** "Levantar" simples: sem blend físico, só um tween de esticar. */
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
    this.view.setPosition(c.x, y + SIZE.enemy.h / 2).setVisible(true).setScale(1, 0.35);
    this.scene.tweens.add({ targets: this.view, scaleY: 1, duration: ENEMY.getUpMs, ease: 'Back.Out' });
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
