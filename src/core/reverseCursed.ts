import { REVERSE_CURSED } from '../data/techniques';

export type ReverseEvent = 'rctStart' | 'rctStop' | 'rctDenied';

/** O que a Energia Reversa precisa saber do frame (lido na hora pela cena). */
export interface ReverseInput {
  /** Tecla da técnica segurada. */
  held: boolean;
  /** Livre para canalizar: vivo, sem atordoamento, sem conjuração, esquiva, golpe nem objeto na mão. */
  canChannel: boolean;
  hp: number;
  maxHp: number;
  /** Energia amaldiçoada disponível agora. */
  energy: number;
}

export interface ReverseStep {
  /** HP inteiros a curar neste frame. */
  heal: number;
  /** Energia a gastar neste frame: sempre `heal × energyPerHp` (RCT-03). */
  spend: number;
  events: ReverseEvent[];
}

/**
 * Energia Amaldiçoada Reversa (RCT-01..09): enquanto a tecla fica segurada, converte energia em vida a
 * `hpPerSec`, gastando `energyPerHp` (o dobro) de energia por HP. Começa depois de `warmupMs` de concentração, para
 * com a tecla solta, a vida cheia, a energia acabando ou algo que tira o player do estado livre, e `interrupt`
 * (levar dano) corta na hora. Só decide números: a cena aplica a cura, o gasto e a trava do player.
 */
export class ReverseCursed {
  private _active = false;
  private warmMs = 0;
  private acc = 0;
  private wasHeld = false;

  constructor(private readonly t = REVERSE_CURSED) {}

  /** Canalizando agora (inclui a concentração): o player fica travado e a energia não regenera (RCT-05, RCT-06). */
  get active(): boolean {
    return this._active;
  }

  /** Já passou da concentração e está curando. */
  get healing(): boolean {
    return this._active && this.warmMs >= this.t.warmupMs;
  }

  update(dtMs: number, inp: ReverseInput): ReverseStep {
    const pressed = inp.held && !this.wasHeld;
    this.wasHeld = inp.held;
    const events: ReverseEvent[] = [];
    const missing = inp.maxHp - inp.hp;
    const affordable = Math.floor(inp.energy / this.t.energyPerHp);

    if (!this._active) {
      if (!inp.held || !inp.canChannel || missing <= 0) return { heal: 0, spend: 0, events };
      // RCT-08: sem energia para 1 HP não começa; o aperto avisa uma vez (a barra pisca).
      if (affordable < 1) {
        if (pressed) events.push('rctDenied');
        return { heal: 0, spend: 0, events };
      }
      this._active = true;
      this.warmMs = 0;
      this.acc = 0;
      events.push('rctStart');
    }

    // RCT-04: para com a tecla solta, a vida cheia, a energia esgotada ou o player ocupado.
    if (!inp.held || !inp.canChannel || missing <= 0 || affordable < 1) {
      this.stop(events);
      return { heal: 0, spend: 0, events };
    }

    const before = this.warmMs;
    this.warmMs += dtMs;
    if (this.warmMs < this.t.warmupMs) return { heal: 0, spend: 0, events };
    // Só o tempo depois da concentração cura (RCT-02).
    const healingMs = this.warmMs - Math.max(before, this.t.warmupMs);
    this.acc += (this.t.hpPerSec * healingMs) / 1000;
    const heal = Math.min(Math.floor(this.acc), missing, affordable);
    this.acc -= heal;
    return { heal, spend: heal * this.t.energyPerHp, events };
  }

  /** Levou dano (RCT-07): corta a canalização na hora; devolve `rctStop` se estava ativa. */
  interrupt(): ReverseEvent[] {
    const events: ReverseEvent[] = [];
    if (this._active) this.stop(events);
    return events;
  }

  /** Nova run: parada, sem fração guardada. */
  reset(): void {
    this._active = false;
    this.warmMs = 0;
    this.acc = 0;
    this.wasHeld = false;
  }

  private stop(events: ReverseEvent[]): void {
    this._active = false;
    this.warmMs = 0;
    this.acc = 0;
    events.push('rctStop');
  }
}
