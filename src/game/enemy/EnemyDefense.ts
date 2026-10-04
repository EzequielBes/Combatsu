import { Filters } from '../../core/collision';
import type { ParryInfo } from '../../core/defense';
import type { EnemyEvent } from '../../core/enemyBrain';
import type { GuardRoll } from '../../core/enemyGuard';
import { normalize, type Hit, type HitReport } from '../../core/hit';
import { pickHitReaction, type HitReaction } from '../../core/hitReaction';
import { LightStreak, baseConditionsHold, guardChance, readingBonus, shoveRoll } from '../../core/moveReading';
import { EnemyGuard } from '../../core/enemyGuard';
import { enemyStructureGain } from '../../core/structure';
import { COUNTER, DEFENSE, FINISHER_MOVE, MOVES, READING, STRUCTURE, type MoveDef } from '../../data/moves';
import { tagBody, type Hittable } from '../bodyTags';
import { applyFilter, setIgnoreGravity } from '../physics';
import { Ragdoll } from '../Ragdoll';
import type { EnemyCtx } from './context';
import type { EnemyAnimator } from './EnemyAnimator';
import type { EnemyAttack } from './EnemyAttack';
import type { EnemyHud } from './EnemyHud';
import type { EnemyMovement } from './EnemyMovement';

/** Gancho ascendente (MOV-11): velocidade vertical inicial (px/step) que leva o centro além dos 64 px do golpe. */
const LAUNCH_VY = -10;
/** Componente vertical (normalizado com o horizontal) do impulso de um empurrão: quase rente ao chão. */
const PUSH_LIFT = -0.15;

/** O que a defesa pede ao inimigo que a hospeda: o alvo dos corpos do ragdoll e as saídas ligadas pela cena. */
export interface DefenseHost {
  readonly target: Hittable;
  /** Sorteio da guarda (EBL-01): o stream da run, entregue pela cena; sem ele nunca levanta a guarda. */
  guardRng(): GuardRoll | null;
  /** Chance do empurrão no 4o leve seguido (RDG-16, `?debug&shove=`), entregue pela cena. */
  shoveChance(): number;
  /** O inimigo empurrou o jogador (RDG-17); `dir` é o sentido do deslocamento do jogador, para longe do inimigo. */
  shove(dir: 1 | -1): void;
  /** Morte (evento `died` do cérebro, uma vez só), com a posição do corpo neste frame (FND-08). */
  died(x: number, y: number): void;
  /** Fim da dissolução (evento `removed`): limpa o inimigo e avisa a cena. */
  remove(): void;
}

/** As outras partes do inimigo com que a defesa conversa. */
export interface DefensePeers {
  anim: EnemyAnimator;
  atk: EnemyAttack;
  move: EnemyMovement;
  hud: EnemyHud;
}

/**
 * Defesa do inimigo: o golpe recebido (`receiveHit`), a guarda, o cambaleio, o ragdoll e o levantar, a postura
 * (quebra, parry, finalizador) e a leitura dos golpes do jogador.
 */
export class EnemyDefense {
  /** Reação escolhida no `receiveHit`, consumida pelo evento `hitReaction` do cérebro. */
  private pickedReaction: HitReaction | null = null;
  /** O ragdoll nasceu escondido atrás da pose de impacto; o próximo `update` troca sprite por ragdoll (HRX-05/06). */
  private pendingRagdollReveal = false;
  /** O finalizador já bateu nesta quebra (um por quebra, FIN-03). */
  private finished = false;
  /** Relógio de jogo do inimigo (ms): soma o `dt` do `update`, que não anda no hitstop; mede o intervalo dos leves (RDG-13). */
  private clockMs = 0;
  /** Leves seguidos aceitos por este inimigo (RDG-13..15). */
  private readonly streak = new LightStreak();

  constructor(
    private readonly c: EnemyCtx,
    private readonly host: DefenseHost,
    private readonly peers: DefensePeers,
  ) {}

  /** Quebrado e ainda sem finalizador nesta quebra (FIN-01, um por quebra). */
  get finishable(): boolean {
    return this.c.structure.broken && !this.finished && !this.c.brain.isDead;
  }

  /** O finalizador acertou: não vale de novo até uma nova quebra. */
  markFinished(): void {
    this.finished = true;
  }

  /** Leves seguidos aceitos, para o snapshot (RDG-13). */
  get lightStreak(): number {
    return this.streak.count;
  }

  /**
   * O começo do `update`: relógio, supressão do parry, queda da postura e da guarda e a troca de sprite por ragdoll
   * (antes do `brain.update`, que a defesa trata em `handle`). No foco a postura cai devagar; fora dele, rápido
   * (PST-14, PST-16); o atraso de 1500 ms vale nos dois.
   */
  tick(dtMs: number, focus: boolean): void {
    this.clockMs += dtMs;
    this.c.s.suppressedMs = Math.max(0, this.c.s.suppressedMs - dtMs);
    this.c.structure.update(dtMs, focus ? STRUCTURE.enemy.decayPerSec : STRUCTURE.enemy.offFocusDecayPerSec);
    if (!this.c.structure.broken) this.finished = false;
    this.c.guard.update(dtMs);
    if (this.pendingRagdollReveal) this.revealRagdoll();
  }

  /**
   * `report` é de saída (TGT-06): `blocked` quando a guarda segurou o golpe. Golpe aceito devolve `true`, inclusive o
   * que bateu num inimigo comprometido e foi absorvido (`armored`, CMT-04): ele perde vida e postura, mas o ataque sai.
   */
  receiveHit(hit: Hit, report?: HitReport): boolean {
    if (this.c.brain.isDead) return false;
    const wasBroken = this.c.structure.broken;
    // EBL-02..05: a guarda segura o leve que vem de frente; forte e carregado passam com dano cheio e encerram a guarda.
    const fromFront = hit.direction.x * this.c.s.facing < 0;
    const res = this.c.guard.resolveHit({
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
      this.peers.anim.lastReaction,
    );
    const events = this.c.brain.receiveHit(reaction, {
      committed: this.c.ai.committed,
      ...(effect?.type === 'knockdown' ? { ragdollStunMs: effect.ms } : {}),
    });
    if (events.length === 0) return false; // já morto, levantando ou no limite do chão (GND-02, GND-03)
    // Comprometido e sem que o golpe derrube, mate ou seja Contra: a IA segue e o golpe pendente sai (CMT-05).
    const armored = events.some((ev) => ev.type === 'armored');
    if (!armored) {
      this.c.s.walkVxStep = null; // o golpe manda no corpo a partir de agora, não a IA
      // Levar golpe cancela o preparo ou o golpe em andamento antes do compromisso (AI-04, CMT-03).
      this.peers.atk.onAI(this.c.ai.interrupt());
    }
    this.handle(events);
    this.pickedReaction = null;
    const survived = !this.c.brain.isDead;
    if (survived && this.c.structure.add(enemyStructureGain(hit))) this.onBreak();
    if (survived && effect && !armored) this.applyEffect(effect, hit);
    if (survived) this.trackStreak(hit);
    this.peers.hud.updateBar();
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
    const free = !this.c.ai.committed && !this.c.structure.broken && !this.c.s.ragdoll && !this.c.brain.isDead;
    const rng = this.host.guardRng();
    if (!free || !rng || !shoveRoll({ streak: count, chance: this.host.shoveChance(), roll: rng })) return;
    this.streak.reset();
    this.c.brain.recover();
    this.c.hooks.event(`shove:${this.c.id}`);
    // O jogador bateu de frente: sai para o lado oposto ao do golpe.
    this.host.shove(hit.direction.x >= 0 ? -1 : 1);
  }

  /** Golpe leve segurado pela guarda (EBL-02): sem dano nem reação, soma estrutura e avisa a cena. */
  private onBlocked(structureGain: number): boolean {
    this.c.hooks.event(`enemyBlock:${this.c.id}`);
    this.c.hooks.block({ x: this.c.body.position.x + this.c.s.facing * 10, y: this.c.body.position.y - 4 });
    if (this.c.structure.add(structureGain)) this.onBreak();
    this.peers.hud.updateBar();
    // `false`: o golpe não conectou de fato (sem faísca vermelha, hitstop nem combo); o feedback é o azul do bloqueio.
    return false;
  }

  /** Reação de golpe que sobrevive (MOV-11, MOV-10 pelo `ragdollStunMs`, SPC-02): lançar e empurrar. */
  private applyEffect(effect: NonNullable<(typeof MOVES)[string]['effect']>, hit: Hit): void {
    if (effect.type === 'launch') this.c.s.ragdoll?.launch(LAUNCH_VY);
    else if (effect.type === 'push') this.peers.move.startSlide(hit.direction.x >= 0 ? 1 : -1, effect.px);
  }

  /** Estrutura cheia (STR-05, STR-10): quebrou, atordoa e para no lugar; um `guardBreak:<id>`. */
  private onBreak(): void {
    this.c.guard.reset();
    this.peers.atk.onAI(this.c.ai.interrupt());
    this.c.s.walkVxStep = null;
    if (!this.c.s.ragdoll) this.c.scene.matter.body.setVelocity(this.c.body, { x: 0, y: this.c.body.velocity.y });
    this.c.hooks.event(`guardBreak:${this.c.id}`);
  }

  /**
   * Golpe do inimigo aparado pelo jogador (PAR-03, DFL-07..11): +35 de estrutura sempre. Golpe do meio da sequência
   * não faz mais nada e a sequência segue (DFL-07, DFL-08); o último deixa o inimigo 400 ms parado (DFL-09), e a
   * Deflexão o põe em `stagger` por `COUNTER.deflectStaggerMs` (DFL-11).
   */
  parried(info: ParryInfo = { final: true, deflect: false }): void {
    if (this.c.brain.isDead) return;
    if (info.final) {
      this.peers.atk.onAI(this.c.ai.interrupt());
      this.c.s.walkVxStep = null;
      this.c.s.suppressedMs = DEFENSE.parrySuppressMs;
      if (!this.c.s.ragdoll) this.c.scene.matter.body.setVelocity(this.c.body, { x: 0, y: this.c.body.velocity.y });
      if (info.deflect) this.c.brain.forceStagger(COUNTER.deflectStaggerMs);
    }
    if (this.c.structure.add(STRUCTURE.enemy.parryGain)) this.onBreak();
    this.peers.hud.updateBar();
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
    if (this.c.s.removed || this.c.s.ragdoll || this.c.brain.isDead || this.c.structure.broken) return false;
    // Comprometido (inclui `attack`, CMT-10) e levantando não levantam a guarda.
    if (this.c.ai.committed || this.c.brain.state === 'gettingUp') return false;
    const ex = this.c.body.position.x;
    const distancePx = Math.abs(ex - player.x);
    const playerFacingEnemy = player.facing === 1 ? ex >= player.x : ex <= player.x;
    if (!playerFacingEnemy || distancePx > READING.rangePx + (move.travel?.forwardPx ?? 0)) return false;
    const bonus = readingBonus(reading.repeats);
    const chance = guardChance({
      base: EnemyGuard.chanceFor(round),
      reading: bonus,
      override: reading.override,
      baseConditions: baseConditionsHold(
        { round, idle: this.c.brain.state === 'idle', playerFacingEnemy, distancePx },
        move.strength,
      ),
    });
    // RDG-10: com `enemyGuard=N` a leitura é ignorada; a guarda que sobe é a comum, sem `read:<id>`.
    const read = bonus > 0 && reading.override === undefined;
    if (!this.c.guard.tryRaise(chance, read)) return false;
    if (read) {
      this.c.brain.recover();
      this.c.hooks.event(`read:${this.c.id}`);
    }
    this.peers.atk.onAI(this.c.ai.interrupt());
    this.c.s.walkVxStep = null;
    this.c.s.facing = player.x >= ex ? 1 : -1;
    this.c.scene.matter.body.setVelocity(this.c.body, { x: 0, y: this.c.body.velocity.y });
    return true;
  }

  handle(events: EnemyEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitReaction') this.playHitReaction(ev.hit);
      else if (ev.type === 'armored') this.onArmored();
      else if (ev.type === 'stagger') this.playStagger(ev.hit);
      else if (ev.type === 'died') this.host.died(this.c.body.position.x, this.c.body.position.y);
      else if (ev.type === 'ragdoll') this.enterRagdoll(ev.hit);
      else if (ev.type === 'getUp') this.getUp();
      else if (ev.type === 'dissolve') this.c.s.ragdoll?.dissolve(this.c.tuning.brain.dissolveMs);
      else if (ev.type === 'removed') this.host.remove();
    }
  }

  /** Golpe leve: a animação sai do animador (HRX-02); aqui o corpo recebe o impulso do golpe. */
  private playHitReaction(hit: Hit): void {
    this.peers.anim.hitReaction(this.pickedReaction);
    const d = normalize(hit.direction);
    this.c.scene.matter.body.setVelocity(this.c.body, { x: d.x * hit.force, y: -1 });
  }

  /** Golpe absorvido por quem está comprometido (CMT-04, CMT-06, RCT-09): faísca de guarda e o evento; a IA segue. */
  private onArmored(): void {
    this.c.hooks.block({ x: this.c.body.position.x + this.c.s.facing * 10, y: this.c.body.position.y - 4 });
    this.c.hooks.event(`armored:${this.c.id}`);
  }

  /**
   * Golpe forte que não derruba (PST-01): cambaleia sem ragdoll, no frame `impact`, com o impulso horizontal do golpe
   * como na reação leve.
   */
  private playStagger(hit: Hit): void {
    this.peers.anim.staggerPose();
    const d = normalize(hit.direction);
    this.c.scene.matter.body.setVelocity(this.c.body, { x: d.x * hit.force, y: -1 });
    this.c.hooks.event(`stagger:${this.c.id}`);
  }

  private enterRagdoll(hit: Hit): void {
    this.peers.anim.clearTint();
    if (!this.c.s.ragdoll) {
      this.c.s.ragdoll = new Ragdoll(this.c.scene, this.c.body.position.x, this.c.body.position.y - 3, this.c.variant);
      for (const b of this.c.s.ragdoll.bodies) tagBody(b, { kind: 'character', target: this.host.target });
      // Pose de impacto (HRX-05/06): a cena não atualiza o inimigo durante o hitstop, então o ragdoll nasce
      // escondido e o sprite fica no frame `impact` até o próximo `update`, que faz a troca.
      this.c.s.ragdoll.setVisible(false);
      this.peers.anim.impactPose();
      this.pendingRagdollReveal = true;
      applyFilter(this.c.body, Filters.hidden);
      setIgnoreGravity(this.c.body, true);
    }
    this.c.s.ragdoll.impulse(hit.direction, hit.force);
  }

  /** Primeiro update depois da pose de impacto: o ragdoll aparece e o sprite some (HRX-05/06). */
  private revealRagdoll(): void {
    this.pendingRagdollReveal = false;
    if (!this.c.s.ragdoll) return;
    this.c.s.ragdoll.setVisible(true);
    this.peers.anim.hide();
  }

  /** Levantar: o ragdoll some e o sprite volta tocando a animação `getup` (o cérebro fica em gettingUp). */
  private getUp(): void {
    if (!this.c.s.ragdoll) return;
    const c = this.c.s.ragdoll.center;
    this.c.s.ragdoll.destroy();
    this.c.s.ragdoll = null;
    const y = c.y - 12;
    this.c.scene.matter.body.setPosition(this.c.body, { x: c.x, y });
    this.c.scene.matter.body.setVelocity(this.c.body, { x: 0, y: 0 });
    applyFilter(this.c.body, Filters.enemy);
    setIgnoreGravity(this.c.body, false);
    this.pendingRagdollReveal = false;
    this.peers.anim.showAfterGetUp();
  }
}
