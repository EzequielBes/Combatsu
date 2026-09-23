import Phaser from 'phaser';
import { RUN_THRESHOLD, attackFrame, pickPlayerAnim, type AttackAnim, type PlayerAnimInput } from '../core/animState';
import { Filters } from '../core/collision';
import { ComboTracker, type AttackStep, type ComboEvent } from '../core/combo';
import type { Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { COMBO_WINDOW_MS, PLAYER_COMBO, PLAYER_MOVE, PROP_SWING } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import type { Prop } from './Prop';
import { playerAnimKey } from './art';
import { PLAYER_ORIGIN } from './art/sprites/player';
import { AttackHitbox } from './hitbox';
import { SIZE, TEX } from './textures';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;
/** Recuo lateral das zonas de sensor (px), para não pegar paredes. */
const SENSOR_INSET = 3;
/** Alcance da zona de coleta à frente do player (px); atrás vale metade. */
const PICKUP_REACH = 24;
/** Animação de cada golpe do combo de socos, pela posição no PLAYER_COMBO. */
const COMBO_ANIMS: readonly AttackAnim[] = ['jab', 'cross', 'kick'];
/** Tempo (ms) que a pose de arremesso fica na tela depois de soltar o objeto. */
const THROW_POSE_MS = 200;
/** Profundidade do sprite do player (inimigos e objetos ficam em 0). */
const PLAYER_DEPTH = 1;

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly team = 'player';
  /** Corpo físico (invisível); o tamanho da textura placeholder define o corpo. */
  readonly sprite: Phaser.Physics.Matter.Image;
  /** O que aparece na tela: sprite animado com a origem no pé, seguindo o corpo. */
  readonly view: Phaser.GameObjects.Sprite;
  private move: MoveState = initialMoveState();
  private readonly fists = new ComboTracker(PLAYER_COMBO, COMBO_WINDOW_MS);
  private readonly propSwing = new ComboTracker([PROP_SWING], 0);
  private readonly hitbox: AttackHitbox;
  private held: Prop | null = null;
  private throwPoseMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
    private readonly props: () => readonly Prop[],
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
    this.sprite.setVisible(false);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
    this.hitbox = new AttackHitbox(scene, this.id, this.team);
    this.view = scene.add
      .sprite(x, y + SIZE.player.h / 2, TEX.playerArt, 'idle-0')
      .setOrigin(PLAYER_ORIGIN.x, PLAYER_ORIGIN.y)
      // Acima dos inimigos e objetos: o membro do golpe aparece por cima do alvo que ele atinge.
      .setDepth(PLAYER_DEPTH);
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  receiveHit(_hit: Hit): void {
    // O player não recebe dano nesta demo (fora do escopo do sub-projeto 1).
  }

  update(dtMs: number, input: InputSnapshot): void {
    // O objeto pode ter quebrado na mão durante o step de física.
    if (this.held && this.held.machine.holderId !== this.id) {
      this.held = null;
      // Sem objeto não há o que balançar: cancela o golpe para o player ficar livre na hora.
      this.onPropSwing(this.propSwing.cancel());
    }

    if (input.attackPressed) {
      if (this.held) this.onPropSwing(this.propSwing.press());
      else this.onCombo(this.fists.press());
    }
    this.onCombo(this.fists.update(dtMs));
    this.onPropSwing(this.propSwing.update(dtMs));

    const attacking = this.fists.isAttacking || this.propSwing.isAttacking;
    if (input.interactPressed && !attacking) this.interact(input.down);

    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, attacking);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
    this.hitbox.follow(this.sprite.x, this.sprite.y, this.facing);
    this.held?.follow(this.sprite.x, this.sprite.y, this.facing);
    this.throwPoseMs = Math.max(0, this.throwPoseMs - dtMs);
    this.animate(sensors.grounded);
  }

  /**
   * Escolhe a animação pelo animState (CHR-01). Nos golpes o frame sai da fase do combo (CHR-02), não do relógio
   * da animação: na fase ativa, com a hitbox ligada, aparece o frame *-hit com o membro esticado.
   */
  private animate(grounded: boolean): void {
    const input: PlayerAnimInput = {
      hurt: false, // o dano do player chega em outra task
      attack: this.currentAttack(grounded),
      grounded,
      vx: this.move.vx,
      vy: this.move.vy,
      holding: this.held !== null,
    };
    const anim = pickPlayerAnim(input);
    const v = this.view;
    v.setPosition(this.sprite.x, this.sprite.y + SIZE.player.h / 2);
    // Escala negativa espelha em volta da origem (o pé no centro do corpo); o flipX espelharia em volta do
    // centro do frame, que é mais largo que o corpo.
    v.setScale(this.facing, 1);
    if (input.attack && anim !== 'throw' && anim !== 'hurt') {
      v.anims.stop();
      v.setFrame(`${anim}-${attackFrame(input.attack.phase)}`);
    } else {
      v.anims.play(playerAnimKey(anim), true);
    }
  }

  /** Golpe em andamento para a animação. Na janela do combo, só enquanto o player está parado no chão. */
  private currentAttack(grounded: boolean): PlayerAnimInput['attack'] {
    if (this.throwPoseMs > 0) return { name: 'throw', phase: 'active' };
    const still = grounded && Math.abs(this.move.vx) <= RUN_THRESHOLD;
    const swing = this.propSwing.phase;
    if (swing !== 'idle' && (swing !== 'window' || still)) return { name: 'swing', phase: swing };
    const fist = this.fists.phase;
    if (fist !== 'idle' && (fist !== 'window' || still)) {
      return { name: COMBO_ANIMS[this.fists.currentIndex], phase: fist };
    }
    return null;
  }

  private interact(dropInstead: boolean): void {
    if (this.held) {
      const prop = this.held;
      this.held = null;
      prop.release(this.sprite.x, this.sprite.y, dropInstead ? 'drop' : 'throw', this.facing);
      if (!dropInstead) this.throwPoseMs = THROW_POSE_MS;
      return;
    }
    const target = this.findPickup();
    if (target && target.pickUp(this.id)) {
      this.held = target;
      this.onCombo(this.fists.cancel());
    }
  }

  /** Zona de coleta (consulta de região) em volta do player, maior para a frente. */
  private findPickup(): Prop | null {
    const candidates = this.props().filter((p) => p.machine.state === 'rest');
    if (candidates.length === 0) return null;
    // Posição + tamanho do sprite, não body.bounds (alargado pela velocidade do frame; ver touchesTerrain).
    const { x, y } = bodyOf(this.sprite).position;
    const halfW = this.sprite.displayWidth / 2;
    const halfH = this.sprite.displayHeight / 2;
    const front = PICKUP_REACH;
    const back = PICKUP_REACH / 2;
    const zone = {
      min: { x: x - halfW - (this.facing < 0 ? front : back), y: y - halfH - 4 },
      max: { x: x + halfW + (this.facing > 0 ? front : back), y: y + halfH + 4 },
    };
    const inZone = new Set(
      this.scene.matter.query.region(
        candidates.map((p) => p.body),
        zone,
      ),
    );
    let best: Prop | null = null;
    let bestDist = Infinity;
    for (const p of candidates) {
      if (!inZone.has(p.body)) continue;
      const d = Math.abs(p.sprite.x - this.sprite.x) + Math.abs(p.sprite.y - this.sprite.y);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  private onPropSwing(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.held?.startSwing();
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.held?.endSwing();
    }
  }

  private onCombo(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.openHitbox(ev.step);
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.hitbox.close();
    }
  }

  private openHitbox(step: AttackStep): void {
    const shape = step.hitbox;
    if (!shape) return;
    const hit: Hit = {
      ownerId: this.id,
      damage: step.damage,
      strength: step.strength,
      force: step.force,
      direction: { x: this.facing, y: step.strength === 'heavy' ? -0.6 : -0.15 },
    };
    this.hitbox.open(shape, hit, this.sprite.x, this.sprite.y, this.facing);
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
