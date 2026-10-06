import Phaser from 'phaser';
import { bossFinisherDamage } from '../../core/bossFinisher';
import { type Hit, type Strength, type Vec2 } from '../../core/hit';
import { HITSTOP_MS } from '../../data/fx';
import { DEFENSE, DODGE, FINISHER_MOVE, MOVES, STRUCTURE } from '../../data/moves';
import { CE } from '../../data/techniques';
import { BOSS, PLAYER_COMBO } from '../../data/tuning';
import { routeContacts, type Hittable } from '../../game/bodyTags';
import { Enemy } from '../../game/Enemy';
import { type SparkKind } from '../../game/fx';
import { type Attacker, type DefenseKind } from '../../game/Player';
import { HD_ON } from '../../game/art/hd/flag';
import { DRAWN_PLAYER, SIZE } from '../../game/textures';
import { CAMERA_FEEL } from '../../data/feel';
import { debugParam } from './params';
import { FINISHER_ZOOM, FINISHER_ZOOM_IN_MS, FINISHER_ZOOM_HOLD_MS } from './camera';
import type { TestScene } from '../TestScene';

export type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

/** Hitstop do finalizador (FIN-02, ms). */
export const FINISHER_HITSTOP_MS = 150;

/** Ligações de combate: entrega de golpes entre player, inimigos, chefe e objetos, defesa, finalizador e contatos. */
export class CombatLinks {
  constructor(readonly s: TestScene) {}

  /**
   * Inimigos comuns + limitador de atacantes (LIM-01..07, EDG-03). Por inimigo, a cena entrega `granted`,
   * `windupAllowed` e `holdRank`; depois do `update` lê o que a IA emitiu: `windupStart` → `noteWindup`,
   * `wantAttack` → `request`, e libera a vaga (ou a fila) no mesmo frame em que o estado sai de
   * {approach, windup, attack} ou o inimigo morre/some.
   */
  updateEnemies(dt: number): void {
    const gate = this.s.attackGate;
    gate.update(dt);
    const px = this.s.player.sprite.x;
    const sideOf = (x: number): 1 | -1 => (x - px >= 0 ? 1 : -1);
    for (const e of [...this.s.enemies]) {
      // Posição na fila de espera entre os que esperam do mesmo lado do player (LIM-05, LIM-07).
      const side = sideOf(e.x);
      const sameSide = gate.queueOrder().filter((id) => {
        const other = this.s.enemies.find((o) => o.id === id);
        return other !== undefined && other.aiState === 'hold' && sideOf(other.x) === side;
      });
      const at = sameSide.indexOf(e.id);
      e.update(dt, px, {
        granted: gate.isGranted(e.id),
        windupAllowed: gate.windupAllowed(),
        holdRank: at >= 0 ? at : sameSide.length,
        // PST-14, PST-16: só o foco da postura cai devagar.
        focus: e.id === this.s.focusId,
      });
      if (e.windupStarted) gate.noteWindup(e.id);
      const s = e.aiState;
      if (e.removed || e.isDead()) gate.release(e.id);
      else if (e.wantsAttack) gate.request(e.id);
      else if (s !== 'approach' && s !== 'windup' && s !== 'attack') gate.release(e.id);
    }
  }

  /** Inimigos comuns de pé cujo corpo toca o de `self` (RCT-04): quem desliza esbarra neles. */
  enemiesTouching(self: Enemy): Enemy[] {
    const a = self.hurtRect();
    return this.s.enemies.filter((o) => {
      if (o === self || o.removed || o.isDead() || o.state !== 'idle') return false;
      const b = o.hurtRect();
      return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
    });
  }

  /** Um abate (FND-08, WAVE-06): conta na onda da rodada, além de ir para o snapshot de debug. */
  onEnemyDied(enemyId: number, x: number, y: number): void {
    this.s.snapshot.debugEvents.push(`enemyDied:${enemyId}`);
    this.s.snapshot.debugDeaths.push({ id: enemyId, x, y });
    this.s.run.enemyDied(enemyId);
  }

  /**
   * Golpe que conectou: faísca no ponto de contato (FX-03), tremida só no forte e hitstop (FX-01/02). Golpe de
   * objeto é forte (hitstop de 90 ms) e tem a faísca roxa. `target` é quem aceitou o golpe (foco, PST-13).
   */
  onConnect(hit: Hit, point: Vec2, kind: SparkKind, target?: Hittable): void {
    // IMP-06, CAM-06: o golpe corpo a corpo do jogador troca a faísca e a tremida pelo impacto amaldiçoado.
    if (hit.ownerId === this.s.player.id && hit.moveName !== undefined)
      this.s.impactFx.onMeleeImpact(hit, point, target);
    else {
      this.s.fx.spark(point.x, point.y, kind);
      if (hit.strength === 'heavy') this.s.fx.shake();
    }
    this.s.effects.hitstop.trigger(HITSTOP_MS[hit.strength]);
    this.s.effects.freeze();
    // CE-06/CE-08: só o golpe corpo a corpo do próprio player (soco do combo ou objeto na mão, `ownerId` é o
    // dele) aplicado a um alvo ganha energia; golpes que o player recebe têm outro dono, e dano de técnica (T22+)
    // não passa por este caminho.
    if (hit.ownerId === this.s.player.id) {
      this.s.energy.gain(CE.meleeGain);
      if (hit.moveName) this.s.player.hitLanded();
      // CMB-01: todo golpe do jogador que acerta conta; objeto na mão entra como um golpe "objeto" para a nota.
      this.s.comboCounter.hit(hit.moveName ?? 'objeto');
      // PST-13: o foco é o último inimigo comum que aceitou golpe corpo a corpo, de objeto ou o finalizador (não o chefe).
      if (target instanceof Enemy) this.s.focusId = target.id;
    }
  }

  /**
   * O jogador começou um golpe do grafo (`move:<nome>`): entra no histórico de leitura (RDG-01) e os inimigos comuns
   * de frente e perto sorteiam a guarda (RDG-03). Contra não conta nem sorteia (RDG-11, RDG-12); o finalizador não
   * emite `move:`. `?debug&enemyGuard=N` fixa a chance total (N=1: sempre levantam) e ignora a leitura (RDG-10).
   */
  onPlayerMoveStart(name: string): void {
    const move = MOVES[name];
    if (!move || move.counter) return;
    const repeats = this.s.reading.note(name, this.s.clockMs);
    const raw = debugParam('enemyGuard');
    const override = raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
    const me = { x: this.s.player.sprite.x, facing: this.s.player.facing };
    for (const e of this.s.enemies) e.onPlayerMove(me, move, this.s.run.round, { repeats, override });
  }

  /** Quem bateu no jogador, para o lado do golpe, o tipo (chefe) e o efeito do parry (PAR-03/07/10). */
  attackerOf(ownerId: number): Attacker | null {
    const enemy = this.s.enemies.find((e) => e.id === ownerId);
    if (enemy) return { x: enemy.x, isBoss: false, parried: (info) => enemy.parried(info) };
    const boss = this.s.boss;
    if (boss && boss.id === ownerId) return { x: boss.x, isBoss: true, parried: () => boss.parried() };
    // Projéteis e ondas de choque só existem pelo chefe.
    const proj = this.s.projectiles.find((p) => p.id === ownerId);
    if (proj) return { x: proj.x, isBoss: true, parried: () => undefined };
    return null;
  }

  /**
   * Defesa do jogador (GRD-08, PAR-08, PAR-11): faíscas azuis no bloqueio; no parry flash em estrela, anel dourado
   * e hitstop de 80 ms. As camadas `game` seguem vivas durante o hitstop, como a estrela do golpe.
   */
  onDefense(kind: DefenseKind, point: Vec2): void {
    if (kind === 'block') {
      this.s.fx.spark(point.x, point.y, 'guard');
      this.s.realtimeFx.add('guard.spark', 100);
    } else if (kind === 'parry' || kind === 'deflect') {
      this.s.fx.spark(point.x, point.y, 'parry');
      this.s.fx.parryRing(point.x, point.y);
      this.s.realtimeFx.add('parry.flash', 100);
      this.s.realtimeFx.add('parry.ring', 200);
      this.s.effects.hitstop.trigger(DEFENSE.parryHitstopMs);
      this.s.effects.freeze();
      // CNT-15, DFL-13: a Deflexão avisa só `DEFLEXÃO`; o parry comum avisa `CONTRA`.
      if (kind === 'deflect') this.warnAboveHead('DEFLEXÃO', 'w');
      else this.warnAboveHead('CONTRA', 'A');
    } else if (kind === 'perfectDodge') {
      // Esquiva perfeita (DOD-07): câmera lenta com tom azulado e o "tique" branco no jogador.
      this.s.effects.slowMo.trigger();
      this.s.player.flash('w', 60);
      this.warnAboveHead('CONTRA', 'A');
      this.cinematicDodge();
    } else if (kind === 'duckEvade') {
      this.warnAboveHead('CONTRA', 'A');
    }
    // `jumpEvade` não abre janela de Contra: sem aviso (DEF-18).
  }

  /** DGA-01/02: o dash da esquiva acabou de começar - passo-relâmpago na direção do dash. */
  onDodgeStart(): void {
    const p = this.s.player;
    this.s.dodgeFx.flashStep(p.view, p.dodge.direction, DODGE.distancePx, this.drawnHeight());
  }

  /**
   * DGA-03..05: a esquiva perfeita vira um quadro de anime - a imagem residual no ponto onde o golpe passou, as linhas
   * de foco convergindo no player e um pulso de zoom (fora do zoom do finalizador e de outro zoom em curso).
   */
  private cinematicDodge(): void {
    const p = this.s.player;
    const height = this.drawnHeight();
    this.s.dodgeFx.zanzou(p.view, p.dodge.direction, height);
    const at = p.renderPos;
    this.s.focusLines.show(this.s.camera.worldToScreen({ x: at.x, y: at.y + SIZE.player.h / 2 - height * 0.55 }));
    const cam = this.s.cameras.main;
    if (this.s.camera.finisherZoomMs <= 0 && !cam.zoomEffect.isRunning) {
      this.s.camera.zoomPulse.start();
      this.s.camera.zoomPulseMs = CAMERA_FEEL.zoomInMs + CAMERA_FEEL.zoomHoldMs + CAMERA_FEEL.zoomOutMs;
    }
  }

  private drawnHeight(): number {
    return (HD_ON ? DRAWN_PLAYER.hd : DRAWN_PLAYER.base).height;
  }

  /** Texto flutuante sobre a cabeça do jogador, a menos de 40 px do centro do corpo (CNT-15, DFL-13); cor da paleta. */
  warnAboveHead(text: string, colorKey: string): void {
    this.s.floatTexts.spawn(text, colorKey, this.s.player.sprite.x, this.s.player.sprite.y - SIZE.player.h / 2);
  }

  /** Inimigo comum quebrado (e ainda não finalizado) mais perto do jogador, com a distância entre os centros do corpo. */
  nearestFinishable(): { enemy: Enemy; dist: number } | null {
    const pr = this.s.player.hurtRect();
    let best: { enemy: Enemy; dist: number } | null = null;
    for (const e of this.s.enemies) {
      if (!e.finishable) continue;
      const r = e.hurtRect();
      const dist = Math.hypot(r.x - pr.x, r.y - pr.y);
      if (!best || dist < best.dist) best = { enemy: e, dist };
    }
    return best;
  }

  /**
   * Finalizador (FIN-01..04): com `J`+`K` a até 40 px de um inimigo comum quebrado (e ainda não finalizado nesta
   * quebra) o golpe causa 40 de dano, congela 150 ms e a câmera dá zoom 1,7 em 100 ms; sem alvo, nada (FIN-03).
   */
  tryFinisher(): void {
    if (this.tryBossFinisher()) return;
    const near = this.nearestFinishable();
    const target = near && near.dist <= STRUCTURE.finisherRangePx ? near.enemy : null;
    if (!target) return;
    const pr = this.s.player.hurtRect();
    const at = target.hurtRect();
    const dir: 1 | -1 = at.x >= pr.x ? 1 : -1;
    const hit: Hit = {
      ownerId: this.s.player.id,
      damage: STRUCTURE.finisherDamage,
      strength: 'heavy',
      force: 12,
      direction: { x: dir, y: -0.6 },
      moveName: FINISHER_MOVE,
      // PST-06: o finalizador derruba o inimigo quebrado que sobrevive.
      knockdown: true,
    };
    this.s.player.finisherPose(dir);
    if (!target.receiveHit(hit)) return;
    target.markFinished();
    this.s.snapshot.debugEvents.push(`finisher:${target.id}`);
    // Faísca, tremida, energia e combo do golpe comum; depois o congelamento maior do finalizador (o maior vence).
    this.onConnect(hit, { x: at.x, y: at.y }, 'heavy', target);
    this.s.effects.hitstop.trigger(FINISHER_HITSTOP_MS);
    this.s.effects.freeze();
    this.s.cameras.main.zoomTo(FINISHER_ZOOM, FINISHER_ZOOM_IN_MS, 'Linear', true);
    this.s.camera.finisherZoomMs = FINISHER_ZOOM_HOLD_MS;
  }

  /**
   * Finalizador do chefe (BFX-06..08): com ele vivo, em `stagger`, com o finalizador pronto e a até
   * `BOSS.finisher.rangePx` do player (distância horizontal entre os centros), tira 12% do HP máximo, com o mesmo
   * hitstop e zoom do finalizador comum. Devolve se foi aplicado; fora disso o fluxo do inimigo comum segue.
   */
  tryBossFinisher(): boolean {
    const boss = this.s.boss;
    if (!boss) return false;
    const damage = bossFinisherDamage({
      dist: Math.abs(boss.x - this.s.player.sprite.x),
      state: boss.state,
      finisherReady: boss.finisherReady,
      maxHp: boss.maxHp,
      t: BOSS.finisher,
    });
    if (damage <= 0) return false;
    const dir: 1 | -1 = boss.x >= this.s.player.sprite.x ? 1 : -1;
    this.s.player.finisherPose(dir);
    boss.receiveFinisher();
    this.s.snapshot.debugEvents.push('finisher:boss');
    const at = boss.hurtRect();
    this.s.fx.spark(at.x, at.y, 'heavy');
    this.s.fx.shake();
    this.s.effects.hitstop.trigger(FINISHER_HITSTOP_MS);
    this.s.effects.freeze();
    this.s.cameras.main.zoomTo(FINISHER_ZOOM, FINISHER_ZOOM_IN_MS, 'Linear', true);
    this.s.camera.finisherZoomMs = FINISHER_ZOOM_HOLD_MS;
    return true;
  }

  /** Aplica em todos os inimigos e no chefe (se houver) o mesmo golpe que o combo do player daria. */
  debugHit(strength: Strength): void {
    const step = PLAYER_COMBO.find((s) => s.strength === strength)!;
    const hitToward = (targetX: number): Hit => ({
      ownerId: 0,
      damage: step.damage,
      strength,
      force: step.force,
      direction: { x: targetX >= this.s.player.sprite.x ? 1 : -1, y: -0.6 },
      // PST-12: o golpe forte de teste (tecla 2) derruba, como antes de o forte passar a cambalear.
      ...(strength === 'heavy' ? { knockdown: true } : {}),
    });
    for (const e of this.s.enemies) e.receiveHit(hitToward(e.x));
    // Golpe aceito pelo chefe vai para o snapshot: na intro e no rugido ele recusa (BOSS-08, BAI-12).
    if (this.s.boss?.receiveHit(hitToward(this.s.boss.x))) this.s.snapshot.debugEvents.push('bossHitAccepted');
  }

  listenForContacts(): void {
    const onStart = (event: ContactEvent): void => {
      routeContacts(event.pairs);
    };
    this.s.matter.world.on('collisionstart', onStart);
    this.s.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.s.matter.world?.off('collisionstart', onStart));
  }
}
