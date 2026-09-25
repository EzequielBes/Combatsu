// Item na mão no HUD (ITEM-01..03) com `?debug&seed=1`: pega a cadeira do mapa, bate e confere o nome e as pips
// caindo com o desgaste, e o hud.heldItem sumindo de mãos vazias.
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
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  let snap = await stepAndSnap(20);
  // ITEM-03: de mãos vazias, hud.heldItem é null.
  assert(snap.hud.heldItem === null, `deveria começar de mãos vazias: ${JSON.stringify(snap.hud.heldItem)}`);

  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(50);

  // Cadeira em LEVEL_1 (coluna 7, x=240). Anda até ela e pega (K).
  const chair = snap.worldProps.find((p) => p.key === 'chair');
  assert(chair, `esperava a cadeira do mapa em worldProps: ${JSON.stringify(snap.worldProps)}`);
  for (let i = 0; i < 100 && Math.abs(snap.player.x - chair.x) > 4; i++) {
    const dir = chair.x >= snap.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    snap = await stepAndSnap(50);
    await page.keyboard.up(dir);
  }
  await page.keyboard.down('KeyK');
  snap = await stepAndSnap(20);
  await page.keyboard.up('KeyK');
  snap = await stepAndSnap(50);

  // ITEM-01/02: nome "Cadeira" e 4/4 pips ao pegar.
  assert(
    snap.hud.heldItem && snap.hud.heldItem.name === 'Cadeira' && snap.hud.heldItem.pips === 4 && snap.hud.heldItem.maxPips === 4,
    `esperava { Cadeira, 4, 4 } ao pegar: ${JSON.stringify(snap.hud.heldItem)}`,
  );

  // Bate em inimigos com a cadeira até 2 impactos realmente registrados (cada queda de pips conta um impacto,
  // independente de quantos golpes no ar foram tentados no meio do caminho).
  // Só considera um inimigo "alcançável" perto o bastante em x *e* y (plataformas diferentes nunca se tocam).
  const reachableEnemy = () =>
    snap.enemies.find((e) => e.hp > 0 && e.state !== 'deadRagdoll' && Math.abs(e.y - snap.player.y) < 24);
  let lastPips = snap.hud.heldItem.pips;
  let realImpacts = 0;
  for (let i = 0; i < 100 && realImpacts < 2; i++) {
    const enemy = reachableEnemy();
    if (!enemy) {
      snap = await stepAndSnap(300);
      continue;
    }
    if (Math.abs(snap.player.x - enemy.x) > 20) {
      const dir = enemy.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
      continue;
    }
    await page.keyboard.down('KeyJ');
    snap = await stepAndSnap(20);
    await page.keyboard.up('KeyJ');
    snap = await stepAndSnap(300);
    const chairNow = snap.hud.heldItem;
    if (!chairNow) break; // quebrou ou saiu da mão antes do esperado
    if (chairNow.pips < lastPips) {
      realImpacts += lastPips - chairNow.pips;
      lastPips = chairNow.pips;
    }
  }
  assert(realImpacts >= 2, `ITEM-02: esperava ao menos 2 impactos reais na cadeira, veio ${realImpacts}`);
  assert(lastPips === 2, `ITEM-02: depois de 2 impactos as pips deveriam cair de 4 para 2: ${lastPips}`);
}
