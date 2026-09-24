// Com `?debug`: o snapshot tem o player e os 2 inimigos no estado inicial, e `step` move a simulação (FND-09, FND-22).
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
  const snap = await page.evaluate(() => window.__game.snapshot());
  const { player, enemies } = snap;
  assert(typeof player.x === 'number' && typeof player.y === 'number', `player sem posição: ${JSON.stringify(player)}`);
  assert(player.hp === 100 && player.dead === false, `player inicial errado: ${JSON.stringify(player)}`);
  assert(enemies.length === 2, `esperava 2 inimigos, veio ${enemies.length}`);
  for (const e of enemies) {
    assert(typeof e.id === 'number', `inimigo sem id: ${JSON.stringify(e)}`);
    assert(e.hp === 60 && e.state === 'idle', `inimigo inicial errado: ${JSON.stringify(e)}`);
    // Centro do corpo (36 px de altura) sobre o chão da linha 14 do LEVEL_1, cujo topo fica em y = 480.
    assert(typeof e.y === 'number' && e.y > 430 && e.y < 480, `inimigo fora do chão: ${JSON.stringify(e)}`);
  }
  assert(Array.isArray(snap.events), 'events deveria ser uma lista');

  const after = await page.evaluate(() => {
    window.__game.step(500);
    return window.__game.snapshot();
  });
  const moved = after.enemies.some((e) => {
    const before = enemies.find((b) => b.id === e.id);
    return before && before.x !== e.x;
  });
  assert(moved, `nenhum inimigo andou após step(500): ${JSON.stringify(enemies)} -> ${JSON.stringify(after.enemies)}`);
}
