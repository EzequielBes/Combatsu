import { afterEach, describe, expect, it } from 'vitest';
import { installDebugApi, registerDebugProbe, type GameSnapshot } from '../../src/game/debugApi';

const DT = 1000 / 60;

function fakeGame() {
  const calls = { sleep: 0, steps: [] as { time: number; delta: number }[] };
  const game = {
    loop: {
      now: 1234,
      sleep: () => {
        calls.sleep++;
      },
    },
    headlessStep: (time: number, delta: number) => {
      calls.steps.push({ time, delta });
    },
  };
  return { game, calls };
}

type Api = { snapshot(): GameSnapshot; step(ms: number): void };

afterEach(() => registerDebugProbe(null));

describe('installDebugApi', () => {
  it('sem debug não define __game (FND-10)', () => {
    const target: { __game?: Api } = {};
    installDebugApi(fakeGame().game, target, false);
    expect(target.__game).toBeUndefined();
  });

  it('snapshot devolve o que o probe registrado devolve (FND-09)', () => {
    const snap: GameSnapshot = {
      player: { x: 10, y: 20, hp: 100, dead: false },
      enemies: [{ id: 7, x: 30, y: 40, hp: 60, state: 'idle', maxHp: 60, damage: 12 }],
      events: ['enemyDied:3'],
      deaths: [{ id: 3, x: 50, y: 60 }],
      run: { state: 'roundActive', round: 1, kills: 0, alive: 1, queued: 2 },
    };
    registerDebugProbe({ debugSnapshot: () => snap });
    const target: { __game?: Api } = {};
    installDebugApi(fakeGame().game, target, true);
    expect(target.__game!.snapshot()).toEqual(snap);
  });

  it('step dorme o loop uma vez e avança em passos fixos de 1000/60 ms com tempo crescente (FND-22)', () => {
    const { game, calls } = fakeGame();
    const target: { __game?: Api } = {};
    installDebugApi(game, target, true);

    target.__game!.step(100);
    expect(calls.sleep).toBe(1);
    expect(calls.steps).toHaveLength(6);
    for (const s of calls.steps) expect(s.delta).toBe(DT);
    for (let i = 1; i < calls.steps.length; i++) expect(calls.steps[i].time).toBeGreaterThan(calls.steps[i - 1].time);

    target.__game!.step(50);
    expect(calls.sleep).toBe(1);
    expect(calls.steps).toHaveLength(9);
    for (let i = 1; i < calls.steps.length; i++) expect(calls.steps[i].time).toBeGreaterThan(calls.steps[i - 1].time);
  });

  it('step arredonda para cima os ms que não fecham um passo: ceil(ms / (1000/60)) (FND-22)', () => {
    const { game, calls } = fakeGame();
    const target: { __game?: Api } = {};
    installDebugApi(game, target, true);

    target.__game!.step(20);
    expect(calls.steps).toHaveLength(2);
    target.__game!.step(1);
    expect(calls.steps).toHaveLength(3);
  });
});
