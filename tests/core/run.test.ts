import { describe, expect, it } from 'vitest';
import { Run, acceptsPlayerInput, type RunCommand, type RunState } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

function isSpawn(c: RunCommand): c is Extract<RunCommand, { type: 'spawn' }> {
  return c.type === 'spawn';
}

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

describe('Run: rodada limpa, loja e próxima rodada (RUN-06, RUN-10, SHOP-01, SHOP-32, SHOP-02, SHOP-03)', () => {
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

  it('2500 ms depois: vai para shop com shopOpen da rodada limpa (SHOP-01, SHOP-32)', () => {
    const { run } = cleared();
    run.update(2499, SEED);
    const commands = run.update(1, SEED);
    expect(commands).toEqual([{ type: 'shopOpen', round: 1 }]);
    expect(run.state).toBe('shop');
    expect(run.round).toBe(1);
  });

  it('em shop, 10 s de update não emitem spawn nem mudam a rodada (SHOP-02)', () => {
    const { run } = cleared();
    run.update(2499, SEED);
    run.update(1, SEED); // entra em shop
    const commands = run.update(10000, SEED);
    expect(commands).toEqual([]);
    expect(run.state).toBe('shop');
    expect(run.round).toBe(1);
  });

  it('closeShop(): update seguinte vai para roundActive com round + 1 e roundStart (SHOP-03)', () => {
    const { run } = cleared();
    run.update(2499, SEED);
    run.update(1, SEED); // entra em shop
    run.closeShop();
    const commands = run.update(0, SEED);
    expect(commands).toEqual([{ type: 'roundStart', round: 2 }]);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(2);
  });

  it('closeShop() fora de shop não faz nada (nenhum roundStart, rodada e estado intactos)', () => {
    const run = started();
    run.closeShop();
    const commands = run.update(0, SEED);
    expect(commands.some((c) => c.type === 'roundStart')).toBe(false);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(1);
  });

  it('morte do player exatamente quando a intermissão abriria a loja: gameOver vence, a loja não abre', () => {
    const { run } = cleared();
    run.update(2499, SEED); // ainda intermission
    run.playerDied();
    const commands = run.update(1, SEED); // este update chegaria a 2500 ms
    expect(run.state).toBe('gameOver');
    expect(commands.some((c) => c.type === 'shopOpen')).toBe(false);
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

describe('Run: dedupe de abate (WAVE-06)', () => {
  it('o mesmo id morto duas vezes antes do update conta 1 em kills e derruba remaining em 1', () => {
    const run = started();
    run.enemyDied(1);
    run.enemyDied(1); // mesmo id, ainda pendente
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(2); // 3 (base da rodada 1) - 1
  });

  it('o mesmo id morto de novo num update seguinte não soma kills nem derruba remaining de novo', () => {
    const run = started();
    run.enemyDied(1);
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(2);
    run.enemyDied(1); // já contado antes, agora num update diferente
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(2);
  });
});

describe('acceptsPlayerInput (RUN-08, SHOP-04)', () => {
  it.each<[RunState, boolean]>([
    ['title', false],
    ['roundActive', true],
    ['intermission', true],
    ['shop', false],
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

describe('Run: firstRound opcional no construtor', () => {
  it('sem a opção: começa na rodada 1 (F1 inalterada)', () => {
    const run = newRun();
    run.startPressed();
    run.update(0, SEED);
    expect(run.round).toBe(1);
  });

  it('com { firstRound: 5 }: começa direto na rodada 5', () => {
    const run = new Run(RUN, WAVE, POINTS, { firstRound: 5 });
    run.startPressed();
    const commands = run.update(0, SEED);
    expect(run.round).toBe(5);
    expect(commands).toEqual([{ type: 'startRun' }, { type: 'roundStart', round: 5 }]);
  });
});

describe('Run: o comando spawn carrega kind (BOSS-01, BOSS-02)', () => {
  it('rodada 1 (não é de chefe): todo spawn tem kind enemy', () => {
    const run = started();
    const commands = run.update(0, SEED); // libera os spawns da rodada 1
    const spawnCmds = commands.filter(isSpawn);
    expect(spawnCmds.length).toBeGreaterThan(0);
    expect(spawnCmds.every((c) => c.kind === 'enemy')).toBe(true);
  });

  it('rodada 5 (de chefe): um único spawn com kind boss', () => {
    const run = new Run(RUN, WAVE, POINTS, { firstRound: 5 });
    run.startPressed();
    run.update(0, SEED); // startRun + roundStart(5), sem spawn ainda
    const commands = run.update(0, SEED); // libera o spawn do chefe
    const spawnCmds = commands.filter(isSpawn);
    expect(spawnCmds).toHaveLength(1);
    expect(spawnCmds[0].kind).toBe('boss');
    expect(spawnCmds[0].round).toBe(5);
  });
});

describe('Run: morte do chefe conta kills e entra em intermission (BOSS-04, BOSS-07)', () => {
  it('o chefe é o único inimigo da onda de tamanho 1; sua morte limpa a rodada', () => {
    const run = new Run(RUN, WAVE, POINTS, { firstRound: 5 });
    run.startPressed();
    run.update(0, SEED); // roundStart(5)
    run.update(0, SEED); // spawn do chefe
    run.enemyDied(500); // o chefe morre, contado do mesmo jeito que um inimigo comum
    const commands = run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.state).toBe('intermission');
    expect(commands).toContainEqual({ type: 'roundCleared', round: 5 });
  });
});

describe('Run: stream de loot com seed própria (ECO-17, ECO-31)', () => {
  it('lootRng é null antes do primeiro start', () => {
    const run = newRun();
    expect(run.lootRng).toBeNull();
  });

  it('depois do start com seed s, lootRng.next() é igual ao primeiro next() de new Rng(s ^ 0x9e3779b9)', () => {
    const run = newRun();
    run.startPressed();
    run.update(0, SEED); // SEED() === 7
    const expected = new Rng(7 ^ 0x9e3779b9).next();
    expect(run.lootRng!.next()).toBe(expected);
  });

  it('sorteios no lootRng entre updates não mudam a ordem de spawn das rodadas (o rng das ondas é outro)', () => {
    // Mata cada inimigo assim que nasce, para as rodadas 1-3 se sucederem dentro de um número fixo de passos;
    // fecha a loja assim que ela abre (SHOP-03), como faria o jogador, para a run seguir de rodada em rodada.
    const run = (withLoot: boolean): { spawns: number[]; rounds: number[] } => {
      const r = new Run(RUN, WAVE, POINTS);
      r.startPressed();
      const spawns: number[] = [];
      const rounds: number[] = [];
      let nextId = 1;
      for (let step = 0; step < 400; step++) {
        if (withLoot) for (let i = 0; i < 50; i++) r.lootRng?.next();
        const cmds = r.update(50, SEED);
        for (const c of cmds) {
          if (c.type === 'spawn') {
            spawns.push(c.point);
            r.enemyDied(nextId++); // morre assim que nasce: a rodada some rápido
          }
          if (c.type === 'roundStart') rounds.push(c.round);
        }
        if (r.state === 'shop') r.closeShop();
        if (rounds.includes(4)) break;
      }
      return { spawns, rounds };
    };

    const without = run(false);
    const with50Draws = run(true);
    expect(with50Draws.spawns).toEqual(without.spawns);
    expect(with50Draws.rounds).toEqual(without.rounds);
    expect(without.rounds).toContain(3); // prova que as 3 rodadas realmente aconteceram
  });

  it('uma nova run cria um lootRng novo, com a seed nova', () => {
    const run = newRun();
    run.startPressed();
    run.update(0, () => 1); // primeira run, seed 1
    run.lootRng!.next(); // consome um sorteio na run anterior

    run.playerDied();
    run.update(0, () => 1); // gameOver
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2); // nova run, seed 2

    expect(run.lootRng!.next()).toBe(new Rng(2 ^ 0x9e3779b9).next());
  });
});

describe('Run: stream da loja com seed própria (SHOP-09, SHOP-40)', () => {
  it('shopRng é null antes do primeiro start', () => {
    const run = newRun();
    expect(run.shopRng).toBeNull();
  });

  it('depois do start com seed s, shopRng.next() é igual ao primeiro next() de new Rng(s ^ SHOP.rngSalt)', () => {
    const run = newRun();
    run.startPressed();
    run.update(0, SEED); // SEED() === 7
    const expected = new Rng(7 ^ SHOP.rngSalt).next();
    expect(run.shopRng!.next()).toBe(expected);
  });

  it('sorteios no shopRng entre updates não mudam a ordem de spawn nem os sorteios de loot (SHOP-40)', () => {
    const run = (withShopDraws: boolean): { spawns: number[]; rounds: number[]; loot: number[] } => {
      const r = new Run(RUN, WAVE, POINTS);
      r.startPressed();
      const spawns: number[] = [];
      const rounds: number[] = [];
      const loot: number[] = [];
      let nextId = 1;
      for (let step = 0; step < 400; step++) {
        if (withShopDraws) for (let i = 0; i < 50; i++) r.shopRng?.next();
        const cmds = r.update(50, SEED);
        for (const c of cmds) {
          if (c.type === 'spawn') {
            spawns.push(c.point);
            r.enemyDied(nextId++);
          }
          if (c.type === 'roundStart') rounds.push(c.round);
        }
        loot.push(r.lootRng?.next() ?? -1); // consumido igualmente nos dois casos, para provar que não mudou
        if (r.state === 'shop') r.closeShop();
        if (rounds.includes(4)) break;
      }
      return { spawns, rounds, loot };
    };

    const without = run(false);
    const withDraws = run(true);
    expect(withDraws.spawns).toEqual(without.spawns);
    expect(withDraws.rounds).toEqual(without.rounds);
    expect(withDraws.loot).toEqual(without.loot);
    expect(without.rounds).toContain(3);
  });

  it('uma nova run cria um shopRng novo, com a seed nova', () => {
    const run = newRun();
    run.startPressed();
    run.update(0, () => 1); // primeira run, seed 1
    run.shopRng!.next(); // consome um sorteio na run anterior

    run.playerDied();
    run.update(0, () => 1); // gameOver
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2); // nova run, seed 2

    expect(run.shopRng!.next()).toBe(new Rng(2 ^ SHOP.rngSalt).next());
  });
});

describe('Run: chefe e player morrem antes do mesmo update (BOSS-05)', () => {
  it('a morte do player tem prioridade sobre a morte do chefe no mesmo frame: gameOver, não intermission', () => {
    const run = new Run(RUN, WAVE, POINTS, { firstRound: 5 });
    run.startPressed();
    run.update(0, SEED); // roundStart(5)
    run.update(0, SEED); // spawn do chefe
    run.enemyDied(500); // chefe morrendo
    run.playerDied(); // player morrendo no mesmo frame
    const commands = run.update(0, SEED);
    expect(run.state).toBe('gameOver');
    expect(commands.some((c) => c.type === 'roundCleared')).toBe(false);
    expect(commands).toContainEqual({ type: 'gameOver', round: 5, kills: 0 });
  });
});
