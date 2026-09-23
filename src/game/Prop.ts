import Phaser from 'phaser';
import { normalize, type Vec2 } from '../core/hit';
import { PROP_BREAK_MS, PropMachine, propHit, type PropDef, type PropImpact, type PropState } from '../core/props';
import { tagBody, type BodyTag } from './bodyTags';
import { PX_PER_S_TO_STEP, applyFilter, bodyOf } from './physics';
import { TEX } from './textures';

/** Posição do objeto relativa ao centro de quem segura (x espelhado pelo facing). */
const SOCKET: Record<'front' | 'back' | 'swing', Vec2> = {
  front: { x: 14, y: 2 },
  back: { x: -8, y: -16 },
  swing: { x: 22, y: -2 },
};
/** Fração da velocidade de arremesso usada para cima. */
const THROW_LIFT = 0.22;

export class Prop {
  readonly machine: PropMachine;
  readonly sprite: Phaser.Physics.Matter.Image;
  private applied: PropState = 'rest';
  private facing: 1 | -1 = 1;
  /** Última posição em voo fora do terreno; é para onde o objeto volta ao bater. */
  private lastSafe: Vec2;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: PropDef,
  ) {
    this.machine = new PropMachine(def);
    this.sprite = scene.matter.add.image(x, y, def.texture, undefined, {
      friction: 0.6,
      frictionAir: 0.01,
      restitution: 0.15,
      collisionFilter: { ...this.machine.filter },
    });
    this.sprite.setMass(def.mass);
    this.lastSafe = { x, y };
    tagBody(this.body, { kind: 'active', onTouch: (other) => this.onTouch(other) });
  }

  get body(): MatterJS.BodyType {
    return bodyOf(this.sprite);
  }

  get isGone(): boolean {
    return this.machine.state === 'gone';
  }

  pickUp(holderId: number): boolean {
    if (!this.machine.pickUp(holderId)) return false;
    this.sync();
    return true;
  }

  startSwing(): void {
    if (this.machine.startSwing()) this.sync();
  }

  endSwing(): void {
    if (this.machine.endSwing()) this.sync();
  }

  /** Chamado todo frame por quem segura. Sem colisão, só posição visual no socket. */
  follow(holderX: number, holderY: number, facing: 1 | -1): void {
    const st = this.machine.state;
    if (st !== 'held' && st !== 'swing') return;
    this.facing = facing;
    const socket = st === 'swing' ? SOCKET.swing : SOCKET[this.def.socket];
    this.sprite.setPosition(holderX + socket.x * facing, holderY + socket.y);
    this.sprite.setAngle(st === 'swing' ? 90 * facing : 0);
    this.sprite.setFlipX(facing < 0);
  }

  /**
   * Larga ou arremessa. O ponto seguro vira o centro de quem segurava — que
   * nunca está dentro do terreno — para o caso de arremessar encostado na parede.
   */
  release(holderX: number, holderY: number, mode: 'drop' | 'throw', facing: 1 | -1): void {
    this.facing = facing;
    const ok = mode === 'throw' ? this.machine.throw() : this.machine.drop();
    if (!ok) return;
    this.lastSafe = { x: holderX, y: holderY };
    if (mode === 'drop') this.sprite.setPosition(holderX, holderY);
    this.sync();
    if (mode === 'throw') {
      const v = this.def.throwSpeed * PX_PER_S_TO_STEP;
      this.sprite.setVelocity(v * facing, -v * THROW_LIFT);
      this.sprite.setAngularVelocity(0.25 * facing);
    }
  }

  update(dtMs: number): void {
    if (this.isGone) return;
    if (this.machine.update(dtMs)) {
      this.sprite.destroy();
      return;
    }
    // Os eventos de colisão rodam no step do Matter, antes deste update:
    // se estamos em voo aqui, a posição atual está fora do terreno.
    if (this.machine.state === 'thrown') this.lastSafe = { x: this.sprite.x, y: this.sprite.y };
  }

  private onTouch(other: BodyTag): void {
    const st = this.machine.state;
    if (st !== 'swing' && st !== 'thrown') return;
    if (other.kind === 'terrain') {
      if (st === 'thrown') this.afterImpact(this.machine.registerImpact());
      return;
    }
    if (other.kind !== 'character') return;
    const ownerId = this.machine.ownerId;
    if (ownerId === null || !this.machine.tryHit(other.target.id)) return;
    other.target.receiveHit(propHit(this.def, ownerId, this.hitDirection(st)));
    this.afterImpact(this.machine.registerImpact());
  }

  private hitDirection(st: PropState): Vec2 {
    if (st === 'thrown') {
      const v = this.body.velocity;
      return normalize({ x: v.x, y: v.y - 2 });
    }
    return { x: this.facing, y: -0.6 };
  }

  private afterImpact(result: PropImpact): void {
    if (result === 'toRest') {
      const v = this.body.velocity;
      this.sprite.setPosition(this.lastSafe.x, this.lastSafe.y);
      this.sync();
      this.sprite.setVelocity(-v.x * 0.25, -1.5); // quica de volta
    } else if (result === 'broke') {
      this.sync();
    }
  }

  /** Aplica no corpo Matter o filtro/sensor/gravidade do estado atual. */
  private sync(): void {
    const st = this.machine.state;
    if (st === this.applied) return;
    this.applied = st;
    applyFilter(this.body, this.machine.filter);
    this.sprite.setSensor(st !== 'rest');
    const floating = st === 'held' || st === 'swing' || st === 'breaking';
    this.sprite.setIgnoreGravity(floating);
    if (floating) {
      this.sprite.setVelocity(0, 0);
      this.sprite.setAngularVelocity(0);
    }
    if (st === 'breaking') this.shatter();
  }

  private shatter(): void {
    const debris = this.scene.add.particles(this.sprite.x, this.sprite.y, TEX.smoke, {
      speed: { min: 40, max: 140 },
      lifespan: 450,
      scale: { start: 0.8, end: 0 },
      tint: this.def.debrisColor,
      gravityY: 400,
      emitting: false,
    });
    debris.explode(14);
    this.scene.time.delayedCall(600, () => debris.destroy());
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: PROP_BREAK_MS });
  }
}
