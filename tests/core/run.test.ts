import { describe, expect, it } from 'vitest';
import { Run, acceptsPlayerInput, type RunCommand, type RunState } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

function isSpawn(c: RunCommand): c is Extract<RunCommand, { type: 'spawn' }> {
  return c.type === 'spawn';
}

/** seed 7: rng.int(0, 1) = 0, então s = 0 para P = 2 (checado em waves.test.ts). */
const SEED = () => 7;

const newRun = (): Run => new Run(RUN, WAVE);

/** Começa a run e chega em `roundActive`, round 1, kills 0. */
const started = (): Run => {
  const run = newRun();
  run.startPressed();
  run.update(0, SEED);
  return run;
};

/** A partir de `roundActive` round 1, mata as 6 (SPN-01) inimigos da rodada e chega em `intermission`. */
const cleared = (): { run: Run; roundCommands: ReturnType<Run['update']> } => {
  const run = started();
  run.enemyDied(1);
  run.enemyDied(2);
  run.enemyDied(3);
  run.enemyDied(4);
  run.enemyDied(5);
  run.enemyDied(6);
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
    expect(run.kills).toBe(6);
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
    expect(run.kills).toBe(6);
  });
});

describe('Run: dedupe de abate (WAVE-06)', () => {
  it('o mesmo id morto duas vezes antes do update conta 1 em kills e derruba remaining em 1', () => {
    const run = started();
    run.enemyDied(1);
    run.enemyDied(1); // mesmo id, ainda pendente
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(5); // 6 (SPN-01, rodada 1) - 1
  });

  it('o mesmo id morto de novo num update seguinte não soma kills nem derruba remaining de novo', () => {
    const run = started();
    run.enemyDied(1);
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(5);
    run.enemyDied(1); // já contado antes, agora num update diferente
    run.update(0, SEED);
    expect(run.kills).toBe(1);
    expect(run.remaining).toBe(5);
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
    expect(commands).toContainEqual({ type: 'gameOver', round: 1, kills: 6 });
    expect(run.summary).toEqual({ round: 1, kills: 6 });
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
    const run = new Run(RUN, WAVE, { firstRound: 5 });
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
    const run = new Run(RUN, WAVE, { firstRound: 5 });
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
    const run = new Run(RUN, WAVE, { firstRound: 5 });
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

describe('Run: stream da guarda dos inimigos com seed própria (EBL-01)', () => {
  it('guardRng é null antes do start e, depois dele com seed s, começa como new Rng(s ^ 0x2545f491)', () => {
    const run = newRun();
    expect(run.guardRng).toBeNull();
    run.startPressed();
    run.update(0, SEED);
    expect(run.guardRng!.next()).toBe(new Rng(7 ^ 0x2545f491).next());
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
      const r = new Run(RUN, WAVE);
      r.startPressed();
      const spawns: number[] = [];
      const rounds: number[] = [];
      let nextId = 1;
      for (let step = 0; step < 400; step++) {
        if (withLoot) for (let i = 0; i < 50; i++) r.lootRng?.next();
        const cmds = r.update(50, SEED);
        for (const c of cmds) {
          if (c.type === 'spawn') {
            spawns.push(step); // passo em que o spawn sai (o ponto não vem mais do comando)
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
      const r = new Run(RUN, WAVE);
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
            spawns.push(step); // passo em que o spawn sai (o ponto não vem mais do comando)
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
    const run = new Run(RUN, WAVE, { firstRound: 5 });
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

describe('Run: stream da aparência dos inimigos e streams anteriores intactos (EVR-04)', () => {
  it('variantRng é null antes do start e, depois dele com seed s, começa como new Rng(s ^ 0x6a09e667)', () => {
    const run = newRun();
    expect(run.variantRng).toBeNull();
    run.startPressed();
    run.update(0, SEED);
    expect(run.variantRng!.next()).toBe(new Rng(7 ^ 0x6a09e667).next());
  });

  it('com seed 7, lootRng e guardRng dão os mesmos números de antes da feature (valores fixados)', () => {
    const run = started();
    const take = (r: Rng) => Array.from({ length: 4 }, () => r.next());
    expect(take(run.lootRng!)).toEqual([
      0.9823943767696619, 0.3341257639694959, 0.6892532545607537, 0.12651141709648073,
    ]);
    expect(take(run.guardRng!)).toEqual([
      0.5889583916869015, 0.13402440771460533, 0.4920719088986516, 0.7194477405864745,
    ]);
  });

  it('consumir o variantRng não muda lootRng nem guardRng', () => {
    const a = started();
    const b = started();
    for (let i = 0; i < 100; i++) b.variantRng!.next();
    expect(b.lootRng!.next()).toBe(a.lootRng!.next());
    expect(b.guardRng!.next()).toBe(a.guardRng!.next());
  });
});

describe('Run: stream do ponto de spawn e teto de vivos (SPN-02, SPN-04, SPN-08)', () => {
  it('spawnRng é null antes do start e, depois dele com seed s, começa como new Rng(s ^ 0x3c6ef372)', () => {
    const run = newRun();
    expect(run.spawnRng).toBeNull();
    run.startPressed();
    run.update(0, SEED);
    expect(run.spawnRng!.next()).toBe(new Rng(7 ^ 0x3c6ef372).next());
  });

  it('a mesma seed reproduz a sequência do spawnRng', () => {
    const a = started();
    const b = started();
    for (let i = 0; i < 5; i++) expect(a.spawnRng!.next()).toBe(b.spawnRng!.next());
  });

  it('consumir o spawnRng não muda lootRng, shopRng, guardRng nem variantRng (regressão)', () => {
    const a = started();
    const b = started();
    for (let i = 0; i < 100; i++) b.spawnRng!.next();
    expect(b.lootRng!.next()).toBe(a.lootRng!.next());
    expect(b.shopRng!.next()).toBe(a.shopRng!.next());
    expect(b.guardRng!.next()).toBe(a.guardRng!.next());
    expect(b.variantRng!.next()).toBe(a.variantRng!.next());
  });

  it('as sequências de variant, guard e shop continuam as de seed 7 (valores fixados)', () => {
    const run = started();
    expect(new Rng(7 ^ 0x6a09e667).next()).toBe(run.variantRng!.next());
    expect(new Rng(7 ^ 0x2545f491).next()).toBe(run.guardRng!.next());
    expect(new Rng(7 ^ SHOP.rngSalt).next()).toBe(run.shopRng!.next());
  });

  it('maxAlive é 0 antes do start e reflete a rodada: 5 na rodada 1, 6 na rodada 3', () => {
    const run = newRun();
    expect(run.maxAlive).toBe(0);
    run.startPressed();
    run.update(0, SEED);
    expect(run.maxAlive).toBe(5);
    const r3 = new Run(RUN, WAVE, { firstRound: 3 });
    r3.startPressed();
    r3.update(0, SEED);
    expect(r3.maxAlive).toBe(6);
  });

  it('maxAliveOverride vale no maxAlive e limita os spawns (1 vivo)', () => {
    const run = new Run(RUN, WAVE, { maxAliveOverride: 1 });
    run.startPressed();
    run.update(0, SEED);
    expect(run.maxAlive).toBe(1);
    const spawns = run.update(0, SEED).filter(isSpawn);
    expect(spawns).toHaveLength(1);
    expect(run.update(5000, SEED).filter(isSpawn)).toHaveLength(0);
  });

  it('o 1º update da rodada 1 emite o burst de 3 spawns sem ponto; 1500 ms depois sai mais 1', () => {
    const run = started();
    const burst = run.update(0, SEED).filter(isSpawn);
    expect(burst).toHaveLength(3);
    expect(burst[0]).toEqual({ type: 'spawn', round: 1, kind: 'enemy' });
    expect(run.update(1499, SEED).filter(isSpawn)).toHaveLength(0);
    expect(run.update(1, SEED).filter(isSpawn)).toHaveLength(1);
  });
});

/** Run modular em `roundActive` round 1; `clearedModular` mata os 6 inimigos da rodada e chega a `traverse`. */
const modularRun = (opts: { skipShop?: boolean } = {}): Run => {
  const run = new Run(RUN, WAVE, { flow: 'modular', ...opts });
  run.startPressed();
  run.update(0, SEED);
  return run;
};
const clearedModular = (opts: { skipShop?: boolean } = {}): { run: Run; commands: RunCommand[] } => {
  const run = modularRun(opts);
  for (let id = 1; id <= 6; id++) run.enemyDied(id);
  return { run, commands: run.update(0, SEED) };
};

describe('Run modular: fim da onda leva a traverse (TRV-02, TRV-04)', () => {
  it('o último abate vai a traverse e emite roundCleared no mesmo update', () => {
    const { run, commands } = clearedModular();
    expect(run.state).toBe('traverse');
    expect(commands).toEqual([{ type: 'roundCleared', round: 1 }]);
  });

  it('no fluxo sala o último abate continua indo a intermission', () => {
    expect(cleared().run.state).toBe('intermission');
  });

  it('traverse não emite spawn nem avança timer: 10 s depois continua em traverse, sem comandos', () => {
    const { run } = clearedModular();
    expect(run.update(10000, SEED)).toEqual([]);
    expect(run.state).toBe('traverse');
    expect(run.update(10000, SEED)).toEqual([]);
  });

  it('acceptsPlayerInput(traverse) é true; shop e gameOver continuam false', () => {
    expect(acceptsPlayerInput('traverse')).toBe(true);
    expect(acceptsPlayerInput('shop')).toBe(false);
    expect(acceptsPlayerInput('gameOver')).toBe(false);
  });
});

describe('Run modular: exitReached (TRV-05, TRV-06, KON-01, KON-04)', () => {
  it('em traverse leva a shop e emite shopOpen da rodada atual', () => {
    const { run } = clearedModular();
    run.exitReached();
    expect(run.update(0, SEED)).toEqual([{ type: 'shopOpen', round: 1 }]);
    expect(run.state).toBe('shop');
  });

  it('com skipShop leva direto a roundActive da rodada seguinte, sem shopOpen', () => {
    const { run } = clearedModular({ skipShop: true });
    run.exitReached();
    const commands = run.update(0, SEED);
    expect(commands).toEqual([{ type: 'roundStart', round: 2 }]);
    expect(run.state).toBe('roundActive');
    expect(run.round).toBe(2);
    // Onda nova: o próximo update já emite o burst de spawns da rodada 2.
    expect(run.update(0, SEED).filter(isSpawn).length).toBeGreaterThan(0);
  });

  it('é ignorado em roundActive: nem a onda que fecha logo depois o aproveita', () => {
    const run = modularRun();
    run.exitReached();
    for (let id = 1; id <= 6; id++) run.enemyDied(id);
    run.update(0, SEED);
    expect(run.state).toBe('traverse');
    expect(run.update(0, SEED)).toEqual([]);
    expect(run.state).toBe('traverse');
  });

  it('é ignorado em shop e em title', () => {
    const { run } = clearedModular();
    run.exitReached();
    run.update(0, SEED);
    expect(run.state).toBe('shop');
    run.exitReached();
    expect(run.update(0, SEED)).toEqual([]);
    expect(run.state).toBe('shop');
    const title = newRun();
    title.exitReached();
    expect(title.update(0, SEED)).toEqual([]);
    expect(title.state).toBe('title');
  });

  it('dois exitReached no mesmo update viram uma transição só', () => {
    const { run } = clearedModular({ skipShop: true });
    run.exitReached();
    run.exitReached();
    expect(run.update(0, SEED)).toEqual([{ type: 'roundStart', round: 2 }]);
    expect(run.round).toBe(2);
    expect(run.update(0, SEED).filter((c) => c.type === 'roundStart')).toEqual([]);
    expect(run.round).toBe(2);
  });

  it('o pedido de saída não fica represado: depois de uma volta a traverse ele não dispara sozinho', () => {
    const { run } = clearedModular({ skipShop: true });
    run.exitReached();
    run.update(0, SEED);
    for (let id = 1; id <= 8; id++) run.enemyDied(id);
    run.update(0, SEED);
    expect(run.state).toBe('traverse');
    expect(run.update(0, SEED)).toEqual([]);
  });

  it('fechar a loja continua levando à rodada seguinte', () => {
    const { run } = clearedModular();
    run.exitReached();
    run.update(0, SEED);
    run.closeShop();
    expect(run.update(0, SEED)).toEqual([{ type: 'roundStart', round: 2 }]);
  });
});

describe('Run modular: morte em traverse (TRV-09, RUN-04)', () => {
  it('morte em traverse vai a gameOver com o resumo da rodada', () => {
    const { run } = clearedModular();
    run.playerDied();
    expect(run.update(0, SEED)).toEqual([{ type: 'gameOver', round: 1, kills: 6 }]);
    expect(run.state).toBe('gameOver');
    expect(run.summary).toEqual({ round: 1, kills: 6 });
  });

  it('morte e último abate no mesmo update vão a gameOver, nunca a traverse', () => {
    const run = modularRun();
    for (let id = 1; id <= 6; id++) run.enemyDied(id);
    run.playerDied();
    const commands = run.update(0, SEED);
    expect(run.state).toBe('gameOver');
    expect(commands.map((c) => c.type)).toEqual(['gameOver']);
  });

  it('morte e exitReached no mesmo update vão a gameOver', () => {
    const { run } = clearedModular();
    run.exitReached();
    run.playerDied();
    expect(run.update(0, SEED).map((c) => c.type)).toEqual(['gameOver']);
    expect(run.state).toBe('gameOver');
  });
});

describe('Run modular: streams do mundo (ARE-07, SLT-01)', () => {
  it('stageRng e slotRng são null antes do start e depois dele com seed s são new Rng(s ^ salt)', () => {
    const run = newRun();
    expect(run.stageRng).toBeNull();
    expect(run.slotRng).toBeNull();
    run.startPressed();
    run.update(0, SEED);
    expect(run.stageRng!.next()).toBe(new Rng(7 ^ 0x1f83d9ab).next());
    expect(run.slotRng!.next()).toBe(new Rng(7 ^ 0x5be0cd19).next());
  });

  it('a mesma seed reproduz as sequências e os dois streams são independentes entre si', () => {
    const a = started();
    const b = started();
    for (let i = 0; i < 100; i++) b.stageRng!.next();
    expect(b.slotRng!.next()).toBe(a.slotRng!.next());
    expect(b.lootRng!.next()).toBe(a.lootRng!.next());
    expect(b.shopRng!.next()).toBe(a.shopRng!.next());
    expect(b.guardRng!.next()).toBe(a.guardRng!.next());
    expect(b.variantRng!.next()).toBe(a.variantRng!.next());
    expect(b.spawnRng!.next()).toBe(a.spawnRng!.next());
    expect(b.elixirRng!.next()).toBe(a.elixirRng!.next());
  });

  it('os streams que já existiam dão as mesmas sequências de antes (valores fixados, seed 7)', () => {
    const run = started();
    const take = (r: Rng) => Array.from({ length: 4 }, () => r.next());
    expect(take(run.lootRng!)).toEqual([
      0.9823943767696619, 0.3341257639694959, 0.6892532545607537, 0.12651141709648073,
    ]);
    expect(take(run.guardRng!)).toEqual([
      0.5889583916869015, 0.13402440771460533, 0.4920719088986516, 0.7194477405864745,
    ]);
    expect(run.spawnRng!.next()).toBe(new Rng(7 ^ 0x3c6ef372).next());
    expect(run.elixirRng!.next()).toBe(new Rng(7 ^ 0x510e527f).next());
  });
});
