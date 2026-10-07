// Nova run depois do `gameOver` no modo modular (edge case da spec): a rodada 1 da run nova constrói a área da seed, com
// o selo fechado e o player na coluna 3. Com `?debug&seed=3` a run nova repete a seed, então os módulos têm de repetir;
// sem `seed` a seed é o relógio, e a área só precisa ser uma área de rodada 1 válida. O `area=modular` na URL impede o
// runner de acrescentar `area=sala`.
const TILE = 32;
const MODULE_COLS = { rua: 40, beco: 20, parque: 32 };

export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const ready = async (query) => {
    await page.goto(`${baseUrl}?debug&enemyGuard=0&maxAlive=1&area=modular${query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__game?.snapshot === 'function', { timeout: 15_000 });
    await stepAndSnap(20);
  };
  const builtEvents = (s) => s.events.filter((e) => e.startsWith('areaBuilt:'));
  const colOf = (s) => Math.floor(s.player.x / TILE);

  // Morre (tecla 3), espera a trava do `gameOver` e começa a run nova com J.
  const dieAndRestart = async (snap) => {
    await page.keyboard.press('Digit3', { delay: 20 });
    for (let i = 0; i < 40 && snap.run.state !== 'gameOver'; i++) snap = await stepAndSnap(100);
    assert(snap.run.state === 'gameOver', `esperava gameOver: ${JSON.stringify(snap.run)}`);
    snap = await stepAndSnap(1200);
    await page.keyboard.press('KeyJ', { delay: 50 });
    return stepAndSnap(100);
  };
  const assertRoundOne = (snap, where) => {
    assert(
      snap.run.state === 'roundActive' && snap.run.round === 1 && snap.run.kills === 0,
      `${where}: a rodada 1 deveria começar: ${JSON.stringify(snap.run)}`,
    );
    assert(!snap.player.dead && snap.player.hp === snap.player.maxHp, `${where}: player com vida cheia`);
    assert(colOf(snap) === 3, `${where}: player deveria estar na coluna 3: x=${snap.player.x}`);
    const cols = snap.area.modules.reduce((n, id) => n + MODULE_COLS[id], 2);
    assert(
      snap.area.modules.length === 2 && snap.area.widthPx === cols * TILE && snap.area.sealed === true,
      `${where}: área da rodada 1 inválida: ${JSON.stringify(snap.area)}`,
    );
  };

  // Mesma seed: a run nova repete a área da primeira.
  await ready('&seed=3');
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(50);
  assertRoundOne(snap, 'run 1');
  const first = snap.area.modules;
  const startX = snap.player.x;
  snap = await dieAndRestart(snap);
  assertRoundOne(snap, 'run 2');
  assert(
    JSON.stringify(snap.area.modules) === JSON.stringify(first),
    `a run nova com a mesma seed deveria repetir ${JSON.stringify(first)}: ${JSON.stringify(snap.area.modules)}`,
  );
  assert(
    Math.abs(snap.player.x - startX) < 0.5,
    `o player deveria nascer no mesmo ponto: ${startX} -> ${snap.player.x}`,
  );
  const built = builtEvents(snap);
  assert(
    built.length === 2 && built[0] === built[1] && built[0] === `areaBuilt:${first.join(',')}`,
    `esperava dois areaBuilt iguais (um por run): ${JSON.stringify(built)}`,
  );

  // Seed do relógio: a área da run nova é uma área de rodada 1 válida, construída de novo.
  await ready('');
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(50);
  assertRoundOne(snap, 'run 1 (relógio)');
  snap = await dieAndRestart(snap);
  assertRoundOne(snap, 'run 2 (relógio)');
  assert(builtEvents(snap).length === 2, `esperava um areaBuilt por run: ${JSON.stringify(builtEvents(snap))}`);
}
