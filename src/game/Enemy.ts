import Phaser from 'phaser';
import { RUN_THRESHOLD, pickEnemyAnim } from '../core/animState';
import { Filters } from '../core/collision';
import { EnemyAI, type AIEvent } from '../core/enemyAI';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import type { EnemyBase } from '../core/difficulty';
import { SpawnGrace } from '../core/spawnGrace';
import { normalize, type Hit, type Vec2 } from '../core/hit';
import { enemyAnimKey } from './art';
import { ENEMY_BAR_WELL } from './art/hud';
import { ART_SCALE, PALETTE } from './art/palette';
import { ENEMY_ORIGIN } from './art/sprites/enemy';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import { AttackHitbox, type OnConnect } from './hitbox';
import { PX_PER_S_TO_STEP, applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE, TEX } from './textures';

/** Duração (ms) do flash branco do golpe leve. */
const HIT_FLASH_MS = 70;
/** No golpe o inimigo fica acima do player (depth 1): a garra aparece por cima de quem ela atinge. */
const ATTACK_DEPTH = 2;
/** Barra de vida (HUD-02): altura do topo acima do centro do corpo (px) e profundidade, acima de todos. */
const BAR_RISE = 44;
const BAR_DEPTH = 3;

/**
 * Corpo físico (retângulo Matter) separado do visual (sprite animado com a origem no pé, no centro do corpo).
 * A animação sai do pickEnemyAnim (CHR-03); em ragdoll o sprite some e as partes do ragdoll aparecem (CHR-04).
 * A EnemyAI decide o andar (só em x) e o golpe de garra (AI-01..05).
 */
export class Enemy implements Hittable {
  readonly id = newEntityId();
  readonly team = 'enemy';
  private readonly brain: EnemyBrain;
  private readonly ai: EnemyAI;
  /** Graça ao nascer (WAVE-09): segura `canAct` pelos primeiros `graceMs`. */
  private readonly grace: SpawnGrace;
  private readonly attack: AttackHitbox;
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Sprite;
  private ragdoll: Ragdoll | null = null;
  /** Barra de vida acima da cabeça, na câmera do mundo: aparece no primeiro dano e some ao morrer (HUD-02). */
  private readonly barFrame: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private facing: 1 | -1 = 1;
  /**
   * vx da IA em px por step, reaplicado a cada step do Matter (null = a física manda). O Matter roda em passo
   * fixo de 60 Hz e dá vários steps por frame abaixo de 60 fps; aplicado só uma vez por frame, o atrito com o
   * chão comia o vx nos steps seguintes e a velocidade caía junto com o fps (AI-06).
   */
  private walkVxStep: number | null = null;
  /** Dano da última garra realmente aberta (DIF-04); antes do primeiro golpe, o dano com que o inimigo nasceu. */
  private lastAttackDamage: number;
  private readonly onStep = (): void => {
    // Os steps do Matter rodam antes do update da cena: sem este teste, o vx de andar do frame anterior passava
    // por cima do empurrão de um golpe recebido neste frame.
    if (this.walkVxStep === null || this.brain.state !== 'idle' || this.ragdoll) return;
    this.scene.matter.body.setVelocity(this.body, { x: this.walkVxStep, y: this.body.velocity.y });
  };
  private _removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly spawn: Vec2,
    /** Tuning escalado da rodada (DIF-04): hp, dano e velocidades já com o multiplicador aplicado. */
    private readonly tuning: EnemyBase,
    graceMs: number,
    private readonly onRemoved: (enemy: Enemy) => void,
    /** Garra que conectou no player (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
    /** Morte (evento `died` do cérebro, uma vez só), com a posição do corpo neste frame (FND-08). */
    private readonly onDied?: (enemy: Enemy, x: number, y: number) => void,
  ) {
    const { w, h } = SIZE.enemy;
    this.brain = new EnemyBrain(tuning.brain);
    this.lastAttackDamage = tuning.attack.damage;
    this.grace = new SpawnGrace(graceMs);
    this.body = scene.matter.add.rectangle(spawn.x, spawn.y, w, h, {
      friction: 0.8,
      frictionAir: 0.02,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.enemy },
    });
    scene.matter.body.setInertia(this.body, Infinity); // não tomba
    tagBody(this.body, { kind: 'character', target: this });
    this.ai = new EnemyAI(tuning.ai, spawn.x);
    this.attack = new AttackHitbox(scene, this.id, this.team, onConnect);
    this.view = scene.add.sprite(spawn.x, spawn.y + h / 2, TEX.enemy, 'idle-0').setOrigin(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y);
    this.barFrame = scene.add.image(0, 0, TEX.enemyBar).setOrigin(0, 0).setDepth(BAR_DEPTH).setVisible(false);
    const well = ENEMY_BAR_WELL;
    scene.matter.world.on('beforeupdate', this.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.onStep));
    this.barFill = scene.add
      .rectangle(0, 0, well.w * ART_SCALE, well.h * ART_SCALE, PALETTE.r)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
  }

  get x(): number {
    return this.body.position.x;
  }

  /** Posição + tamanho do corpo (em ragdoll ele acompanha o tronco), nunca body.bounds. */
  hurtRect(): Rect {
    const { x, y } = this.body.position;
    return { x, y, width: SIZE.enemy.w, height: SIZE.enemy.h };
  }

  get hp(): number {
    return this.brain.hp;
  }

  get state(): EnemyState {
    return this.brain.state;
  }

  get removed(): boolean {
    return this._removed;
  }

  /** Vida máxima com que o cérebro foi criado (DIF-04), para o snapshot de debug. */
  get maxHp(): number {
    return this.brain.maxHp;
  }

  /** Dano do golpe realmente usado da última garra aberta (DIF-04), para o snapshot de debug. */
  get damage(): number {
    return this.lastAttackDamage;
  }

  /** Velocidade de patrulha da IA em uso, já escalada pela rodada (DIF-04/06), para o snapshot de debug. */
  get patrolSpeed(): number {
    return this.ai.patrolSpeed;
  }

  /** Velocidade de perseguição da IA em uso, já escalada pela rodada (DIF-04/06), para o snapshot de debug. */
  get chaseSpeed(): number {
    return this.ai.chaseSpeed;
  }

  receiveHit(hit: Hit): boolean {
    const events = this.brain.receiveHit(hit);
    if (events.length === 0) return false; // já morto
    this.walkVxStep = null; // o golpe manda no corpo a partir de agora, não a IA
    // Levar golpe cancela o preparo ou o golpe em andamento (AI-04).
    this.onAI(this.ai.interrupt());
    this.handle(events);
    this.updateBar();
    return true;
  }

  /** Mostra a barra depois do primeiro dano e até morrer, cheia na proporção da vida, em passos de 1 texel. */
  private updateBar(): void {
    const show = !this.brain.isDead && this.brain.hp < this.tuning.brain.maxHp;
    this.barFrame.setVisible(show);
    const well = ENEMY_BAR_WELL;
    const texels = Math.round((well.w * this.brain.hp) / this.tuning.brain.maxHp);
    this.barFill.setVisible(show && texels > 0).setSize(texels * ART_SCALE, well.h * ART_SCALE);
    if (!show) return;
    const { x, y } = this.body.position;
    const left = Math.round(x - this.barFrame.width / 2);
    const top = Math.round(y - BAR_RISE);
    this.barFrame.setPosition(left, top);
    this.barFill.setPosition(left + well.x * ART_SCALE, top + well.y * ART_SCALE);
  }

  update(dtMs: number, playerX: number): void {
    if (this._removed) return;
    this.grace.update(dtMs);
    this.handle(this.brain.update(dtMs));
    if (this._removed) return;
    // Só age com o cérebro livre e fora da graça de nascimento: reação a golpe, ragdoll, levantando, morto ou
    // recém-nascido deixam a IA parada (AI-04, WAVE-09).
    const canAct = this.brain.state === 'idle' && !this.brain.isDead && !this.grace.active;
    const out = this.ai.update(dtMs, { selfX: this.body.position.x, playerX, canAct });
    this.onAI(out.events);
    this.walkVxStep = canAct && !this.ragdoll ? out.vx * PX_PER_S_TO_STEP : null;
    if (this.ragdoll) {
      // Corpo escondido acompanha o tronco para o "levantar" nascer no lugar certo.
      this.scene.matter.body.setPosition(this.body, this.ragdoll.center);
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      this.updateBar();
      return;
    }
    if (canAct) {
      this.facing = out.facing;
      // A IA só mexe no x; o y fica com a física (gravidade). Sem canAct o empurrão do golpe segue livre.
      this.scene.matter.body.setVelocity(this.body, { x: out.vx * PX_PER_S_TO_STEP, y: this.body.velocity.y });
    }
    this.attack.follow(this.body.position.x, this.body.position.y, this.facing);
    this.animate();
    this.updateBar();
  }

  private onAI(events: AIEvent[]): void {
    for (const ev of events) {
      if (ev === 'hitboxOn') this.openAttack();
      else if (ev === 'hitboxOff') this.attack.close();
    }
  }

  /** Garra: dano da rodada (DIF-04), time 'enemy' (nunca acerta outro inimigo, AI-05). */
  private openAttack(): void {
    const step = this.tuning.attack;
    const hit: Hit = {
      ownerId: this.id,
      damage: step.damage,
      strength: step.strength,
      force: step.force,
      direction: { x: this.facing, y: -0.3 },
    };
    this.lastAttackDamage = hit.damage;
    this.attack.open(step.hitbox!, hit, this.body.position.x, this.body.position.y, this.facing);
  }

  private animate(): void {
    const vxPerS = this.body.velocity.x / PX_PER_S_TO_STEP;
    const anim = pickEnemyAnim({ brain: this.brain.state, ai: this.ai.state, moving: Math.abs(vxPerS) > RUN_THRESHOLD });
    this.view.setPosition(this.body.position.x, this.body.position.y + SIZE.enemy.h / 2);
    // Escala negativa espelha em volta da origem (o pé no centro do corpo), não do centro do frame largo.
    this.view.setScale(this.facing, 1);
    this.view.setDepth(anim === 'attack' ? ATTACK_DEPTH : 0);
    this.view.anims.play(enemyAnimKey(anim), true);
  }

  private handle(events: EnemyEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitReaction') this.playHitReaction(ev.hit);
      else if (ev.type === 'hurtWhileDown') this.ragdoll?.flash();
      else if (ev.type === 'died') this.onDied?.(this, this.body.position.x, this.body.position.y);
      else if (ev.type === 'ragdoll') this.enterRagdoll(ev.hit);
      else if (ev.type === 'getUp') this.getUp();
      else if (ev.type === 'dissolve') this.ragdoll?.dissolve(this.tuning.brain.dissolveMs);
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
    this.cleanup();
    this.onRemoved(this);
  }

  /**
   * Remove o inimigo na hora, sem dissolução nem `onRemoved` (o `startRun` já limpa a lista da cena inteira de
   * uma vez): corpo, sprite, barra, ragdoll e o listener `beforeupdate` somem já (RUN-01/05).
   */
  destroyNow(): void {
    if (this._removed) return;
    this.cleanup();
  }

  private cleanup(): void {
    this.walkVxStep = null;
    this.scene.matter.world.off('beforeupdate', this.onStep);
    this.attack.close();
    this.ragdoll?.destroy();
    this.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this.barFrame.destroy();
    this.barFill.destroy();
    this._removed = true;
  }
}
