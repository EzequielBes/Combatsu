import type { EnemyState } from '../core/enemyBrain';

/** Estado lido pelo smoke headless em `?debug` (FND-09). */
export interface GameSnapshot {
  player: { x: number; y: number; hp: number; dead: boolean };
  enemies: { id: number; x: number; y: number; hp: number; state: EnemyState }[];
  events: string[];
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
