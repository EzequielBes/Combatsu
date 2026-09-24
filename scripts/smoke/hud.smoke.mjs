// HUD da run (RHUD-01..07) com `?debug&seed=1`: rodada e restantes, faixa temporária, "rodada concluída", telas
// de título e de game over, e a checagem de que o HUD está fora da câmera principal (AD-003).
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

  // Título (RHUD-05): o nome do jogo e a chamada para começar.
  let snap = await snapshot();
  assert(snap.hud.center?.includes('Combatsu'), `título sem o nome do jogo: ${JSON.stringify(snap.hud.center)}`);
  assert(
    snap.hud.center?.includes('J / Enter para começar'),
    `título sem a chamada para começar: ${JSON.stringify(snap.hud.center)}`,
  );

  // RHUD-07: o HUD está fora da câmera principal (checagem real do bit de câmera, não uma constante).
  assert(snap.hud.ignoredByMain === true, `HUD deveria estar fora da câmera principal: ${JSON.stringify(snap.hud)}`);

  // J começa a run: banner "Rodada 1" logo em seguida (RHUD-02), e o texto de rodada/restantes (RHUD-01).
  await page.evaluate(() => window.__game.step(20));
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(snap.run.state === 'roundActive' && snap.run.round === 1, `run deveria estar na rodada 1: ${JSON.stringify(snap.run)}`);
  assert(snap.hud.banner === 'Rodada 1', `banner deveria mostrar a rodada 1: ${JSON.stringify(snap.hud.banner)}`);
  assert(snap.hud.round === 'Rodada 1', `hud.round errado: ${JSON.stringify(snap.hud.round)}`);
  const expectedRemaining = `Inimigos: ${snap.run.alive + snap.run.queued}`;
  assert(snap.hud.remaining === expectedRemaining, `hud.remaining errado: ${snap.hud.remaining} != ${expectedRemaining}`);

  // A faixa fica centralizada em x = 480, y = 135 na tela de 960x540 (RHUD-02).
  assert(
    Math.abs(snap.hud.bannerPos.x - 480) < 1 && Math.abs(snap.hud.bannerPos.y - 135) < 1,
    `posição da faixa errada: ${JSON.stringify(snap.hud.bannerPos)}`,
  );

  // RUN.bannerMs (1500 ms): ainda visível em 1400 ms (limite inferior), sumida em mais 200 ms (RHUD-02).
  snap = await page.evaluate(() => {
    window.__game.step(1400);
    return window.__game.snapshot();
  });
  assert(snap.hud.banner === 'Rodada 1', `banner deveria continuar em 1400 ms: ${JSON.stringify(snap.hud.banner)}`);
  snap = await page.evaluate(() => {
    window.__game.step(200);
    return window.__game.snapshot();
  });
  assert(snap.hud.banner === null, `banner deveria sumir após 1600 ms: ${JSON.stringify(snap.hud.banner)}`);

  // Limpa a rodada 1 (tecla 2) até a intermission: banner "Rodada 1 concluída" (RHUD-03).
  for (let i = 0; i < 20 && snap.run.state !== 'intermission'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await page.evaluate(() => {
      window.__game.step(300);
      return window.__game.snapshot();
    });
  }
  assert(snap.run.state === 'intermission', `rodada 1 não limpou a tempo: ${JSON.stringify(snap.run)}`);
  assert(
    snap.hud.banner === 'Rodada 1 concluída',
    `banner deveria mostrar a rodada concluída: ${JSON.stringify(snap.hud.banner)}`,
  );

  // Chega a rodada 2 e o player morre pela tecla 3: game over com o resumo (RHUD-06).
  for (let i = 0; i < 20 && !(snap.run.state === 'roundActive' && snap.run.round === 2); i++) {
    snap = await page.evaluate(() => {
      window.__game.step(200);
      return window.__game.snapshot();
    });
  }
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 2,
    `rodada 2 não começou a tempo: ${JSON.stringify(snap.run)}`,
  );
  await page.keyboard.press('Digit3', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(snap.run.state === 'gameOver', `run deveria estar em gameOver: ${JSON.stringify(snap.run)}`);
  const center = snap.hud.center ?? [];
  assert(center.includes(`Rodada alcançada: ${snap.run.round}`), `game over sem a rodada alcançada: ${JSON.stringify(center)}`);
  assert(center.includes(`Abates: ${snap.run.kills}`), `game over sem os abates: ${JSON.stringify(center)}`);
  assert(
    center.includes('J / Enter para tentar de novo'),
    `game over sem a chamada para tentar de novo: ${JSON.stringify(center)}`,
  );
}
