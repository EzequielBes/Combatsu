import Phaser from 'phaser';
import { BossAI, type BossAIEvent, type BossAIState, type BossAttack } from '../core/bossAI';
import { BossBrain, type BossBrainState } from '../core/bossBrain';
import type { BossSpec } from '../core/bossTier';
import { Filters } from '../core/collision';
import type { Hit, Vec2 } from '../core/hit';
import { bossAnimKey, BOSS_ORIGIN } from './art/sprites/boss';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import { AttackHitbox, type OnConnect } from './hitbox';
import { PX_PER_S_TO_STEP, applyFilter, setIgnoreGravity } from './physics';
import { TEX } from './textures';

/** Corpo físico do chefe (design: 40x56 px). */
const BODY_W = 40;
const BODY_H = 56;
/** Arco do salto (design: 120 px de altura). */
const LEAP_ARC_HEIGHT = 120;
/** Folga lateral da hitbox de pouso além da largura do corpo (BAT-10). */
const LANDING_HITBOX_PAD = 16;
/** Sonda de parede à frente do corpo (px), para `blocked` na investida (BAT-01). */
const WALL_PROBE = 4;
/** Profundidade da sondagem de chão abaixo do chefe (px), para achar o terreno mesmo já meio encostado nele. */
const GROUND_PROBE_DEPTH = 200;
/** Metade da altura da onda de choque (design: 20 px), para nascer rente ao chão de verdade (ver `groundTopBelow`). */
const SHOCKWAVE_HALF_H = 10;

/**
 * Adaptador Phaser do chefe (BOSS-01/03/06/08, BAT-01/02/09/10/13, BAI-04/13, BHUD-04): move o corpo Matter,
 * abre as hitboxes e toca a animação a partir do `BossBrain` (vida/fases/postura) e do `BossAI` (ataques), ambos
 * puros (AD-001). É `Hittable` do time `enemy`; o corpo empurra o player mas nunca causa dano por contato (BAT-08).
 * Durante o salto o corpo vira sensor sem gravidade com a posição roteirizada; no pouso volta a sólido e abre a
 * hitbox de pouso por um frame. O chefe nunca entra em ragdoll (o `BossBrain` não tem esse estado).
 */
export class Boss implements Hittable {
  readonly id = newEntityId();
  readonly team = 'enemy';
  private readonly brain: BossBrain;
  private readonly ai: BossAI;
  private readonly attack: AttackHitbox;
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Sprite;
  private facing: 1 | -1 = 1;
  private lastPlayerX = 0;
  /** `vx` do último output do `BossAI` (px/s), para saber a direção da investida ao checar `blocked`. */
  private lastVx = 0;
  private inLeap = false;
  private leapGroundY = 0;
  private landingHitboxTicks = 0;
  private _removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly spec: BossSpec,
    /** Corpos do terreno (BAT-01: `blocked` ao encostar numa parede à frente). */
    private readonly terrain: MatterJS.BodyType[],
    /** Golpe que conectou (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
    /** Rugido (BAI-13): a cena empurra o player para longe. */
    private readonly onRoarPush?: (dir: 1 | -1) => void,
    /** Pouso do salto (BAT-03, T9): a cena cria as duas ondas de choque, com o dano já escalado pelo tier. */
    private readonly onLanded?: (x: number, y: number, damage: number) => void,
    /** Disparo da rajada (BAT-04, T9): a cena cria o projétil. */
    private readonly onFire?: (x: number, y: number, dir: 1 | -1, speed: number, damage: number) => void,
    /** Morte (BWIN-01..03, T10): a cena aplica a recompensa e os efeitos. */
    private readonly onDied?: (boss: Boss, x: number, y: number) => void,
  ) {
    this.brain = new BossBrain(spec.maxHp);
    this.ai = new BossAI();
    this.body = scene.matter.add.rectangle(spawn.x, spawn.y, BODY_W, BODY_H, {
      friction: 0.8,
      frictionAir: 0.02,
      collisionFilter: { ...Filters.boss },
    });
    scene.matter.body.setInertia(this.body, Infinity); // não tomba
    tagBody(this.body, { kind: 'character', target: this });
    this.attack = new AttackHitbox(scene, this.id, this.team, onConnect);
    const textureKey = spec.archetype === 'tecela' ? TEX.bossTecela : TEX.bossOni;
    this.view = scene.add
      .sprite(spawn.x, spawn.y + BODY_H / 2, textureKey, 'idle')
      .setOrigin(BOSS_ORIGIN.x, BOSS_ORIGIN.y);
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  get hp(): number {
    return this.brain.hp;
  }

  get maxHp(): number {
    return this.brain.maxHp;
  }

  get phase(): 1 | 2 | 3 {
    return this.brain.phase;
  }

  /**
   * Estado público (BHUD-04, BAT-11): fora de `active` é o estado do `BossBrain` (intro/roar/stagger/dead);
   * em `active` é o sub-estado do `BossAI` (rest/windup/charge/leap/volley), para o snapshot conseguir reportar
   * `state === 'windup'` durante o preparo de um ataque.
   */
  get state(): BossBrainState | BossAIState {
    return this.brain.state === 'active' ? this.ai.state : this.brain.state;
  }

  get attackName(): BossAttack | null {
    return this.ai.attack;
  }

  get poise(): number {
    return this.brain.poise;
  }

  get archetype(): BossSpec['archetype'] {
    return this.spec.archetype;
  }

  get name(): string {
    return this.spec.name;
  }

  get removed(): boolean {
    return this._removed;
  }

  /** Posição + tamanho do corpo, nunca `body.bounds` (mesma regra de Enemy/Player). */
  hurtRect(): Rect {
    const { x, y } = this.body.position;
    return { x, y, width: BODY_W, height: BODY_H };
  }

  /**
   * Golpe recebido (BOSS-08, BAI-04/12): ignorado por completo na intro e no rugido, sem faísca nem hitstop
   * (`false`). Fora disso é sempre aceito (`true`), mesmo quando não muda de fase nem atordoa.
   */
  receiveHit(hit: Hit): boolean {
    const state = this.brain.state;
    if (state === 'intro' || state === 'roar' || state === 'dead') return false;
    const events = this.brain.receiveHit(hit);
    for (const ev of events) {
      if (ev.type === 'roarStart') this.onRoarPush?.(this.lastPlayerX >= this.body.position.x ? 1 : -1);
      else if (ev.type === 'died') this.onDied?.(this, this.body.position.x, this.body.position.y);
    }
    return true;
  }

  update(dtMs: number, playerX: number): void {
    if (this._removed) return;
    this.lastPlayerX = playerX;
    this.brain.update(dtMs);
    if (this.landingHitboxTicks > 0) {
      this.landingHitboxTicks--;
      if (this.landingHitboxTicks === 0) this.attack.close();
    }
    if (this.brain.isDead) {
      // Sem IA nem movimento depois de morto, mas a pose "dead" ainda precisa aparecer (o `animate` decide o
      // frame pelo estado do `BossBrain`, não pelos parâmetros abaixo).
      this.animate('rest', null);
      return;
    }

    const canAct = this.brain.state === 'active';
    const chargeDir: 1 | -1 = this.lastVx > 0 ? 1 : this.lastVx < 0 ? -1 : this.facing;
    const blocked = canAct ? this.isBlockedAhead(chargeDir) : false;
    const out = this.ai.update(dtMs, {
      selfX: this.body.position.x,
      playerX,
      blocked,
      canAct,
      phase: this.brain.phase,
      spec: this.spec,
    });
    this.lastVx = out.vx;
    this.handleAIEvents(out.events);

    if (out.leap) {
      this.applyLeap(out.leap);
    } else {
      if (this.inLeap) this.exitLeap();
      if (canAct) {
        if (out.vx !== 0) this.facing = out.vx > 0 ? 1 : -1;
        this.scene.matter.body.setVelocity(this.body, { x: out.vx * PX_PER_S_TO_STEP, y: this.body.velocity.y });
      }
    }
    this.attack.follow(this.body.position.x, this.body.position.y, this.facing);
    this.animate(out.state, out.attack);
  }

  private handleAIEvents(events: BossAIEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.openChargeHitbox();
      else if (ev.type === 'hitboxOff') this.attack.close();
      else if (ev.type === 'landed') this.onLand();
      else if (ev.type === 'fire') {
        const { x, y } = this.body.position;
        // Altura de tronco a partir do chão de verdade (T9: nunca o y ao vivo do corpo - ver `groundTopBelow`).
        this.onFire?.(x, this.groundTopBelow(x, y) - BODY_H / 2, ev.dir, ev.speed, this.spec.damage.projectile);
      }
    }
  }

  private openChargeHitbox(): void {
    const hit: Hit = {
      ownerId: this.id,
      damage: this.spec.damage.charge,
      strength: 'heavy',
      force: 6,
      direction: { x: this.facing, y: -0.3 },
    };
    const shape = { offsetX: BODY_W / 2 + 15, offsetY: 0, width: 30, height: BODY_H };
    this.attack.open(shape, hit, this.body.position.x, this.body.position.y, this.facing);
  }

  /** Entra no salto: corpo vira sensor sem gravidade (evita colidir no ar) e guarda o y do chão (BAT-02). */
  private enterLeap(): void {
    this.inLeap = true;
    this.leapGroundY = this.body.position.y;
    applyFilter(this.body, Filters.bossAirborne);
    setIgnoreGravity(this.body, true);
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
  }

  /** Posição roteirizada do salto: x interpolado por `progress`, arco de altura fixa (BAT-02). */
  private applyLeap(leap: { fromX: number; toX: number; progress: number }): void {
    if (!this.inLeap) this.enterLeap();
    const x = leap.fromX + (leap.toX - leap.fromX) * leap.progress;
    const arc = Math.sin(Math.PI * leap.progress) * LEAP_ARC_HEIGHT;
    this.scene.matter.body.setPosition(this.body, { x, y: this.leapGroundY - arc });
  }

  /** Volta o corpo a sólido sem esperar o evento `landed` (ex.: ataque interrompido em pleno ar). */
  private exitLeap(): void {
    this.inLeap = false;
    applyFilter(this.body, Filters.boss);
    setIgnoreGravity(this.body, false);
  }

  /** Pouso (BAT-03/10): corpo sólido de novo, hitbox de impacto por um frame e aviso para a cena (ondas, T9). */
  private onLand(): void {
    this.exitLeap();
    const { x } = this.body.position;
    // Ancora no topo real do chão no nível da partida ou abaixo dele (a sonda começa nos pés do chefe): nunca pousa
    // numa plataforma acima, mesmo com o player embaixo dela (edge case da spec).
    const y = this.groundTopBelow(x, this.leapGroundY + BODY_H / 2 - 4) - BODY_H / 2;
    this.scene.matter.body.setPosition(this.body, { x, y });
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    const hit: Hit = {
      ownerId: this.id,
      damage: this.spec.damage.leap,
      strength: 'heavy',
      force: 6,
      direction: { x: 0, y: -0.6 },
    };
    const shape = { offsetX: 0, offsetY: 0, width: BODY_W + LANDING_HITBOX_PAD * 2, height: BODY_H };
    this.attack.open(shape, hit, x, y, this.facing);
    this.landingHitboxTicks = 1;
    // Rente ao chão de verdade (T9: nunca o y ao vivo do corpo - ver `groundTopBelow`).
    this.onLanded?.(x, this.groundTopBelow(x, y) - SHOCKWAVE_HALF_H, this.spec.damage.shockwave);
  }

  /**
   * Topo do terreno abaixo de `x`, a partir de `fromY` (BAT-03/04, T9): ancora o projétil/onda no chão de
   * verdade, nunca no y ao vivo do corpo do chefe. Depois de uma luta longa o corpo pode ficar um pouco cravado
   * no chão (o Matter aceita uma pequena sobreposição de contato que se acumula aos poucos); um projétil/onda
   * nascido nessa profundidade tocaria o terreno e sumiria no mesmo frame (BAT-06), sem nunca voar de verdade.
   * Sem terreno na sondagem (não deveria acontecer sobre um chão válido), devolve `fromY`.
   */
  private groundTopBelow(x: number, fromY: number): number {
    const region = { min: { x: x - 4, y: fromY - 4 }, max: { x: x + 4, y: fromY + GROUND_PROBE_DEPTH } };
    const hits = this.scene.matter.query.region(this.terrain, region);
    if (hits.length === 0) return fromY;
    return Math.min(...hits.map((b) => b.bounds.min.y));
  }

  /** Terreno a `WALL_PROBE` px à frente do corpo, na direção `dir` (BAT-01). */
  private isBlockedAhead(dir: 1 | -1): boolean {
    const { x, y } = this.body.position;
    const halfW = BODY_W / 2;
    const halfH = BODY_H / 2;
    const x0 = dir > 0 ? x + halfW : x - halfW - WALL_PROBE;
    const region = { min: { x: x0, y: y - halfH + 4 }, max: { x: x0 + WALL_PROBE, y: y + halfH - 4 } };
    return this.scene.matter.query.region(this.terrain, region).length > 0;
  }

  private animate(aiState: BossAIState, attack: BossAttack | null): void {
    const brainState = this.brain.state;
    let name: string;
    if (brainState === 'dead') name = 'dead';
    else if (brainState === 'roar') name = 'roar';
    else if (brainState === 'stagger') name = 'stagger';
    else if (attack && aiState === 'windup') name = `windup-${attack}`;
    else if (attack) name = attack;
    else name = 'idle';
    this.view.setPosition(this.body.position.x, this.body.position.y + BODY_H / 2);
    this.view.setScale(this.facing, 1);
    this.view.anims.play(bossAnimKey(this.spec.archetype, name), true);
  }

  /** Nova run com o chefe vivo (edge case): remove tudo na hora, sem efeitos de morte. */
  destroyNow(): void {
    if (this._removed) return;
    this.attack.close();
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this._removed = true;
  }
}
