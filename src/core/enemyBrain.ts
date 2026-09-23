import type { Hit } from './hit';

export type EnemyState = 'idle' | 'hitstun' | 'ragdollStun' | 'gettingUp' | 'deadRagdoll' | 'dissolving' | 'gone';

export interface EnemyTuning {
  maxHp: number;
  hitstunMs: number;
  ragdollStunMs: number;
  getUpMs: number;
  deathRagdollMs: number;
  dissolveMs: number;
}

export type EnemyEvent =
  | { type: 'hitReaction'; hit: Hit }
  | { type: 'ragdoll'; hit: Hit } // entra em ragdoll, ou novo impulso se já estiver
  | { type: 'hurtWhileDown'; hit: Hit }
  | { type: 'died'; hit: Hit }
  | { type: 'getUp' }
  | { type: 'recovered' }
  | { type: 'dissolve' }
  | { type: 'removed' };

/**
 * Reação a dano agnóstica da origem do golpe: leve = animação, forte = ragdoll
 * temporário, fatal = ragdoll permanente seguido de dissolução.
 */
export class EnemyBrain {
  private _state: EnemyState = 'idle';
  private _hp: number;
  private timer = 0;

  constructor(private readonly t: EnemyTuning) {
    this._hp = t.maxHp;
  }

  get state(): EnemyState {
    return this._state;
  }

  get hp(): number {
    return this._hp;
  }

  get isDead(): boolean {
    return this._state === 'deadRagdoll' || this._state === 'dissolving' || this._state === 'gone';
  }

  receiveHit(hit: Hit): EnemyEvent[] {
    if (this.isDead) return [];
    this._hp = Math.max(0, this._hp - hit.damage);
    if (this._hp === 0) {
      this.enter('deadRagdoll', this.t.deathRagdollMs);
      return [{ type: 'died', hit }, { type: 'ragdoll', hit }];
    }
    if (hit.strength === 'heavy') {
      this.enter('ragdollStun', this.t.ragdollStunMs);
      return [{ type: 'ragdoll', hit }];
    }
    if (this._state === 'ragdollStun') return [{ type: 'hurtWhileDown', hit }];
    this.enter('hitstun', this.t.hitstunMs);
    return [{ type: 'hitReaction', hit }];
  }

  update(dtMs: number): EnemyEvent[] {
    if (this._state === 'idle' || this._state === 'gone') return [];
    this.timer -= dtMs;
    if (this.timer > 0) return [];
    switch (this._state) {
      case 'hitstun':
        this.enter('idle', 0);
        return [];
      case 'ragdollStun':
        this.enter('gettingUp', this.t.getUpMs);
        return [{ type: 'getUp' }];
      case 'gettingUp':
        this.enter('idle', 0);
        return [{ type: 'recovered' }];
      case 'deadRagdoll':
        this.enter('dissolving', this.t.dissolveMs);
        return [{ type: 'dissolve' }];
      case 'dissolving':
        this.enter('gone', 0);
        return [{ type: 'removed' }];
      default:
        return [];
    }
  }

  private enter(state: EnemyState, ms: number): void {
    this._state = state;
    this.timer = ms;
  }
}
