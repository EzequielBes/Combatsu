// Loop completo da run (RUN-01..11, WAVE-05/09, DIF-04, RHUD-08) com `?debug&seed=1` para reprodutibilidade.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return typeof window.__game.snapshot === 'function';
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  const snapshot = () => page.evaluate(() => window.__game.snapshot());

  // Boot: título, sem inimigos (RUN-01).
  let snap = await snapshot();
  assert(snap.run.state === 'title', `boot deveria começar em title: ${JSON.stringify(snap.run)}`);
  assert(snap.enemies.length === 0, `title não deveria ter inimigos: ${snap.enemies.length}`);

  // Em title, segurar D por 500 ms não move o player: fora de roundActive/intermission o input é ignorado (RUN-08).
  const beforeHold = await snapshot();
  await page.evaluate(() => window.__game.step(20));
  await page.keyboard.down('KeyD');
  await page.evaluate(() => window.__game.step(500));
  await page.keyboard.up('KeyD');
  const afterHold = await snapshot();
  assert(
    Math.abs(afterHold.player.x - beforeHold.player.x) < 0.5,
    `player andou em title segurando D: ${beforeHold.player.x} -> ${afterHold.player.x}`,
  );

  // J começa a run (RUN-02): rodada 1, 0 abates, player com hp cheio no spawn.
  await page.keyboard.press('KeyJ', { delay: 50 });
  await page.evaluate(() => window.__game.step(50));
  snap = await snapshot();
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1 && snap.run.kills === 0,
    `run deveria estar na rodada 1: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.player.hp === 100 && snap.player.dead === false, `player inicial errado: ${JSON.stringify(snap.player)}`);

  // Limpa a rodada 1 (golpe forte de teste, tecla 2, em todos os vivos) até a run entrar em intermission (RUN-06).
  for (let i = 0; i < 20 && snap.run.state !== 'intermission'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await page.evaluate(() => {
      window.__game.step(300);
      return window.__game.snapshot();
    });
  }
  assert(snap.run.state === 'intermission', `rodada 1 não limpou a tempo: ${JSON.stringify(snap.run)}`);
  assert(snap.run.kills === 3, `rodada 1 tem 3 inimigos: kills=${snap.run.kills}`);

  // Cada inimigo que já existiu (vivo ou morto) tem seu spawnFx:<id> no snapshot (RHUD-08).
  const spawnedIds = new Set([...snap.enemies.map((e) => e.id), ...snap.deaths.map((d) => d.id)]);
  for (const id of spawnedIds) {
    assert(snap.events.includes(`spawnFx:${id}`), `inimigo ${id} nasceu sem spawnFx`);
  }

  // WAVE-05: durante a intermission nenhum inimigo da rodada 1 volta a existir vivo, e run.alive é 0.
  const mid = await page.evaluate(() => {
    window.__game.step(2000);
    return window.__game.snapshot();
  });
  const ALIVE_STATES = new Set(['idle', 'hitstun', 'ragdollStun', 'gettingUp']);
  assert(
    mid.enemies.every((e) => !ALIVE_STATES.has(e.state)),
    `um inimigo voltou a existir vivo na intermission: ${JSON.stringify(mid.enemies)}`,
  );
  assert(mid.run.alive === 0, `run.alive deveria ser 0 na intermission: ${mid.run.alive}`);

  // Depois de 2500 ms de intermission a rodada 2 começa (RUN-10); passamos aqui só os 500 ms que faltam.
  let round2;
  for (let i = 0; i < 20; i++) {
    round2 = await page.evaluate(() => {
      window.__game.step(100);
      return window.__game.snapshot();
    });
    if (round2.run.state === 'roundActive' && round2.run.round === 2) break;
  }
  assert(
    round2.run.state === 'roundActive' && round2.run.round === 2,
    `rodada 2 não começou a tempo: ${JSON.stringify(round2.run)}`,
  );

  // DIF-04: os inimigos da rodada 2 têm hp 67 e dano 13 (arredondado de 60 × 1,12 e 12 × 1,08). Um inimigo da
  // rodada 1 ainda pode estar dissolvendo (hp 0) neste snapshot; só os vivos pertencem à onda nova.
  const round2EnemiesAtStart = round2.enemies.filter((e) => e.hp > 0);
  assert(round2EnemiesAtStart.length > 0, 'rodada 2 sem inimigos vivos para conferir a escala');
  const closestAtStart = round2EnemiesAtStart.reduce((a, b) =>
    Math.abs(a.x - round2.player.x) <= Math.abs(b.x - round2.player.x) ? a : b,
  );

  // WAVE-09: um inimigo que nasce neste step não muda de x nos primeiros 500 ms (pode nascer parado, apanhar sim).
  let prevIds = new Set(round2.enemies.map((e) => e.id));
  let freshId = null;
  let freshX = null;
  let scan = round2;
  for (let i = 0; i < 20 && freshId === null; i++) {
    scan = await page.evaluate(() => {
      window.__game.step(50);
      return window.__game.snapshot();
    });
    const newIds = scan.enemies.map((e) => e.id).filter((id) => !prevIds.has(id));
    if (newIds.length > 0) {
      freshId = newIds[0];
      freshX = scan.enemies.find((e) => e.id === freshId).x;
    }
    prevIds = new Set(scan.enemies.map((e) => e.id));
  }
  assert(freshId !== null, 'nenhum inimigo novo nasceu na rodada 2 para testar a graça (WAVE-09)');
  const graceCheck = await page.evaluate(() => {
    window.__game.step(500);
    return window.__game.snapshot();
  });
  const afterGraceX = graceCheck.enemies.find((e) => e.id === freshId)?.x;
  assert(
    typeof afterGraceX === 'number' && Math.abs(afterGraceX - freshX) < 0.5,
    `inimigo recém-nascido andou durante a graça: ${freshX} -> ${afterGraceX}`,
  );

  // DIF-04 (real): anda até o inimigo mais próximo da rodada 2 e deixa a IA atacar de verdade, para que
  // maxHp/damage venham do EnemyBrain e do golpe realmente aberto (A2, A3), não de um valor "de prateleira" que
  // ficaria certo mesmo se o inimigo usasse outro. Só até entrar na faixa de perseguição (chaseRange 200 px);
  // dali em diante a própria IA fecha a distância e ataca sozinha (o player não atravessa e passa do alvo, porque
  // runSpeed > chaseSpeed).
  const targetId = closestAtStart.id;
  const moveKey = closestAtStart.x >= graceCheck.player.x ? 'KeyD' : 'KeyA';
  let holding = true;
  await page.keyboard.down(moveKey);
  let attacked = null;
  let chase = graceCheck;
  for (let i = 0; i < 80 && attacked === null; i++) {
    chase = await page.evaluate(() => {
      window.__game.step(200);
      return window.__game.snapshot();
    });
    const target = chase.enemies.find((e) => e.id === targetId) ?? closestAtStart;
    if (holding && Math.abs(target.x - chase.player.x) < 150) {
      await page.keyboard.up(moveKey);
      holding = false;
    }
    if (chase.player.hp < 100) attacked = chase;
  }
  if (holding) await page.keyboard.up(moveKey);
  assert(attacked !== null, `nenhum inimigo da rodada 2 chegou a atacar o player: player.hp=${chase.player.hp}`);
  assert(attacked.player.hp === 87, `player deveria perder 13 de hp no golpe da rodada 2: ${attacked.player.hp}`);
  const attacker = attacked.enemies.find((e) => e.hp > 0 && Math.abs(e.x - attacked.player.x) < 60);
  assert(attacker !== undefined, `nenhum inimigo perto do player logo após o golpe: ${JSON.stringify(attacked.enemies)}`);
  assert(
    attacker.hp === 67 && attacker.maxHp === 67 && attacker.damage === 13,
    `escala da rodada 2 errada no inimigo que atacou: ${JSON.stringify(attacker)}`,
  );
  // Passa a invulnerabilidade do golpe (HP-02, invulnMs 700 ms) antes da tecla 3, para o golpe de morte não ser ignorado.
  await page.evaluate(() => window.__game.step(800));

  // Tecla 3 mata o player pelo caminho normal de morte: gameOver com o resumo da rodada 2 (RUN-04).
  await page.keyboard.press('Digit3', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(
    snap.run.state === 'gameOver' && snap.run.round === 2 && snap.run.kills === 3,
    `gameOver deveria trazer o resumo da rodada 2: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.player.dead === true, `player deveria estar morto: ${JSON.stringify(snap.player)}`);

  // RUN-11: J apertado logo depois (menos de 1000 ms de gameOver) não faz nada.
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(100);
    return window.__game.snapshot();
  });
  assert(
    snap.run.state === 'gameOver' && snap.run.round === 2 && snap.run.kills === 3,
    `J antes de 1000 ms não deveria sair do gameOver: ${JSON.stringify(snap.run)}`,
  );

  // RUN-03/04: sem J, o player continua morto e a run continua em gameOver mesmo bem depois (sem respawn automático).
  snap = await page.evaluate(() => {
    window.__game.step(3000);
    return window.__game.snapshot();
  });
  assert(
    snap.run.state === 'gameOver' && snap.player.dead === true,
    `run deveria continuar em gameOver com o player morto: ${JSON.stringify({ run: snap.run, player: snap.player })}`,
  );

  // RUN-05: passada a trava de 1000 ms, J começa uma run nova: rodada 1, 0 abates, hp cheio.
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1 && snap.run.kills === 0,
    `nova run deveria começar na rodada 1: ${JSON.stringify(snap.run)}`,
  );
  assert(
    snap.player.hp === 100 && snap.player.dead === false,
    `player deveria renascer com hp cheio na run nova: ${JSON.stringify(snap.player)}`,
  );
}
