import Phaser from 'phaser';
import { RUN_THRESHOLD, attackFrame, pickPlayerAnim, type AttackPhase, type PlayerAnimInput } from '../core/animState';
import type { CastState } from '../core/cast';
import { Filters } from '../core/collision';
import { ComboTracker, type ComboEvent } from '../core/combo';
import type { Hit, Vec2 } from '../core/hit';
import { Guard, resolveIncomingHit } from '../core/defense';
import { Dodge } from '../core/dodge';
import { Health } from '../core/health';
import { MotionInput } from '../core/motionInput';
import { shouldCancelJumpForUppercut } from '../core/fightInput';
import { MoveMachine, moveTravelAt, type MoveContext, type MoveEvent } from '../core/moveMachine';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import type { Modifiers } from '../core/modifiers';
import { PLAYER_STRUCTURE, Structure } from '../core/structure';
import { CHARGE_MS, DEFENSE, DODGE, type MoveDef } from '../data/moves';
import { CAST_FX, type TechId } from '../data/techniques';
import {
  PLAYER_HEALTH,
  PLAYER_KNOCKBACK,
  PLAYER_MOVE,
  PROP_SWING,
} from '../data/tuning';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import type { Fx } from './fx';
import type { InputSnapshot } from './input';
import { bodyOf, BodyRenderPos, PX_PER_S_TO_STEP } from './physics';
import type { Prop } from './Prop';
import { playerAnimKey } from './art';
import { PALETTE } from './art/palette';
import { PLAYER_ORIGIN } from './art/sprites/player';
import { AttackHitbox, type OnConnect } from './hitbox';
import { SIZE, TEX } from './textures';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;
/** Recuo lateral das zonas de sensor (px), para não pegar paredes. */
const SENSOR_INSET = 3;
/** Alcance da zona de coleta à frente do player (px); atrás vale metade. */
const PICKUP_REACH = 24;
/** Tempo (ms) que a pose de arremesso fica na tela depois de soltar o objeto. */
const THROW_POSE_MS = 200;
/** Profundidade do sprite do player (inimigos e objetos ficam em 0). */
const PLAYER_DEPTH = 1;
/** Piscar da invulnerabilidade: meio período (ms) e alpha da fase apagada. */
const BLINK_MS = 70;
const BLINK_ALPHA = 0.25;
/** Fade da câmera ao morrer e ao renascer (ms); o respawn em si sai do PLAYER_HEALTH.respawnMs. */
const DEATH_FADE_MS = 600;
const RESPAWN_FADE_MS = 300;

/** Conjuração ativa que trava o player (CAST-11/12/13): id da técnica e estado atual, escrito pelo `TechCaster`. */
export interface CastPose {
  id: TechId;
  state: CastState;
}

/** Quem atacou, para o lado do golpe (GRD-02/03), o tipo (GRD-06) e o efeito do parry no atacante (PAR-03/07/10). */
export interface Attacker {
  x: number;
  isBoss: boolean;
  parried(): void;
}

/** Desfecho de defesa avisado à cena (faíscas, hitstop, câmera lenta) no ponto de contato. */
export type DefenseKind = 'block' | 'parry' | 'perfectDodge';

/** Recuo do bloqueio (GRD-09, px) e a velocidade dele (px/s): 8 px em 100 ms. */
const BLOCK_PUSH_PX = DEFENSE.blockPushPx;
const BLOCK_PUSH_MS = 100;
/** Pose do finalizador (FIN-01): frame do golpe mais forte do grafo, por este tempo (ms). */
const FINISHER_POSE_MS = 350;
/** Troca de frame do atordoamento da guarda quebrada (ms). */
const STUN_FRAME_MS = 120;
/** Alpha do corpo enquanto a esquiva torna invulnerável. */
const DODGE_ALPHA = 0.6;
/** Frame da esquiva pelo tempo que falta de recarga (450 ms desde o início): primeira metade `dodge-0`, depois `dodge-1`. */
const DODGE_ELAPSED_HALF = (cooldownMs: number): 0 | 1 => (DODGE.cooldownMs - cooldownMs < DODGE.durationMs / 2 ? 0 : 1);

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly team = 'player';
  /** Corpo físico (invisível); o tamanho da textura placeholder define o corpo. */
  readonly sprite: Phaser.Physics.Matter.Image;
  /** Posição do corpo como a tela a mostra, entre os dois últimos passos de física (ITP-05). */
  private readonly drawPos: BodyRenderPos;
  /** O que aparece na tela: sprite animado com a origem no pé, seguindo o corpo. */
  readonly view: Phaser.GameObjects.Sprite;
  /**
   * Conjuração ativa (CAST-11/12/13), escrita pelo `TechCaster` a cada frame; gancho fino, sem lógica de técnica
   * aqui (design "Integration Points").
   */
  castLock: CastPose | null = null;
  /** Chamado quando um golpe é de fato aplicado (CAST-07); o `TechCaster` usa para cancelar a conjuração. */
  onDamaged: (() => void) | null = null;
  private move: MoveState = initialMoveState();
  /** Grafo de golpes do jogador (MOV-*): escolhe o golpe por botão + direção + ar; o swing com objeto segue no `propSwing`. */
  private readonly moves = new MoveMachine();
  private readonly motion = new MotionInput();
  /** Relógio de jogo do player (ms), para a meia-lua (SPC-01). */
  private clockMs = 0;
  /** Tempo (ms) segurando `K` desde o aperto que abriu o carregado; -1 sem aperto em andamento (MOV-09). */
  private heavyHoldMs = -1;
  /** Tempo no `active` do golpe atual e deslocamento já aplicado (voadora, AIR-02). */
  private activeElapsedMs = 0;
  private travelDone = { forward: 0, down: 0 };
  private chargeTinted = false;
  /** Pulo iniciado com `W` (AD-011): relógio de jogo (ms) da saída do chão, y do chão e o aperto de `W` mais recente. */
  private wJump: { startMs: number; groundY: number } | null = null;
  private lastWPressMs = -Infinity;
  /** Evento de debug do player (`move:<nome>`, `block`, `parry`, `dodge`, ...), entregue à cena. */
  onEvent: ((name: string) => void) | null = null;
  /** Quem bateu, por `hit.ownerId` (a cena procura em inimigos, chefe e projéteis). */
  attackerOf: ((ownerId: number) => Attacker | null) | null = null;
  /** Bloqueio, parry ou esquiva perfeita aconteceram, no ponto de contato (efeitos ficam com a cena). */
  onDefense: ((kind: DefenseKind, point: Vec2) => void) | null = null;
  private guard = new Guard();
  private readonly dodge = new Dodge();
  private readonly structure = new Structure(PLAYER_STRUCTURE);
  /** Recuo do bloqueio em curso (GRD-09). */
  private blockPush: { dir: 1 | -1; remainingPx: number } | null = null;
  /** O frame anterior era de dash da esquiva: no seguinte a velocidade zera, sem escorregar além dos 96 px. */
  private wasDashing = false;
  /**
   * Deslocamento x pendente (px) da esquiva, da voadora e do recuo do bloqueio. O Matter roda 0, 1 ou 2 steps por
   * frame conforme o tempo real; aplicar a velocidade do frame em todos os steps fazia o dash de 96 px andar de 96 a
   * 158 px. Aqui o total sai inteiro no primeiro step depois de produzido (mesmo padrão do L-001 do inimigo).
   */
  private scriptedDx = 0;
  /** Um step já aplicou `scriptedDx` neste frame: os steps seguintes zeram o x até o próximo `update`. */
  private stepDriven = false;
  private readonly onStep = (): void => {
    const body = bodyOf(this.sprite);
    if (this.scriptedDx !== 0) {
      this.scene.matter.body.setVelocity(body, { x: this.scriptedDx, y: body.velocity.y });
      this.scriptedDx = 0;
      this.stepDriven = true;
    } else if (this.stepDriven) {
      this.scene.matter.body.setVelocity(body, { x: 0, y: body.velocity.y });
    }
  };
  /** Tempo (ms) que a pose do finalizador segue na tela. */
  private poseMs = 0;
  private readonly propSwing = new ComboTracker([PROP_SWING], 0);
  private readonly hitbox: AttackHitbox;
  private held: Prop | null = null;
  private throwPoseMs = 0;
  /** `respawnMs: Infinity` (RUN-03): fora de run não existe mais respawn, só `resetForRun`. */
  private readonly health = new Health({ ...PLAYER_HEALTH, respawnMs: Infinity });
  /** Sentido do recuo do último golpe recebido. */
  private knockDir: 1 | -1 = 1;
  private blinkMs = 0;
  /** Flash sólido temporário (HEAL-10, ex.: cura), independente do piscar de invulnerabilidade. */
  private flashMs = 0;
  private flashColor: string | null = null;
  /** Onde o player renasce: o spawn do level. */
  private readonly spawn: { x: number; y: number };
  /** Sensor de chão do frame anterior, para a poeira do pouso (FX-04). */
  private wasGrounded = true;
  /** ms desde o último pouso (SPR-13); Infinity até o primeiro. Alimenta a animação `land`. */
  private landMs = Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
    private readonly props: () => readonly Prop[],
    private readonly fx: Fx,
    /** Modificadores da run (MOD-05, MOD-06), lidos na hora a cada golpe/movimento, sem cache. */
    private readonly modifiers: Modifiers,
    /** Golpe que conectou (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
  ) {
    this.sprite = scene.matter.add.image(x, y, TEX.player, undefined, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.player },
    });
    this.sprite.setFixedRotation();
    this.drawPos = new BodyRenderPos(scene, bodyOf(this.sprite));
    scene.matter.world.on('beforeupdate', this.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.onStep));
    this.sprite.setIgnoreGravity(true);
    this.sprite.setVisible(false);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
    // DOD-08: o primeiro golpe em até 1000 ms de uma esquiva perfeita causa ×1,5, uma vez (o `Dodge` cuida da janela).
    this.hitbox = new AttackHitbox(scene, this.id, this.team, onConnect, (h) => ({
      ...h,
      damage: this.dodge.applyCounterBonus(h.damage),
    }));
    this.spawn = { x, y };
    this.view = scene.add
      .sprite(x, y + SIZE.player.h / 2, TEX.playerArt, 'idle-0')
      .setOrigin(PLAYER_ORIGIN.x, PLAYER_ORIGIN.y)
      // Acima dos inimigos e objetos: o membro do golpe aparece por cima do alvo que ele atinge.
      .setDepth(PLAYER_DEPTH);
  }

  /** Centro do corpo como a tela o mostra neste quadro (ITP-05): a câmera e o objeto na mão seguem isto. */
  get renderPos(): Vec2 {
    return this.drawPos.get();
  }

  /** Põe o sprite visível, com a origem no pé, na posição de desenho do corpo. */
  private placeView(): void {
    const p = this.renderPos;
    this.view.setPosition(p.x, p.y + SIZE.player.h / 2);
  }

  /** Velocidade vertical do movimento (px/s, + para baixo), lida pelo smoke da gravidade na conjuração (CAST-11). */
  get verticalSpeed(): number {
    return this.move.vy;
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  /** RED-15: no chão agora, para decidir se o recuo da soltura do Vermelho se aplica (design "Vermelho"). */
  get grounded(): boolean {
    return this.touchesTerrain('below');
  }

  /** Objeto segurado agora (ITEM-01..03), `null` de mãos vazias. */
  get heldProp(): Prop | null {
    return this.held;
  }

  /** Posição + tamanho do corpo, nunca body.bounds. */
  hurtRect(): Rect {
    return { x: this.sprite.x, y: this.sprite.y, width: SIZE.player.w, height: SIZE.player.h };
  }

  /** Vida atual, para o HUD. */
  get hp(): number {
    return this.health.hp;
  }

  get maxHp(): number {
    return this.health.max;
  }

  get dead(): boolean {
    return this.health.dead;
  }

  /**
   * Golpe recebido: a única decisão de dano é `resolveIncomingHit` (parry → esquiva → guarda → golpe cheio). Só o
   * golpe cheio devolve `true` (faísca e hitstop do golpe); parry, esquiva e bloqueio têm feedback próprio.
   */
  receiveHit(hit: Hit): boolean {
    if (this.health.dead) return false;
    const attacker = this.attackerOf?.(hit.ownerId) ?? null;
    // Sem atacante conhecido (golpe de teste), o lado sai da direção do golpe: vindo "de frente" se ela aponta para trás.
    const attackerX = attacker ? attacker.x : this.sprite.x - Math.sign(hit.direction.x || 1);
    const inFront = this.facing === 1 ? attackerX >= this.sprite.x : attackerX <= this.sprite.x;
    const res = resolveIncomingHit({
      hit,
      attackerInFront: inFront,
      isBoss: attacker?.isBoss ?? false,
      guard: this.guard.state,
      dodgeInvulnerable: this.dodge.invulnerable,
    });
    const awayDir: 1 | -1 = attackerX >= this.sprite.x ? -1 : 1;
    const point: Vec2 = { x: this.sprite.x - awayDir * 14, y: this.sprite.y - 4 };
    switch (res.outcome) {
      case 'parry':
        this.onEvent?.('parry');
        attacker?.parried();
        this.onDefense?.('parry', point);
        return false;
      case 'dodged':
        if (this.dodge.registerIncomingHit()) {
          this.onEvent?.('perfectDodge');
          this.onDefense?.('perfectDodge', point);
        }
        return false;
      case 'block':
        this.onEvent?.('block');
        this.blockPush = { dir: awayDir, remainingPx: BLOCK_PUSH_PX };
        this.onDefense?.('block', point);
        if (this.structure.add(res.playerStructureGain)) this.onGuardBreak();
        if (res.damage > 0 && this.health.chip(res.damage) === 'died') this.die();
        return false;
      default:
        return this.takeHit(hit);
    }
  }

  /** Estrutura cheia (STR-06, STR-11): atordoa e larga o golpe; um `guardBreak:player`. */
  private onGuardBreak(): void {
    this.onMove(this.moves.cancel());
    this.heavyHoldMs = -1;
    this.onPropSwing(this.propSwing.cancel());
    this.onEvent?.('guardBreak:player');
  }

  /**
   * Dano cheio (HP-01..04): perde vida, fica invulnerável (piscando) e atordoado, com recuo na direção do golpe.
   * O golpe em andamento é cancelado. Ao zerar, larga o objeto e a tela escurece até o respawn.
   */
  private takeHit(hit: Hit): boolean {
    const result = this.health.receive(hit.damage);
    if (result === 'ignored') return false;
    this.onMove(this.moves.cancel());
    this.heavyHoldMs = -1;
    this.onPropSwing(this.propSwing.cancel());
    this.throwPoseMs = 0;
    this.knockDir = hit.direction.x < 0 ? -1 : 1;
    // CAST-07: golpe de fato aplicado avisa quem cuida da conjuração (TechCaster), sem lógica de técnica aqui.
    this.onDamaged?.();
    if (result === 'died') this.die();
    return true;
  }

  update(dtMs: number, input: InputSnapshot): void {
    this.stepDriven = false;
    for (const ev of this.health.update(dtMs)) if (ev === 'respawn') this.respawn();
    this.structure.update(dtMs);
    // Atordoado, morto ou com a guarda quebrada (STR-06): sem golpe, sem pegar objeto e sem controle (HP-03).
    const stunned = this.health.staggered || this.health.dead || this.structure.broken;
    // Conjurando (CAST-12/13): trava golpe, interação e movimento por input igual a um golpe em andamento — o
    // "Selo" da direção de arte trava o player por inteiro, não só o eixo horizontal citado na letra da AC.
    const casting = this.castLock !== null;

    // O objeto pode ter quebrado na mão durante o step de física.
    if (this.held && this.held.machine.holderId !== this.id) {
      this.held = null;
      // Sem objeto não há o que balançar: cancela o golpe para o player ficar livre na hora.
      this.onPropSwing(this.propSwing.cancel());
    }

    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.clockMs += dtMs;
    const onGround = sensors.grounded && this.move.vy >= 0;
    // AIR-04: pousar libera o golpe aéreo do próximo pulo.
    if (onGround) this.moves.land();
    if (input.dodgePressed && !stunned && !casting) this.tryDodge(input, onGround);
    const dodging = this.dodge.active;
    this.updateStrikes(dtMs, input, onGround, stunned || casting || dodging);
    this.onPropSwing(this.propSwing.update(dtMs));
    // Guarda no chão sem golpe, esquiva nem conjuração (GRD-01); o aperto abre a janela de parry (PAR-01/04).
    const canGuard = onGround && !this.moves.isMoving && !dodging && !casting && !stunned;
    if (input.guardPressed) this.guard.press(canGuard);
    this.guard.update(dtMs, input.guardHeld, canGuard);

    const attacking = this.moves.isMoving || this.propSwing.isAttacking;
    if (input.interactPressed && !attacking && !stunned && !casting && !dodging) this.interact(input.down);

    const before = this.move;
    const wPressedAt = input.jumpWPressed ? this.clockMs : this.lastWPressMs;
    this.lastWPressMs = wPressedAt;
    const groundYBefore = this.sprite.y;
    // MOD-06: velocidade de corrida lida de `modifiers` a cada frame, sem cache; CAST-11: gravidade a 30% em
    // `sign`/`charge` (só nesses dois estados: em `release`/`recover` a gravidade já volta ao normal).
    const castAirGravity = this.castLock?.state === 'sign' || this.castLock?.state === 'charge';
    const moveTuning = {
      ...PLAYER_MOVE,
      // GRD-05: guardando anda a 40% da velocidade de corrida.
      runSpeed: this.modifiers.runSpeed * (this.guard.state === 'none' ? 1 : DEFENSE.guardSpeedFactor),
      gravity: castAirGravity ? PLAYER_MOVE.gravity * CAST_FX.airGravity : PLAYER_MOVE.gravity,
    };
    this.move = stepMovement(this.move, input, sensors, dtMs, moveTuning, attacking || stunned || casting || dodging);
    this.applyMoveTravel(dtMs);
    this.applyDash(dtMs);
    this.applyBlockPush(dtMs);
    this.trackWJump(before, groundYBefore, wPressedAt);
    this.kickUpDust(before, sensors.grounded, dtMs);
    // Recuo: enquanto atordoado, empurrado na direção do golpe; morto, fica parado no lugar.
    if (this.health.staggered) this.move = { ...this.move, vx: this.knockDir * PLAYER_KNOCKBACK };
    else if (this.health.dead) this.move = { ...this.move, vx: 0 };
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
    this.hitbox.follow(this.sprite.x, this.sprite.y, this.facing);
    // O objeto na mão acompanha o sprite, não o corpo: senão ele treme contra a mão acima de 60 Hz.
    const draw = this.renderPos;
    this.held?.follow(draw.x, draw.y, this.facing);
    this.throwPoseMs = Math.max(0, this.throwPoseMs - dtMs);
    this.poseMs = Math.max(0, this.poseMs - dtMs);
    this.animate(sensors.grounded);
    this.blink(dtMs);
    this.tickFlash(dtMs);
  }

  /** Guarda de onde saiu um pulo iniciado com `W` (AD-011); qualquer outro pulo ou o pouso apaga a marca. */
  private trackWJump(before: MoveState, groundY: number, wPressedAt: number): void {
    const jumped = this.move.jumping && !before.jumping;
    if (jumped) {
      const fromW = this.clockMs - wPressedAt <= PLAYER_MOVE.jumpBufferMs;
      this.wJump = fromW ? { startMs: this.clockMs, groundY } : null;
    } else if (this.wJump && this.touchesTerrain('below') && this.move.vy >= 0) {
      this.wJump = null;
    }
  }

  /** Poeira nos pés (FX-04): ao pular, ao pousar e ao virar enquanto corre no chão. */
  private kickUpDust(before: MoveState, grounded: boolean, dtMs: number): void {
    const jumped = this.move.jumping && !before.jumping;
    const landed = grounded && !this.wasGrounded;
    const turned = grounded && this.move.facing !== before.facing && Math.abs(before.vx) > RUN_THRESHOLD;
    this.wasGrounded = grounded;
    this.landMs = landed ? 0 : this.landMs + dtMs;
    if (jumped || landed || turned) this.fx.dust(this.sprite.x, this.sprite.y + SIZE.player.h / 2);
  }

  /** Pisca enquanto invulnerável (HP-02). */
  private blink(dtMs: number): void {
    if (!this.health.invulnerable) {
      this.blinkMs = 0;
      this.view.setAlpha(this.dodge.invulnerable ? DODGE_ALPHA : 1);
      return;
    }
    this.blinkMs += dtMs;
    this.view.setAlpha(Math.floor(this.blinkMs / BLINK_MS) % 2 === 0 ? BLINK_ALPHA : 1);
  }

  /** hp 0 (HP-04): larga o objeto (ele cai em repouso), e a tela escurece até o respawn. */
  private die(): void {
    if (this.held) {
      this.held.holderGone(this.sprite.x, this.sprite.y);
      this.held = null;
    }
    this.scene.cameras.main.fadeOut(DEATH_FADE_MS);
  }

  /** Renasce no spawn do level com a vida cheia (o Health já voltou para o máximo). */
  private respawn(): void {
    this.sprite.setPosition(this.spawn.x, this.spawn.y);
    this.drawPos.snap();
    this.sprite.setVelocity(0, 0);
    this.move = initialMoveState();
    this.resetDefense();
    this.scene.cameras.main.fadeIn(RESPAWN_FADE_MS);
  }

  /** Zera guarda, esquiva, estrutura, golpe em curso e recuo (respawn e nova run). */
  private resetDefense(): void {
    this.onMove(this.moves.cancel());
    this.heavyHoldMs = -1;
    this.guard = new Guard();
    this.dodge.reset();
    this.structure.reset();
    this.blockPush = null;
    this.wasDashing = false;
  }

  /**
   * Nova run (RUN-02/05): larga o objeto da mão, volta ao spawn do level parado e com a vida cheia, sem
   * invulnerabilidade nem atordoamento. A morte deixou a câmera do mundo em fadeOut; aqui ela clareia de volta.
   */
  resetForRun(): void {
    if (this.held) {
      this.held.holderGone(this.sprite.x, this.sprite.y);
      this.held = null;
    }
    this.sprite.setPosition(this.spawn.x, this.spawn.y);
    this.drawPos.snap();
    this.sprite.setVelocity(0, 0);
    this.move = initialMoveState();
    this.resetDefense();
    this.health.reset();
    this.scene.cameras.main.fadeIn(RESPAWN_FADE_MS);
  }

  /** Empurrão instantâneo (BAI-13): o rugido do chefe soma esta velocidade horizontal (px/step) ao corpo. */
  /** Novo teto de vida (MOD-04): a compra de `vida` sobe o teto; `resetForRun` volta ao da tuning (MOD-10). */
  setMaxHp(n: number): void {
    this.health.setMax(n);
  }

  /** Cura com teto em maxHp (BWIN-01); devolve o que foi restaurado. */
  heal(amount: number): number {
    return this.health.heal(amount);
  }

  /** Flash sólido por `ms` (HEAL-10), na cor da PALETTE indicada; independente do piscar de invulnerabilidade. */
  flash(colorKey: string, ms: number): void {
    this.flashMs = ms;
    this.flashColor = colorKey;
    this.view.setTintFill(PALETTE[colorKey]);
  }

  private tickFlash(dtMs: number): void {
    if (this.flashMs <= 0) return;
    this.flashMs -= dtMs;
    if (this.flashMs <= 0) {
      this.view.clearTint();
      this.flashColor = null;
    }
  }

  /** Cor do flash em andamento (HEAL-10) para o snapshot de debug; `null` sem flash. */
  get activeFlash(): string | null {
    return this.flashMs > 0 && this.view.isTinted ? this.flashColor : null;
  }

  pushHorizontal(dir: 1 | -1, pxPerStep: number): void {
    const body = bodyOf(this.sprite);
    this.scene.matter.body.setVelocity(body, { x: body.velocity.x + dir * pxPerStep, y: body.velocity.y });
  }

  /** Fase do golpe de socos para o `TechCaster` (CAST-09/10); objeto na mão já é coberto por `isBusyForCast`. */
  meleePhase(): 'none' | 'startup' | 'active' | 'recover' {
    const phase = this.moves.phase;
    if (phase === 'startup' || phase === 'active') return phase;
    if (phase === 'recovery') return 'recover';
    return 'none';
  }

  /** CAST-10: encerra o golpe corpo a corpo em andamento (a `recover`) para a conjuração começar no mesmo frame. */
  cancelMelee(): void {
    this.onMove(this.moves.cancel());
  }

  /** Fase do golpe em andamento (`idle` sem golpe), para os efeitos da cena. */
  get movePhase(): 'idle' | 'startup' | 'active' | 'recovery' | 'window' {
    return this.moves.phase;
  }

  /** Nome do golpe em andamento, `null` sem golpe (MOV-18, `player.move` do snapshot). */
  get moveName(): string | null {
    return this.moves.current;
  }

  /** O golpe em andamento acertou um alvo (libera o cancelamento da recovery por esquiva, DOD-06). */
  hitLanded(): void {
    this.moves.hitLanded();
  }

  /** CAST-09: segurando objeto ou em hitstun (atordoado) impedem conjurar. */
  isBusyForCast(): boolean {
    return (
      this.held !== null ||
      this.health.staggered ||
      this.structure.broken ||
      this.guard.state !== 'none' ||
      this.dodge.active
    );
  }

  /** Nome do frame do sprite em cena, para o snapshot (`player.frame`, CTL-09). */
  get frameName(): string {
    return String(this.view.frame.name);
  }

  /** Guarda para o snapshot (`player.guard`): `parry` = janela aberta. */
  get guardState(): 'none' | 'guard' | 'parry' {
    return this.guard.state;
  }

  /** Estrutura para o snapshot e a barra do HUD (STR-01); `cur` arredondado. */
  get structureView(): { cur: number; max: number; broken: boolean } {
    return { cur: Math.round(this.structure.cur), max: this.structure.max, broken: this.structure.broken };
  }

  /** Esquiva para o snapshot (`player.dodge`). */
  get dodgeView(): { active: boolean; invulnerable: boolean; cooldownMs: number } {
    return { active: this.dodge.active, invulnerable: this.dodge.invulnerable, cooldownMs: Math.round(this.dodge.cooldownMs) };
  }

  /** Finalizador (FIN-01): vira para o alvo e mostra a pose de golpe por um instante. */
  finisherPose(dir: 1 | -1): void {
    this.move = { ...this.move, facing: dir };
    this.poseMs = FINISHER_POSE_MS;
  }

  /** Mata o player pelo caminho normal de morte (tecla 3 em `?debug`, RUN-03/04). */
  /** Dano de teste (só debug, tecla 4) pelo caminho normal de golpe. */
  debugHurt(damage: number): void {
    this.takeHit({ ownerId: 0, damage, strength: 'light', force: 0, direction: { x: this.facing, y: 0 } });
  }

  debugKill(): void {
    this.takeHit({
      ownerId: 0,
      damage: this.health.max,
      strength: 'heavy',
      force: 0,
      direction: { x: this.facing, y: -1 },
    });
  }

  /** FxLab (T28): vira o player para `dir` antes de disparar uma técnica mirada no boneco mais próximo. */
  debugFace(dir: 1 | -1): void {
    this.move.facing = dir;
  }

  /** FxLab (T28): teleporta o player no eixo x (y intacto) para o alcance curto do Punho Divergente/Kokusen. */
  debugTeleportX(x: number): void {
    const body = bodyOf(this.sprite);
    this.scene.matter.body.setPosition(body, { x, y: body.position.y });
    this.scene.matter.body.setVelocity(body, { x: 0, y: body.velocity.y });
  }

  /**
   * Escolhe a animação pelo animState (CHR-01). Nos golpes o frame sai da fase do combo (CHR-02), não do relógio
   * da animação: na fase ativa, com a hitbox ligada, aparece o frame *-hit com o membro esticado.
   */
  private animate(grounded: boolean): void {
    // CAST-13: em qualquer fase da conjuração, o frame vem do `castLock`, não do animState normal.
    if (this.castLock) {
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      v.setFrame(`${this.castLock.id}-${this.castLock.state}`);
      return;
    }
    if (this.poseMs > 0 && !this.health.dead && !this.health.staggered) {
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      v.setFrame('palmaExplosiva-hit');
      this.fx.afterimage(v);
      return;
    }
    if (this.structure.broken && !this.health.dead) {
      // Guarda quebrada (STR-06): cambaleia alternando os dois frames de atordoamento.
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      v.setFrame(`stunned-${Math.floor(this.clockMs / STUN_FRAME_MS) % 2}`);
      return;
    }
    if (this.dodge.active) {
      // Esquiva (DOD-01/11): corpo encolhido e rastro de imagens; o segundo frame na metade final do dash.
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      v.setFrame(`dodge-${DODGE_ELAPSED_HALF(this.dodge.cooldownMs)}`);
      this.fx.afterimage(v);
      return;
    }
    if (this.guard.state !== 'none' && !this.health.staggered && !this.health.dead && !this.moves.isMoving) {
      // CTL-09: guarda ou janela de parry mostram o frame `guard`.
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      v.setFrame('guard');
      return;
    }
    const mv = this.moves.def;
    if (mv && !(this.health.staggered || this.health.dead)) {
      // Golpe do grafo: o frame vem da fase (wind/hit/recover), não do relógio da animação (CHR-02).
      const v = this.view;
      this.placeView();
      v.setScale(this.facing, 1);
      v.anims.stop();
      const phase = this.moves.phase as AttackPhase;
      v.setFrame(`${mv.name}-${attackFrame(phase)}`);
      if (phase === 'active' && mv.strength === 'heavy') this.fx.afterimage(v);
      return;
    }
    this.tickChargeGlow();
    const input: PlayerAnimInput = {
      // Atordoado pelo golpe ou morto até o respawn.
      hurt: this.health.staggered || this.health.dead,
      attack: this.currentAttack(grounded),
      grounded,
      vx: this.move.vx,
      vy: this.move.vy,
      holding: this.held !== null,
      landMs: this.landMs,
    };
    const anim = pickPlayerAnim(input);
    const v = this.view;
    this.placeView();
    // Escala negativa espelha em volta da origem (o pé no centro do corpo); o flipX espelharia em volta do
    // centro do frame, que é mais largo que o corpo.
    v.setScale(this.facing, 1);
    if (input.attack && anim !== 'throw' && anim !== 'hurt') {
      v.anims.stop();
      v.setFrame(`${anim}-${attackFrame(input.attack.phase)}`);
    } else {
      v.anims.play(playerAnimKey(anim), true);
    }
    // Rastro enquanto o chute está na fase ativa ou a pose de arremesso está na tela (FX-05), já com o frame novo.
    if ((anim === 'kick' && input.attack?.phase === 'active') || anim === 'throw') this.fx.afterimage(v);
  }

  /** Chute carregado pronto (segurando `K` há CHARGE_MS): o corpo pisca branco (direção de arte do grafo). */
  private tickChargeGlow(): void {
    if (this.flashMs > 0) return;
    const charged = this.heavyHoldMs >= CHARGE_MS;
    if (charged) {
      this.chargeTinted = true;
      if (Math.floor(this.clockMs / 80) % 2 === 0) this.view.setTintFill(PALETTE.w);
      else this.view.clearTint();
    } else if (this.chargeTinted) {
      this.chargeTinted = false;
      this.view.clearTint();
    }
  }

  /** Golpe em andamento para a animação. Na janela do combo, só enquanto o player está parado no chão. */
  private currentAttack(grounded: boolean): PlayerAnimInput['attack'] {
    if (this.throwPoseMs > 0) return { name: 'throw', phase: 'active' };
    const still = grounded && Math.abs(this.move.vx) <= RUN_THRESHOLD;
    const swing = this.propSwing.phase;
    if (swing !== 'idle' && (swing !== 'window' || still)) return { name: 'swing', phase: swing };
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
      this.onMove(this.moves.cancel());
      this.heavyHoldMs = -1;
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

  /** Aperto de golpe, soltura do carregado e relógio do grafo (MOV-02..09, MOV-13, MOV-16..18, SPC-01). */
  private updateStrikes(dtMs: number, input: InputSnapshot, onGround: boolean, locked: boolean): void {
    const forward = this.facing === 1 ? input.right : input.left;
    this.motion.sample(this.clockMs, { down: input.down, forward });
    const ctx: MoveContext = { grounded: onGround, down: input.down, up: input.upHeld, forward };
    if (locked) this.heavyHoldMs = -1;
    if (!locked && this.held === null) {
      if (input.lightPressed && !onGround && this.tryUppercutCancel()) {
        // AD-011: o pulo com `W` some e o gancho ascendente sai do chão, como se `W`+`J` fossem no mesmo frame.
        this.onMove(this.moves.press('light', { grounded: true, down: false, up: true, forward }));
      } else if (input.lightPressed) this.onMove(this.moves.press('light', { ...ctx, motion: this.motion.matches(this.clockMs) }));
      if (input.heavyPressed) {
        this.onMove(this.moves.press('heavy', ctx));
        // Só um aperto no chão abre o carregado: a voadora/pisão apertadas no ar não carregam ao pousar.
        this.heavyHoldMs = onGround ? 0 : -1;
      } else if (this.heavyHoldMs >= 0) {
        this.heavyHoldMs += dtMs;
        if (!input.heavyHeld) {
          this.onMove(this.moves.release('heavy', this.heavyHoldMs, ctx));
          this.heavyHoldMs = -1;
        }
      }
    } else if (!locked && (input.lightPressed || input.heavyPressed)) {
      // Com objeto na mão J e K balançam o objeto (edge case da spec).
      this.onPropSwing(this.propSwing.press());
    }
    this.onMove(this.moves.update(dtMs));
    if (this.moves.phase === 'active') this.activeElapsedMs += dtMs;
  }

  /** `J` logo depois de um pulo com `W` (AD-011): volta ao chão e zera o pulo; `false` fora da janela. */
  private tryUppercutCancel(): boolean {
    const jump = this.wJump;
    if (!jump || this.moves.isMoving || !shouldCancelJumpForUppercut(this.clockMs - jump.startMs)) return false;
    this.wJump = null;
    this.sprite.setPosition(this.sprite.x, jump.groundY);
    this.move = { ...this.move, vy: 0, jumping: false, jumpHoldMs: 0, jumpBufferMs: 0 };
    return true;
  }

  private onMove(events: MoveEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'moveStart') {
        this.onEvent?.(`move:${ev.move.name}`);
        this.activeElapsedMs = 0;
        this.travelDone = { forward: 0, down: 0 };
        // Pisão (AIR-03): a velocidade vertical vai direto para a queda máxima.
        // O golpe aéreo assume a vertical: solta o pulo sustentado para a subida não sobrescrever a queda/avanço.
        if (ev.move.slam) this.move = { ...this.move, vy: PLAYER_MOVE.maxFallSpeed, jumping: false };
        else if (ev.move.travel) this.move = { ...this.move, jumping: false };
      } else if (ev.type === 'hitboxOn') this.openHitbox(ev.move);
      else if (ev.type === 'hitboxOff' || ev.type === 'moveEnd') this.hitbox.close();
    }
  }

  /**
   * Esquiva (DOD-01, DOD-04..06, DOD-09, DOD-10): no chão, sem golpe nem objeto em andamento, com a recarga zerada.
   * Um golpe que já acertou pode ser cancelado na recovery pela esquiva, no mesmo frame (DOD-06).
   */
  private tryDodge(input: InputSnapshot, onGround: boolean): void {
    if (!onGround || this.dodge.cooldownMs > 0 || this.propSwing.isAttacking) return;
    if (this.moves.isMoving && !this.moves.canDodgeCancel) return;
    const held = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.moves.isMoving) this.onMove(this.moves.cancel());
    this.heavyHoldMs = -1;
    const started = this.dodge.start({ grounded: onGround, busy: false, held: held as -1 | 0 | 1, facing: this.facing });
    if (started) this.onEvent?.('dodge');
  }

  /** Dash da esquiva (DOD-01): velocidade dirigida por frame, e zerada no frame seguinte ao fim (sem escorregar). */
  private applyDash(dtMs: number): void {
    const dx = this.dodge.update(dtMs);
    if (dx !== 0 && dtMs > 0) {
      this.scriptedDx += dx;
      this.move = { ...this.move, vx: 0 };
      this.wasDashing = true;
    } else if (this.wasDashing) {
      this.move = { ...this.move, vx: 0 };
      this.wasDashing = false;
    }
  }

  /** Recuo do bloqueio (GRD-09): 8 px para longe do atacante em 100 ms. */
  private applyBlockPush(dtMs: number): void {
    const push = this.blockPush;
    if (!push || dtMs <= 0) return;
    const px = Math.min(push.remainingPx, (BLOCK_PUSH_PX * dtMs) / BLOCK_PUSH_MS);
    this.scriptedDx += push.dir * px;
    this.move = { ...this.move, vx: 0 };
    push.remainingPx -= px;
    if (push.remainingPx <= 0) this.blockPush = null;
  }

  /** Voadora (AIR-02): durante o `active` o corpo anda 120 px à frente e 60 px para baixo, com velocidade dirigida. */
  private applyMoveTravel(dtMs: number): void {
    const def = this.moves.def;
    if (!def?.travel || this.moves.phase !== 'active' || dtMs <= 0) return;
    const target = moveTravelAt(def, this.activeElapsedMs);
    this.scriptedDx += this.facing * (target.forward - this.travelDone.forward);
    this.move = { ...this.move, vx: 0, vy: (target.down - this.travelDone.down) / (dtMs / 1000) };
    this.travelDone = target;
  }

  private openHitbox(move: MoveDef): void {
    const shape = move.hitbox;
    if (!shape) return;
    const hit: Hit = {
      ownerId: this.id,
      // MOD-05: dano do golpe escalado por `forca`, lido na hora.
      damage: this.modifiers.meleeDamage(move.damage),
      strength: move.strength,
      force: move.force,
      direction: { x: this.facing, y: move.strength === 'heavy' ? -0.6 : -0.15 },
      moveName: move.name,
      unblockable: move.unblockable,
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
