export type EnemyAIState = 'patrol' | 'chase' | 'windup' | 'attack' | 'rest';
export type AIEvent = 'windupStart' | 'hitboxOn' | 'hitboxOff';

export interface EnemyAITuning {
  /** Meia largura da faixa de patrulha em volta do spawn (px). */
  patrolRange: number;
  /** px/s */
  patrolSpeed: number;
  /** Persegue quando o player está a menos disso na horizontal (px). */
  chaseRange: number;
  /** px/s */
  chaseSpeed: number;
  /** Prepara o golpe quando o player está a menos disso na horizontal (px). */
  attackRange: number;
  windupMs: number;
  attackMs: number;
  restMs: number;
}

export interface AIInput {
  selfX: number;
  playerX: number;
  /** false quando o cérebro não está idle ou o inimigo morreu. */
  canAct: boolean;
}

export interface AIOutput {
  /** px/s, só horizontal. */
  vx: number;
  facing: 1 | -1;
  events: AIEvent[];
}

/**
 * Ciclo simples do inimigo (AI-01..04): patrulha → persegue → prepara → golpeia → descansa → volta a patrulhar
 * ou perseguir. Todas as distâncias são só no eixo horizontal. Sem `canAct` ele fica parado, e um preparo ou golpe
 * em andamento é cancelado (a hitbox fecha se estava aberta e nunca abre depois).
 */
export class EnemyAI {
  private _state: EnemyAIState = 'patrol';
  private timer = 0;
  private facing: 1 | -1 = 1;
  /** Sentido atual da patrulha. */
  private patrolDir: 1 | -1 = 1;

  constructor(
    private readonly t: EnemyAITuning,
    private readonly spawnX: number,
  ) {}

  get state(): EnemyAIState {
    return this._state;
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
        this.enter(dist < this.t.chaseRange ? 'chase' : 'patrol', 0);
        return this.out(0);
      default:
        break;
    }

    if (dist < this.t.attackRange) {
      towardPlayer();
      this.enter('windup', this.t.windupMs);
      return this.out(0, ['windupStart']);
    }
    if (dist < this.t.chaseRange) {
      this._state = 'chase';
      towardPlayer();
      return this.out(this.facing * this.t.chaseSpeed);
    }
    this._state = 'patrol';
    if (s.selfX >= this.spawnX + this.t.patrolRange) this.patrolDir = -1;
    else if (s.selfX <= this.spawnX - this.t.patrolRange) this.patrolDir = 1;
    this.facing = this.patrolDir;
    return this.out(this.patrolDir * this.t.patrolSpeed);
  }

  /** Levou golpe: cancela preparo ou golpe. Devolve `hitboxOff` se a hitbox estava aberta. */
  interrupt(): AIEvent[] {
    if (this._state === 'windup') {
      this.enter('patrol', 0);
      return [];
    }
    if (this._state === 'attack') {
      this.enter('patrol', 0);
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
