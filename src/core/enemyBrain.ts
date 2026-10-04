import type { Hit } from './hit';

export type EnemyState =
  | 'idle'
  | 'hitstun'
  | 'stagger'
  | 'ragdollStun'
  | 'gettingUp'
  | 'deadRagdoll'
  | 'dissolving'
  | 'gone';

export interface EnemyTuning {
  maxHp: number;
  hitstunMs: number;
  ragdollStunMs: number;
  getUpMs: number;
  deathRagdollMs: number;
  dissolveMs: number;
  /** Cambaleio do golpe forte que não derruba (PST-01, em ms). */
  staggerMs: number;
}

export type EnemyEvent =
  | { type: 'hitReaction'; hit: Hit }
  | { type: 'stagger'; hit: Hit } // golpe forte que não derruba: cambaleia sem ragdoll (PST-01)
  | { type: 'armored'; hit: Hit } // comprometido: levou o golpe e segue o ataque (CMT-06)
  | { type: 'ragdoll'; hit: Hit } // entra em ragdoll, ou novo impulso se já estiver
  | { type: 'hurtWhileDown'; hit: Hit }
  | { type: 'died'; hit: Hit }
  | { type: 'getUp' }
  | { type: 'recovered' }
  | { type: 'dissolve' }
  | { type: 'removed' };

/** O que o chamador sabe e o cérebro não: se o inimigo está comprometido (CMT-04) e o tempo do ragdoll do golpe. */
export interface HitContext {
  committed?: boolean;
  ragdollStunMs?: number;
}

/**
 * Reação a dano agnóstica da origem do golpe: leve = animação, forte = cambaleio de `staggerMs`, golpe que derruba
 * (`knockdown`) = ragdoll temporário, fatal = ragdoll permanente seguido de dissolução. Comprometido, o inimigo só
 * perde vida (armadura, CMT-04). No chão entra um golpe só, fora os de técnica (GND-01..04).
 */
export class EnemyBrain {
  private _state: EnemyState = 'idle';
  private _hp: number;
  private timer = 0;
  private _downHits = 0;

  constructor(private readonly t: EnemyTuning) {
    this._hp = t.maxHp;
  }

  get state(): EnemyState {
    return this._state;
  }

  get hp(): number {
    return this._hp;
  }

  /** Vida máxima com que este cérebro foi criado (DIF-04): a fonte real de verdade do hp do inimigo. */
  get maxHp(): number {
    return this.t.maxHp;
  }

  get isDead(): boolean {
    return this._state === 'deadRagdoll' || this._state === 'dissolving' || this._state === 'gone';
  }

  /** Golpes aceitos no `ragdollStun` atual, sem contar os de técnica (GND-05, GND-07). */
  get downHits(): number {
    return this._downHits;
  }

  /** Devolve `[]` quando o golpe é recusado (já morto, levantando ou no limite do chão: GND-02, GND-03). */
  receiveHit(hit: Hit, ctx: HitContext = {}): EnemyEvent[] {
    if (this.isDead) return [];
    const grounded = this._state === 'ragdollStun';
    if (!hit.tech) {
      if (this._state === 'gettingUp') return [];
      if (grounded && this._downHits >= 1) return [];
    }
    this._hp = Math.max(0, this._hp - hit.damage);
    if (grounded && !hit.tech) this._downHits = 1;
    if (this._hp === 0) {
      this.enter('deadRagdoll', this.t.deathRagdollMs);
      return [{ type: 'died', hit }, { type: 'ragdoll', hit }];
    }
    if (grounded && !hit.tech) return [{ type: 'hurtWhileDown', hit }];
    if (hit.knockdown) {
      this.enter('ragdollStun', ctx.ragdollStunMs ?? this.t.ragdollStunMs);
      if (!grounded) this._downHits = 0;
      return [{ type: 'ragdoll', hit }];
    }
    if (ctx.committed && !hit.counter) return [{ type: 'armored', hit }];
    if (hit.strength === 'heavy') {
      this.enter('stagger', this.t.staggerMs);
      return [{ type: 'stagger', hit }];
    }
    if (this._state === 'stagger') {
      this.timer = Math.max(this.timer, this.t.hitstunMs);
      return [{ type: 'hitReaction', hit }];
    }
    if (grounded) return [{ type: 'hurtWhileDown', hit }];
    this.enter('hitstun', this.t.hitstunMs);
    return [{ type: 'hitReaction', hit }];
  }

  /** Deflexão: cambaleia por `ms` se está vivo e fora do chão (DFL-11). Devolve se entrou em `stagger`. */
  forceStagger(ms: number): boolean {
    if (this.isDead || this._state === 'ragdollStun' || this._state === 'gettingUp') return false;
    this.enter('stagger', ms);
    return true;
  }

  /** Sai de `hitstun` ou `stagger` para `idle` (guarda de leitura, empurrão: RDG-09, RDG-22). Devolve se mudou. */
  recover(): boolean {
    if (this._state !== 'hitstun' && this._state !== 'stagger') return false;
    this.enter('idle', 0);
    return true;
  }

  update(dtMs: number): EnemyEvent[] {
    if (this._state === 'idle' || this._state === 'gone') return [];
    this.timer -= dtMs;
    if (this.timer > 0) return [];
    switch (this._state) {
      case 'hitstun':
      case 'stagger':
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
