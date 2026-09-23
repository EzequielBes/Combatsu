export interface HealthTuning {
  maxHp: number;
  /** Depois de um golpe, ignora os seguintes por este tempo. */
  invulnMs: number;
  /** Depois de um golpe, fica sem controle de movimento por este tempo. */
  staggerMs: number;
  /** Morto, renasce depois deste tempo. */
  respawnMs: number;
}

export type HealthResult = 'ignored' | 'hurt' | 'died';
export type HealthEvent = 'staggerEnd' | 'invulnEnd' | 'respawn';

/**
 * Vida do player (HP-01..04): golpe tira hp e dá invulnerabilidade + atordoamento; hp 0 = morte e, depois do
 * tempo de respawn, volta com o hp cheio. Dois golpes no mesmo frame valem um só (o segundo cai na invulnerabilidade).
 */
export class Health {
  private _hp: number;
  private invulnTimer = 0;
  private staggerTimer = 0;
  private respawnTimer = 0;
  private _dead = false;

  constructor(private readonly t: HealthTuning) {
    this._hp = t.maxHp;
  }

  get hp(): number {
    return this._hp;
  }

  get max(): number {
    return this.t.maxHp;
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0;
  }

  get staggered(): boolean {
    return this.staggerTimer > 0;
  }

  get dead(): boolean {
    return this._dead;
  }

  receive(damage: number): HealthResult {
    if (this._dead || this.invulnerable) return 'ignored';
    this._hp = Math.max(0, this._hp - damage);
    if (this._hp === 0) {
      this._dead = true;
      this.invulnTimer = 0;
      this.staggerTimer = 0;
      this.respawnTimer = this.t.respawnMs;
      return 'died';
    }
    this.invulnTimer = this.t.invulnMs;
    this.staggerTimer = this.t.staggerMs;
    return 'hurt';
  }

  update(dtMs: number): HealthEvent[] {
    const events: HealthEvent[] = [];
    if (this._dead) {
      this.respawnTimer -= dtMs;
      if (this.respawnTimer <= 0) {
        this._dead = false;
        this._hp = this.t.maxHp;
        events.push('respawn');
      }
      return events;
    }
    if (this.staggerTimer > 0) {
      this.staggerTimer -= dtMs;
      if (this.staggerTimer <= 0) events.push('staggerEnd');
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dtMs;
      if (this.invulnTimer <= 0) events.push('invulnEnd');
    }
    return events;
  }
}
