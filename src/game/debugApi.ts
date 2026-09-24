import type { EnemyState } from '../core/enemyBrain';
import type { RunState } from '../core/run';

/** Estado lido pelo smoke headless em `?debug` (FND-09). */
export interface GameSnapshot {
  player: { x: number; y: number; hp: number; dead: boolean };
  enemies: {
    id: number;
    x: number;
    y: number;
    hp: number;
    state: EnemyState;
    maxHp: number;
    damage: number;
    /** Velocidades da IA em uso, já escaladas pela rodada (DIF-04/06). */
    patrolSpeed: number;
    chaseSpeed: number;
  }[];
  events: string[];
  /** Um por abate, com a posição que chegou em `onEnemyDied` (FND-08). */
  deaths: { id: number; x: number; y: number }[];
  /** Estado da máquina de run (RUN-09). */
  run: { state: RunState; round: number; kills: number; alive: number; queued: number };
  /** Spawn do player no level, já com o mesmo ajuste que a cena aplica (RUN-02/05). */
  level: { playerSpawn: { x: number; y: number } };
  /** Estado do HUD da run (RHUD-01..07). */
  hud: {
    ignoredByMain: boolean;
    round: string;
    remaining: string;
    banner: string | null;
    center: string[] | null;
    bannerPos: { x: number; y: number };
  };
}

export interface DebugProbe {
  debugSnapshot(): GameSnapshot;
}

/** O pedaço do Phaser.Game que o step usa; tipado aqui para testar com um game falso. */
export interface SteppableGame {
  loop: { sleep(): void; now: number };
  headlessStep(time: number, delta: number): void;
}

const STEP_MS = 1000 / 60;
let probe: DebugProbe | null = null;

/** A cena se registra no create e passa `null` no SHUTDOWN. */
export function registerDebugProbe(p: DebugProbe | null): void {
  probe = p;
}

/**
 * Só com `debugOn` define `target.__game` (FND-10). O primeiro `step` dorme o loop de tempo real: dali em
 * diante o jogo só anda por `step`, em passos fixos de 1000/60 ms (FND-22).
 */
export function installDebugApi(game: SteppableGame, target: object, debugOn: boolean): void {
  if (!debugOn) return;
  let manual = false;
  let time = 0;
  const api = {
    snapshot(): GameSnapshot {
      if (!probe) throw new Error('nenhuma cena registrada no debug');
      return probe.debugSnapshot();
    },
    step(ms: number): void {
      if (!manual) {
        game.loop.sleep();
        manual = true;
        time = game.loop.now;
      }
      const n = Math.ceil(ms / STEP_MS);
      for (let i = 0; i < n; i++) {
        time += STEP_MS;
        game.headlessStep(time, STEP_MS);
      }
    },
  };
  (target as { __game?: typeof api }).__game = api;
}
