// Com `?debug`: golpes fortes de teste (tecla 2) até os inimigos morrerem; cada morte gera um único
// `enemyDied:<id>` no snapshot, e nada a mais depois (FND-08). Inimigos renascem com id novo e não morrem sozinhos.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return window.__game.snapshot().enemies.length > 0;
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  const initial = (await page.evaluate(() => window.__game.snapshot())).enemies.map((e) => e.id);
  assert(initial.length === 2, `esperava 2 inimigos, veio ${initial.length}`);

  const snapshot = () => page.evaluate(() => window.__game.snapshot());
  let snap = await snapshot();
  const allDead = (s) => initial.every((id) => s.events.includes(`enemyDied:${id}`));
  // Modo manual: o teclado do Phaser só é processado dentro do step, então aperta e depois avança.
  await page.evaluate(() => window.__game.step(20));
  for (let i = 0; i < 12 && !allDead(snap); i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    await page.evaluate(() => window.__game.step(300));
    snap = await snapshot();
  }
  assert(allDead(snap), `nem todos morreram: events=${JSON.stringify(snap.events)}`);

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
  assert(
    JSON.stringify(later.events) === JSON.stringify(snap.events),
    `eventos novos após step(3000): ${JSON.stringify(snap.events)} -> ${JSON.stringify(later.events)}`,
  );
}
