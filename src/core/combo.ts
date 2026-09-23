import type { Strength } from './hit';

export interface HitboxShape {
  offsetX: number; // positivo = à frente de quem ataca
  offsetY: number;
  width: number;
  height: number;
}

export interface AttackStep {
  name: string;
  damage: number;
  strength: Strength;
  force: number;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  /** Ausente quando a hitbox é o próprio objeto na mão. */
  hitbox?: HitboxShape;
}

export type ComboEvent =
  | { type: 'stepStart'; index: number; step: AttackStep }
  | { type: 'hitboxOn'; index: number; step: AttackStep }
  | { type: 'hitboxOff'; index: number }
  | { type: 'comboEnd' };

type Phase = 'idle' | 'startup' | 'active' | 'recovery' | 'window';

/**
 * Sequência de golpes: cada golpe tem startup → active (hitbox ligada) → recovery.
 * Apertar durante um golpe guarda UM aperto no buffer; apertar na janela após a
 * recuperação encadeia o próximo. Depois do último golpe o combo sempre termina.
 */
export class ComboTracker {
  private phase: Phase = 'idle';
  private index = -1;
  private timer = 0;
  private buffered = false;

  constructor(
    private readonly steps: readonly AttackStep[],
    private readonly windowMs: number,
  ) {
    if (steps.length === 0) throw new Error('Combo precisa de pelo menos um golpe');
  }

  /** Durante startup/active/recovery o personagem fica travado; na janela ele já pode se mexer. */
  get isAttacking(): boolean {
    return this.phase === 'startup' || this.phase === 'active' || this.phase === 'recovery';
  }

  get currentIndex(): number {
    return this.index;
  }

  press(): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') this.startStep(0, events);
    else if (this.phase === 'window') this.startStep(this.index + 1, events);
    else this.buffered = true;
    return events;
  }

  update(dtMs: number): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') return events;
    this.timer -= dtMs;
    if (this.timer > 0) return events;

    const step = this.steps[this.index];
    switch (this.phase) {
      case 'startup':
        this.phase = 'active';
        this.timer = step.activeMs;
        events.push({ type: 'hitboxOn', index: this.index, step });
        break;
      case 'active':
        this.phase = 'recovery';
        this.timer = step.recoveryMs;
        events.push({ type: 'hitboxOff', index: this.index });
        break;
      case 'recovery': {
        const hasNext = this.index + 1 < this.steps.length;
        if (hasNext && this.buffered) this.startStep(this.index + 1, events);
        else if (hasNext && this.windowMs > 0) {
          this.phase = 'window';
          this.timer = this.windowMs;
        } else this.end(events);
        break;
      }
      case 'window':
        this.end(events);
        break;
    }
    return events;
  }

  cancel(): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') return events;
    if (this.phase === 'active') events.push({ type: 'hitboxOff', index: this.index });
    this.end(events);
    return events;
  }

  private startStep(index: number, events: ComboEvent[]): void {
    this.index = index;
    this.phase = 'startup';
    this.timer = this.steps[index].startupMs;
    this.buffered = false;
    events.push({ type: 'stepStart', index, step: this.steps[index] });
  }

  private end(events: ComboEvent[]): void {
    this.phase = 'idle';
    this.index = -1;
    this.timer = 0;
    this.buffered = false;
    events.push({ type: 'comboEnd' });
  }
}
