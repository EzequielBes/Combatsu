import type { Hit } from '../../core/hit';
import { type CounterKind } from '../../core/counter';
import { StepIn } from '../../core/stepIn';
import { shouldCancelJumpForUppercut } from '../../core/fightInput';
import { moveTravelAt, type MoveContext, type MoveEvent } from '../../core/moveMachine';
import { READING, type MoveDef } from '../../data/moves';
import { PLAYER_MOVE } from '../../data/tuning';
import { tagOf, type Rect } from '../bodyTags';
import type { InputSnapshot } from '../input';
import { HD_ON } from '../art/hd/flag';
import { RIG_ON, RIG_UPPERCUT_HITBOX, currentSearch, rigHitbox } from '../art/rig/flag';
import { SIZE } from '../textures';
import type { Player } from '../Player';

/** Folga (px) à frente do corpo em que o passo à frente enxerga parede ou inimigo (POS-09). */
const STEP_PROBE_PX = 2;
/** Id do golpe iniciado; cada golpe novo ganha o seguinte e o `Hit` leva o mesmo (IMP-14). */
let nextSwingId = 1;

/** Golpes do player: máquina de golpes, hitboxes, passo à frente, voadora e pedidos do passo de física. */
export class PlayerStrikes {
  /** Tempo no `active` do golpe atual e deslocamento já aplicado (voadora, AIR-02). */
  activeElapsedMs = 0;
  travelDone = { forward: 0, down: 0 };
  /** Recuo do quique da voadora (VOA-05) ou empurrão de um inimigo (RDG-19) em curso: sentido, px que faltam, total e duração. */
  push: { dir: 1 | -1; remainingPx: number; totalPx: number; ms: number } | null = null;
  /**
   * Pedidos feitos de dentro do passo de física (`hitLanded` e `shoved` rodam no callback de colisão) que o `update`
   * seguinte aplica: o fim do `active` da voadora (evento `hitboxOff` ainda por tratar), o quique e o empurrão.
   */
  pendingMoveEvents: MoveEvent[] = [];
  pendingBounce: { dir: 1 | -1; backPx: number; ms: number; vy: number } | null = null;
  pendingShove: 1 | -1 | null = null;
  /** Passo à frente do golpe de chão (POS-07..09). */
  readonly stepIn = new StepIn();
  /** Nome e id do golpe em andamento; `null` sem golpe. */
  strikeName: string | null = null;
  swingId = 0;

  constructor(private readonly p: Player) {}

  /**
   * O golpe em andamento acertou um alvo (libera o cancelamento da recovery por esquiva, DOD-06). Chamado pela cena
   * dentro do passo de física: a voadora, que tem `bounce`, termina o `active` agora (VOA-04, VOA-09) e pede o recuo e
   * a subida; aqui só se grava estado (a fase, a velocidade vertical e o pedido), o `update` seguinte fecha a hitbox e
   * aplica o recuo. O hitstop do próprio golpe segura o `update`, então a velocidade já fica gravada aqui (VOA-06).
   */
  hitLanded(): void {
    this.p.moves.hitLanded();
    const bounce = this.p.moves.def?.bounce;
    if (!bounce || this.p.moves.phase !== 'active') return;
    this.pendingMoveEvents.push(...this.p.moves.endActive());
    this.p.move = { ...this.p.move, vy: bounce.vy, jumping: false };
    this.pendingBounce = { dir: this.p.facing === 1 ? -1 : 1, backPx: bounce.backPx, ms: bounce.ms, vy: bounce.vy };
  }

  /**
   * Empurrão de um inimigo (RDG-19..21), na direção `dir` do deslocamento (para longe dele). Chamado dentro do passo de
   * física (o `receiveHit` do inimigo): só grava o pedido, que o `update` seguinte aplica.
   */
  shoved(dir: 1 | -1): void {
    this.pendingShove = dir;
  }

  /**
   * Aplica o que o passo de física pediu (`hitLanded`, `shoved`). Devolve a velocidade vertical do quique, a pôr depois
   * do `stepMovement`, ou `null` sem quique. O empurrão cancela o golpe e o objeto em curso, desloca o jogador 48 px
   * em 150 ms e trava o input por 300 ms.
   */
  applyPending(): number | null {
    if (this.pendingMoveEvents.length > 0) this.onMove(this.pendingMoveEvents.splice(0));
    let bounceVy: number | null = null;
    const bounce = this.pendingBounce;
    if (bounce) {
      this.pendingBounce = null;
      this.push = { dir: bounce.dir, remainingPx: bounce.backPx, totalPx: bounce.backPx, ms: bounce.ms };
      bounceVy = bounce.vy;
    }
    const shove = this.pendingShove;
    if (shove !== null) {
      this.pendingShove = null;
      this.onMove(this.p.moves.cancel());
      this.p.heavyHoldMs = -1;
      this.p.holding.onPropSwing(this.p.propSwing.cancel());
      this.push = { dir: shove, remainingPx: READING.shovePx, totalPx: READING.shovePx, ms: READING.shoveMs };
      this.p.shoveLockMs = READING.shoveLockMs;
    }
    return bounceVy;
  }

  /**
   * Aperto de golpe, soltura do carregado e relógio do grafo (MOV-02..09, MOV-13, MOV-16..18, SPC-01). `locked` =
   * atordoado ou conjurando; `evading` = esquiva ou abaixar ativos, que também travam o golpe mas deixam o aperto do
   * Contra guardado (CNT-07).
   */
  updateStrikes(dtMs: number, input: InputSnapshot, onGround: boolean, lockedByState: boolean, evading: boolean): void {
    const forward = this.p.facing === 1 ? input.right : input.left;
    this.p.motion.sample(this.p.clockMs, { down: input.down, forward });
    const ctx: MoveContext = { grounded: onGround, down: input.down, up: input.upHeld, forward };
    const locked = lockedByState || evading;
    if (locked) this.p.heavyHoldMs = -1;
    const counter = this.takeCounter(input, onGround, lockedByState, evading);
    if (counter) {
      this.p.heavyHoldMs = -1;
      this.onMove(this.p.moves.startCounter(counter));
    } else if (!locked && this.p.held === null) {
      if (input.lightPressed && !onGround && this.tryUppercutCancel()) {
        // AD-011: o pulo com `W` some e o gancho ascendente sai do chão, como se `W`+`J` fossem no mesmo frame.
        this.onMove(this.p.moves.press('light', { grounded: true, down: false, up: true, forward }));
      } else if (input.lightPressed)
        this.onMove(this.p.moves.press('light', { ...ctx, motion: this.p.motion.matches(this.p.clockMs) }));
      if (input.heavyPressed) {
        this.onMove(this.p.moves.press('heavy', ctx));
        // Só um aperto no chão abre o carregado: a voadora/pisão apertadas no ar não carregam ao pousar.
        this.p.heavyHoldMs = onGround ? 0 : -1;
      } else if (this.p.heavyHoldMs >= 0) {
        this.p.heavyHoldMs += dtMs;
        if (!input.heavyHeld) {
          this.onMove(this.p.moves.release('heavy', this.p.heavyHoldMs, ctx));
          this.p.heavyHoldMs = -1;
        }
      }
    } else if (!locked && (input.lightPressed || input.heavyPressed)) {
      // Com objeto na mão J e K balançam o objeto (edge case da spec).
      this.p.holding.onPropSwing(this.p.propSwing.press());
    }
    this.onMove(this.p.moves.update(dtMs));
    if (this.p.moves.phase === 'active') this.activeElapsedMs += dtMs;
  }

  /**
   * Contra (CNT-05..07, CNT-16, CNT-18, CNT-19): com a janela aberta, no chão, sem golpe em curso e de mãos vazias, `J`
   * ou `K` inicia o Contra da janela, seja qual for a direção segurada (CNT-18). Durante a esquiva ou o abaixar o aperto
   * fica guardado e sai no primeiro frame livre, se a janela ainda estiver aberta (CNT-07). No ar ou com objeto na mão
   * o aperto segue o caminho normal (golpe aéreo, balanço do objeto).
   */
  takeCounter(input: InputSnapshot, onGround: boolean, locked: boolean, evading: boolean): CounterKind | null {
    if (locked || !onGround || this.p.held !== null || this.p.moves.isMoving) return null;
    if (input.lightPressed || input.heavyPressed) this.p.counter.buffer();
    return this.p.counter.take(!evading);
  }

  /** `J` logo depois de um pulo com `W` (AD-011): volta ao chão e zera o pulo; `false` fora da janela. */
  tryUppercutCancel(): boolean {
    const jump = this.p.loco.wJump;
    if (!jump || this.p.moves.isMoving || !shouldCancelJumpForUppercut(this.p.clockMs - jump.startMs)) return false;
    this.p.loco.wJump = null;
    this.p.sprite.setPosition(this.p.sprite.x, jump.groundY);
    this.p.move = { ...this.p.move, vy: 0, jumping: false, jumpHoldMs: 0, jumpBufferMs: 0 };
    return true;
  }

  onMove(events: MoveEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'moveStart') {
        this.p.onEvent?.(`move:${ev.move.name}`);
        this.activeElapsedMs = 0;
        this.travelDone = { forward: 0, down: 0 };
        this.swingId = nextSwingId++;
        this.strikeName = ev.move.name;
        // POS-07/08: só o golpe de chão dá o passo (o aéreo tem o próprio avanço ou nenhum).
        const groundMove =
          this.p.loco.touchesTerrain('below') && this.p.move.vy >= 0 && !ev.move.travel && !ev.move.slam;
        if (groundMove) this.stepIn.start(ev.move.strength, ev.move.startupMs);
        else this.stepIn.start(ev.move.strength, 0);
        this.p.onStrikePhase?.(ev.move.name, 'startup');
        // Pisão (AIR-03): a velocidade vertical vai direto para a queda máxima.
        // O golpe aéreo assume a vertical: solta o pulo sustentado para a subida não sobrescrever a queda/avanço.
        if (ev.move.slam) this.p.move = { ...this.p.move, vy: PLAYER_MOVE.maxFallSpeed, jumping: false };
        else if (ev.move.travel) this.p.move = { ...this.p.move, jumping: false };
        // VOA-01..03: o custo de postura sobe ao começar; se enche a barra, a guarda quebra e o golpe é cancelado.
        if (ev.move.postureCost !== undefined && this.p.structure.add(ev.move.postureCost))
          this.p.defense.onGuardBreak();
      } else if (ev.type === 'hitboxOn') {
        this.openHitbox(ev.move);
        this.p.onStrikePhase?.(ev.move.name, 'active');
      } else if (ev.type === 'hitboxOff') {
        this.p.hitbox.close();
        this.p.onStrikePhase?.(ev.move.name, 'recovery');
      } else if (ev.type === 'moveEnd') {
        this.p.hitbox.close();
        if (this.strikeName !== null) this.p.onStrikePhase?.(this.strikeName, 'end');
        this.strikeName = null;
      } else if (ev.type === 'whiff') this.p.onEvent?.(`whiff:${ev.move.name}`);
    }
  }

  /** Recuo do quique (VOA-05) e empurrão (RDG-19): mesmo padrão do recuo do bloqueio, o total sai inteiro pelo `scriptedDx`. */
  applyPush(dtMs: number): void {
    const push = this.push;
    if (!push || dtMs <= 0) return;
    const px = Math.min(push.remainingPx, (push.totalPx * dtMs) / push.ms);
    this.p.loco.scriptedDx += push.dir * px;
    this.p.move = { ...this.p.move, vx: 0 };
    push.remainingPx -= px;
    if (push.remainingPx <= 0) this.push = null;
  }

  /** Voadora (AIR-02): durante o `active` o corpo anda 120 px à frente e 60 px para baixo, com velocidade dirigida. */
  applyMoveTravel(dtMs: number): void {
    const def = this.p.moves.def;
    if (!def?.travel || this.p.moves.phase !== 'active' || dtMs <= 0) return;
    const target = moveTravelAt(def, this.activeElapsedMs);
    this.p.loco.scriptedDx += this.p.facing * (target.forward - this.travelDone.forward);
    this.p.move = { ...this.p.move, vx: 0, vy: (target.down - this.travelDone.down) / (dtMs / 1000) };
    this.travelDone = target;
  }

  /**
   * Passo à frente do golpe de chão (POS-07..09): 4 ou 10 px distribuídos pelo startup, pela velocidade dirigida
   * (`scriptedDx`, como a esquiva). Para no contato com corpo de inimigo ou parede.
   */
  applyStepIn(dtMs: number): void {
    // O startup pode acabar no `updateStrikes` deste mesmo quadro: o passo continua enquanto o `StepIn` não fechou o
    // total, desde que o golpe siga em curso (startup ou active); golpe cancelado não anda.
    const phase = this.p.moves.phase;
    if (dtMs <= 0 || !this.stepIn.running || (phase !== 'startup' && phase !== 'active')) return;
    const px = this.stepIn.update(dtMs, this.stepBlocked());
    if (px <= 0) return;
    this.p.loco.scriptedDx += this.p.facing * px;
    this.p.move = { ...this.p.move, vx: 0 };
  }

  /** `true` se logo à frente do corpo há parede (terreno na altura do tronco) ou o corpo de um inimigo vivo. */
  stepBlocked(): boolean {
    const probe = STEP_PROBE_PX;
    const halfW = SIZE.player.w / 2;
    const halfH = SIZE.player.h / 2;
    const near = this.p.sprite.x + this.p.facing * halfW;
    const far = near + this.p.facing * probe;
    const wall = {
      min: { x: Math.min(near, far), y: this.p.sprite.y - halfH + 2 },
      max: { x: Math.max(near, far), y: this.p.sprite.y + halfH - 4 },
    };
    if (this.p.scene.matter.query.region(this.p.terrain, wall).length > 0) return true;
    const ahead: Rect = {
      x: this.p.sprite.x + (this.p.facing * probe) / 2,
      y: this.p.sprite.y,
      width: SIZE.player.w + probe,
      height: SIZE.player.h,
    };
    for (const body of this.p.scene.matter.world.getAllBodies()) {
      const tag = tagOf(body);
      if (
        tag?.kind !== 'character' ||
        tag.target === this.p ||
        tag.target.team === this.p.team ||
        tag.target.isDead?.()
      )
        continue;
      const r = tag.target.hurtRect?.();
      if (!r) continue;
      if (
        Math.abs(r.x - ahead.x) < (r.width + ahead.width) / 2 &&
        Math.abs(r.y - ahead.y) < (r.height + ahead.height) / 2
      )
        return true;
    }
    return false;
  }

  openHitbox(move: MoveDef): void {
    // Com o boneco (`?debug&rig=1`), o gancho do heroico alto bate 20 px mais alto (PRA-05); os outros golpes seguem o MOVES.
    // Com o corpo HD (`?hd=1`, ~60 px, a altura do heroico alto) o gancho usa a mesma hitbox mais alta do rig.
    const hdShape = HD_ON && move.name === 'ganchoAscendente' ? RIG_UPPERCUT_HITBOX : undefined;
    const shape = hdShape ?? (RIG_ON ? rigHitbox(move.name, currentSearch()) : undefined) ?? move.hitbox;
    if (!shape) return;
    const hit: Hit = {
      ownerId: this.p.id,
      // MOD-05: dano do golpe escalado por `forca`, lido na hora.
      damage: Math.round(this.p.modifiers.meleeDamage(move.damage) * (this.p.damageMul?.(move) ?? 1)),
      strength: move.strength,
      force: move.force,
      direction: { x: this.p.facing, y: move.strength === 'heavy' ? -0.6 : -0.15 },
      moveName: move.name,
      unblockable: move.unblockable,
      // Contra (CNT-09, CNT-21): cambaleia até o inimigo comprometido; `knockdown` só nos golpes que derrubam (PST-04).
      counter: move.counter,
      knockdown: move.knockdown,
      swingId: this.swingId,
    };
    this.p.hitbox.open(shape, hit, this.p.sprite.x, this.p.sprite.y, this.p.facing, move.maxTargets);
  }
}
