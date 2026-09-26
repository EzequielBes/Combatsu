import Phaser from 'phaser';
import { normalize, type Vec2 } from '../core/hit';
import type { Modifiers } from '../core/modifiers';
import { PropMachine, propHit, type PropDef, type PropImpact, type PropState } from '../core/props';
import { shardsKey } from './art';
import { ART_SCALE } from './art/palette';
import { PROP_SHARDS } from './art/sprites/props';
import { newEntityId, tagBody, type BodyTag } from './bodyTags';
import { contactWith, type OnConnect } from './hitbox';
import { PX_PER_S_TO_STEP, applyFilter, bodyOf } from './physics';

/** Posição do objeto relativa ao centro de quem segura (x espelhado pelo facing). */
const SOCKET: Record<'front' | 'back' | 'swing', Vec2> = {
  front: { x: 14, y: 2 },
  back: { x: -8, y: -16 },
  swing: { x: 22, y: -2 },
};
/** Fração da velocidade de arremesso usada para cima. */
const THROW_LIFT = 0.22;
/** Estilhaços: duração do voo (ms), gravidade (px/s²), velocidade para fora (px/s) e pulo para cima (px/s). */
const SHARD_MS = 500;
const SHARD_GRAVITY = 700;
const SHARD_SPEED = { min: 50, max: 130 };
const SHARD_LIFT = { min: 60, max: 130 };
/** Alternância do contorno raro (RAR-03): troca entre `common` e `rare` a cada 200 ms. */
const RARE_BLINK_MS = 200;

export class Prop {
  readonly id = newEntityId();
  readonly machine: PropMachine;
  readonly sprite: Phaser.Physics.Matter.Image;
  private applied: PropState = 'rest';
  private facing: 1 | -1 = 1;
  /** Última posição em voo fora do terreno; é para onde o objeto volta ao bater. */
  private lastSafe: Vec2;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: PropDef,
    /** Modificadores da run (MOD-05): dano do golpe/arremesso escalado por `forca`, lido na hora. */
    private readonly modifiers: Modifiers,
    /** Golpe de objeto que conectou (faísca roxa + hitstop do forte), injetado pela cena. */
    private readonly onConnect?: OnConnect,
    /** Ferramenta rara (RAR-02/03/06): sprite alterna `common`/`rare`; sem efeito num objeto comum. */
    readonly rare: boolean = false,
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

  /** Velocidade horizontal do corpo em px/s (ARM-26, snapshot de debug). */
  get vx(): number {
    return this.body.velocity.x / PX_PER_S_TO_STEP;
  }

  get isGone(): boolean {
    return this.machine.state === 'gone' || this.destroyed;
  }

  /** Remoção forçada (ARM-13/14: sumiço por tempo ou teto), fora do ciclo natural de quebra. */
  destroyNow(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sprite.destroy();
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

  /**
   * Quem segurava morreu ou sumiu (HP-04): o objeto cai em repouso de onde estava a mão. O ponto seguro vira o
   * centro de quem segurava, que nunca está dentro do terreno.
   */
  holderGone(holderX: number, holderY: number): void {
    if (!this.machine.holderGone()) return;
    this.lastSafe = { x: holderX, y: holderY };
    this.sprite.setPosition(holderX, holderY);
    this.sync();
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
    // RAR-03: contorno raro piscando, em qualquer estado (chão, na mão, arremessado).
    if (this.rare) this.sprite.setFrame(Math.floor(this.scene.time.now / RARE_BLINK_MS) % 2 === 0 ? 'common' : 'rare');
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
    const hit = propHit(this.def, ownerId, this.hitDirection(st));
    // MOD-05: dano do objeto segurado/arremessado escalado por `forca`, lido na hora.
    hit.damage = this.modifiers.meleeDamage(hit.damage);
    // O objeto bate de verdade mesmo se o alvo ignorar o golpe (conta impacto), mas só golpe aceito tem feedback (FX-06).
    if (other.target.receiveHit(hit)) {
      // Posição + tamanho do sprite (girado 90° no golpe com o objeto na mão), nunca body.bounds.
      const [w, h] = st === 'swing' ? [this.sprite.height, this.sprite.width] : [this.sprite.width, this.sprite.height];
      this.onConnect?.(hit, contactWith({ x: this.sprite.x, y: this.sprite.y, width: w, height: h }, other.target));
    }
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

  /**
   * Quebra (PRP-01): o sprite some e no lugar dele voam os estilhaços recortados da própria arte, cada um saindo
   * da sua posição no objeto (com o giro e o espelhamento que o objeto tinha) para fora do centro, e caindo.
   */
  private shatter(): void {
    const spr = this.sprite;
    const shards = PROP_SHARDS[this.def.key as keyof typeof PROP_SHARDS] ?? [];
    const cols = spr.width / ART_SCALE;
    const rows = spr.height / ART_SCALE;
    const flip = spr.flipX ? -1 : 1;
    const cos = Math.cos(spr.rotation);
    const sin = Math.sin(spr.rotation);
    for (const s of shards) {
      const half = s.grid.length / 2;
      const lx = (s.x + half - cols / 2) * ART_SCALE * flip;
      const ly = (s.y + half - rows / 2) * ART_SCALE;
      const ox = lx * cos - ly * sin;
      const oy = lx * sin + ly * cos;
      const x0 = spr.x + ox;
      const y0 = spr.y + oy;
      const piece = this.scene.add
        .image(x0, y0, shardsKey(this.def.texture), s.key)
        .setFlipX(spr.flipX)
        .setRotation(spr.rotation);
      const len = Math.hypot(ox, oy) || 1;
      const speed = Phaser.Math.Between(SHARD_SPEED.min, SHARD_SPEED.max);
      const vx = (ox / len) * speed;
      const vy = (oy / len) * speed - Phaser.Math.Between(SHARD_LIFT.min, SHARD_LIFT.max);
      // Tween da cena: pausa junto com o hitstop, e os estilhaços ficam parados durante o congelamento.
      this.scene.tweens.addCounter({
        from: 0,
        to: SHARD_MS / 1000,
        duration: SHARD_MS,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          piece.setPosition(x0 + vx * t, y0 + vy * t + 0.5 * SHARD_GRAVITY * t * t);
          piece.setAlpha(1 - tw.progress);
        },
        onComplete: () => piece.destroy(),
      });
    }
    spr.setAlpha(0);
  }
}
