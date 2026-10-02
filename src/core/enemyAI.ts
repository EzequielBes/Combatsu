export type EnemyAIState = 'chase' | 'hold' | 'approach' | 'windup' | 'attack' | 'rest';
export type AIEvent = 'windupStart' | 'hitboxOn' | 'hitboxOff' | 'wantAttack';

export interface EnemyAITuning {
  /** px/s */
  chaseSpeed: number;
  /** Prepara o golpe quando o player está a no máximo isso na horizontal (px). */
  attackRange: number;
  windupMs: number;
  attackMs: number;
  restMs: number;
  /** Sem permissão de ataque, a no máximo isso do player o inimigo espera em `hold` (px, LIM-03). */
  holdRange: number;
  /** Distância de espera do 1º da fila (`holdRank` 0), em px (LIM-07). */
  holdBase: number;
  /** Distância a mais para cada posição na fila de espera, em px (LIM-05, LIM-07). */
  holdStep: number;
  /** Folga em volta da distância de espera, em px (LIM-07). */
  holdTolerance: number;
  /** Acima disso o inimigo corre a `farSpeedMult` × `chaseSpeed` (px, SPN-12). */
  farRange: number;
  farSpeedMult: number;
}

export interface AIInput {
  selfX: number;
  playerX: number;
  /** false quando o cérebro não está idle ou o inimigo morreu. */
  canAct: boolean;
  /** Tem a vaga de ataque do limitador (LIM-01). */
  granted: boolean;
  /** O limitador permite iniciar um `windup` agora (LIM-02). */
  windupAllowed: boolean;
  /** Posição na fila de espera entre os do mesmo lado do player, começando em 0 (LIM-07). */
  holdRank: number;
}

export interface AIOutput {
  /** px/s, só horizontal. */
  vx: number;
  facing: 1 | -1;
  events: AIEvent[];
}

/**
 * Ciclo do inimigo comum (SPN-10..12, LIM-03, LIM-05, LIM-07, LIM-08): persegue sempre (sem patrulha); sem
 * permissão de ataque espera em `hold` perto do player; com permissão avança (`approach`), prepara, golpeia e
 * descansa. Todas as distâncias são só no eixo horizontal. Sem `canAct` ele fica parado, e um preparo ou golpe em
 * andamento é cancelado (a hitbox fecha se estava aberta e nunca abre depois).
 */
export class EnemyAI {
  private _state: EnemyAIState = 'chase';
  private timer = 0;
  private facing: 1 | -1 = 1;

  constructor(private readonly t: EnemyAITuning) {}

  get state(): EnemyAIState {
    return this._state;
  }

  /** Velocidade de perseguição do tuning com que a IA foi criada (px/s), já escalada pela rodada (DIF-04/06). */
  get chaseSpeed(): number {
    return this.t.chaseSpeed;
  }

  /** Distância de espera em `hold` para a posição `rank` da fila (LIM-07), sem a folga. */
  holdDistance(rank: number): number {
    return this.t.holdBase + this.t.holdStep * rank;
  }

  update(dtMs: number, s: AIInput): AIOutput {
    if (!s.canAct) {
      const events = this.interrupt();
      if (this._state === 'rest') this.timer -= dtMs;
      return this.out(0, events);
    }
    const dx = s.playerX - s.selfX;
    const dist = Math.abs(dx);
    const towardPlayer = (): void => {
      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    };

    switch (this._state) {
      case 'windup':
        towardPlayer();
        this.timer -= dtMs;
        if (this.timer > 0) return this.out(0);
        this.next('attack', this.t.attackMs);
        return this.out(0, ['hitboxOn']);
      case 'attack':
        this.timer -= dtMs;
        if (this.timer > 0) return this.out(0);
        this.next('rest', this.t.restMs);
        return this.out(0, ['hitboxOff']);
      case 'rest':
        this.timer -= dtMs;
        if (this.timer > 0) return this.out(0);
        this.enter('chase', 0);
        return this.out(0);
      default:
        break;
    }

    towardPlayer();
    if (s.granted) {
      if (dist <= this.t.attackRange) {
        if (!s.windupAllowed) {
          this._state = 'approach';
          return this.out(0);
        }
        this.enter('windup', this.t.windupMs);
        return this.out(0, ['windupStart']);
      }
      this._state = 'approach';
      return this.out(this.facing * this.t.chaseSpeed);
    }

    const target = this.holdDistance(s.holdRank);
    // Quem já espera fica em `hold` até a própria distância de espera (+ folga), que pode passar de `holdRange`.
    const holdLimit = this._state === 'hold' ? Math.max(this.t.holdRange, target + this.t.holdTolerance) : this.t.holdRange;
    if (dist <= holdLimit) {
      this._state = 'hold';
      if (dist < target - this.t.holdTolerance) return this.out(-this.facing * this.t.chaseSpeed, ['wantAttack']);
      if (dist > target + this.t.holdTolerance) return this.out(this.facing * this.t.chaseSpeed, ['wantAttack']);
      return this.out(0, ['wantAttack']);
    }

    this._state = 'chase';
    const speed = dist > this.t.farRange ? this.t.chaseSpeed * this.t.farSpeedMult : this.t.chaseSpeed;
    return this.out(this.facing * speed);
  }

  /** Levou golpe: cancela aproximação, preparo ou golpe e volta a perseguir. Devolve `hitboxOff` se a hitbox estava aberta. */
  interrupt(): AIEvent[] {
    if (this._state === 'windup' || this._state === 'approach') {
      this.enter('chase', 0);
      return [];
    }
    if (this._state === 'attack') {
      this.enter('chase', 0);
      return ['hitboxOff'];
    }
    return [];
  }

  private enter(state: EnemyAIState, ms: number): void {
    this._state = state;
    this.timer = ms;
  }

  /** Passa para a fase seguinte levando a sobra do frame, para o ciclo durar exatamente o tuning. */
  private next(state: EnemyAIState, ms: number): void {
    this._state = state;
    this.timer += ms;
  }

  private out(vx: number, events: AIEvent[] = []): AIOutput {
    return { vx, facing: this.facing, events };
  }
}
