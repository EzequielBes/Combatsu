import Phaser from 'phaser';
import type { EnemyVariant } from '../core/enemyVariant';
import { Filters } from '../core/collision';
import { EnemyAI, type EnemyAIState } from '../core/enemyAI';
import type { AttackKind } from '../core/attackKind';
import { EnemyBrain, type EnemyState } from '../core/enemyBrain';
import { EnemyGuard, type GuardRoll } from '../core/enemyGuard';
import { ENEMY_STRUCTURE, Structure } from '../core/structure';
import type { EnemyBase } from '../core/difficulty';
import type { ToolKey } from '../core/loot';
import { SpawnGrace } from '../core/spawnGrace';
import type { ImpactTier } from '../core/impactTier';
import { READING, type MoveDef } from '../data/moves';
import type { ParryInfo } from '../core/defense';
import type { Hit, HitReport, Vec2 } from '../core/hit';
import { newEntityId, tagBody, type Hittable, type Rect } from './bodyTags';
import type { OnConnect } from './hitbox';
import { BodyRenderPos } from './physics';
import { SIZE } from './textures';
import type { EnemyCtx } from './enemy/context';
import { EnemyDefense } from './enemy/EnemyDefense';
import { EnemyAttack } from './enemy/EnemyAttack';
import { EnemyAnimator } from './enemy/EnemyAnimator';
import { EnemyMovement } from './enemy/EnemyMovement';
import { EnemyHud } from './enemy/EnemyHud';

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
  /** Graça ao nascer (WAVE-09): segura `canAct` pelos primeiros `graceMs`. */
  private readonly grace: SpawnGrace;
  private readonly body: MatterJS.BodyType;
  /** Posição do corpo como a tela a mostra, entre os dois últimos passos de física (ITP-07). */
  private readonly drawPos: BodyRenderPos;
  /** Estrutura do inimigo (STR-01..05, PAR-03): quebra atordoa; `update` avança o relógio de jogo. */
  private readonly structure = new Structure(ENEMY_STRUCTURE);
  /** Sorteio da guarda (EBL-01): o stream da run, entregue pela cena; sem ele nunca levanta a guarda. */
  guardRng: GuardRoll | null = null;
  /** Guarda do inimigo comum (EBL-01..05): 600 ms, bloqueia leve de frente; forte e carregado passam. */
  private readonly guard = new EnemyGuard({ chance: (p) => this.guardRng?.chance(p) ?? false });
  /** Faísca azul do bloqueio (EBL-02), no ponto de contato; a cena liga ao `Fx`. */
  onBlock: ((point: Vec2) => void) | null = null;
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
  private readonly atk: EnemyAttack;
  private readonly def: EnemyDefense;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly spawn: Vec2,
    /** Tuning escalado da rodada (DIF-04): hp, dano e velocidades já com o multiplicador aplicado. */
    tuning: EnemyBase,
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
    scene.matter.world.on('beforeupdate', this.onStep);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.matter.world?.off('beforeupdate', this.onStep));
    this.move = new EnemyMovement(this.c);
    this.anim = new EnemyAnimator(this.c, spawn, weaponInfo);
    this.atk = new EnemyAttack(this.c, this.anim, onConnect);
    this.hud = new EnemyHud(this.c);
    this.def = new EnemyDefense(
      this.c,
      {
        target: this,
        guardRng: () => this.guardRng,
        shoveChance: () => this.shoveChance,
        shove: (dir) => this.onShove?.(dir),
        died: (x, y) => this.onDied?.(this, x, y),
        remove: () => this.remove(),
      },
      { anim: this.anim, atk: this.atk, move: this.move, hud: this.hud },
    );
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
    return this.atk.lastDamage;
  }

  /** Estado atual da IA (`chase|hold|approach|windup|attack|rest`), lido pela cena para o limitador e pelo debug. */
  get aiState(): EnemyAIState {
    return this.ai.state;
  }

  /** `true` no frame em que a IA emitiu `wantAttack` (espera em `hold`, LIM-03): a cena pede vaga ao limitador. */
  get wantsAttack(): boolean {
    return this.atk.wantsAttack;
  }

  /** `true` no frame em que a IA emitiu `windupStart`: a cena avisa o limitador (`noteWindup`, LIM-02). */
  get windupStarted(): boolean {
    return this.atk.windupStarted;
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
    return { kind: this.atk.kind, index: this.ai.hitIndex, length: this.ai.hits };
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
    return this.def.receiveHit(hit, report);
  }

  /** Golpe do inimigo aparado pelo jogador (PAR-03, DFL-07..11); ver `EnemyDefense.parried`. */
  parried(info?: ParryInfo): void {
    this.def.parried(info);
  }

  /** O jogador iniciou um golpe do grafo (RDG-03, RDG-10): a guarda pode subir; ver `EnemyDefense.onPlayerMove`. */
  onPlayerMove(
    player: { x: number; facing: 1 | -1 },
    move: Pick<MoveDef, 'strength' | 'travel'>,
    round: number,
    reading: { repeats: number; override?: number },
  ): boolean {
    return this.def.onPlayerMove(player, move, round, reading);
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
    return this.def.finishable;
  }

  /** O finalizador acertou: não vale de novo até uma nova quebra. */
  markFinished(): void {
    this.def.markFinished();
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
    return this.def.lightStreak;
  }

  /**
   * `gate` vem da cena a cada frame (limitador de atacantes): `granted` (tem a vaga), `windupAllowed` (intervalo
   * entre windups), `holdRank` (posição na fila de espera do lado do player) e `focus` (alvo em foco). A IA continua pura.
   */
  update(dtMs: number, playerX: number, gate: EnemyFrameInput = NO_GATE): void {
    if (this.c.s.removed) return;
    this.atk.beginFrame();
    this.grace.update(dtMs);
    this.def.tick(dtMs, gate.focus);
    this.def.handle(this.brain.update(dtMs));
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
    this.atk.onAI(out.events);
    this.move.setWalk(out, canAct);
    if (this.c.s.ragdoll) {
      this.move.followRagdoll();
      this.hud.updateBar();
      this.anim.updateWeaponView(); // some junto com o sprite em ragdoll (ARM-10)
      return;
    }
    this.move.drive(out, canAct, this.grace.active);
    this.atk.follow();
    this.anim.animate();
    this.hud.updateBar();
    this.anim.updateWeaponView();
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
    this.atk.close();
    this.c.s.ragdoll?.destroy();
    this.c.s.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.anim.destroy();
    this.hud.destroy();
    this.move.dropSlide();
    this.c.s.removed = true;
  }
}
