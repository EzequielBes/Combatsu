import type { Hit } from './hit';
import { BOSS } from '../data/tuning';

export type BossBrainState = 'intro' | 'active' | 'roar' | 'stagger' | 'dead';

export interface BossBrainTuning {
  introMs: number;
  phaseThresholds: { phase2: number; phase3: number };
  roarMs: number;
  staggerMs: number;
  poise: { max: number; regenPerSec: number; regenDelayMs: number };
  /** Multiplicador do dano de `receiveHit` durante o `stagger` (BFX-05). */
  staggerDamageMult: number;
  /** `hpFraction`: fração do HP máximo que o finalizador tira (BFX-06). */
  finisher: { hpFraction: number };
}

/** O que causou o `stagger`: postura zerada (restaura a postura ao sair) ou parede (não mexe nela, BFX-02). */
export type StaggerCause = 'poise' | 'wall';

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
  private _staggerCause: StaggerCause | null = null;
  private _finisherReady = false;

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

  /** Causa do `stagger` atual; `null` fora dele. */
  get staggerCause(): StaggerCause | null {
    return this._staggerCause;
  }

  /** `true` desde que o `stagger` começa até o finalizador ser usado ou o `stagger` acabar (BFX-06, BFX-07). */
  get finisherReady(): boolean {
    return this._finisherReady;
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
    const poiseDamage = hit.strength === 'heavy' ? hit.damage * 2 : hit.damage;
    // BFX-05: durante o `stagger` o golpe causa `round(dano × staggerDamageMult)`.
    const damage = this._state === 'stagger' ? Math.round(hit.damage * this.t.staggerDamageMult) : hit.damage;
    return this.applyDamage(damage, poiseDamage);
  }

  /**
   * Atordoa o chefe por `ms` sem mexer na postura (BFX-02): chamado quando a investida bate na parede. Ignorado
   * na intro, no rugido (o rugido vence, EDG-05), morto e se já está em `stagger`.
   */
  stun(ms: number): BossEvent[] {
    if (this._state !== 'active') return [];
    this.beginStagger('wall', ms);
    return [{ type: 'staggerStart' }];
  }

  /**
   * Finalizador (BFX-06..08, EDG-06): com `finisherReady`, tira `round(hpFraction × maxHp)` uma única vez por
   * `stagger`, sem o multiplicador do `stagger`; pode matar (emite `died`) ou cruzar um limiar de fase. Fora do
   * `stagger`, ou depois do primeiro uso, devolve `[]` e não muda nada.
   */
  receiveFinisher(): BossEvent[] {
    if (this._state !== 'stagger' || !this._finisherReady) return [];
    this._finisherReady = false;
    return this.applyDamage(Math.round(this.t.finisher.hpFraction * this.maxHp), 0);
  }

  private beginStagger(cause: StaggerCause, ms: number): void {
    this._state = 'stagger';
    this.timer = ms;
    this._staggerCause = cause;
    this._finisherReady = true;
  }

  /** Limpa o estado do `stagger` ao sair dele por qualquer caminho (fim, rugido ou morte). */
  private endStagger(): void {
    this._staggerCause = null;
    this._finisherReady = false;
  }

  /**
   * KOK-06/08/12/32: dano do Kokusen no chefe — mesmas regras de fase/morte/rugido de `receiveHit`, mas a
   * postura cai por um valor próprio (`poiseDamage`, KOK-08: 3× o dano, não a fórmula 2× de um golpe forte
   * comum), e nunca é ignorado por intro/rugido invulneráveis (BOSS-08 continua valendo — quem chama decide se
   * o Kokusen pode acontecer nesse estado; ver o edge case do Punho Divergente contra o chefe em `roar`/`intro`).
   */
  receiveKokusen(damage: number, poiseDamage: number): BossEvent[] {
    if (this._state === 'dead' || this._state === 'intro' || this._state === 'roar') return [];
    return this.applyDamage(damage, poiseDamage);
  }

  /** Núcleo comum de `receiveHit`/`receiveKokusen`: hp e postura (nunca abaixo de 0), fase/rugido/morte/stagger. */
  private applyDamage(damage: number, poiseDamage: number): BossEvent[] {
    this.sinceHit = 0;
    this._hp = Math.max(0, this._hp - damage);
    const poiseBefore = this._poise;
    // Em `stagger` a postura não muda: ou já está em 0 (causa postura) ou foi preservada pela parede (BFX-02).
    if (this._state !== 'stagger') this._poise = Math.max(0, this._poise - poiseDamage);

    if (this._hp <= 0) {
      this._state = 'dead';
      this.endStagger();
      return [{ type: 'died' }];
    }

    const newPhase = this.phaseFromHp();
    if (newPhase > this._phase) {
      this._phase = newPhase;
      this._state = 'roar';
      this.endStagger();
      this.timer = this.t.roarMs;
      // newPhase > this._phase (que já era >= 1) só pode ser 2 ou 3 aqui.
      return [{ type: 'phaseChanged', phase: newPhase as 2 | 3 }, { type: 'roarStart' }];
    }

    if (poiseBefore > 0 && this._poise <= 0) {
      this.beginStagger('poise', this.t.staggerMs);
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
          // Só o `stagger` por postura restaura a postura; o da parede a deixou como estava (BFX-02).
          if (this._staggerCause === 'poise') this._poise = this.t.poise.max;
          this.endStagger();
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
