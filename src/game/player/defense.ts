import type { Hit, Vec2 } from '../../core/hit';
import { Guard, resolveIncomingHit } from '../../core/defense';
import { COUNTER, DEFENSE, STRUCTURE } from '../../data/moves';
import type { InputSnapshot } from '../input';
import type { Player } from '../Player';

/** Recuo do bloqueio (GRD-09, px) e a velocidade dele (px/s): 8 px em 100 ms. */
const BLOCK_PUSH_PX = DEFENSE.blockPushPx;
const BLOCK_PUSH_MS = 100;

/** Defesa do player: guarda, parry, esquiva, abaixar e Contra (resolução do golpe recebido e recuos). */
export class PlayerDefense {
  /** Recuo do bloqueio em curso (GRD-09). */
  blockPush: { dir: 1 | -1; remainingPx: number } | null = null;
  /** O frame anterior era de dash da esquiva: no seguinte a velocidade zera, sem escorregar além dos 96 px. */
  wasDashing = false;

  constructor(private readonly p: Player) {}

  /**
   * Golpe recebido: a única decisão de dano é `resolveIncomingHit` (parry → esquiva → Contra → abaixar → pulo → guarda
   * → golpe cheio, DEF-20). Só o golpe cheio devolve `true` (faísca e hitstop do golpe); as outras defesas têm feedback
   * próprio. Roda no passo de física (callback de colisão): lê o estado do último `update`.
   */
  receiveHit(hit: Hit): boolean {
    if (this.p.health.dead) return false;
    const attacker = this.p.attackerOf?.(hit.ownerId) ?? null;
    // Sem atacante conhecido (golpe de teste), o lado sai da direção do golpe: vindo "de frente" se ela aponta para trás.
    const attackerX = attacker ? attacker.x : this.p.sprite.x - Math.sign(hit.direction.x || 1);
    const inFront = this.p.facing === 1 ? attackerX >= this.p.sprite.x : attackerX <= this.p.sprite.x;
    const res = resolveIncomingHit({
      hit,
      attackerInFront: inFront,
      isBoss: attacker?.isBoss ?? false,
      guard: this.p.guard.state,
      dodgeInvulnerable: this.p.dodge.invulnerable,
      counterInvulnerable: this.counterInvulnerable,
      ducking: this.p.duck.active,
      // DEF-17: fora do chão = sem terreno sob os pés ou subindo, o mesmo critério do `onGround` do `update`.
      airborne: !(this.p.loco.touchesTerrain('below') && this.p.move.vy >= 0),
    });
    const awayDir: 1 | -1 = attackerX >= this.p.sprite.x ? -1 : 1;
    const point: Vec2 = { x: this.p.sprite.x - awayDir * 14, y: this.p.sprite.y - 4 };
    switch (res.outcome) {
      case 'parry': {
        // DFL-10, DFL-12: o parry do último golpe de uma sequência aparada inteira é a Deflexão (janela de 900 ms).
        const deflect = this.p.deflect.onParry(hit.string);
        this.p.onEvent?.('parry');
        if (deflect) this.p.onEvent?.('deflect');
        // DFL-08, DFL-09: só o parry do último golpe da sequência (ou do golpe sem sequência) deixa o inimigo parado.
        attacker?.parried({ final: hit.string ? hit.string.index === hit.string.length : true, deflect });
        this.p.counter.open('contra', deflect ? COUNTER.deflectWindowMs : COUNTER.windowMs);
        this.p.onDefense?.(deflect ? 'deflect' : 'parry', point);
        return false;
      }
      case 'dodged':
        if (this.p.dodge.registerIncomingHit()) {
          this.p.onEvent?.('perfectDodge');
          // DEF-19, CNT-02: a esquiva perfeita alivia a postura e abre a janela de Contra.
          this.p.structure.reduce(STRUCTURE.player.evadeRelief);
          this.p.counter.open('contra', COUNTER.windowMs);
          this.p.onDefense?.('perfectDodge', point);
        }
        return false;
      case 'ducked':
        // DEF-12: um `duckEvade` por abaixar, mesmo que outros golpes `high` cheguem nele.
        if (this.p.duck.registerEvade()) {
          this.p.onEvent?.('duckEvade');
          // DEF-13, CNT-03.
          this.p.structure.reduce(STRUCTURE.player.evadeRelief);
          this.p.counter.open('contraGancho', COUNTER.windowMs);
          this.p.onDefense?.('duckEvade', point);
        }
        return false;
      case 'jumped':
        // DEF-18: um `jumpEvade` por golpe `low` evitado no ar; sem efeito na postura.
        this.p.onEvent?.('jumpEvade');
        this.p.onDefense?.('jumpEvade', point);
        return false;
      case 'countered':
        // CNT-11, CNT-12: o Contra em `startup` ou `active` não leva dano nem cancela.
        return false;
      case 'block':
        this.p.onEvent?.('block');
        this.blockPush = { dir: awayDir, remainingPx: BLOCK_PUSH_PX };
        this.p.onDefense?.('block', point);
        if (this.p.structure.add(res.playerStructureGain)) this.onGuardBreak();
        if (res.damage > 0 && this.p.health.chip(res.damage) === 'died') this.p.die();
        return false;
      default:
        return this.p.takeHit(hit);
    }
  }

  /** Contra em `startup` ou `active` (CNT-11): o golpe que chega causa 0 de dano e não cancela o Contra. */
  get counterInvulnerable(): boolean {
    const phase = this.p.moves.phase;
    return this.p.moves.def?.counter === true && (phase === 'startup' || phase === 'active');
  }

  /** Estrutura cheia (STR-06, STR-11): atordoa e larga o golpe; um `guardBreak:player`. */
  onGuardBreak(): void {
    this.p.strikes.onMove(this.p.moves.cancel());
    this.p.heavyHoldMs = -1;
    this.p.holding.onPropSwing(this.p.propSwing.cancel());
    this.p.onEvent?.('guardBreak:player');
  }

  /** Zera guarda, esquiva, abaixar, Contra, estrutura, golpe em curso e recuo (respawn e nova run, EDG-01, EDG-02). */
  resetDefense(): void {
    this.p.strikes.onMove(this.p.moves.cancel());
    this.p.heavyHoldMs = -1;
    this.p.guard = new Guard();
    this.p.dodge.reset();
    this.p.duck.reset();
    this.p.counter.close();
    this.p.deflect.reset();
    this.p.structure.reset();
    this.blockPush = null;
    this.p.strikes.push = null;
    this.p.strikes.pendingMoveEvents = [];
    this.p.strikes.pendingBounce = null;
    this.p.strikes.pendingShove = null;
    this.p.shoveLockMs = 0;
    this.wasDashing = false;
  }

  /** Recarga de `Q`: o maior dos relógios da esquiva e do abaixar, que dividem os 450 ms (DEF-15). */
  get evadeCooldownMs(): number {
    return Math.max(this.p.dodge.cooldownMs, this.p.duck.cooldownMs);
  }

  /**
   * `Q`: esquiva ou abaixar, que dividem a recarga (DEF-15). Com `S` segurada vale sempre o abaixar, nunca a esquiva,
   * mesmo com direção horizontal (DEF-22) e mesmo no ar, onde nada acontece (DEF-16).
   * Esquiva (DOD-01, DOD-04..06, DOD-09, DOD-10): no chão, sem golpe nem objeto em andamento, com a recarga zerada.
   * Um golpe que já acertou pode ser cancelado na recovery pela esquiva, no mesmo frame (DOD-06).
   */
  tryDodge(input: InputSnapshot, onGround: boolean): void {
    if (input.down) {
      this.tryDuck(onGround);
      return;
    }
    if (!onGround || this.evadeCooldownMs > 0 || this.p.propSwing.isAttacking) return;
    if (this.p.moves.isMoving && !this.p.moves.canDodgeCancel) return;
    const held = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.p.moves.isMoving) this.p.strikes.onMove(this.p.moves.cancel());
    this.p.heavyHoldMs = -1;
    const started = this.p.dodge.start({
      grounded: onGround,
      busy: false,
      held: held as -1 | 0 | 1,
      facing: this.p.facing,
    });
    if (started) this.p.onEvent?.('dodge');
  }

  /**
   * Abaixar (DEF-07, DEF-08, DEF-15): no chão, sem golpe, objeto balançando nem recarga (a mesma da esquiva). Quem chama
   * já conferiu atordoamento e conjuração. Sem cancelar golpe: a recovery de um golpe que acertou só a esquiva corta.
   */
  tryDuck(onGround: boolean): void {
    if (!onGround || this.evadeCooldownMs > 0 || this.p.moves.isMoving || this.p.propSwing.isAttacking) return;
    this.p.heavyHoldMs = -1;
    this.p.duck.start();
    this.p.onEvent?.('duck');
  }

  /** Dash da esquiva (DOD-01): velocidade dirigida por frame, e zerada no frame seguinte ao fim (sem escorregar). */
  applyDash(dtMs: number): void {
    const dx = this.p.dodge.update(dtMs);
    if (dx !== 0 && dtMs > 0) {
      this.p.loco.scriptedDx += dx;
      this.p.move = { ...this.p.move, vx: 0 };
      this.wasDashing = true;
    } else if (this.wasDashing) {
      this.p.move = { ...this.p.move, vx: 0 };
      this.wasDashing = false;
    }
  }

  /** Recuo do bloqueio (GRD-09): 8 px para longe do atacante em 100 ms. */
  applyBlockPush(dtMs: number): void {
    const push = this.blockPush;
    if (!push || dtMs <= 0) return;
    const px = Math.min(push.remainingPx, (BLOCK_PUSH_PX * dtMs) / BLOCK_PUSH_MS);
    this.p.loco.scriptedDx += push.dir * px;
    this.p.move = { ...this.p.move, vx: 0 };
    push.remainingPx -= px;
    if (push.remainingPx <= 0) this.blockPush = null;
  }
}
