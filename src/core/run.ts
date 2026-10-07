import { Rng } from './rng';
import { WaveSpawner, type SpawnKind, type WaveTuning } from './waves';
import { SHOP } from '../data/tuning';

/** Tuning da máquina de estados da run (RUN-10, RUN-11, RHUD-02); lógica em T6. */
export interface RunTuning {
  intermissionMs: number;
  gameOverLockMs: number;
  spawnGraceMs: number;
  bannerMs: number;
}

export type RunState = 'title' | 'roundActive' | 'intermission' | 'traverse' | 'shop' | 'gameOver';

export interface RunSummary {
  round: number;
  kills: number;
}

export type RunCommand =
  | { type: 'startRun' }
  | { type: 'roundStart'; round: number }
  | { type: 'spawn'; round: number; kind: SpawnKind }
  | { type: 'roundCleared'; round: number }
  | { type: 'shopOpen'; round: number }
  | { type: 'gameOver'; round: number; kills: number };

/** Opções do construtor de `Run`; `firstRound` só serve para o debug começar direto numa rodada (ex.: de chefe). */
export interface RunOptions {
  firstRound?: number;
  /** `?debug&maxAlive=N`: fixa o teto de vivos no lugar de `maxAliveFor` (SPN-02). */
  maxAliveOverride?: number;
  /**
   * Fluxo da rodada fechada: `'sala'` (padrão) passa por `intermission` e abre a loja sozinha; `'modular'` (TRV-02)
   * vai para `traverse`, onde o jogador anda até a saída e a cena chama `exitReached()`.
   */
  flow?: 'sala' | 'modular';
  /** `?debug&noshop=1` (KON-04): `exitReached` leva direto à próxima rodada, sem `shop`. */
  skipShop?: boolean;
}

/** `true` em `roundActive`, `intermission` e `traverse` (RUN-08, SHOP-04, TRV-04): em `shop` o player recebe input neutro. */
export function acceptsPlayerInput(state: RunState): boolean {
  return state === 'roundActive' || state === 'intermission' || state === 'traverse';
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
  private lootRngValue: Rng | null = null;
  private shopRngValue: Rng | null = null;
  private guardRngValue: Rng | null = null;
  private variantRngValue: Rng | null = null;
  private spawnRngValue: Rng | null = null;
  private elixirRngValue: Rng | null = null;
  private stageRngValue: Rng | null = null;
  private slotRngValue: Rng | null = null;
  private intermissionTimer = 0;
  private gameOverTimer = 0;

  private pendingStart = false;
  private pendingPlayerDied = false;
  private pendingEnemyDeaths: number[] = [];
  private pendingCloseShop = false;
  private pendingExit = false;

  private readonly firstRound: number;
  private readonly maxAliveOverride: number | undefined;
  private readonly flow: 'sala' | 'modular';
  private readonly skipShop: boolean;

  constructor(
    private readonly t: RunTuning,
    private readonly waveT: WaveTuning,
    options: RunOptions = {},
  ) {
    this.firstRound = options.firstRound ?? 1;
    this.maxAliveOverride = options.maxAliveOverride;
    this.flow = options.flow ?? 'sala';
    this.skipShop = options.skipShop ?? false;
  }

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

  /** Teto de vivos da rodada atual (SPN-02, ou o override de debug); 0 antes do primeiro start. */
  get maxAlive(): number {
    return this.spawner?.maxAlive ?? 0;
  }

  /** Stream de sorteio dos drops (ECO-17): próprio, criado com `seed ^ 0x9e3779b9`; `null` antes do primeiro start. */
  get lootRng(): Rng | null {
    return this.lootRngValue;
  }

  /** Stream de sorteio do Elixir (ELX-03): próprio, `seed ^ 0x510e527f`, para não mexer nos drops que já existem. */
  get elixirRng(): Rng | null {
    return this.elixirRngValue;
  }

  /** Stream de sorteio da loja (SHOP-09): próprio, criado com `seed ^ SHOP.rngSalt`; `null` antes do 1º start. */
  get shopRng(): Rng | null {
    return this.shopRngValue;
  }

  /** Stream de sorteio da guarda dos inimigos (EBL-01): próprio, `seed ^ 0x2545f491`, para não mexer nos drops nem na loja. */
  get guardRng(): Rng | null {
    return this.guardRngValue;
  }

  /** Stream de sorteio da aparência dos inimigos (EVR-04): próprio, `seed ^ 0x6a09e667`, para não mexer nos outros streams. */
  get variantRng(): Rng | null {
    return this.variantRngValue;
  }

  /** Stream do ponto de spawn (SPN-08): próprio, `seed ^ 0x3c6ef372`, para não mexer nos outros streams. */
  get spawnRng(): Rng | null {
    return this.spawnRngValue;
  }

  /** Stream do sorteio dos módulos de cada área (ARE-07): próprio, `seed ^ 0x1f83d9ab`; `null` antes do 1º start. */
  get stageRng(): Rng | null {
    return this.stageRngValue;
  }

  /** Stream dos slots `p` dos módulos (SLT-01): próprio, `seed ^ 0x5be0cd19`, nunca usado nos módulos (SLT-02). */
  get slotRng(): Rng | null {
    return this.slotRngValue;
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

  /** Pedido para fechar a loja (SHOP-03): resolvido no `update` seguinte; fora de `shop` não faz nada. */
  closeShop(): void {
    this.pendingCloseShop = true;
  }

  /**
   * Pedido de saída da área (TRV-05, TRV-06): só vale em `traverse` (nos outros estados é ignorado na hora) e é
   * resolvido no próximo `update`; dois pedidos no mesmo update viram uma transição só.
   */
  exitReached(): void {
    if (this._state === 'traverse') this.pendingExit = true;
  }

  update(dtMs: number, seedForNewRun: () => number): RunCommand[] {
    const commands: RunCommand[] = [];
    const startState = this._state;
    this.resolveDeath(commands);
    this.resolveKills(commands);
    this.advanceTimers(dtMs, startState, commands);
    this.resolveExit(commands);
    this.resolveCloseShop(commands);
    this.resolveStart(seedForNewRun, commands);
    return commands;
  }

  /** 1. Morte do player: prioridade máxima (RUN-04, edge case player + último inimigo no mesmo frame; TRV-09). */
  private resolveDeath(commands: RunCommand[]): void {
    const alive = this._state === 'roundActive' || this._state === 'intermission' || this._state === 'traverse';
    if (this.pendingPlayerDied && alive) {
      this._summary = { round: this._round, kills: this._kills };
      this._state = 'gameOver';
      this.gameOverTimer = 0;
      commands.push({ type: 'gameOver', round: this._round, kills: this._kills });
    }
    this.pendingPlayerDied = false;
  }

  /** 2. Abates: só valem enquanto a rodada está ativa (RUN-07); a rodada fechada vai para `traverse` no modular. */
  private resolveKills(commands: RunCommand[]): void {
    if (this._state === 'roundActive' && this.spawner) {
      for (const id of this.pendingEnemyDeaths) {
        if (this.spawner.enemyDied(id)) this._kills++;
      }
      if (this.spawner.cleared) {
        this._state = this.flow === 'modular' ? 'traverse' : 'intermission';
        this.intermissionTimer = 0;
        commands.push({ type: 'roundCleared', round: this._round });
      }
    }
    this.pendingEnemyDeaths = [];
  }

  /** 3. Tempos: só avançam se nenhuma transição de evento aconteceu neste update; `traverse` não tem timer. */
  private advanceTimers(dtMs: number, startState: RunState, commands: RunCommand[]): void {
    if (this._state !== startState) return;
    if (this._state === 'roundActive' && this.spawner) {
      for (const order of this.spawner.update(dtMs)) {
        commands.push({ type: 'spawn', round: this._round, kind: order.kind });
      }
    } else if (this._state === 'intermission') {
      this.intermissionTimer += dtMs;
      if (this.intermissionTimer >= this.t.intermissionMs) {
        this._state = 'shop';
        commands.push({ type: 'shopOpen', round: this._round });
      }
    } else if (this._state === 'gameOver') {
      this.gameOverTimer += dtMs;
    }
    // `shop`: nenhum spawn, nenhum timer da run avança aqui (SHOP-02); fechar é um pedido explícito.
  }

  /** Saída da área (TRV-05, TRV-06, KON-01, KON-04): em `traverse` abre a loja ou, com `skipShop`, a próxima rodada. */
  private resolveExit(commands: RunCommand[]): void {
    if (this.pendingExit && this._state === 'traverse') {
      if (this.skipShop) {
        this.startNextRound(commands);
      } else {
        this._state = 'shop';
        commands.push({ type: 'shopOpen', round: this._round });
      }
    }
    this.pendingExit = false;
  }

  /** 4. Fechar a loja (SHOP-03): pedido de `closeShop()`, resolvido no update seguinte; fora de `shop` é descartado. */
  private resolveCloseShop(commands: RunCommand[]): void {
    if (this.pendingCloseShop && this._state === 'shop') this.startNextRound(commands);
    this.pendingCloseShop = false;
  }

  private startNextRound(commands: RunCommand[]): void {
    this._round++;
    this.spawner = new WaveSpawner(this._round, this.waveT, this.maxAliveOverride);
    this._state = 'roundActive';
    commands.push({ type: 'roundStart', round: this._round });
  }

  /** 5. Start: só em `title` sempre, ou em `gameOver` depois da trava (RUN-05, RUN-11). */
  private resolveStart(seedForNewRun: () => number, commands: RunCommand[]): void {
    if (this.pendingStart) {
      const canStart =
        this._state === 'title' || (this._state === 'gameOver' && this.gameOverTimer >= this.t.gameOverLockMs);
      if (canStart) {
        const seed = seedForNewRun();
        this.lootRngValue = new Rng(seed ^ 0x9e3779b9);
        this.shopRngValue = new Rng(seed ^ SHOP.rngSalt);
        this.guardRngValue = new Rng(seed ^ 0x2545f491);
        this.variantRngValue = new Rng(seed ^ 0x6a09e667);
        this.spawnRngValue = new Rng(seed ^ 0x3c6ef372);
        this.elixirRngValue = new Rng(seed ^ 0x510e527f);
        this.stageRngValue = new Rng(seed ^ 0x1f83d9ab);
        this.slotRngValue = new Rng(seed ^ 0x5be0cd19);
        this._round = this.firstRound;
        this._kills = 0;
        this._summary = null;
        this.spawner = new WaveSpawner(this._round, this.waveT, this.maxAliveOverride);
        this._state = 'roundActive';
        commands.push({ type: 'startRun' }, { type: 'roundStart', round: this._round });
      }
    }
    this.pendingStart = false;
  }
}
