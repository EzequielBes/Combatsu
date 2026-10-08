// Arsenal (ARS-01, ARS-07, ARS-09, ARS-10) com `?debug&arsenal=...`: a arma vinculada entra na mão no começo da
// rodada, na sala e no mundo modular, não gasta ao bater e a ferramenta comprada é entregue uma vez.
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  /** Abre o jogo com a query dada e começa a run; devolve o snapshot logo depois do `roundStart`. */
  const start = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&enemyGuard=0&seed=1&${query}`, { waitUntil: 'load' });
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
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    return stepAndSnap(100);
  };
  const heldProp = (snap) => snap.worldProps.find((p) => p.state === 'held' || p.state === 'swing');

  // ARS-09: arma vinculada na mão ao começar a rodada, com a relíquia registrada ao lado (sala).
  let snap = await start('arsenal=bastao,bastao,manoplas');
  assert(
    snap.arsenal.weapon === 'bastao' && snap.arsenal.weaponLevel === 2 && snap.arsenal.relic === 'manoplas',
    `arsenal do debug: ${JSON.stringify(snap.arsenal)}`,
  );
  let held = heldProp(snap);
  assert(held && held.key === 'boundClub', `ARS-09: o bastão deveria estar na mão: ${JSON.stringify(snap.worldProps)}`);
  assert(
    snap.hud.heldItem && snap.hud.heldItem.name === 'Bastão Selado',
    `o HUD deveria nomear a arma: ${JSON.stringify(snap.hud.heldItem)}`,
  );
  assert(snap.build.points.lutador === 3, `bastão nv 2 + manoplas nv 1 = 3 pontos: ${JSON.stringify(snap.build)}`);

  // ARS-07: bater com a arma vinculada não gasta durabilidade (ela segue na mão depois de vários balanços).
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('KeyJ', { delay: 50 });
    snap = await stepAndSnap(450);
  }
  held = heldProp(snap);
  assert(
    held && held.key === 'boundClub' && held.durabilityLeft === 1,
    `ARS-07: o bastão deveria seguir inteiro na mão: ${JSON.stringify(snap.worldProps)}`,
  );

  // ARS-09: no mundo modular a área é montada antes da entrega, e a arma chega na mão do mesmo jeito.
  snap = await start('area=modular&arsenal=lamina');
  held = heldProp(snap);
  assert(held && held.key === 'boundKnife', `ARS-09 (modular): ${JSON.stringify(snap.worldProps)}`);

  // ARS-10: a ferramenta comprada é entregue na mão e deixa de estar pendente.
  snap = await start('arsenal=faca');
  held = heldProp(snap);
  assert(held && held.key === 'cursedKnife', `ARS-10: a faca deveria estar na mão: ${JSON.stringify(snap.worldProps)}`);
  assert(
    snap.arsenal.tool === null,
    `ARS-10: a ferramenta não deveria seguir pendente: ${JSON.stringify(snap.arsenal)}`,
  );
}
