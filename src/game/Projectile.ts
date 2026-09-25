import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { canDamage, type Hit } from '../core/hit';
import { Mover } from '../core/mover';
import { newEntityId, tagBody, type BodyTag } from './bodyTags';
import { contactWith, type OnConnect } from './hitbox';
import { setIgnoreGravity } from './physics';
import { TEX } from './textures';

/** Impulso do golpe do projétil/onda (px por step do Matter), pequeno o bastante para não gerar ragdoll. */
const HIT_FORCE = 4;

export type ProjectileKind = 'projectile' | 'shockwave';

/** Tamanho do corpo/sprite por tipo, em px de mundo (BAT-03: onda com 20 px de altura). */
const SIZE: Record<ProjectileKind, { width: number; height: number }> = {
  projectile: { width: 16, height: 16 },
  shockwave: { width: 32, height: 20 },
};

/**
 * Adaptador Phaser do projétil da rajada e da onda de choque do pouso (BAT-03/04/06/12, BTIER-05/07): sensor
 * Matter sem gravidade, movido pelo `Mover` (puro, AD-001). Acerta o player com `canDamage` e some no mesmo
 * frame ao tocar uma parede ou o player, ou quando o `Mover` expira pelo alcance.
 */
export class Projectile {
  readonly id = newEntityId();
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Sprite;
  private readonly mover: Mover;
  private readonly hit: Hit;
  private readonly size: { width: number; height: number };
  private _removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly kind: ProjectileKind,
    x: number,
    y: number,
    readonly dir: 1 | -1,
    readonly speed: number,
    maxDist: number,
    damage: number,
    /** Golpe que conectou no player (faísca + hitstop), injetado pela cena. */
    private readonly onConnect?: OnConnect,
  ) {
    this.mover = new Mover(x, dir, speed, maxDist);
    this.size = SIZE[kind];
    this.hit = { ownerId: this.id, damage, strength: 'light', force: HIT_FORCE, direction: { x: dir, y: 0 } };
    this.body = scene.matter.add.rectangle(x, y, this.size.width, this.size.height, {
      isSensor: true,
      collisionFilter: { ...Filters.projectile },
    });
    setIgnoreGravity(this.body, true);
    tagBody(this.body, { kind: 'active', onTouch: (other) => this.onTouch(other) });
    const textureKey = kind === 'projectile' ? TEX.bossProjectile : TEX.bossShockwave;
    this.view = scene.add.sprite(x, y, textureKey, kind).setFlipX(dir < 0);
  }

  get x(): number {
    return this.mover.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  /** Altura do corpo (BAT-03: 20 px na onda), lida do objeto vivo, nunca do tuning. */
  get height(): number {
    return this.size.height;
  }

  get removed(): boolean {
    return this._removed;
  }

  /** Avança pelo `Mover`; some sozinho ao chegar ao alcance máximo (BAT-12). */
  update(dtMs: number): void {
    if (this._removed) return;
    const status = this.mover.update(dtMs);
    this.scene.matter.body.setPosition(this.body, { x: this.mover.x, y: this.body.position.y });
    this.view.setPosition(this.mover.x, this.body.position.y);
    if (status === 'expired') this.destroyNow();
  }

  /** Contato com parede ou player (BAT-06): some no mesmo frame; o dano só se aplica se o player aceitar o golpe. */
  private onTouch(other: BodyTag): void {
    if (this._removed) return;
    if (other.kind === 'terrain') {
      this.destroyNow();
      return;
    }
    if (other.kind === 'character' && canDamage('enemy', other.target.team)) {
      if (other.target.receiveHit(this.hit)) {
        const { x, y } = this.body.position;
        this.onConnect?.(this.hit, contactWith({ x, y, width: this.size.width, height: this.size.height }, other.target));
      }
      this.destroyNow();
    }
  }

  destroyNow(): void {
    if (this._removed) return;
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this._removed = true;
  }
}
