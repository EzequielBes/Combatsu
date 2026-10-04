import Phaser from 'phaser';
import type { EnemyVariant } from '../core/enemyVariant';
import { pickHitReaction, type HitReaction } from '../core/hitReaction';
import { Filters } from '../core/collision';
import { EnemyAI, type AIEvent, type EnemyAIState } from '../core/enemyAI';
import { hitFieldsFor, type AttackKind } from '../core/attackKind';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import { EnemyGuard, type GuardRoll } from '../core/enemyGuard';
import { LightStreak, baseConditionsHold, guardChance, readingBonus, shoveRoll } from '../core/moveReading';
import { ENEMY_STRUCTURE, Structure, enemyStructureGain } from '../core/structure';
import type { EnemyBase } from '../core/difficulty';
import type { ToolKey } from '../core/loot';
import { SpawnGrace } from '../core/spawnGrace';
import type { ImpactTier } from '../core/impactTier';
import { COUNTER, DEFENSE, FINISHER_MOVE, MOVES, READING, STRUCTURE, type MoveDef } from '../data/moves';
import type { ParryInfo } from '../core/defense';
import { normalize, type Hit, type HitReport, type Vec2 } from '../core/hit';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import { AttackHitbox, type OnConnect } from './hitbox';
import { BodyRenderPos, applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE } from './textures';
import type { EnemyCtx } from './enemy/context';
import { EnemyAnimator } from './enemy/EnemyAnimator';
import { EnemyMovement } from './enemy/EnemyMovement';
import { EnemyHud } from './enemy/EnemyHud';

/** Gancho ascendente (MOV-11): velocidade vertical inicial (px/step) que leva o centro além dos 64 px do golpe. */
const LAUNCH_VY = -10;
/** Componente vertical (normalizado com o horizontal) do impulso de um empurrão: quase rente ao chão. */
const PUSH_LIFT = -0.15;

/**
 * O que a cena entrega ao inimigo a cada frame: o limitador de atacantes (LIM-01..03, LIM-07) e `focus`, se este é o
 * alvo em foco, que escolhe a taxa de queda da postura (PST-14, PST-16).
 */
export interface EnemyFrameInput {
  granted: boolean;
  windupAllowed: boolean;
  holdRank: number;
  focus: boolean;
}

/** Id da próxima sequência de golpes (DFL-10): global, para duas sequências de inimigos diferentes não se misturarem. */
let nextStringId = 1;

/** Sem limitador (inimigo isolado): nunca tem vaga, então só persegue e espera. */
const NO_GATE: EnemyFrameInput = { granted: false, windupAllowed: true, holdRank: 0, focus: false };

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
  /** Reação escolhida no `receiveHit`, consumida pelo evento `hitReaction` do cérebro. */
  private pickedReaction: HitReaction | null = null;
  /** O ragdoll nasceu escondido atrás da pose de impacto; o próximo `update` troca sprite por ragdoll (HRX-05/06). */
  private pendingRagdollReveal = false;
  /** Id da sequência de golpes em curso; muda a cada `windupStart` (DFL-10). */
  private stringId = 0;
  /** Dano da última garra realmente aberta (DIF-04); antes do primeiro golpe, o dano com que o inimigo nasceu. */
  private lastAttackDamage: number;
  /** Estrutura do inimigo (STR-01..05, PAR-03): quebra atordoa; `update` avança o relógio de jogo. */
  private readonly structure = new Structure(ENEMY_STRUCTURE);
  /** O finalizador já bateu nesta quebra (um por quebra, FIN-03). */
  private finished = false;
  /** Sorteio da guarda (EBL-01): o stream da run, entregue pela cena; sem ele nunca levanta a guarda. */
  guardRng: GuardRoll | null = null;
  /** Guarda do inimigo comum (EBL-01..05): 600 ms, bloqueia leve de frente; forte e carregado passam. */
  private readonly guard = new EnemyGuard({ chance: (p) => this.guardRng?.chance(p) ?? false });
  /** Faísca azul do bloqueio (EBL-02), no ponto de contato; a cena liga ao `Fx`. */
  onBlock: ((point: Vec2) => void) | null = null;
  /** Relógio de jogo do inimigo (ms): soma o `dt` do `update`, que não anda no hitstop; mede o intervalo dos leves (RDG-13). */
  private clockMs = 0;
  /** Leves seguidos aceitos por este inimigo (RDG-13..15). */
  private readonly streak = new LightStreak();
  /** Chance do empurrão no 4º leve seguido (RDG-16, `?debug&shove=`), entregue pela cena. */
  shoveChance: number = READING.shoveChance;
  /** O inimigo empurrou o jogador (RDG-17); `dir` é o sentido do deslocamento do jogador, para longe do inimigo. */
  onShove: ((dir: 1 | -1) => void) | null = null;
  /** A cena responde se a caixa toca o terreno (RCT-05: o deslizamento para na parede). */
  isWall: ((box: { min: Vec2; max: Vec2 }) => boolean) | null = null;
  /** A cena devolve os inimigos comuns de pé tocados por este corpo (RCT-04). */
  slideTouch: ((self: Enemy) => Enemy[]) | null = null;
  /** Resíduo nos pés a cada 40 ms de jogo (RCT-03); a cena liga ao `CursedFx.residue`. */
  onSlideResidue: ((at: Vec2) => void) | null = null;
  /** Evento de debug do inimigo (`guardBreak:<id>`, ...), entregue à cena. */
  onEvent: ((name: string) => void) | null = null;
  private readonly onStep = (): void => this.move.onStep();
  private readonly c: EnemyCtx;
  private readonly hud: EnemyHud;
  private readonly anim: EnemyAnimator;
  private readonly move: EnemyMovement;

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
    this.c = {
      id: this.id,
      scene,
      body: this.body,
      tuning,
      variant,
      brain: this.brain,
      ai: this.ai,
      structure: this.structure,
      guard: this.guard,
      drawPos: this.drawPos,
      hooks: {
        event: (name) => this.onEvent?.(name),
        block: (point) => this.onBlock?.(point),
        isWall: (box) => this.isWall?.(box) ?? false,
        slideTouch: () => this.slideTouch?.(this) ?? [],
        slideResidue: (at) => this.onSlideResidue?.(at),
      },
      s: { facing: 1, ragdoll: null, walkVxStep: null, suppressedMs: 0, removed: false },
    };
    this.attack = new AttackHitbox(scene, this.id, this.team, onConnect);
    scene.matter.world.on('beforeupdate', this.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.onStep));
    this.move = new EnemyMovement(this.c);
    this.anim = new EnemyAnimator(this.c, spawn, weaponInfo);
    this.hud = new EnemyHud(this.c);
  }

  get x(): number {
    return this.body.position.x;
  }

  /** BLU-04/05: puxão do orbe Azul (px/step, já convertido); `null` limpa (fora do raio ou orbe sumiu). */
  setPull(velocity: Vec2 | null): void {
    this.move.setPull(velocity);
  }

  /** Onde o sprite visível está de fato, convertido para o centro do corpo (ITP-07), para o snapshot de debug. */
  get spritePos(): Vec2 {
    return { x: this.anim.view.x, y: this.anim.view.y - SIZE.enemy.h / 2 };
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
    return this.c.s.removed;
  }

  /** DIV-06: o alvo já morreu (ragdoll de morte, dissolvendo ou já sumido). */
  isDead(): boolean {
    return this.brain.isDead;
  }

  /** KOK-16: sprite visual para a silhueta do negativo do Kokusen. */
  get fxSprite(): Phaser.GameObjects.Sprite {
    return this.anim.view;
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
    return String(this.anim.view.frame.name);
  }

  /** Sprite visível (debug, HRX-05). */
  get spriteVisible(): boolean {
    return this.anim.view.visible;
  }

  /** Ragdoll existe e está visível; `null` fora de ragdoll (debug, HRX-05). */
  get ragdollVisible(): boolean | null {
    return this.c.s.ragdoll ? this.c.s.ragdoll.parts[0].visible : null;
  }

  /** Corpos das partes do ragdoll; `null` fora de ragdoll (rachadura da queda, IMP-15). */
  get ragdollBodies(): MatterJS.BodyType[] | null {
    return this.c.s.ragdoll ? this.c.s.ragdoll.bodies : null;
  }

  /** Chaves de textura das partes do ragdoll; `null` fora de ragdoll (debug, EVR-06). */
  get ragdollTextures(): string[] | null {
    return this.c.s.ragdoll ? this.c.s.ragdoll.textureKeys : null;
  }

  /** Golpes aceitos no `ragdollStun` atual, para o snapshot (GND-05). */
  get downHits(): number {
    return this.brain.downHits;
  }

  /** Tipo do golpe deste inimigo (HGT-01..06), resolvido pela cena no spawn. */
  private get kind(): AttackKind {
    return this.tuning.attack.kind;
  }

  /** Frame do marcador de telegrafo se ele está visível, lido do sprite desenhado; senão `null` (HGT-07, HGT-08). */
  get telegraph(): AttackKind | null {
    return this.anim.telegraph;
  }

  /** Comprometido (CMT-01): o golpe pendente sai mesmo levando golpe comum. */
  get committed(): boolean {
    return this.ai.committed;
  }

  /** Chave da `PALETTE` do flash de compromisso enquanto ele dura, lido do tint do sprite; `null` fora dele (CMT-02). */
  get commitFlash(): string | null {
    return this.anim.commitFlash;
  }

  /** Tipo e posição do golpe na sequência para o snapshot: `index` 0 fora de `windup` e `attack` (DFL-15). */
  get attackView(): { kind: AttackKind; index: number; length: number } {
    return { kind: this.kind, index: this.ai.hitIndex, length: this.ai.hits };
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
    return this.anim.weaponVisible;
  }

  /**
   * `report` é de saída (TGT-06): `blocked` quando a guarda segurou o golpe. Golpe aceito devolve `true`, inclusive o
   * que bateu num inimigo comprometido e foi absorvido (`armored`, CMT-04): ele perde vida e postura, mas o ataque sai.
   */
  receiveHit(hit: Hit, report?: HitReport): boolean {
    if (this.brain.isDead) return false;
    const wasBroken = this.structure.broken;
    // EBL-02..05: a guarda segura o leve que vem de frente; forte e carregado passam com dano cheio e encerram a guarda.
    const fromFront = hit.direction.x * this.c.s.facing < 0;
    const res = this.guard.resolveHit({
      damage: hit.damage,
      strength: hit.strength,
      unblockable: hit.unblockable,
      fromFront,
      structureGain: enemyStructureGain(hit),
    });
    if (res.blocked) {
      if (report) report.blocked = true;
      return this.onBlocked(res.structureGain);
    }
    const isFinisher = hit.moveName === FINISHER_MOVE;
    const effect = !wasBroken && hit.moveName ? MOVES[hit.moveName]?.effect : undefined;
    // Quebrado e atordoado: o golpe tira vida mas não derruba nem empurra, para o finalizador ainda alcançar (FIN-01, EDG-11).
    let reaction: Hit = hit;
    if (wasBroken && !isFinisher) reaction = { ...hit, strength: 'light', force: 0, knockdown: false };
    // Empurrão (SPC-02): sai rente ao chão, para o deslocamento horizontal não esbarrar em plataformas.
    else if (effect?.type === 'push') reaction = { ...hit, direction: { x: hit.direction.x, y: PUSH_LIFT } };
    this.pickedReaction = pickHitReaction(
      { strength: reaction.strength, moveName: hit.moveName },
      this.anim.lastReaction,
    );
    const events = this.brain.receiveHit(reaction, {
      committed: this.ai.committed,
      ...(effect?.type === 'knockdown' ? { ragdollStunMs: effect.ms } : {}),
    });
    if (events.length === 0) return false; // já morto, levantando ou no limite do chão (GND-02, GND-03)
    // Comprometido e sem que o golpe derrube, mate ou seja Contra: a IA segue e o golpe pendente sai (CMT-05).
    const armored = events.some((ev) => ev.type === 'armored');
    if (!armored) {
      this.c.s.walkVxStep = null; // o golpe manda no corpo a partir de agora, não a IA
      // Levar golpe cancela o preparo ou o golpe em andamento antes do compromisso (AI-04, CMT-03).
      this.onAI(this.ai.interrupt());
    }
    this.handle(events);
    this.pickedReaction = null;
    const survived = !this.brain.isDead;
    if (survived && this.structure.add(enemyStructureGain(hit))) this.onBreak();
    if (survived && effect && !armored) this.applyEffect(effect, hit);
    if (survived) this.trackStreak(hit);
    this.hud.updateBar();
    return true;
  }

  /**
   * Leves seguidos e empurrão (RDG-13..18), com o golpe do jogador já aceito: o golpe forte zera a contagem; o leve
   * corpo a corpo soma, e do 4º em diante o inimigo livre sorteia o empurrão no stream de guarda da run. Objeto e
   * técnica não entram na sequência de leves.
   */
  private trackStreak(hit: Hit): void {
    if (hit.strength === 'heavy') {
      this.streak.onHeavy();
      return;
    }
    if (hit.tech || hit.moveName === undefined) return;
    const count = this.streak.onLight(this.clockMs);
    const free = !this.ai.committed && !this.structure.broken && !this.c.s.ragdoll && !this.brain.isDead;
    if (!free || !this.guardRng || !shoveRoll({ streak: count, chance: this.shoveChance, roll: this.guardRng })) return;
    this.streak.reset();
    this.brain.recover();
    this.onEvent?.(`shove:${this.id}`);
    // O jogador bateu de frente: sai para o lado oposto ao do golpe.
    this.onShove?.(hit.direction.x >= 0 ? -1 : 1);
  }

  /** Golpe leve segurado pela guarda (EBL-02): sem dano nem reação, soma estrutura e avisa a cena. */
  private onBlocked(structureGain: number): boolean {
    this.onEvent?.(`enemyBlock:${this.id}`);
    this.onBlock?.({ x: this.body.position.x + this.c.s.facing * 10, y: this.body.position.y - 4 });
    if (this.structure.add(structureGain)) this.onBreak();
    this.hud.updateBar();
    // `false`: o golpe não conectou de fato (sem faísca vermelha, hitstop nem combo); o feedback é o azul do bloqueio.
    return false;
  }

  /** Reação de golpe que sobrevive (MOV-11, MOV-10 pelo `ragdollStunMs`, SPC-02): lançar e empurrar. */
  private applyEffect(effect: NonNullable<(typeof MOVES)[string]['effect']>, hit: Hit): void {
    if (effect.type === 'launch') this.c.s.ragdoll?.launch(LAUNCH_VY);
    else if (effect.type === 'push') this.move.startSlide(hit.direction.x >= 0 ? 1 : -1, effect.px);
  }

  /** Estrutura cheia (STR-05, STR-10): quebrou, atordoa e para no lugar; um `guardBreak:<id>`. */
  private onBreak(): void {
    this.guard.reset();
    this.onAI(this.ai.interrupt());
    this.c.s.walkVxStep = null;
    if (!this.c.s.ragdoll) this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    this.onEvent?.(`guardBreak:${this.id}`);
  }

  /**
   * Golpe do inimigo aparado pelo jogador (PAR-03, DFL-07..11): +35 de estrutura sempre. Golpe do meio da sequência
   * não faz mais nada e a sequência segue (DFL-07, DFL-08); o último deixa o inimigo 400 ms parado (DFL-09), e a
   * Deflexão o põe em `stagger` por `COUNTER.deflectStaggerMs` (DFL-11).
   */
  parried(info: ParryInfo = { final: true, deflect: false }): void {
    if (this.brain.isDead) return;
    if (info.final) {
      this.onAI(this.ai.interrupt());
      this.c.s.walkVxStep = null;
      this.c.s.suppressedMs = DEFENSE.parrySuppressMs;
      if (!this.c.s.ragdoll) this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
      if (info.deflect) this.brain.forceStagger(COUNTER.deflectStaggerMs);
    }
    if (this.structure.add(STRUCTURE.enemy.parryGain)) this.onBreak();
    this.hud.updateBar();
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

  /** A guarda de pé é de leitura (RDG-06), para o snapshot. */
  get guardRead(): boolean {
    return this.guard.read;
  }

  /** Leves seguidos aceitos, para o snapshot (RDG-13). */
  get lightStreak(): number {
    return this.streak.count;
  }

  /**
   * O jogador iniciou um golpe do grafo (RDG-03, RDG-10). Se este inimigo é elegível, está de frente para o jogador e a
   * até `READING.rangePx + travel.forwardPx` dele, sorteia a guarda com `guardChance`: a base do EBL-01 (golpe leve,
   * `idle`, a 60 px) mais o bônus de leitura das `repeats`; `override` fixa a chance (`?debug&enemyGuard=`). Ao subir,
   * cancela o preparo e vira para o jogador (a guarda só segura o que vem de frente). A guarda de leitura (bônus acima
   * de 0, sem `override`) tira o inimigo do `hitstun` ou do `stagger` (RDG-09) e emite `read:<id>` (RDG-05); com
   * `override` a leitura não conta e a guarda é sempre a comum (RDG-10).
   */
  onPlayerMove(
    player: { x: number; facing: 1 | -1 },
    move: Pick<MoveDef, 'strength' | 'travel'>,
    round: number,
    reading: { repeats: number; override?: number },
  ): boolean {
    if (this.c.s.removed || this.c.s.ragdoll || this.brain.isDead || this.structure.broken) return false;
    // Comprometido (inclui `attack`, CMT-10) e levantando não levantam a guarda.
    if (this.ai.committed || this.brain.state === 'gettingUp') return false;
    const ex = this.body.position.x;
    const distancePx = Math.abs(ex - player.x);
    const playerFacingEnemy = player.facing === 1 ? ex >= player.x : ex <= player.x;
    if (!playerFacingEnemy || distancePx > READING.rangePx + (move.travel?.forwardPx ?? 0)) return false;
    const bonus = readingBonus(reading.repeats);
    const chance = guardChance({
      base: EnemyGuard.chanceFor(round),
      reading: bonus,
      override: reading.override,
      baseConditions: baseConditionsHold(
        { round, idle: this.brain.state === 'idle', playerFacingEnemy, distancePx },
        move.strength,
      ),
    });
    // RDG-10: com `enemyGuard=N` a leitura é ignorada; a guarda que sobe é a comum, sem `read:<id>`.
    const read = bonus > 0 && reading.override === undefined;
    if (!this.guard.tryRaise(chance, read)) return false;
    if (read) {
      this.brain.recover();
      this.onEvent?.(`read:${this.id}`);
    }
    this.onAI(this.ai.interrupt());
    this.c.s.walkVxStep = null;
    this.c.s.facing = player.x >= ex ? 1 : -1;
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    return true;
  }

  /**
   * `gate` vem da cena a cada frame (limitador de atacantes): `granted` (tem a vaga), `windupAllowed` (intervalo
   * entre windups), `holdRank` (posição na fila de espera do lado do player) e `focus` (alvo em foco). A IA continua pura.
   */
  update(dtMs: number, playerX: number, gate: EnemyFrameInput = NO_GATE): void {
    if (this.c.s.removed) return;
    this.wantAttackNow = false;
    this.windupStartNow = false;
    this.clockMs += dtMs;
    this.grace.update(dtMs);
    this.c.s.suppressedMs = Math.max(0, this.c.s.suppressedMs - dtMs);
    // PST-14, PST-16: no foco a postura cai devagar; fora dele, rápido. O atraso de 1500 ms vale nos dois.
    this.structure.update(dtMs, gate.focus ? STRUCTURE.enemy.decayPerSec : STRUCTURE.enemy.offFocusDecayPerSec);
    if (!this.structure.broken) this.finished = false;
    this.guard.update(dtMs);
    if (this.pendingRagdollReveal) this.revealRagdoll();
    this.handle(this.brain.update(dtMs));
    if (this.c.s.removed) return;
    this.move.stepHitSlide(dtMs);
    this.anim.tick(dtMs);
    // Só age com o cérebro livre e fora da graça de nascimento: reação a golpe, ragdoll, levantando, morto,
    // recém-nascido, aparado (PAR-10) ou quebrado (STR-05) deixam a IA parada (AI-04, WAVE-09).
    const canAct =
      this.brain.state === 'idle' &&
      !this.brain.isDead &&
      !this.grace.active &&
      this.c.s.suppressedMs <= 0 &&
      !this.structure.broken &&
      !this.guard.guarding;
    const out = this.ai.update(dtMs, {
      selfX: this.body.position.x,
      playerX,
      canAct,
      granted: gate.granted,
      windupAllowed: gate.windupAllowed,
      holdRank: gate.holdRank,
    });
    this.onAI(out.events);
    this.move.setWalk(out, canAct);
    if (this.c.s.ragdoll) {
      this.move.followRagdoll();
      this.hud.updateBar();
      this.anim.updateWeaponView(); // some junto com o sprite em ragdoll (ARM-10)
      return;
    }
    this.move.drive(out, canAct, this.grace.active);
    this.attack.follow(this.body.position.x, this.body.position.y, this.c.s.facing);
    this.anim.animate();
    this.hud.updateBar();
    this.anim.updateWeaponView();
  }

  private onAI(events: AIEvent[]): void {
    for (const ev of events) {
      if (ev === 'hitboxOn') this.openAttack();
      else if (ev === 'hitboxOff') this.attack.close();
      else if (ev === 'wantAttack') this.wantAttackNow = true;
      else if (ev === 'windupStart') {
        this.windupStartNow = true;
        this.stringId = nextStringId++;
      } else if (ev === 'commit') this.anim.flashCommit();
    }
    // Toda mudança de estado da IA passa por aqui (`update` e `interrupt`): o marcador acompanha na hora.
    this.anim.updateTelegraph();
  }

  /**
   * Garra: dano da rodada (DIF-04), time 'enemy' (nunca acerta outro inimigo, AI-05). Altura e `unblockable` saem do
   * tipo do golpe (HGT-04..06) e `string` diz qual golpe da sequência é este (DFL-10, DFL-15). A hitbox abre com um
   * portão novo a cada golpe, então o seguinte da sequência acerta de novo quem o anterior já acertou (DFL-05).
   */
  private openAttack(): void {
    const step = this.tuning.attack;
    const hit: Hit = {
      ownerId: this.id,
      damage: step.damage,
      strength: step.strength,
      force: step.force,
      direction: { x: this.c.s.facing, y: -0.3 },
      ...hitFieldsFor(this.kind),
      string: { id: this.stringId, index: this.ai.hitIndex, length: this.ai.hits },
    };
    this.lastAttackDamage = hit.damage;
    this.attack.open(step.hitbox!, hit, this.body.position.x, this.body.position.y, this.c.s.facing);
  }

  /** Começa o deslizamento depois de um golpe `heavy` ou `decisive` (RCT-01, RCT-02); ver `EnemyMovement.slideBy`. */
  slideBy(tier: ImpactTier, dir: 1 | -1): void {
    this.move.slideBy(tier, dir);
  }

  /** Deslizamento em curso para o snapshot (RCT-06); `null` fora dele. */
  get slideView(): { remainingPx: number } | null {
    return this.move.slideView;
  }

  /** Esbarrão de outro inimigo deslizando (RCT-04): toca `body` sem perder vida nem postura. */
  touched(): void {
    if (this.c.s.removed || this.c.s.ragdoll || this.brain.isDead || this.brain.state !== 'idle') return;
    this.anim.touch();
    this.onEvent?.(`slideTouch:${this.id}`);
  }

  private handle(events: EnemyEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitReaction') this.playHitReaction(ev.hit);
      else if (ev.type === 'armored') this.onArmored();
      else if (ev.type === 'stagger') this.playStagger(ev.hit);
      else if (ev.type === 'died') this.onDied?.(this, this.body.position.x, this.body.position.y);
      else if (ev.type === 'ragdoll') this.enterRagdoll(ev.hit);
      else if (ev.type === 'getUp') this.getUp();
      else if (ev.type === 'dissolve') this.c.s.ragdoll?.dissolve(this.tuning.brain.dissolveMs);
      else if (ev.type === 'removed') this.remove();
    }
  }

  /** Golpe leve: a animação sai do animador (HRX-02); aqui o corpo recebe o impulso do golpe. */
  private playHitReaction(hit: Hit): void {
    this.anim.hitReaction(this.pickedReaction);
    const d = normalize(hit.direction);
    this.scene.matter.body.setVelocity(this.body, { x: d.x * hit.force, y: -1 });
  }

  /** Golpe absorvido por quem está comprometido (CMT-04, CMT-06, RCT-09): faísca de guarda e o evento; a IA segue. */
  private onArmored(): void {
    this.onBlock?.({ x: this.body.position.x + this.c.s.facing * 10, y: this.body.position.y - 4 });
    this.onEvent?.(`armored:${this.id}`);
  }

  /**
   * Golpe forte que não derruba (PST-01): cambaleia sem ragdoll, no frame `impact`, com o impulso horizontal do golpe
   * como na reação leve.
   */
  private playStagger(hit: Hit): void {
    this.anim.staggerPose();
    const d = normalize(hit.direction);
    this.scene.matter.body.setVelocity(this.body, { x: d.x * hit.force, y: -1 });
    this.onEvent?.(`stagger:${this.id}`);
  }

  private enterRagdoll(hit: Hit): void {
    this.anim.clearTint();
    if (!this.c.s.ragdoll) {
      this.c.s.ragdoll = new Ragdoll(this.scene, this.body.position.x, this.body.position.y - 3, this.variant);
      for (const b of this.c.s.ragdoll.bodies) tagBody(b, { kind: 'character', target: this });
      // Pose de impacto (HRX-05/06): a cena não atualiza o inimigo durante o hitstop, então o ragdoll nasce
      // escondido e o sprite fica no frame `impact` até o próximo `update`, que faz a troca.
      this.c.s.ragdoll.setVisible(false);
      this.anim.impactPose();
      this.pendingRagdollReveal = true;
      applyFilter(this.body, Filters.hidden);
      setIgnoreGravity(this.body, true);
    }
    this.c.s.ragdoll.impulse(hit.direction, hit.force);
  }

  /** Primeiro update depois da pose de impacto: o ragdoll aparece e o sprite some (HRX-05/06). */
  private revealRagdoll(): void {
    this.pendingRagdollReveal = false;
    if (!this.c.s.ragdoll) return;
    this.c.s.ragdoll.setVisible(true);
    this.anim.hide();
  }

  /** Levantar: o ragdoll some e o sprite volta tocando a animação `getup` (o cérebro fica em gettingUp). */
  private getUp(): void {
    if (!this.c.s.ragdoll) return;
    const c = this.c.s.ragdoll.center;
    this.c.s.ragdoll.destroy();
    this.c.s.ragdoll = null;
    const y = c.y - 12;
    this.scene.matter.body.setPosition(this.body, { x: c.x, y });
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    applyFilter(this.body, Filters.enemy);
    setIgnoreGravity(this.body, false);
    this.pendingRagdollReveal = false;
    this.anim.showAfterGetUp();
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
    if (this.c.s.removed) return;
    this.cleanup();
  }

  private cleanup(): void {
    this.c.s.walkVxStep = null;
    this.scene.matter.world.off('beforeupdate', this.onStep);
    this.drawPos.stop();
    this.attack.close();
    this.c.s.ragdoll?.destroy();
    this.c.s.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.anim.destroy();
    this.hud.destroy();
    this.move.dropSlide();
    this.c.s.removed = true;
  }
}
