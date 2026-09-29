import { CHARGE_MS, MOVES, MOVE_WINDOW_MS, type MoveButton, type MoveDef } from '../data/moves';

/** Estado do jogador lido no frame do aperto. `forward` = a direção para onde ele está virado está segurada. */
export interface MoveContext {
  grounded: boolean;
  down: boolean;
  up: boolean;
  forward: boolean;
}

export type MoveEvent =
  | { type: 'moveStart'; move: MoveDef }
  | { type: 'hitboxOn'; move: MoveDef }
  | { type: 'hitboxOff'; move: MoveDef }
  | { type: 'moveEnd' };

/** `window` = já sem golpe em andamento, mas ainda aceitando o follow-up (MOV-03). */
export type MovePhase = 'idle' | 'startup' | 'active' | 'recovery' | 'window';

interface Buffered {
  button: MoveButton;
  grounded: boolean;
}

/**
 * Máquina do grafo de golpes (MOV-01..09, MOV-16..18, AIR-01..04): escolhe o golpe por botão + direção + ar,
 * encadeia follow-ups na janela, guarda UM aperto no buffer e dispara o chute carregado no fim do golpe atual.
 * Pura: o tempo entra por `update(dt)`.
 */
export class MoveMachine {
  private _phase: MovePhase = 'idle';
  private move: MoveDef | null = null;
  private timer = 0;
  private windowElapsed = 0;
  private buffered: Buffered | null = null;
  private pendingCharge = false;
  private airUsed = false;
  private _hasHit = false;

  constructor(
    private readonly moves: Readonly<Record<string, MoveDef>> = MOVES,
    private readonly windowMs: number = MOVE_WINDOW_MS,
    private readonly chargeMs: number = CHARGE_MS,
  ) {}

  /** Nome do golpe em startup/active/recovery; `null` sem golpe em andamento, inclusive na janela (MOV-18). */
  get current(): string | null {
    return this.isMoving ? (this.move as MoveDef).name : null;
  }

  get isMoving(): boolean {
    return this._phase === 'startup' || this._phase === 'active' || this._phase === 'recovery';
  }

  get phase(): MovePhase {
    return this._phase;
  }

  get def(): MoveDef | null {
    return this.isMoving ? this.move : null;
  }

  /** Recovery de um golpe que já acertou: pode ser cancelado pela esquiva (DOD-06). */
  get canDodgeCancel(): boolean {
    return this._phase === 'recovery' && this._hasHit;
  }

  /** Marca que o golpe atual acertou um alvo. */
  hitLanded(): void {
    if (this.isMoving) this._hasHit = true;
  }

  /** O jogador pousou: libera um novo golpe aéreo (AIR-04). */
  land(): void {
    this.airUsed = false;
  }

  press(button: MoveButton, ctx: MoveContext): MoveEvent[] {
    if (ctx.grounded) this.airUsed = false;
    const events: MoveEvent[] = [];
    if (this.isMoving) {
      this.buffered = { button, grounded: ctx.grounded };
      return events;
    }
    if (this._phase === 'window') {
      const next = this.followUp(button, ctx.grounded);
      if (next) {
        this.startMove(next, events);
        return events;
      }
    }
    const first = this.initialMove(button, ctx);
    if (first) this.startMove(first, events);
    return events;
  }

  /** Soltou `K` depois de `heldMs` desde o aperto: com ≥ 400 ms o carregado sai no fim do golpe atual (MOV-09, MOV-16). */
  release(button: MoveButton, heldMs: number, ctx: MoveContext): MoveEvent[] {
    const events: MoveEvent[] = [];
    if (button !== 'heavy' || heldMs < this.chargeMs || !ctx.grounded) return events;
    if (this.isMoving) this.pendingCharge = true;
    else this.startMove(this.moves.chuteCarregado, events);
    return events;
  }

  update(dtMs: number): MoveEvent[] {
    const events: MoveEvent[] = [];
    if (this._phase === 'idle') return events;
    if (this._phase === 'window') {
      this.windowElapsed += dtMs;
      if (this.windowElapsed > this.windowMs) this.toIdle();
      return events;
    }
    this.timer -= dtMs;
    if (this.timer > 0) return events;
    const move = this.move as MoveDef;
    switch (this._phase) {
      case 'startup':
        this._phase = 'active';
        this.timer = move.activeMs;
        events.push({ type: 'hitboxOn', move });
        break;
      case 'active':
        this._phase = 'recovery';
        this.timer = move.recoveryMs;
        events.push({ type: 'hitboxOff', move });
        break;
      case 'recovery':
        this.finishRecovery(move, events);
        break;
    }
    return events;
  }

  /** Interrompe o golpe (esquiva, técnica, atordoamento). */
  cancel(): MoveEvent[] {
    const events: MoveEvent[] = [];
    if (this._phase === 'idle') return events;
    if (this._phase === 'active') events.push({ type: 'hitboxOff', move: this.move as MoveDef });
    if (this.isMoving) events.push({ type: 'moveEnd' });
    this.toIdle();
    return events;
  }

  private finishRecovery(move: MoveDef, events: MoveEvent[]): void {
    if (this.pendingCharge) {
      this.startMove(this.moves.chuteCarregado, events);
      return;
    }
    const buffered = this.buffered;
    const next = buffered ? this.followUp(buffered.button, buffered.grounded) : null;
    if (next) {
      this.startMove(next, events);
      return;
    }
    events.push({ type: 'moveEnd' });
    this.buffered = null;
    if (Object.keys(move.followUps).length > 0) {
      this._phase = 'window';
      this.windowElapsed = 0;
    } else {
      this.toIdle();
    }
  }

  private followUp(button: MoveButton, grounded: boolean): MoveDef | null {
    if (!grounded || !this.move) return null;
    const name = this.move.followUps[button];
    return name ? this.moves[name] : null;
  }

  /** Golpe base de um aperto sem golpe em andamento; `null` no ar depois do golpe aéreo do pulo (AIR-04). */
  private initialMove(button: MoveButton, ctx: MoveContext): MoveDef | null {
    if (!ctx.grounded) {
      if (this.airUsed) return null;
      if (button === 'light') return this.moves.socoAereo;
      return ctx.down ? this.moves.pisao : this.moves.voadora;
    }
    if (button === 'light') {
      if (ctx.down) return this.moves.socoBaixo;
      if (ctx.up) return this.moves.ganchoAscendente;
      return this.moves.jab;
    }
    if (ctx.down) return this.moves.rasteira;
    if (ctx.forward) return this.moves.chuteEmpurrao;
    return this.moves.chuteFrontal;
  }

  private startMove(move: MoveDef, events: MoveEvent[]): void {
    const input = move.input;
    if (input.via === 'press' && input.air) this.airUsed = true;
    this.move = move;
    this._phase = 'startup';
    this.timer = move.startupMs;
    this.buffered = null;
    this.pendingCharge = false;
    this._hasHit = false;
    events.push({ type: 'moveStart', move });
  }

  private toIdle(): void {
    this._phase = 'idle';
    this.move = null;
    this.timer = 0;
    this.windowElapsed = 0;
    this.buffered = null;
    this.pendingCharge = false;
    this._hasHit = false;
  }
}

/**
 * Deslocamento acumulado do jogador dentro do `active` de um golpe com `travel` (voadora, AIR-02): interpola
 * linearmente de 0 até `forwardPx`/`downPx` ao fim do active. Sem `travel`, zero.
 */
export function moveTravelAt(move: MoveDef, activeElapsedMs: number): { forward: number; down: number } {
  if (!move.travel) return { forward: 0, down: 0 };
  const t = Math.min(Math.max(activeElapsedMs / move.activeMs, 0), 1);
  return { forward: move.travel.forwardPx * t, down: move.travel.downPx * t };
}
