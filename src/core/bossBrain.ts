import type { Hit } from './hit';
import { BOSS } from '../data/tuning';

export type BossBrainState = 'intro' | 'active' | 'roar' | 'stagger' | 'dead';

export interface BossBrainTuning {
  introMs: number;
  phaseThresholds: { phase2: number; phase3: number };
  roarMs: number;
  staggerMs: number;
  poise: { max: number; regenPerSec: number; regenDelayMs: number };
}

export type BossEvent =
  | { type: 'introEnd' }
  | { type: 'phaseChanged'; phase: 2 | 3 }
  | { type: 'roarStart' }
  | { type: 'roarEnd' }
  | { type: 'staggerStart' }
  | { type: 'staggerEnd' }
  | { type: 'died' };

/**
 * Vida, fases, postura e entrada do chefe (BOSS-06/08, BAI-01, 04..14): puro, sem `phaser` (AD-001). A intro e
 * o rugido são invulneráveis (nenhum golpe muda hp ou postura); ao cruzar um limiar de fase entra em `roar`,
 * mesmo vindo de `stagger` ("o rugido vence"); a postura chegando a 0 entra em `stagger` e depois volta a 100.
 * Não existe estado de ragdoll: um golpe forte nunca produz mais que uma troca de estado (roar ou stagger).
 */
export class BossBrain {
  private _state: BossBrainState = 'intro';
  private _hp: number;
  private _phase: 1 | 2 | 3 = 1;
  private _poise: number;
  private timer: number;
  /** Tempo desde o último golpe que de fato mudou hp/postura (fora da intro e do rugido), para BAI-09. */
  private sinceHit = 0;

  constructor(
    public readonly maxHp: number,
    private readonly t: BossBrainTuning = BOSS,
  ) {
    this._hp = maxHp;
    this._poise = t.poise.max;
    this.timer = t.introMs;
  }

  get state(): BossBrainState {
    return this._state;
  }

  get hp(): number {
    return this._hp;
  }

  get phase(): 1 | 2 | 3 {
    return this._phase;
  }

  get poise(): number {
    return this._poise;
  }

  get isDead(): boolean {
    return this._state === 'dead';
  }

  /**
   * Aplica um golpe (BOSS-08, BAI-01, BAI-04..10, BAI-12): ignorado por completo na intro e no rugido. Fora
   * disso, tira hp e postura (leve = dano, forte = 2×dano, nunca abaixo de 0); morte tem prioridade sobre
   * qualquer troca de fase ou postura (um único `died`); cruzar um limiar de fase entra em `roar` (mesmo vindo
   * de `stagger`); a postura cruzando de > 0 para <= 0 entra em `stagger`.
   */
  receiveHit(hit: Hit): BossEvent[] {
    if (this._state === 'dead' || this._state === 'intro' || this._state === 'roar') return [];

    this.sinceHit = 0;
    this._hp = Math.max(0, this._hp - hit.damage);
    const poiseDamage = hit.strength === 'heavy' ? hit.damage * 2 : hit.damage;
    const poiseBefore = this._poise;
    this._poise = Math.max(0, this._poise - poiseDamage);

    if (this._hp <= 0) {
      this._state = 'dead';
      return [{ type: 'died' }];
    }

    const newPhase = this.phaseFromHp();
    if (newPhase > this._phase) {
      this._phase = newPhase;
      this._state = 'roar';
      this.timer = this.t.roarMs;
      // newPhase > this._phase (que já era >= 1) só pode ser 2 ou 3 aqui.
      return [{ type: 'phaseChanged', phase: newPhase as 2 | 3 }, { type: 'roarStart' }];
    }

    if (poiseBefore > 0 && this._poise <= 0) {
      this._state = 'stagger';
      this.timer = this.t.staggerMs;
      return [{ type: 'staggerStart' }];
    }

    return [];
  }

  /** Avança a intro, o rugido ou o atordoamento; regenera a postura depois de `regenDelayMs` sem apanhar. */
  update(dtMs: number): BossEvent[] {
    if (this._state === 'dead') return [];
    const events: BossEvent[] = [];

    switch (this._state) {
      case 'intro':
        this.timer -= dtMs;
        if (this.timer <= 0) {
          this._state = 'active';
          events.push({ type: 'introEnd' });
        }
        break;
      case 'roar':
        this.timer -= dtMs;
        if (this.timer <= 0) {
          this._state = 'active';
          events.push({ type: 'roarEnd' });
        }
        break;
      case 'stagger':
        this.timer -= dtMs;
        if (this.timer <= 0) {
          this._state = 'active';
          this._poise = this.t.poise.max;
          events.push({ type: 'staggerEnd' });
        }
        break;
      default:
        break;
    }

    if (this._state !== 'stagger') {
      const before = this.sinceHit;
      const after = before + dtMs;
      if (after > this.t.poise.regenDelayMs) {
        const regenMs = after - Math.max(before, this.t.poise.regenDelayMs);
        this._poise = Math.min(this.t.poise.max, this._poise + (this.t.poise.regenPerSec * regenMs) / 1000);
      }
      this.sinceHit = after;
    }

    return events;
  }

  private phaseFromHp(): 1 | 2 | 3 {
    if (this._hp <= this.maxHp * this.t.phaseThresholds.phase3) return 3;
    if (this._hp <= this.maxHp * this.t.phaseThresholds.phase2) return 2;
    return 1;
  }
}
