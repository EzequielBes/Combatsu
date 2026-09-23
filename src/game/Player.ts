import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { ComboTracker, type AttackStep, type ComboEvent, type HitboxShape } from '../core/combo';
import { makeHitGate, type Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { COMBO_WINDOW_MS, PLAYER_COMBO, PLAYER_MOVE } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import { TEX } from './textures';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;
/** Recuo lateral das zonas de sensor (px), para não pegar paredes. */
const SENSOR_INSET = 3;

interface ActiveHitbox {
  body: MatterJS.BodyType;
  view: Phaser.GameObjects.Rectangle;
  shape: HitboxShape;
}

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly sprite: Phaser.Physics.Matter.Image;
  private move: MoveState = initialMoveState();
  private readonly fists = new ComboTracker(PLAYER_COMBO, COMBO_WINDOW_MS);
  private hitbox: ActiveHitbox | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
  ) {
    this.sprite = scene.matter.add.image(x, y, TEX.player, undefined, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.player },
    });
    this.sprite.setFixedRotation();
    this.sprite.setIgnoreGravity(true);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  receiveHit(_hit: Hit): void {
    // O player não recebe dano nesta demo (fora do escopo do sub-projeto 1).
  }

  update(dtMs: number, input: InputSnapshot): void {
    if (input.attackPressed) this.onCombo(this.fists.press());
    this.onCombo(this.fists.update(dtMs));
    const locked = this.fists.isAttacking;

    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, locked);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
    this.placeHitbox();
  }

  private onCombo(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.openHitbox(ev.step);
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.closeHitbox();
    }
  }

  /** Sensor estático reposicionado a cada frame; o gate garante 1 acerto por alvo por golpe. */
  private openHitbox(step: AttackStep): void {
    const shape = step.hitbox;
    if (!shape) return;
    this.closeHitbox();
    const gate = makeHitGate(this.id);
    const facing = this.facing; // travado durante o golpe, não muda
    const body = this.scene.matter.add.rectangle(0, 0, shape.width, shape.height, {
      isSensor: true,
      isStatic: true,
      collisionFilter: { ...Filters.hitbox },
    });
    tagBody(body, {
      kind: 'active',
      onTouch: (other) => {
        if (other.kind !== 'character' || !gate(other.target.id)) return;
        other.target.receiveHit({
          ownerId: this.id,
          damage: step.damage,
          strength: step.strength,
          force: step.force,
          direction: { x: facing, y: step.strength === 'heavy' ? -0.6 : -0.15 },
        });
      },
    });
    const color = step.strength === 'heavy' ? 0xffd166 : 0xffffff;
    const view = this.scene.add.rectangle(0, 0, shape.width, shape.height, color, 0.35);
    this.hitbox = { body, view, shape };
    this.placeHitbox();
  }

  private placeHitbox(): void {
    if (!this.hitbox) return;
    const { body, view, shape } = this.hitbox;
    const x = this.sprite.x + shape.offsetX * this.facing;
    const y = this.sprite.y + shape.offsetY;
    this.scene.matter.body.setPosition(body, { x, y });
    view.setPosition(x, y);
  }

  private closeHitbox(): void {
    if (!this.hitbox) return;
    this.scene.matter.world.remove(this.hitbox.body);
    this.hitbox.view.destroy();
    this.hitbox = null;
  }

  /**
   * Sensor por região: uma faixa fina logo abaixo (ou acima) do corpo, recuada das laterais para não pegar paredes.
   * A região sai da posição + tamanho do sprite, não de `body.bounds`: o Matter alarga o AABB pela velocidade do
   * frame, e empurrando a parede a ~3,7 px/step isso passava da folga lateral e a parede virava "teto"/"chão".
   */
  private touchesTerrain(side: 'below' | 'above'): boolean {
    const { x, y } = bodyOf(this.sprite).position;
    const halfW = this.sprite.displayWidth / 2;
    const halfH = this.sprite.displayHeight / 2;
    const y0 = side === 'below' ? y + halfH : y - halfH - SENSOR_DEPTH;
    const region = {
      min: { x: x - halfW + SENSOR_INSET, y: y0 },
      max: { x: x + halfW - SENSOR_INSET, y: y0 + SENSOR_DEPTH },
    };
    return this.scene.matter.query.region(this.terrain, region).length > 0;
  }
}
