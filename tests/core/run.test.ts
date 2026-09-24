import { describe, expect, it } from 'vitest';
import { Run, acceptsPlayerInput, type RunState } from '../../src/core/run';
import { RUN, WAVE } from '../../src/data/tuning';

/** seed 7: rng.int(0, 1) = 0, então s = 0 para P = 2 (checado em waves.test.ts). */
const SEED = () => 7;
const POINTS = 2;

const newRun = (): Run => new Run(RUN, WAVE, POINTS);

/** Começa a run e chega em `roundActive`, round 1, kills 0. */
const started = (): Run => {
  const run = newRun();
  run.startPressed();
  run.update(0, SEED);
  return run;
};

/** A partir de `roundActive` round 1, mata as 3 (base) inimigas da rodada e chega em `intermission`. */
const cleared = (): { run: Run; roundCommands: ReturnType<Run['update']> } => {
  const run = started();
  run.enemyDied(1);
  run.enemyDied(2);
  run.enemyDied(3);
  const roundCommands = run.update(0, SEED);
  return { run, roundCommands };
};

describe('Run: estado inicial (RUN-01)', () => {
  it('boot em title, sem comandos de spawn', () => {
    const run = newRun();
    expect(run.state).toBe('title');
    expect(run.update(500, SEED)).toEqual([]);
  });
});

describe('Run: start em title (RUN-02)', () => {
  it('vai para roundActive, round 1, kills 0, com startRun e roundStart(1)', () => {
    const run = newRun();
    run.startPressed();
    const commands = run.update(0, SEED);
    expect(commands).toEqual([{ type: 'startRun' }, { type: 'roundStart', round: 1 }]);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(0);
  });

  it('não emite comando de spawn no mesmo update que inicia a run', () => {
    const run = newRun();
    run.startPressed();
    const commands = run.update(0, SEED);
    expect(commands.some((c) => c.type === 'spawn')).toBe(false);
  });
});

describe('Run: morte do player em roundActive (RUN-04)', () => {
  it('vai para gameOver com o resumo da rodada e dos abates atuais', () => {
    const run = started();
    run.playerDied();
    const commands = run.update(0, SEED);
    expect(commands).toContainEqual({ type: 'gameOver', round: 1, kills: 0 });
    expect(run.state).toBe('gameOver');
    expect(run.summary).toEqual({ round: 1, kills: 0 });
  });
});

describe('Run: start em gameOver com trava de 1000 ms (RUN-05, RUN-11)', () => {
  it('999 ms depois de entrar em gameOver: continua gameOver com o mesmo summary', () => {
    const run = started();
    run.playerDied();
    run.update(0, SEED); // entra em gameOver
    run.startPressed();
    const commands = run.update(999, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('gameOver');
    expect(run.summary).toEqual({ round: 1, kills: 0 });
  });

  it('depois de 1000 ms: start começa uma nova run com round 1, kills 0', () => {
    const run = started();
    run.playerDied();
    run.update(0, SEED); // entra em gameOver
    run.startPressed();
    run.update(999, SEED); // ainda travado
    run.startPressed();
    const commands = run.update(1, SEED); // total 1000 ms
    expect(commands).toEqual([{ type: 'startRun' }, { type: 'roundStart', round: 1 }]);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(0);
  });
});

describe('Run: rodada limpa e intermission (RUN-06, RUN-10)', () => {
  it('último abate: um único roundCleared, vai para intermission', () => {
    const { run, roundCommands } = cleared();
    expect(roundCommands.filter((c) => c.type === 'roundCleared')).toEqual([{ type: 'roundCleared', round: 1 }]);
    expect(run.state).toBe('intermission');
  });

  it('2499 ms depois de entrar em intermission: continua em intermission', () => {
    const { run } = cleared();
    const commands = run.update(2499, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('intermission');
  });

  it('2500 ms depois: vai para roundActive com round + 1 e roundStart', () => {
    const { run } = cleared();
    run.update(2499, SEED);
    const commands = run.update(1, SEED);
    expect(commands).toEqual([{ type: 'roundStart', round: 2 }]);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(2);
  });
});

describe('Run: eventos fora de hora são ignorados (RUN-07)', () => {
  it('abate em title não muda nada', () => {
    const run = newRun();
    run.enemyDied(1);
    const commands = run.update(500, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('title');
    expect(run.round).toBe(0);
    expect(run.kills).toBe(0);
  });

  it('abate em intermission não muda kills nem round', () => {
    const { run } = cleared();
    run.enemyDied(999);
    const commands = run.update(0, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('intermission');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(3);
  });

  it('abate em gameOver não muda kills nem round', () => {
    const run = started();
    run.playerDied();
    run.update(0, SEED);
    run.enemyDied(1);
    const commands = run.update(500, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('gameOver');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(0);
  });

  it('start em roundActive não muda state, round nem kills', () => {
    const run = started();
    run.startPressed();
    const commands = run.update(0, SEED);
    expect(commands.some((c) => c.type === 'startRun' || c.type === 'roundStart')).toBe(false);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(0);
  });

  it('start em intermission não muda state, round nem kills', () => {
    const { run } = cleared();
    run.startPressed();
    const commands = run.update(0, SEED);
    expect(commands.some((c) => c.type === 'startRun' || c.type === 'roundStart')).toBe(false);
    expect(run.state).toBe('intermission');
    expect(run.round).toBe(1);
    expect(run.kills).toBe(3);
  });
});

describe('acceptsPlayerInput (RUN-08)', () => {
  it.each<[RunState, boolean]>([
    ['title', false],
    ['roundActive', true],
    ['intermission', true],
    ['gameOver', false],
  ])('%s => %s', (state, expected) => {
    expect(acceptsPlayerInput(state)).toBe(expected);
  });
});

describe('Run: edge cases de prioridade', () => {
  it('player e último inimigo morrem antes do mesmo update: gameOver, não intermission', () => {
    const run = started();
    run.enemyDied(1);
    run.enemyDied(2);
    run.update(0, SEED); // 2 abates contados, kills = 2, rodada ainda não limpa (falta 1)
    run.enemyDied(3); // terceiro e último abate da rodada
    run.playerDied();
    const commands = run.update(0, SEED);
    expect(run.state).toBe('gameOver');
    expect(commands.some((c) => c.type === 'roundCleared')).toBe(false);
    expect(commands).toContainEqual({ type: 'gameOver', round: 1, kills: 2 });
    expect(run.summary).toEqual({ round: 1, kills: 2 });
  });

  it('morte do player em intermission: gameOver com a rodada recém-limpa', () => {
    const { run } = cleared();
    run.playerDied();
    const commands = run.update(0, SEED);
    expect(run.state).toBe('gameOver');
    expect(commands).toContainEqual({ type: 'gameOver', round: 1, kills: 3 });
    expect(run.summary).toEqual({ round: 1, kills: 3 });
  });
});
