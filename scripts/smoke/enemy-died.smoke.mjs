// Com `?debug`: J começa a run e golpes fortes de teste (tecla 2) até os inimigos morrerem; cada morte gera um
// único `enemyDied:<id>` no snapshot, e nada a mais depois (FND-08). Inimigos não renascem sozinhos (WAVE-05).
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug`, { waitUntil: 'load' });
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
  const isEnemyDied = (ev) => ev.startsWith('enemyDied:');
  const diedEvents = (events) => events.filter(isEnemyDied);

  // Modo manual: o teclado do Phaser só é processado dentro do step, então aperta e depois avança.
  await page.evaluate(() => window.__game.step(20));
  await page.keyboard.press('KeyJ', { delay: 50 });
  // Avança menos que os 800 ms do rodízio (WAVE-04): só os 2 primeiros pontos da rodada 1 nasceram.
  let snap = await page.evaluate(() => {
    window.__game.step(650);
    return window.__game.snapshot();
  });
  const initial = snap.enemies.map((e) => e.id);
  assert(initial.length === 2, `esperava 2 inimigos, veio ${initial.length}`);

  const allDead = (s) => initial.every((id) => s.events.includes(`enemyDied:${id}`));
  // Posição de cada inimigo no snapshot anterior ao golpe que o matou, e os ids que morreram em cada step.
  const beforeFatal = new Map();
  const diedInStep = [];
  for (let i = 0; i < 12 && !allDead(snap); i++) {
    const prev = snap;
    await page.keyboard.press('Digit2', { delay: 50 });
    await page.evaluate(() => window.__game.step(300));
    snap = await snapshot();
    // Só os eventos enemyDied: contam aqui - um spawnFx: novo (o 3º inimigo da rodada) não é uma morte.
    const newly = diedEvents(snap.events)
      .filter((ev) => !diedEvents(prev.events).includes(ev))
      .map((ev) => Number(ev.split(':')[1]));
    for (const id of newly) beforeFatal.set(id, prev.enemies.find((e) => e.id === id));
    if (newly.length) diedInStep.push(newly);
  }
  assert(allDead(snap), `nem todos morreram: events=${JSON.stringify(snap.events)}`);

  // O golpe de teste acerta os dois de uma vez: as duas mortes entram no mesmo step (edge case do mesmo frame).
  assert(
    diedInStep.some((ids) => initial.every((id) => ids.includes(id))),
    `as duas mortes deveriam cair no mesmo step: ${JSON.stringify(diedInStep)}`,
  );

  // Cada abate chega com a posição do inimigo naquele frame (FND-08): a mesma de antes do golpe, porque o golpe de teste entra antes da física no primeiro frame do step.
  for (const id of initial) {
    const deaths = snap.deaths.filter((d) => d.id === id);
    assert(deaths.length === 1, `deaths deveria ter uma entrada para ${id}: ${JSON.stringify(snap.deaths)}`);
    const was = beforeFatal.get(id);
    const { x, y } = deaths[0];
    assert(
      Math.abs(x - was.x) < 1 && Math.abs(y - was.y) < 1,
      `posição do abate ${JSON.stringify(deaths[0])} longe de ${JSON.stringify({ x: was.x, y: was.y })}`,
    );
  }

  const count = (events) => {
    const c = new Map();
    for (const ev of events) c.set(ev, (c.get(ev) ?? 0) + 1);
    return c;
  };
  for (const [ev, n] of count(snap.events)) assert(n === 1, `${ev} apareceu ${n} vezes`);
  for (const id of initial) assert(count(snap.events).get(`enemyDied:${id}`) === 1, `enemyDied:${id} não apareceu uma vez`);

  const later = await page.evaluate(() => {
    window.__game.step(3000);
    return window.__game.snapshot();
  });
  // Nenhuma morte nova depois disso; um spawnFx: novo (o 3º inimigo da rodada) é esperado e não conta aqui.
  assert(
    JSON.stringify(diedEvents(later.events)) === JSON.stringify(diedEvents(snap.events)),
    `mortes novas após step(3000): ${JSON.stringify(diedEvents(snap.events))} -> ${JSON.stringify(diedEvents(later.events))}`,
  );
}
