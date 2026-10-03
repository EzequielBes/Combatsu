import Phaser from 'phaser';
import { RUN_THRESHOLD, pickEnemyAnim, type LightReaction } from '../core/animState';
import type { EnemyVariant } from '../core/enemyVariant';
import { pickHitReaction, type HitReaction } from '../core/hitReaction';
import { Filters } from '../core/collision';
import { EnemyAI, type AIEvent, type EnemyAIState } from '../core/enemyAI';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import { EnemyGuard, type GuardRoll } from '../core/enemyGuard';
import { ENEMY_STRUCTURE, Structure, enemyStructureGain } from '../core/structure';
import type { EnemyBase } from '../core/difficulty';
import type { ToolKey } from '../core/loot';
import { SpawnGrace } from '../core/spawnGrace';
import { DEFENSE, FINISHER_MOVE, MOVES, STRUCTURE } from '../data/moves';
import { normalize, type Hit, type Vec2 } from '../core/hit';
import { enemyAnimKey } from './art';
import { ENEMY_BAR_WELL } from './art/hud';
import { ART_SCALE, PALETTE } from './art/palette';
import { ENEMY_ORIGIN } from './art/sprites/enemy';
import { STRUCTURE_BAR_BG_COLOR, STRUCTURE_BAR_BREAK_COLOR, STRUCTURE_BAR_FILL_COLOR } from './art/combatColors';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import { AttackHitbox, type OnConnect } from './hitbox';
import { BodyRenderPos, PX_PER_S_TO_STEP, applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE, TEX, enemyTex } from './textures';

/** Duração (ms) do flash branco do golpe leve. */
const HIT_FLASH_MS = 70;
/** Ferramenta na mão (ARM-09): aura alternando a cada 150 ms; offset à frente do corpo. */
const WEAPON_AURA_MS = 150;
const WEAPON_OFFSET = { x: 10, y: 2 };
/** No golpe o inimigo fica acima do player (depth 1): a garra aparece por cima de quem ela atinge. */
const ATTACK_DEPTH = 2;
/** Barra de vida (HUD-02): altura do topo acima do centro do corpo (px) e profundidade, acima de todos. */
const BAR_RISE = 44;
const BAR_DEPTH = 3;
/** Barra de estrutura (STR-01): fina, logo abaixo da barra de vida (px de mundo). */
const STRUCTURE_BAR_H = 4;
const STRUCTURE_BAR_GAP = 1;
/** Ícone de estrela girando sobre a cabeça do inimigo quebrado (STR-05): altura acima do centro e giro (°/s). */
const BREAK_STAR_RISE = 34;
const BREAK_STAR_SPIN = 360;
/** Empurrão scriptado (SPC-02): número de steps do Matter em que o corpo anda os px do golpe. */
const SLIDE_STEPS = 25;
/** Gancho ascendente (MOV-11): velocidade vertical inicial (px/step) que leva o centro além dos 64 px do golpe. */
const LAUNCH_VY = -10;
/** Componente vertical (normalizado com o horizontal) do impulso de um empurrão: quase rente ao chão. */
const PUSH_LIFT = -0.15;

/** O que o limitador de atacantes da cena entrega ao inimigo a cada frame (LIM-01..03, LIM-07). */
export interface EnemyGateInput {
  granted: boolean;
  windupAllowed: boolean;
  holdRank: number;
}

/** Sem limitador (inimigo isolado): nunca tem vaga, então só persegue e espera. */
const NO_GATE: EnemyGateInput = { granted: false, windupAllowed: true, holdRank: 0 };

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
  private wantAttackNow = false;
  private windupStartNow = false;
  /** Graça ao nascer (WAVE-09): segura `canAct` pelos primeiros `graceMs`. */
  private readonly grace: SpawnGrace;
  private readonly attack: AttackHitbox;
  private readonly body: MatterJS.BodyType;
  /** Posição do corpo como a tela a mostra, entre os dois últimos passos de física (ITP-07). */
  private readonly drawPos: BodyRenderPos;
  private readonly view: Phaser.GameObjects.Sprite;
  private ragdoll: Ragdoll | null = null;
  /** Reação leve em curso (HRX-02); só vale enquanto o cérebro está em hitstun. */
  private reaction: LightReaction | null = null;
  /** Última reação de cabeça, para a alternância cabeça-a/cabeça-b (HRX-01). */
  private lastReaction: HitReaction | null = null;
  /** Reação escolhida no `receiveHit`, consumida pelo evento `hitReaction` do cérebro. */
  private pickedReaction: HitReaction | null = null;
  /** Chave da animação de reação que está tocando: evita reiniciar a cada frame (HRX-02). */
  private reactionKey: string | null = null;
  /** O ragdoll nasceu escondido atrás da pose de impacto; o próximo `update` troca sprite por ragdoll (HRX-05/06). */
  private pendingRagdollReveal = false;
  /** Sprite da ferramenta na mão (ARM-09/10), `null` se o inimigo não está armado. */
  private readonly weaponView: Phaser.GameObjects.Sprite | null;
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
  /** BLU-04: velocidade (px/step) do puxão do orbe Azul, reaplicada a cada step (L-001); `null` fora do raio. */
  private pull: Vec2 | null = null;
  /** Estrutura do inimigo (STR-01..05, PAR-03): quebra atordoa; `update` avança o relógio de jogo. */
  private readonly structure = new Structure(ENEMY_STRUCTURE);
  /** Tempo (ms de jogo) sem atacar nem andar depois de um parry (PAR-10). */
  private suppressedMs = 0;
  /** O finalizador já bateu nesta quebra (um por quebra, FIN-03). */
  private finished = false;
  /** Sorteio da guarda (EBL-01): o stream da run, entregue pela cena; sem ele nunca levanta a guarda. */
  guardRng: GuardRoll | null = null;
  /** Guarda do inimigo comum (EBL-01..05): 600 ms, bloqueia leve de frente; forte e carregado passam. */
  private readonly guard = new EnemyGuard({ chance: (p) => this.guardRng?.chance(p) ?? false });
  /** Faísca azul do bloqueio (EBL-02), no ponto de contato; a cena liga ao `Fx`. */
  onBlock: ((point: Vec2) => void) | null = null;
  private guardTinted = false;
  /** Empurrão scriptado em curso (SPC-02, MOV-*): velocidade x por step e steps que faltam. */
  private slide: { vxStep: number; stepsLeft: number; friction: Map<MatterJS.BodyType, { f: number; fs: number }> } | null =
    null;
  private readonly structBg: Phaser.GameObjects.Rectangle;
  private readonly structFill: Phaser.GameObjects.Rectangle;
  private readonly breakStar: Phaser.GameObjects.Image;
  /** Evento de debug do inimigo (`guardBreak:<id>`, ...), entregue à cena. */
  onEvent: ((name: string) => void) | null = null;
  private readonly onStep = (): void => {
    if (this.slide) {
      this.stepSlide();
      return;
    }
    // Os steps do Matter rodam antes do update da cena: sem este teste, o vx de andar do frame anterior passava
    // por cima do empurrão de um golpe recebido neste frame.
    if (this.brain.state !== 'idle' || this.ragdoll) return;
    if (this.pull) {
      this.scene.matter.body.setVelocity(this.body, { x: this.pull.x, y: this.pull.y });
      return;
    }
    if (this.walkVxStep === null) return;
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
    /** Ferramenta amaldiçoada na mão (ARM-01..03), `null` para um inimigo comum desarmado. */
    private readonly weaponInfo: { tool: ToolKey; rare: boolean } | null = null,
    /** Aparência sorteada na cena (EVR-04/05): folha, animações e partes do ragdoll. */
    readonly variant: EnemyVariant = 'corcunda',
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
    this.drawPos = new BodyRenderPos(scene, this.body);
    this.ai = new EnemyAI(tuning.ai);
    this.attack = new AttackHitbox(scene, this.id, this.team, onConnect);
    this.view = scene.add.sprite(spawn.x, spawn.y + h / 2, enemyTex(variant), 'idle-0').setOrigin(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y);
    this.weaponView = weaponInfo
      ? scene.add.sprite(spawn.x, spawn.y, weaponInfo.tool === 'cursedKnife' ? TEX.cursedKnife : TEX.cursedClub, 'hold-a')
      : null;
    this.barFrame = scene.add.image(0, 0, TEX.enemyBar).setOrigin(0, 0).setDepth(BAR_DEPTH).setVisible(false);
    const well = ENEMY_BAR_WELL;
    scene.matter.world.on('beforeupdate', this.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.onStep));
    this.barFill = scene.add
      .rectangle(0, 0, well.w * ART_SCALE, well.h * ART_SCALE, PALETTE.r)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    const barW = this.barFrame.width;
    this.structBg = scene.add
      .rectangle(0, 0, barW, STRUCTURE_BAR_H, STRUCTURE_BAR_BG_COLOR)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    this.structFill = scene.add
      .rectangle(0, 0, 0, STRUCTURE_BAR_H - 2, STRUCTURE_BAR_FILL_COLOR)
      .setOrigin(0, 0)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
    this.breakStar = scene.add.image(0, 0, TEX.fxStar, 'heavy').setDepth(BAR_DEPTH).setVisible(false);
  }

  get x(): number {
    return this.body.position.x;
  }

  /** BLU-04/05: puxão do orbe Azul (px/step, já convertido); `null` limpa (fora do raio ou orbe sumiu). */
  setPull(velocity: Vec2 | null): void {
    this.pull = velocity;
  }

  /** Posição + tamanho do corpo (em ragdoll ele acompanha o tronco), nunca body.bounds. */
  /** Centro do corpo como a tela o mostra neste quadro (ITP-07), para o snapshot de debug. */
  get renderPos(): Vec2 {
    return this.drawPos.get();
  }

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

  /** DIV-06: o alvo já morreu (ragdoll de morte, dissolvendo ou já sumido). */
  isDead(): boolean {
    return this.brain.isDead;
  }

  /** KOK-16: sprite visual para a silhueta do negativo do Kokusen. */
  get fxSprite(): Phaser.GameObjects.Sprite {
    return this.view;
  }

  /** Vida máxima com que o cérebro foi criado (DIF-04), para o snapshot de debug. */
  get maxHp(): number {
    return this.brain.maxHp;
  }

  /** Dano do golpe realmente usado da última garra aberta (DIF-04), para o snapshot de debug. */
  get damage(): number {
    return this.lastAttackDamage;
  }

  /** Estado atual da IA (`chase|hold|approach|windup|attack|rest`), lido pela cena para o limitador e pelo debug. */
  get aiState(): EnemyAIState {
    return this.ai.state;
  }

  /** `true` no frame em que a IA emitiu `wantAttack` (espera em `hold`, LIM-03): a cena pede vaga ao limitador. */
  get wantsAttack(): boolean {
    return this.wantAttackNow;
  }

  /** `true` no frame em que a IA emitiu `windupStart`: a cena avisa o limitador (`noteWindup`, LIM-02). */
  get windupStarted(): boolean {
    return this.windupStartNow;
  }

  /** Velocidade de perseguição da IA em uso, já escalada pela rodada (DIF-04/06), para o snapshot de debug. */
  get chaseSpeed(): number {
    return this.ai.chaseSpeed;
  }

  /** Frame atual do sprite (debug, HRX-02/05). */
  get frame(): string {
    return String(this.view.frame.name);
  }

  /** Sprite visível (debug, HRX-05). */
  get spriteVisible(): boolean {
    return this.view.visible;
  }

  /** Ragdoll existe e está visível; `null` fora de ragdoll (debug, HRX-05). */
  get ragdollVisible(): boolean | null {
    return this.ragdoll ? this.ragdoll.parts[0].visible : null;
  }

  /** Chaves de textura das partes do ragdoll; `null` fora de ragdoll (debug, EVR-06). */
  get ragdollTextures(): string[] | null {
    return this.ragdoll ? this.ragdoll.textureKeys : null;
  }

  /** Ferramenta amaldiçoada na mão (ARM-16), `null` se desarmado. */
  get weapon(): ToolKey | null {
    return this.weaponInfo?.tool ?? null;
  }

  /** Raridade da ferramenta na mão (RAR-02/06): sem sentido desarmado. */
  get weaponRare(): boolean {
    return this.weaponInfo?.rare ?? false;
  }

  /** Sprite da ferramenta visível (ARM-10); `null` sem arma. */
  get weaponVisible(): boolean | null {
    return this.weaponView ? this.weaponView.visible : null;
  }

  receiveHit(hit: Hit): boolean {
    if (this.brain.isDead) return false;
    const wasBroken = this.structure.broken;
    // EBL-02..05: a guarda segura o leve que vem de frente; forte e carregado passam com dano cheio e encerram a guarda.
    const fromFront = hit.direction.x * this.facing < 0;
    const res = this.guard.resolveHit({
      damage: hit.damage,
      strength: hit.strength,
      unblockable: hit.unblockable,
      fromFront,
      structureGain: enemyStructureGain(hit),
    });
    if (res.blocked) return this.onBlocked(res.structureGain);
    const isFinisher = hit.moveName === FINISHER_MOVE;
    const effect = !wasBroken && hit.moveName ? MOVES[hit.moveName]?.effect : undefined;
    // Quebrado e atordoado: o golpe tira vida mas não derruba nem empurra, para o finalizador ainda alcançar (FIN-01).
    let reaction: Hit = hit;
    if (wasBroken && !isFinisher) reaction = { ...hit, strength: 'light', force: 0 };
    // Empurrão (SPC-02): sai rente ao chão, para o deslocamento horizontal não esbarrar em plataformas.
    else if (effect?.type === 'push') reaction = { ...hit, direction: { x: hit.direction.x, y: PUSH_LIFT } };
    this.pickedReaction = pickHitReaction({ strength: reaction.strength, moveName: hit.moveName }, this.lastReaction);
    const events = this.brain.receiveHit(reaction, effect?.type === 'knockdown' ? { ragdollStunMs: effect.ms } : {});
    if (events.length === 0) return false; // já morto
    this.walkVxStep = null; // o golpe manda no corpo a partir de agora, não a IA
    // Levar golpe cancela o preparo ou o golpe em andamento (AI-04).
    this.onAI(this.ai.interrupt());
    this.handle(events);
    this.pickedReaction = null;
    const survived = !this.brain.isDead;
    if (survived && this.structure.add(enemyStructureGain(hit))) this.onBreak();
    if (survived && effect) this.applyEffect(effect, hit);
    this.updateBar();
    return true;
  }

  /** Golpe leve segurado pela guarda (EBL-02): sem dano nem reação, soma estrutura e avisa a cena. */
  private onBlocked(structureGain: number): boolean {
    this.onEvent?.(`enemyBlock:${this.id}`);
    this.onBlock?.({ x: this.body.position.x + this.facing * 10, y: this.body.position.y - 4 });
    if (this.structure.add(structureGain)) this.onBreak();
    this.updateBar();
    // `false`: o golpe não conectou de fato (sem faísca vermelha, hitstop nem combo); o feedback é o azul do bloqueio.
    return false;
  }

  /** Reação de golpe que sobrevive (MOV-11, MOV-10 pelo `ragdollStunMs`, SPC-02): lançar e empurrar. */
  private applyEffect(effect: NonNullable<(typeof MOVES)[string]['effect']>, hit: Hit): void {
    if (effect.type === 'launch') this.ragdoll?.launch(LAUNCH_VY);
    else if (effect.type === 'push') this.startSlide(hit.direction.x >= 0 ? 1 : -1, effect.px);
  }

  private startSlide(dir: 1 | -1, px: number): void {
    this.slide = { vxStep: (dir * px) / SLIDE_STEPS, stepsLeft: SLIDE_STEPS, friction: new Map() };
    // Sem atrito durante o empurrão: o chão não come o deslocamento, que fica exato (SPC-02); volta ao fim.
    for (const b of this.ragdoll ? this.ragdoll.bodies : [this.body]) {
      this.slide.friction.set(b, { f: b.friction, fs: b.frictionStatic });
      b.friction = 0;
      b.frictionStatic = 0;
    }
  }

  /**
   * Um step do empurrão: velocidade x fixa (L-001) em todas as partes por `SLIDE_STEPS` steps; o step seguinte
   * zera o x e devolve o atrito (deslocamento exato).
   */
  private stepSlide(): void {
    const slide = this.slide;
    if (!slide) return;
    const done = slide.stepsLeft === 0;
    const bodies = this.ragdoll ? this.ragdoll.bodies : [this.body];
    for (const b of bodies) {
      // Matter descontou `frictionAir` da velocidade a cada step: compensa para o corpo andar os px pedidos.
      const vx = done ? 0 : slide.vxStep / (1 - b.frictionAir);
      this.scene.matter.body.setVelocity(b, { x: vx, y: b.velocity.y });
    }
    if (done) this.endSlide();
    else slide.stepsLeft -= 1;
  }

  /** Devolve o atrito original às partes (as que já foram destruídas pelo getUp/remoção são ignoradas). */
  private endSlide(): void {
    const slide = this.slide;
    this.slide = null;
    if (!slide) return;
    for (const [b, { f, fs }] of slide.friction) {
      b.friction = f;
      b.frictionStatic = fs;
    }
  }

  /** Estrutura cheia (STR-05, STR-10): quebrou, atordoa e para no lugar; um `guardBreak:<id>`. */
  private onBreak(): void {
    this.guard.reset();
    this.onAI(this.ai.interrupt());
    this.walkVxStep = null;
    if (!this.ragdoll) this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    this.onEvent?.(`guardBreak:${this.id}`);
  }

  /** Golpe do inimigo aparado pelo jogador (PAR-03, PAR-10): +35 de estrutura e 400 ms parado. */
  parried(): void {
    if (this.brain.isDead) return;
    this.onAI(this.ai.interrupt());
    this.walkVxStep = null;
    this.suppressedMs = DEFENSE.parrySuppressMs;
    if (!this.ragdoll) this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    if (this.structure.add(STRUCTURE.enemy.parryGain)) this.onBreak();
    this.view.setTintFill(PALETTE.w);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.view.active) this.view.clearTint();
    });
    this.updateBar();
  }

  /** Estrutura viva para o snapshot (STR-01). */
  get structureView(): { cur: number; max: number; broken: boolean } {
    return { cur: Math.round(this.structure.cur), max: this.structure.max, broken: this.structure.broken };
  }

  /** Quebrado e atordoado: o finalizador procura por estes (FIN-01). */
  get broken(): boolean {
    return this.structure.broken;
  }

  /** Quebrado e ainda sem finalizador nesta quebra (FIN-01, um por quebra). */
  get finishable(): boolean {
    return this.structure.broken && !this.finished && !this.brain.isDead;
  }

  /** O finalizador acertou: não vale de novo até uma nova quebra. */
  markFinished(): void {
    this.finished = true;
  }

  /** Guardando (EBL-01), para o snapshot. */
  get guarding(): boolean {
    return this.guard.guarding;
  }

  /**
   * O jogador iniciou um golpe leve (EBL-01): se está a até 60 px, virado para cá e este inimigo está `idle`, sorteia a
   * guarda (`chanceOverride` fixa a chance em `?debug&enemyGuard=`). Ao subir, cancela o preparo e vira para o jogador
   * (a guarda só segura o que vem de frente).
   */
  onPlayerLightMove(player: { x: number; facing: 1 | -1 }, round: number, chanceOverride?: number): boolean {
    if (this._removed || this.ragdoll || this.brain.isDead || this.structure.broken) return false;
    const ex = this.body.position.x;
    const raised = this.guard.onPlayerLightMove(
      {
        round,
        idle: this.brain.state === 'idle',
        playerFacingEnemy: player.facing === 1 ? ex >= player.x : ex <= player.x,
        distancePx: Math.abs(ex - player.x),
      },
      chanceOverride,
    );
    if (!raised) return false;
    this.onAI(this.ai.interrupt());
    this.walkVxStep = null;
    this.facing = player.x >= ex ? 1 : -1;
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    return true;
  }

  /** Mostra a barra depois do primeiro dano e até morrer, cheia na proporção da vida, em passos de 1 texel. */
  private updateBar(): void {
    const show = !this.brain.isDead && this.brain.hp < this.tuning.brain.maxHp;
    this.barFrame.setVisible(show);
    const well = ENEMY_BAR_WELL;
    const texels = Math.round((well.w * this.brain.hp) / this.tuning.brain.maxHp);
    this.barFill.setVisible(show && texels > 0).setSize(texels * ART_SCALE, well.h * ART_SCALE);
    this.updateStructureBar();
    if (!show) return;
    const { x, y } = this.drawPos.get();
    const left = Math.round(x - this.barFrame.width / 2);
    const top = Math.round(y - BAR_RISE);
    this.barFrame.setPosition(left, top);
    this.barFill.setPosition(left + well.x * ART_SCALE, top + well.y * ART_SCALE);
  }

  /** Barra de estrutura amarela sob a de vida; a quebra estoura em branco e a estrela gira sobre a cabeça (STR-05). */
  private updateStructureBar(): void {
    const s = this.structure;
    const show = !this.brain.isDead && (s.cur > 0 || s.broken);
    this.structBg.setVisible(show);
    this.structFill.setVisible(show && s.cur > 0);
    this.breakStar.setVisible(show && s.broken);
    if (!show) return;
    const { x, y } = this.drawPos.get();
    const left = Math.round(x - this.barFrame.width / 2);
    const top = Math.round(y - BAR_RISE) + this.barFrame.height + STRUCTURE_BAR_GAP;
    this.structBg.setPosition(left, top);
    const inner = Math.max(0, this.barFrame.width - 2);
    this.structFill
      .setPosition(left + 1, top + 1)
      .setSize(Math.round((inner * s.cur) / s.max), STRUCTURE_BAR_H - 2)
      .setFillStyle(s.broken ? STRUCTURE_BAR_BREAK_COLOR : STRUCTURE_BAR_FILL_COLOR);
    this.breakStar.setPosition(x, y - BREAK_STAR_RISE).setAngle((this.scene.time.now * BREAK_STAR_SPIN) / 1000);
  }

  /**
   * `gate` vem da cena a cada frame (limitador de atacantes): `granted` (tem a vaga), `windupAllowed` (intervalo
   * entre windups) e `holdRank` (posição na fila de espera do lado do player). A IA continua pura.
   */
  update(dtMs: number, playerX: number, gate: EnemyGateInput = NO_GATE): void {
    if (this._removed) return;
    this.wantAttackNow = false;
    this.windupStartNow = false;
    this.grace.update(dtMs);
    this.suppressedMs = Math.max(0, this.suppressedMs - dtMs);
    this.structure.update(dtMs);
    if (!this.structure.broken) this.finished = false;
    this.guard.update(dtMs);
    if (this.pendingRagdollReveal) this.revealRagdoll();
    this.handle(this.brain.update(dtMs));
    if (this._removed) return;
    // Só age com o cérebro livre e fora da graça de nascimento: reação a golpe, ragdoll, levantando, morto,
    // recém-nascido, aparado (PAR-10) ou quebrado (STR-05) deixam a IA parada (AI-04, WAVE-09).
    const canAct =
      this.brain.state === 'idle' && !this.brain.isDead && !this.grace.active && this.suppressedMs <= 0 && !this.structure.broken && !this.guard.guarding;
    const out = this.ai.update(dtMs, {
      selfX: this.body.position.x,
      playerX,
      canAct,
      granted: gate.granted,
      windupAllowed: gate.windupAllowed,
      holdRank: gate.holdRank,
    });
    this.onAI(out.events);
    this.walkVxStep = canAct && !this.ragdoll ? out.vx * PX_PER_S_TO_STEP : null;
    if (this.ragdoll) {
      // Corpo escondido acompanha o tronco para o "levantar" nascer no lugar certo.
      this.scene.matter.body.setPosition(this.body, this.ragdoll.center);
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      this.updateBar();
      this.updateWeaponView(); // some junto com o sprite em ragdoll (ARM-10)
      return;
    }
    // Aparado ou quebrado com o cérebro livre: fica no lugar, sem andar (PAR-10, STR-05).
    if (!canAct && this.brain.state === 'idle' && !this.grace.active && !this.slide) {
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    }
    if (canAct) {
      this.facing = out.facing;
      // A IA só mexe no x; o y fica com a física (gravidade). Sem canAct o empurrão do golpe segue livre.
      this.scene.matter.body.setVelocity(this.body, { x: out.vx * PX_PER_S_TO_STEP, y: this.body.velocity.y });
    }
    this.attack.follow(this.body.position.x, this.body.position.y, this.facing);
    this.animate();
    this.updateBar();
    this.updateWeaponView();
  }

  /** Ferramenta na mão (ARM-09/10): some em ragdoll, senão segue a mão com a aura/preparo certo. */
  private updateWeaponView(): void {
    if (!this.weaponView) return;
    if (this.ragdoll || this._removed) {
      this.weaponView.setVisible(false);
      return;
    }
    this.weaponView.setVisible(true);
    this.weaponView.setFrame(this.weaponFrame());
    const { x, y } = this.drawPos.get();
    this.weaponView.setPosition(x + WEAPON_OFFSET.x * this.facing, y + WEAPON_OFFSET.y);
    this.weaponView.setFlipX(this.facing < 0);
    this.weaponView.setDepth(this.view.depth);
  }

  /** `raised` no preparo (ARM-09, glow U); senão a aura alterna entre `hold-a`/`hold-b` (rara: `hold-rare` fixo). */
  private weaponFrame(): string {
    if (this.ai.state === 'windup') return 'raised';
    if (this.weaponInfo?.rare) return 'hold-rare';
    return Math.floor(this.scene.time.now / WEAPON_AURA_MS) % 2 === 0 ? 'hold-a' : 'hold-b';
  }

  private onAI(events: AIEvent[]): void {
    for (const ev of events) {
      if (ev === 'hitboxOn') this.openAttack();
      else if (ev === 'hitboxOff') this.attack.close();
      else if (ev === 'wantAttack') this.wantAttackNow = true;
      else if (ev === 'windupStart') this.windupStartNow = true;
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
    const stunned = this.suppressedMs > 0 || this.structure.broken;
    if (this.brain.state !== 'hitstun') this.reaction = null;
    const picked = pickEnemyAnim({
      brain: this.brain.state,
      ai: this.ai.state,
      moving: Math.abs(vxPerS) > RUN_THRESHOLD,
      reaction: this.reaction,
    });
    const anim = stunned && picked !== 'getup' ? 'hurt' : picked;
    const draw = this.drawPos.get();
    this.view.setPosition(draw.x, draw.y + SIZE.enemy.h / 2);
    // Escala negativa espelha em volta da origem (o pé no centro do corpo), não do centro do frame largo.
    this.view.setScale(this.facing, 1);
    this.view.setDepth(anim === 'attack' ? ATTACK_DEPTH : 0);
    // Guarda (EBL-01): sem quadro próprio na arte, o corpo fica azulado enquanto a guarda está de pé.
    if (this.guard.guarding) {
      this.view.setTint(PALETTE.c);
      this.guardTinted = true;
    } else if (this.guardTinted) {
      this.view.clearTint();
      this.guardTinted = false;
    }
    const key = enemyAnimKey(this.variant, anim);
    if (anim.startsWith('hurt-')) {
      // Reação leve: já foi iniciada do frame 0 no golpe; aqui só garante a chave certa, sem reiniciar enquanto vale.
      if (this.reactionKey !== key) {
        this.view.anims.play(key, false);
        this.reactionKey = key;
      }
      return;
    }
    this.reactionKey = null;
    this.view.anims.play(key, true);
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

  /**
   * Golpe leve: animação `hurt-<reaction>` do frame 0, mesmo se já estava em outra reação (HRX-02), + flash branco,
   * sem ragdoll. Quebrado ou aparado continua mostrando `hurt` (HRX-04, decidido no `animate`).
   */
  private playHitReaction(hit: Hit): void {
    const picked = this.pickedReaction;
    if (picked && picked !== 'impact') {
      this.reaction = picked;
      if (picked === 'head-a' || picked === 'head-b') this.lastReaction = picked;
      if (!this.structure.broken && this.suppressedMs <= 0) {
        const key = enemyAnimKey(this.variant, `hurt-${picked}`);
        this.view.anims.play(key, false);
        this.view.anims.restart();
        this.reactionKey = key;
      }
    } else {
      this.reaction = null;
    }
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
      this.ragdoll = new Ragdoll(this.scene, this.body.position.x, this.body.position.y - 3, this.variant);
      for (const b of this.ragdoll.bodies) tagBody(b, { kind: 'character', target: this });
      // Pose de impacto (HRX-05/06): a cena não atualiza o inimigo durante o hitstop, então o ragdoll nasce
      // escondido e o sprite fica no frame `impact` até o próximo `update`, que faz a troca.
      this.ragdoll.setVisible(false);
      this.view.anims.stop();
      this.view.setVisible(true).setFrame('impact');
      this.reactionKey = null;
      this.reaction = null;
      this.pendingRagdollReveal = true;
      applyFilter(this.body, Filters.hidden);
      setIgnoreGravity(this.body, true);
    }
    this.ragdoll.impulse(hit.direction, hit.force);
  }

  /** Primeiro update depois da pose de impacto: o ragdoll aparece e o sprite some (HRX-05/06). */
  private revealRagdoll(): void {
    this.pendingRagdollReveal = false;
    if (!this.ragdoll) return;
    this.ragdoll.setVisible(true);
    this.view.setVisible(false);
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
    this.pendingRagdollReveal = false;
    this.reactionKey = null;
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
    this.drawPos.stop();
    this.attack.close();
    this.ragdoll?.destroy();
    this.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this.weaponView?.destroy();
    this.barFrame.destroy();
    this.barFill.destroy();
    this.structBg.destroy();
    this.structFill.destroy();
    this.breakStar.destroy();
    this.slide = null;
    this._removed = true;
  }
}
