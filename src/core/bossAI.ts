import { BOSS } from '../data/tuning';
import { animBase } from './bossAttacks';
import type { BossSpec } from './bossTier';

/** Os 3 ataques de base e os encadeados/afixos dos ciclos por arquétipo (CYC-03/04, SNG-01). */
export type BossAttack = 'charge' | 'leap' | 'volley' | 'doubleCharge' | 'tripleLeap' | 'threadRain' | 'beam';
export type BossAIState = 'rest' | 'windup' | 'charge' | 'leap' | 'volley' | 'threadRain' | 'beam';
/** Ataques com aviso no chão ou na tela: preparo fixo, sem `windupMult` (SNG-02, CYC-09). */
export type BossStrike = 'beam' | 'threadRain';

export interface BossAITuning {
  /** Ciclo de ataques por fase (BAI-02, CYC-01): recomeça do primeiro ao trocar de fase. */
  cycles: Readonly<Record<1 | 2 | 3, readonly BossAttack[]>>;
  phases: readonly { windupMult: number; restMs: number }[];
  charge: { windupMs: number; speed: number; maxDist: number };
  /** `recoveryMs`: descanso mínimo depois do pouso (BFX-04). */
  leap: { windupMs: number; durationMs: number; recoveryMs: number };
  volley: { windupMs: number; intervalMs: number };
  /** Preparo da 2ª investida da Investida Dupla (CYC-05). */
  doubleCharge: { rewindupMs: number };
  /** Saltos do Salto Triplo e intervalo entre pouso e saída (CYC-07). */
  tripleLeap: { hops: number; gapMs: number };
  /** Preparo fixo e tempo ativo da Chuva de Fios (CYC-09/10). */
  threadRain: { windupMs: number; activeMs: number };
  /** Aviso fixo e tempo ativo do feixe do Sangue Convergente (SNG-02/03); os números vêm de `BOSS_AFFIX.beam`. */
  beam: { warnMs: number; activeMs: number };
}

export interface BossAIObservation {
  selfX: number;
  playerX: number;
  /** A investida bateu numa parede (encerra o movimento, BAT-01). */
  blocked: boolean;
  /** `false` na intro, no rugido, no atordoamento ou morto: sem mover, sem atacar (BAI-05). */
  canAct: boolean;
  phase: 1 | 2 | 3;
  /** `volleyCount` e `projectileSpeed` do arquétipo (BTIER-05, BTIER-07). */
  spec: Pick<BossSpec, 'volleyCount' | 'projectileSpeed'>;
}

export type BossAIEvent =
  | { type: 'hitboxOn' }
  | { type: 'hitboxOff' }
  | { type: 'fire'; dir: 1 | -1; speed: number }
  /** Pouso de um salto: `final` é falso nos dois primeiros pousos do Salto Triplo e verdadeiro nos demais (CYC-08). */
  | { type: 'landed'; final: boolean }
  /** A investida terminou batendo na parede: quem chama atordoa o chefe (BFX-02). */
  | { type: 'wallStun' }
  /**
   * Fim de toda investida, por alcance ou por parede (IGN-01): `fromX` é o X do chefe ao sair e `toX` o X dele no
   * frame em que parou, na ordem do movimento (`toX < fromX` quando correu para a esquerda). Cancelar a investida
   * sem `canAct` não deixa rastro.
   */
  | { type: 'chargeTrail'; fromX: number; toX: number }
  /**
   * Início do preparo do feixe ou da chuva (SNG-02, CYC-09): `dir` é o lado do player nesse frame (o feixe fica preso
   * nele) e `playerX` o centro das marcas da chuva.
   */
  | { type: 'telegraph'; attack: BossStrike; dir: 1 | -1; playerX: number }
  /** Fim do preparo: o feixe (no `dir` avisado) ou os fios abrem; `strikeOff` fecha (SNG-03, CYC-10). */
  | { type: 'strikeOn'; attack: BossStrike; dir: 1 | -1 }
  | { type: 'strikeOff'; attack: BossStrike }
  /** Interrompido no preparo ou no corpo do feixe/chuva: apaga o aviso; no preparo, nada chegou a abrir (edge case). */
  | { type: 'telegraphCancel' };

export interface BossAIOutput {
  /** px/s, só horizontal; só != 0 durante a investida. */
  vx: number;
  leap: { fromX: number; toX: number; progress: number } | null;
  state: BossAIState;
  attack: BossAttack | null;
  events: BossAIEvent[];
}

/**
 * Ciclo de ataques do chefe (BAI-02/03/11, BAT-01/02/04/05/09/10/11): puro, sem `phaser` (AD-001). `update`
 * recebe as observações do frame e devolve velocidade, progresso do salto, estado/ataque atual e eventos.
 * Sem `canAct` fecha a hitbox da investida se estava aberta, zera `vx` e cancela o ataque em andamento -
 * ele não retoma de onde parou (BAI-05); ao trocar de fase, o ciclo recomeça do primeiro ataque.
 */
export class BossAI {
  private _state: BossAIState = 'rest';
  private timer = 0;
  private facing: 1 | -1 = 1;
  private currentPhase: 1 | 2 | 3 = 1;
  private cycleIndex = 0;
  private currentAttack: BossAttack | null = null;

  private chargeDir: 1 | -1 = 1;
  private chargeTraveled = 0;
  private chargeFromX = 0;
  /** Perna da Investida Dupla: 0 na 1ª investida (ou numa investida simples), 1 na 2ª (CYC-05). */
  private chargeLeg: 0 | 1 = 0;

  private leapFromX = 0;
  private leapToX = 0;
  private leapProgress = 0;
  /** Salto atual do Salto Triplo, de 0 a `tripleLeap.hops - 1`; 0 num salto simples (CYC-07). */
  private leapHop = 0;

  private volleyDir: 1 | -1 = 1;
  private volleyFired = 0;

  /** Lado do feixe, preso no início do aviso (SNG-02). */
  private strikeDir: 1 | -1 = 1;

  private currentVx = 0;

  constructor(private readonly t: BossAITuning = BOSS) {}

  get state(): BossAIState {
    return this._state;
  }

  get attack(): BossAttack | null {
    return this.currentAttack;
  }

  update(dtMs: number, obs: BossAIObservation): BossAIOutput {
    if (obs.phase !== this.currentPhase) {
      this.currentPhase = obs.phase;
      this.cycleIndex = 0;
    }

    if (!obs.canAct) return this.interrupt();

    const events: BossAIEvent[] = [];
    this.step(dtMs, obs, events);

    const leap =
      this._state === 'leap'
        ? { fromX: this.leapFromX, toX: this.leapToX, progress: this.leapProgress }
        : events.some((e) => e.type === 'landed')
          ? { fromX: this.leapFromX, toX: this.leapToX, progress: 1 }
          : null;

    return { vx: this.currentVx, leap, state: this._state, attack: this.currentAttack, events };
  }

  /** Avança o estado atual; qualquer sobra de tempo de uma transição é repassada ao próximo estado no mesmo frame. */
  private step(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    switch (this._state) {
      case 'rest': {
        this.currentVx = 0;
        this.timer -= dtMs;
        if (this.timer > 0) return;
        const overrun = -this.timer;
        this.enterWindup(obs, events);
        this.step(overrun, obs, events);
        return;
      }
      case 'windup': {
        this.currentVx = 0;
        this.timer -= dtMs;
        if (this.timer > 0) return;
        const overrun = -this.timer;
        this.beginAttackBody(obs, events);
        this.step(overrun, obs, events);
        return;
      }
      case 'charge':
        this.stepCharge(dtMs, obs, events);
        return;
      case 'leap':
        this.stepLeap(dtMs, obs, events);
        return;
      case 'volley':
        this.stepVolley(dtMs, obs, events);
        return;
      case 'beam':
      case 'threadRain':
        this.stepStrike(dtMs, obs, events);
        return;
      default:
        return;
    }
  }

  /**
   * Sai do descanso para o preparo do próximo ataque do ciclo. O feixe e a chuva avisam aqui (`telegraph`), com o
   * lado do player desse frame: é o lado em que o feixe sai, mesmo que o player troque de lado no aviso (SNG-02).
   */
  private enterWindup(obs: BossAIObservation, events: BossAIEvent[]): void {
    const attack = this.t.cycles[this.currentPhase][this.cycleIndex];
    this.currentAttack = attack;
    this._state = 'windup';
    this.timer = this.windupDurationFor(attack);
    if (!isStrike(attack)) return;
    const dx = obs.playerX - obs.selfX;
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    this.strikeDir = this.facing;
    events.push({ type: 'telegraph', attack, dir: this.strikeDir, playerX: obs.playerX });
  }

  /** Fixa a direção para o player e entra no corpo do ataque escolhido (BAT-01, BAT-02, BAT-04). */
  private beginAttackBody(obs: BossAIObservation, events: BossAIEvent[]): void {
    if (isStrike(this.currentAttack)) {
      this.beginStrike(this.currentAttack, events);
      return;
    }
    const dx = obs.playerX - obs.selfX;
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;

    switch (this.currentAttack) {
      case 'charge':
      case 'doubleCharge':
        this._state = 'charge';
        this.chargeDir = this.facing;
        this.chargeTraveled = 0;
        this.chargeFromX = obs.selfX;
        events.push({ type: 'hitboxOn' });
        return;
      case 'leap':
      case 'tripleLeap':
        this._state = 'leap';
        this.leapFromX = obs.selfX;
        this.leapToX = obs.playerX;
        this.leapProgress = 0;
        this.timer = this.t.leap.durationMs;
        return;
      case 'volley':
        this._state = 'volley';
        this.volleyDir = this.facing;
        this.volleyFired = 0;
        this.timer = 0;
        return;
      default:
        // Ataque sem corpo neste BossAI: pula para o descanso, sem prender o preparo num laço.
        this.enterRestAfterAttack();
        return;
    }
  }

  /** Corpo do feixe ou da chuva (SNG-03, CYC-10): abre no lado preso no aviso, sem olhar o player de novo. */
  private beginStrike(attack: BossStrike, events: BossAIEvent[]): void {
    this.facing = this.strikeDir;
    this._state = attack;
    this.timer = this.t[attack].activeMs;
    events.push({ type: 'strikeOn', attack, dir: this.strikeDir });
  }

  /** Feixe ou fios abertos por `activeMs`; ao fechar, descansa como depois de qualquer ataque. */
  private stepStrike(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    this.currentVx = 0;
    this.timer -= dtMs;
    if (this.timer > 0 || !isStrike(this.currentAttack)) return;
    const overrun = -this.timer;
    events.push({ type: 'strikeOff', attack: this.currentAttack });
    this.enterRestAfterAttack();
    if (overrun > 0) this.step(overrun, obs, events);
  }

  /** Investida (BAT-01/09): anda até `maxDist` ou até `blocked`, com a hitbox aberta durante o movimento. */
  private stepCharge(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    const remainingDist = this.t.charge.maxDist - this.chargeTraveled;
    const wantDist = this.t.charge.speed * (dtMs / 1000);
    const stepDist = Math.min(wantDist, remainingDist);
    this.chargeTraveled += stepDist;
    this.currentVx = this.chargeDir * this.t.charge.speed;

    const reachedMax = this.chargeTraveled >= this.t.charge.maxDist;
    if (!reachedMax && !obs.blocked) return;
    events.push({ type: 'hitboxOff' });
    // BFX-02/03: só a parede atordoa; chegar ao alcance máximo cai no descanso normal.
    if (obs.blocked) events.push({ type: 'wallStun' });
    // IGN-01: o trecho vai da saída até onde o corpo está de fato (na parede, onde ela o parou).
    events.push({ type: 'chargeTrail', fromX: this.chargeFromX, toX: obs.selfX });
    this.currentVx = 0;
    const overrun = reachedMax ? dtMs - (stepDist / this.t.charge.speed) * 1000 : 0;
    // CYC-05/06: a 1ª perna da Investida Dupla encadeia a 2ª só quando acabou pelo alcance, sem parede.
    if (this.currentAttack === 'doubleCharge' && this.chargeLeg === 0 && !obs.blocked) this.enterRewindup(obs);
    else this.enterRestAfterAttack();
    if (overrun > 0) this.step(overrun, obs, events);
  }

  /**
   * Fim da 1ª investida da Investida Dupla pelo alcance (CYC-05): vira para o player e prepara a 2ª por
   * `doubleCharge.rewindupMs` fixos (sem `windupMult`), sem descanso. O `beginAttackBody` no fim do preparo fixa
   * a direção da 2ª pelo player daquele frame, como numa investida comum.
   */
  private enterRewindup(obs: BossAIObservation): void {
    const dx = obs.playerX - obs.selfX;
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    this.chargeLeg = 1;
    this._state = 'windup';
    this.timer = this.t.doubleCharge.rewindupMs;
  }

  /**
   * Salto (BAT-02/10): `progress` de 0 a 1 em `leap.durationMs`; ao chegar a 1, emite `landed` uma vez. No Salto
   * Triplo (CYC-07/08), os pousos antes do último encadeiam o próximo salto depois de `tripleLeap.gapMs`, sem
   * descanso; só o último pouso é `final` e leva à recuperação de pouso.
   */
  private stepLeap(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    this.currentVx = 0;
    this.timer -= dtMs;
    this.leapProgress = Math.min(1, Math.max(0, (this.t.leap.durationMs - this.timer) / this.t.leap.durationMs));
    if (this.timer > 0) return;
    this.leapProgress = 1;
    const overrun = -this.timer;
    const chained = this.currentAttack === 'tripleLeap' && this.leapHop < this.t.tripleLeap.hops - 1;
    events.push({ type: 'landed', final: !chained });
    if (chained) this.enterLeapGap();
    else this.enterRestAfterAttack(this.t.leap.recoveryMs);
    if (overrun > 0) this.step(overrun, obs, events);
  }

  /**
   * Pouso intermediário do Salto Triplo (CYC-07): parado por `tripleLeap.gapMs` fixos (sem `windupMult`). O
   * `beginAttackBody` no fim dessa espera mira o próximo salto no X do player daquele frame.
   */
  private enterLeapGap(): void {
    this.leapHop++;
    this._state = 'windup';
    this.timer = this.t.tripleLeap.gapMs;
  }

  /** Rajada (BAT-04, BTIER-05/07): `spec.volleyCount` disparos a `intervalMs` de intervalo, o primeiro imediato. */
  private stepVolley(dtMs: number, obs: BossAIObservation, events: BossAIEvent[]): void {
    this.currentVx = 0;
    this.timer -= dtMs;
    while (this.volleyFired < obs.spec.volleyCount && this.timer <= 0) {
      events.push({ type: 'fire', dir: this.volleyDir, speed: obs.spec.projectileSpeed });
      this.volleyFired++;
      if (this.volleyFired < obs.spec.volleyCount) this.timer += this.t.volley.intervalMs;
    }
    if (this.volleyFired >= obs.spec.volleyCount) {
      const overrun = -this.timer;
      this.enterRestAfterAttack();
      if (overrun > 0) this.step(overrun, obs, events);
    }
  }

  /**
   * Fim de um ataque (BAI-11): descansa pelo tempo da fase e avança o ciclo para o próximo ataque. `minRestMs`
   * é o piso do descanso (recuperação do pouso do salto, BFX-04).
   */
  private enterRestAfterAttack(minRestMs = 0): void {
    this._state = 'rest';
    this.timer = Math.max(this.t.phases[this.currentPhase - 1].restMs, minRestMs);
    this.currentAttack = null;
    this.chargeLeg = 0;
    this.leapHop = 0;
    this.cycleIndex = (this.cycleIndex + 1) % this.t.cycles[this.currentPhase].length;
  }

  /**
   * Preparo de abertura: o feixe e a chuva têm preparo fixo, sem `windupMult` (SNG-02, CYC-09); os demais seguem o
   * ataque de base com o multiplicador da fase (a Investida Dupla abre como a investida; CYC-11).
   */
  private windupDurationFor(attack: BossAttack): number {
    const fixed = FIXED_WINDUP[attack];
    if (fixed) return fixed(this.t);
    return this.t[animBase(attack)].windupMs * this.t.phases[this.currentPhase - 1].windupMult;
  }

  /**
   * Sem `canAct`: fecha a hitbox da investida se estava aberta, zera `vx` e cancela o ataque (BAI-05). Zera também
   * o encadeado: a troca de fase (rugido) no meio da Investida Dupla ou do Salto Triplo não deixa o resto pendente.
   * No feixe ou na chuva: no corpo fecha (`strikeOff`) e apaga o aviso; no preparo só apaga, sem abrir (edge case).
   */
  private interrupt(): BossAIOutput {
    const events: BossAIEvent[] = [];
    if (this._state === 'charge') events.push({ type: 'hitboxOff' });
    if (isStrike(this.currentAttack)) {
      if (this._state === this.currentAttack) events.push({ type: 'strikeOff', attack: this.currentAttack });
      events.push({ type: 'telegraphCancel' });
    }
    this._state = 'rest';
    this.timer = 0;
    this.currentAttack = null;
    this.chargeLeg = 0;
    this.leapHop = 0;
    this.currentVx = 0;
    return { vx: 0, leap: null, state: 'rest', attack: null, events };
  }
}

/** Preparos fixos, sem `windupMult` (SNG-02, CYC-09). */
const FIXED_WINDUP: Partial<Record<BossAttack, (t: BossAITuning) => number>> = {
  beam: (t) => t.beam.warnMs,
  threadRain: (t) => t.threadRain.windupMs,
};

function isStrike(attack: BossAttack | null): attack is BossStrike {
  return attack === 'beam' || attack === 'threadRain';
}
