// Com `?debug`: o boot é a tela de título (RUN-01); J começa a run e a onda da rodada 1 nasce (FND-09, FND-22).
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
  const titleSnap = await page.evaluate(() => window.__game.snapshot());
  assert(titleSnap.run.state === 'title', `boot deveria começar em title: ${JSON.stringify(titleSnap.run)}`);
  assert(titleSnap.enemies.length === 0, `title não deveria ter inimigos: ${titleSnap.enemies.length}`);

  // Modo manual: o teclado do Phaser só é processado dentro do step, então aperta e depois avança. A graça ao
  // nascer (600 ms, WAVE-09) segura o movimento dos inimigos que acabaram de spawnar: avança 1200 ms.
  await page.evaluate(() => window.__game.step(20));
  await page.keyboard.press('KeyJ', { delay: 50 });
  const snap = await page.evaluate(() => {
    window.__game.step(1200);
    return window.__game.snapshot();
  });
  const { player, enemies, run } = snap;
  assert(run.state === 'roundActive' && run.round === 1, `run deveria estar na rodada 1: ${JSON.stringify(run)}`);
  assert(typeof player.x === 'number' && typeof player.y === 'number', `player sem posição: ${JSON.stringify(player)}`);
  assert(player.hp === 100 && player.dead === false, `player inicial errado: ${JSON.stringify(player)}`);
  // A rodada 1 tem 3 inimigos e o LEVEL_1 tem 2 pontos E: os 2 primeiros nascem juntos, o 3º só 800 ms depois no
  // mesmo ponto do 1º (WAVE-02/04).
  assert(enemies.length >= 2, `esperava ao menos 2 inimigos, veio ${enemies.length}`);
  for (const e of enemies) {
    assert(typeof e.id === 'number', `inimigo sem id: ${JSON.stringify(e)}`);
    assert(e.hp === 60 && e.maxHp === 60 && e.state === 'idle', `inimigo inicial errado: ${JSON.stringify(e)}`);
    // Centro do corpo (36 px de altura) sobre o chão da linha 14 do LEVEL_1, cujo topo fica em y = 480.
    assert(typeof e.y === 'number' && e.y > 430 && e.y < 480, `inimigo fora do chão: ${JSON.stringify(e)}`);
  }

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
