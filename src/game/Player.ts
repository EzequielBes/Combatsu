import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { ComboTracker } from '../core/combo';
import type { Hit, Vec2 } from '../core/hit';
import { CounterWindow, type CounterKind } from '../core/counter';
import { DeflectTracker, Guard } from '../core/defense';
import { Dodge } from '../core/dodge';
import { Duck } from '../core/duck';
import { Health } from '../core/health';
import { MotionInput } from '../core/motionInput';
import { MoveMachine } from '../core/moveMachine';
import { initialMoveState, type MoveState } from '../core/movement';
import type { Modifiers } from '../core/modifiers';
import { PLAYER_STRUCTURE, Structure } from '../core/structure';
import { PLAYER_HEALTH, PROP_SWING } from '../data/tuning';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import type { Fx } from './fx';
import type { InputSnapshot } from './input';
import { bodyOf, BodyRenderPos } from './physics';
import type { Prop } from './Prop';
import { PLAYER_ORIGIN } from './art/sprites/player';
import type { Attacker, CastPose, DefenseKind, OnStrikePhase } from './player/types';
import { PlayerAnimator } from './player/animator';
import { PlayerDefense } from './player/defense';
import { PlayerHolding } from './player/holding';
import { PlayerMovement } from './player/movement';
import { PlayerStrikes } from './player/strikes';
import { AttackHitbox, type OnConnect } from './hitbox';
import { SIZE, TEX } from './textures';
import { HD_ON } from './art/hd/flag';
import { hdAnchors } from './art/hd/sheet';

export type { Attacker, CastPose, DefenseKind, OnStrikePhase, StrikePhase } from './player/types';

/** Profundidade do sprite do player (inimigos e objetos ficam em 0). */
const PLAYER_DEPTH = 1;
/** Fade da câmera ao morrer e ao renascer (ms); o respawn em si sai do PLAYER_HEALTH.respawnMs. */
const DEATH_FADE_MS = 600;
const RESPAWN_FADE_MS = 300;

/** Pose do finalizador (FIN-01): frame do golpe mais forte do grafo, por este tempo (ms). */
const FINISHER_POSE_MS = 350;

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly team = 'player';
  /** Corpo físico (invisível); o tamanho da textura placeholder define o corpo. */
  readonly sprite: Phaser.Physics.Matter.Image;
  /** Colaboradores que dividem o estado do player: animador, defesa, golpes, movimento e objeto na mão. */
  readonly anim = new PlayerAnimator(this);
  readonly defense = new PlayerDefense(this);
  readonly strikes = new PlayerStrikes(this);
  readonly loco = new PlayerMovement(this);
  readonly holding = new PlayerHolding(this);
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
  move: MoveState = initialMoveState();
  /** Grafo de golpes do jogador (MOV-*): escolhe o golpe por botão + direção + ar; o swing com objeto segue no `propSwing`. */
  readonly moves = new MoveMachine();
  readonly motion = new MotionInput();
  /** Relógio de jogo do player (ms), para a meia-lua (SPC-01). */
  clockMs = 0;
  /** Tempo (ms) segurando `K` desde o aperto que abriu o carregado; -1 sem aperto em andamento (MOV-09). */
  heavyHoldMs = -1;
  /** Evento de debug do player (`move:<nome>`, `block`, `parry`, `dodge`, ...), entregue à cena. */
  onEvent: ((name: string) => void) | null = null;
  /** Quem bateu, por `hit.ownerId` (a cena procura em inimigos, chefe e projéteis). */
  attackerOf: ((ownerId: number) => Attacker | null) | null = null;
  /** Bloqueio, parry ou esquiva perfeita aconteceram, no ponto de contato (efeitos ficam com a cena). */
  onDefense: ((kind: DefenseKind, point: Vec2) => void) | null = null;
  guard = new Guard();
  readonly dodge = new Dodge();
  /** Abaixar (DEF-07): irmão da esquiva, com a recarga dividida com ela (DEF-15). */
  readonly duck = new Duck();
  /** Janela de Contra aberta por parry, esquiva perfeita ou abaixar que evitou golpe (CNT-01..04). */
  readonly counter = new CounterWindow();
  /** Conta os parries por sequência do inimigo, para a Deflexão (DFL-10, DFL-12). */
  readonly deflect = new DeflectTracker();
  readonly structure = new Structure(PLAYER_STRUCTURE);
  /** Tempo de jogo (ms) em que o input segue ignorado depois de um empurrão (RDG-21). */
  shoveLockMs = 0;
  /** Tempo (ms) que a pose do finalizador segue na tela. */
  poseMs = 0;
  readonly propSwing = new ComboTracker([PROP_SWING], 0);
  readonly hitbox: AttackHitbox;
  held: Prop | null = null;
  throwPoseMs = 0;
  /** `respawnMs: Infinity` (RUN-03): fora de run não existe mais respawn, só `resetForRun`. */
  readonly health = new Health({ ...PLAYER_HEALTH, respawnMs: Infinity });
  /** Sentido do recuo do último golpe recebido. */
  knockDir: 1 | -1 = 1;
  blinkMs = 0;
  /** Onde o player renasce: o spawn do level. */
  private readonly spawn: { x: number; y: number };
  /** Sensor de chão do frame anterior, para a poeira do pouso (FX-04). */
  wasGrounded = true;
  /** ms desde o último pouso (SPR-13); Infinity até o primeiro. Alimenta a animação `land`. */
  landMs = Infinity;

  constructor(
    readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly terrain: MatterJS.BodyType[],
    readonly props: () => readonly Prop[],
    readonly fx: Fx,
    /** Modificadores da run (MOD-05, MOD-06), lidos na hora a cada golpe/movimento, sem cache. */
    readonly modifiers: Modifiers,
    /** Golpe que conectou (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
    /** Troca de fase do golpe (startup, active, recovery, end); a cena liga rastro e chamas (TRL-03, TRL-07, TRL-08). */
    readonly onStrikePhase?: OnStrikePhase,
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
    scene.matter.world.on('beforeupdate', this.loco.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.loco.onStep));
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

  /** Onde o sprite visível está de fato, convertido para o centro do corpo: o snapshot lê isto, não o `renderPos`. */
  get spritePos(): Vec2 {
    return { x: this.view.x, y: this.view.y - SIZE.player.h / 2 };
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
    return this.loco.touchesTerrain('below');
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
   * Dano cheio (HP-01..04): perde vida, fica invulnerável (piscando) e atordoado, com recuo na direção do golpe.
   * O golpe em andamento é cancelado. Ao zerar, larga o objeto e a tela escurece até o respawn.
   */
  takeHit(hit: Hit): boolean {
    const result = this.health.receive(hit.damage);
    if (result === 'ignored') return false;
    this.strikes.onMove(this.moves.cancel());
    this.heavyHoldMs = -1;
    this.holding.onPropSwing(this.propSwing.cancel());
    this.throwPoseMs = 0;
    this.knockDir = hit.direction.x < 0 ? -1 : 1;
    // CAST-07: golpe de fato aplicado avisa quem cuida da conjuração (TechCaster), sem lógica de técnica aqui.
    this.onDamaged?.();
    if (result === 'died') this.die();
    return true;
  }

  /**
   * Golpe recebido: a única decisão de dano é `resolveIncomingHit` (ver `PlayerDefense.receiveHit`). Só o golpe cheio
   * devolve `true` (faísca e hitstop do golpe). Roda no passo de física (callback de colisão).
   */
  receiveHit(hit: Hit): boolean {
    return this.defense.receiveHit(hit);
  }

  /** O golpe em andamento acertou um alvo (DOD-06, VOA-04); ver `PlayerStrikes.hitLanded`. */
  hitLanded(): void {
    this.strikes.hitLanded();
  }

  /** Empurrão de um inimigo (RDG-19..21) na direção `dir`; ver `PlayerStrikes.shoved`. */
  shoved(dir: 1 | -1): void {
    this.strikes.shoved(dir);
  }

  update(dtMs: number, input: InputSnapshot): void {
    this.loco.stepDriven = false;
    for (const ev of this.health.update(dtMs)) if (ev === 'respawn') this.respawn();
    this.structure.update(dtMs);
    // Relógios de jogo da janela de Contra e do abaixar: o hitstop não chama `update`, então os congela (CNT-20).
    this.counter.update(dtMs);
    this.duck.update(dtMs);
    this.shoveLockMs = Math.max(0, this.shoveLockMs - dtMs);
    const bounceVy = this.strikes.applyPending();
    // Atordoado, morto, com a guarda quebrada (STR-06) ou empurrado (RDG-21): sem golpe, sem pegar objeto e sem controle (HP-03).
    const stunned = this.health.staggered || this.health.dead || this.structure.broken || this.shoveLockMs > 0;
    // Conjurando (CAST-12/13): trava golpe, interação e movimento por input igual a um golpe em andamento — o
    // "Selo" da direção de arte trava o player por inteiro, não só o eixo horizontal citado na letra da AC.
    const casting = this.castLock !== null;

    // O objeto pode ter quebrado na mão durante o step de física.
    if (this.held && this.held.machine.holderId !== this.id) {
      this.held = null;
      // Sem objeto não há o que balançar: cancela o golpe para o player ficar livre na hora.
      this.holding.onPropSwing(this.propSwing.cancel());
    }

    const sensors = { grounded: this.loco.touchesTerrain('below'), ceiling: this.loco.touchesTerrain('above') };
    this.clockMs += dtMs;
    const onGround = sensors.grounded && this.move.vy >= 0;
    // AIR-04: pousar libera o golpe aéreo do próximo pulo.
    if (onGround) this.moves.land();
    if (input.dodgePressed && !stunned && !casting) this.defense.tryDodge(input, onGround);
    const dodging = this.dodge.active;
    // Abaixado (DEF-07..10): travado como na esquiva, sem golpe, guarda, pegar objeto nem andar.
    const ducking = this.duck.active;
    this.strikes.updateStrikes(dtMs, input, onGround, stunned || casting, dodging || ducking);
    this.holding.onPropSwing(this.propSwing.update(dtMs));
    // Guarda no chão sem golpe, esquiva, abaixar nem conjuração (GRD-01); o aperto abre a janela de parry (PAR-01/04).
    const canGuard = onGround && !this.moves.isMoving && !dodging && !ducking && !casting && !stunned;
    if (input.guardPressed) this.guard.press(canGuard);
    this.guard.update(dtMs, input.guardHeld, canGuard);

    const attacking = this.moves.isMoving || this.propSwing.isAttacking;
    if (input.interactPressed && !attacking && !stunned && !casting && !dodging && !ducking)
      this.holding.interact(input.down);

    this.loco.step(dtMs, input, sensors, attacking || stunned || casting || dodging || ducking, ducking, bounceVy);
    this.sprite.setFlipX(this.move.facing < 0);
    this.hitbox.follow(this.sprite.x, this.sprite.y, this.facing);
    // O objeto na mão acompanha o sprite, não o corpo: senão ele treme contra a mão acima de 60 Hz.
    const draw = this.renderPos;
    this.held?.follow(draw.x, draw.y, this.facing, this.hdHand());
    this.throwPoseMs = Math.max(0, this.throwPoseMs - dtMs);
    this.poseMs = Math.max(0, this.poseMs - dtMs);
    this.anim.animate(sensors.grounded);
    this.anim.blink(dtMs);
    this.anim.tickFlash(dtMs);
  }

  /** `?hd=1`: a mão de perto do quadro HD, em px a partir do centro do corpo, e o giro do antebraço: o objeto fica nela. */
  private hdHand(): { x: number; y: number; angle: number } | undefined {
    const a = HD_ON ? hdAnchors(this.frameName) : undefined;
    return a ? { x: a.near.x, y: a.near.y + SIZE.player.h / 2, angle: a.nearAngle } : undefined;
  }

  /** hp 0 (HP-04): larga o objeto (ele cai em repouso), e a tela escurece até o respawn. */
  die(): void {
    // EDG-07: morrer fecha a janela de Contra (e descarta o aperto guardado).
    this.counter.close();
    if (this.held) {
      this.held.holderGone(this.sprite.x, this.sprite.y);
      this.held = null;
    }
    this.scene.cameras.main.fadeOut(DEATH_FADE_MS);
  }

  /** Renasce no spawn do level com a vida cheia (o Health já voltou para o máximo). */
  private respawn(): void {
    this.sprite.setPosition(this.spawn.x, this.spawn.y);
    // EDG-02: a posição de desenho e o sprite vão junto na hora, sem deslizar nem ficar um quadro para trás.
    this.drawPos.snap();
    this.anim.placeView();
    this.sprite.setVelocity(0, 0);
    this.move = initialMoveState();
    this.defense.resetDefense();
    this.scene.cameras.main.fadeIn(RESPAWN_FADE_MS);
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
    // EDG-02: a posição de desenho e o sprite vão junto na hora, sem deslizar nem ficar um quadro para trás.
    this.drawPos.snap();
    this.anim.placeView();
    this.sprite.setVelocity(0, 0);
    this.move = initialMoveState();
    this.defense.resetDefense();
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
    this.anim.flash(colorKey, ms);
  }

  /** Cor do flash em andamento (HEAL-10) para o snapshot de debug; `null` sem flash. */
  get activeFlash(): string | null {
    return this.anim.flashMs > 0 && this.view.isTinted ? this.anim.flashColor : null;
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
    this.strikes.onMove(this.moves.cancel());
  }

  /** Fase do golpe em andamento (`idle` sem golpe), para os efeitos da cena. */
  get movePhase(): 'idle' | 'startup' | 'active' | 'recovery' | 'window' {
    return this.moves.phase;
  }

  /** Nome do golpe em andamento, `null` sem golpe (MOV-18, `player.move` do snapshot). */
  get moveName(): string | null {
    return this.moves.current;
  }

  /** CAST-09: segurando objeto ou em hitstun (atordoado) impedem conjurar. */
  isBusyForCast(): boolean {
    return (
      this.held !== null ||
      this.health.staggered ||
      this.structure.broken ||
      this.guard.state !== 'none' ||
      this.dodge.active ||
      this.duck.active
    );
  }

  /** Nome do frame do sprite em cena, para o snapshot (`player.frame`, CTL-09). */
  get frameName(): string {
    return String(this.view.frame.name);
  }

  /** Chave da textura do sprite em cena, para o snapshot (`player.sheet`, ex.: `player-hd`). */
  get sheetKey(): string {
    return this.view.texture.key;
  }

  /** Guarda para o snapshot (`player.guard`): `parry` = janela aberta. */
  get guardState(): 'none' | 'guard' | 'parry' {
    return this.guard.state;
  }

  /** Estrutura para o snapshot e a barra do HUD (STR-01); `cur` arredondado. */
  get structureView(): { cur: number; max: number; broken: boolean } {
    return { cur: Math.round(this.structure.cur), max: this.structure.max, broken: this.structure.broken };
  }

  /** Esquiva para o snapshot (`player.dodge`); `cooldownMs` é a recarga comum com o abaixar (DEF-15). */
  get dodgeView(): { active: boolean; invulnerable: boolean; cooldownMs: number } {
    return {
      active: this.dodge.active,
      invulnerable: this.dodge.invulnerable,
      cooldownMs: Math.round(this.defense.evadeCooldownMs),
    };
  }

  /** Invulnerável depois de um golpe cheio (PST-15), para o snapshot (`player.invulnerable`). */
  get invulnerable(): boolean {
    return this.health.invulnerable;
  }

  /** Abaixar para o snapshot (`player.duck`, DEF-07). */
  get duckView(): { active: boolean } {
    return { active: this.duck.active };
  }

  /** Janela de Contra para o snapshot (`player.counter`, CNT-01..04): `remainingMs` é tempo de jogo, arredondado. */
  get counterView(): { open: boolean; kind: CounterKind | null; remainingMs: number } {
    return { open: this.counter.isOpen, kind: this.counter.kind, remainingMs: Math.round(this.counter.remainingMs) };
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
}
