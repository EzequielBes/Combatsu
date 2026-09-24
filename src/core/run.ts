import { Rng } from './rng';
import { WaveSpawner, type WaveTuning } from './waves';

/** Tuning da máquina de estados da run (RUN-10, RUN-11, RHUD-02); lógica em T6. */
export interface RunTuning {
  intermissionMs: number;
  gameOverLockMs: number;
  spawnGraceMs: number;
  bannerMs: number;
}

export type RunState = 'title' | 'roundActive' | 'intermission' | 'gameOver';

export interface RunSummary {
  round: number;
  kills: number;
}

export type RunCommand =
  | { type: 'startRun' }
  | { type: 'roundStart'; round: number }
  | { type: 'spawn'; point: number; round: number }
  | { type: 'roundCleared'; round: number }
  | { type: 'gameOver'; round: number; kills: number };

/** `true` só em `roundActive` e `intermission` (RUN-08): fora disso o player ignora o input de jogo. */
export function acceptsPlayerInput(state: RunState): boolean {
  return state === 'roundActive' || state === 'intermission';
}

/**
 * Máquina de estados da run (RUN-01..11): título → rodadas com permadeath → resumo → nova run. `playerDied`,
 * `enemyDied` e `startPressed` só registram o evento; `update(dtMs)` resolve tudo numa ordem fixa (morte do
 * player, depois abates, depois tempos), para o edge case "player e último inimigo morrem no mesmo frame" não
 * depender da ordem dos callbacks de fora.
 */
export class Run {
  private _state: RunState = 'title';
  private _round = 0;
  private _kills = 0;
  private _summary: RunSummary | null = null;
  private spawner: WaveSpawner | null = null;
  private rng: Rng | null = null;
  private intermissionTimer = 0;
  private gameOverTimer = 0;

  private pendingStart = false;
  private pendingPlayerDied = false;
  private pendingEnemyDeaths: number[] = [];

  constructor(
    private readonly t: RunTuning,
    private readonly waveT: WaveTuning,
    private readonly pointCount: number,
  ) {}

  get state(): RunState {
    return this._state;
  }

  get round(): number {
    return this._round;
  }

  get kills(): number {
    return this._kills;
  }

  get summary(): RunSummary | null {
    return this._summary;
  }

  get alive(): number {
    return this.spawner?.alive ?? 0;
  }

  get queued(): number {
    return this.spawner?.queued ?? 0;
  }

  get remaining(): number {
    return this.spawner?.remaining ?? 0;
  }

  startPressed(): void {
    this.pendingStart = true;
  }

  playerDied(): void {
    this.pendingPlayerDied = true;
  }

  enemyDied(enemyId: number): void {
    this.pendingEnemyDeaths.push(enemyId);
  }

  update(dtMs: number, seedForNewRun: () => number): RunCommand[] {
    const commands: RunCommand[] = [];
    const startState = this._state;

    // 1. Morte do player: prioridade máxima (RUN-04, edge case player + último inimigo no mesmo frame).
    if (this.pendingPlayerDied && (this._state === 'roundActive' || this._state === 'intermission')) {
      this._summary = { round: this._round, kills: this._kills };
      this._state = 'gameOver';
      this.gameOverTimer = 0;
      commands.push({ type: 'gameOver', round: this._round, kills: this._kills });
    }
    this.pendingPlayerDied = false;

    // 2. Abates: só valem enquanto a rodada está ativa (RUN-07).
    if (this._state === 'roundActive' && this.spawner) {
      for (const id of this.pendingEnemyDeaths) {
        if (this.spawner.enemyDied(id)) this._kills++;
      }
      if (this.spawner.cleared) {
        this._state = 'intermission';
        this.intermissionTimer = 0;
        commands.push({ type: 'roundCleared', round: this._round });
      }
    }
    this.pendingEnemyDeaths = [];

    // 3. Tempos: só avançam se nenhuma transição de evento aconteceu neste update.
    if (this._state === startState) {
      if (this._state === 'roundActive' && this.spawner) {
        for (const order of this.spawner.update(dtMs)) {
          commands.push({ type: 'spawn', point: order.point, round: this._round });
        }
      } else if (this._state === 'intermission') {
        this.intermissionTimer += dtMs;
        if (this.intermissionTimer >= this.t.intermissionMs) {
          this._round++;
          this.spawner = new WaveSpawner(this._round, this.pointCount, this.rng as Rng, this.waveT);
          this._state = 'roundActive';
          commands.push({ type: 'roundStart', round: this._round });
        }
      } else if (this._state === 'gameOver') {
        this.gameOverTimer += dtMs;
      }
    }

    // 4. Start: só em `title` sempre, ou em `gameOver` depois da trava (RUN-05, RUN-11).
    if (this.pendingStart) {
      const canStart = this._state === 'title' || (this._state === 'gameOver' && this.gameOverTimer >= this.t.gameOverLockMs);
      if (canStart) {
        this.rng = new Rng(seedForNewRun());
        this._round = 1;
        this._kills = 0;
        this._summary = null;
        this.spawner = new WaveSpawner(this._round, this.pointCount, this.rng, this.waveT);
        this._state = 'roundActive';
        commands.push({ type: 'startRun' }, { type: 'roundStart', round: this._round });
      }
    }
    this.pendingStart = false;

    return commands;
  }
}
