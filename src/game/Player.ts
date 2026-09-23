import Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { PLAYER_MOVE } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import { TEX } from './textures';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;
/** Recuo lateral das zonas de sensor (px), para não pegar paredes. */
const SENSOR_INSET = 3;

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly sprite: Phaser.Physics.Matter.Image;
  private move: MoveState = initialMoveState();

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
    // A gravidade do player é calculada em stepMovement, não pelo Matter.
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
    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, false);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
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
