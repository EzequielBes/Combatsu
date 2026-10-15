// Marcador `Recorde: rN` e banner de recorde novo (RMK-*, RST-05) em HD no mundo modular. `record=1` finge um
// recorde na rodada 1 sem tocar no save (`storage: 'off'`): a morte ainda bate o recorde em memória, que é o que o
// marcador mostra na run seguinte. `noshop=1` pula a loja entre as rodadas.
export default async function ({ page, baseUrl, assert }) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&seed=1&noshop=1&${query}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return !!window.__game.snapshot();
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    return step(20);
  };
  const show = (snap) => JSON.stringify({ banner: snap.hud.banner, marker: snap.record.marker });
  const sameMarker = (snap, text, highlight) => {
    const m = snap.record.marker;
    return m.visible === true && m.text === text && m.highlight === highlight;
  };

  /** Limpa a rodada (tecla 2), espera o `traverse` e anda para a direita até a próxima rodada começar. */
  const nextRound = async (snap) => {
    const target = snap.run.round + 1;
    for (let i = 0; i < 400 && snap.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 20 });
      snap = await step(80);
      if (snap.player.dead) throw new Error(`o player morreu antes de limpar a rodada ${target - 1}`);
    }
    for (let i = 0; i < 200 && snap.run.state !== 'traverse' && snap.run.round < target; i++) snap = await step(50);
    await page.keyboard.down('KeyD');
    for (let i = 0; i < 600 && snap.run.round < target; i++) snap = await step(50);
    await page.keyboard.up('KeyD');
    if (snap.run.state !== 'roundActive' || snap.run.round !== target)
      throw new Error(`a rodada ${target} não começou: ${JSON.stringify(snap.run)}`);
    return snap;
  };

  // RMK-01/02: recorde na r1; a r1 mostra `Recorde: r1` na cor normal, banner sem comemoração.
  let snap = await open('record=1&nosave=1');
  assert(snap.record.marker.visible === false, `RMK-04: escondido no título: ${show(snap)}`);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await step(50);
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `a run deveria começar: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.hud.banner === 'Rodada 1', `RMK-05: r1 sem comemoração: ${show(snap)}`);
  assert(sameMarker(snap, 'Recorde: r1', false), `RMK-01: r1 mostra o recorde sem destaque: ${show(snap)}`);
  assert(snap.record.passed === false, `REC-10: r1 ainda não passou do recorde: ${snap.record.passed}`);

  // RMK-05/07: a r2 passa do recorde; banner de recorde novo e o marcador na rodada atual, em destaque.
  snap = await nextRound(snap);
  assert(snap.hud.banner === 'Rodada 2 · Novo recorde!', `RMK-05: banner de recorde novo: ${show(snap)}`);
  assert(sameMarker(snap, 'Recorde: r2', true), `RMK-07: r2 em destaque: ${show(snap)}`);
  assert(snap.record.passed === true, `REC-10: a r2 passou do recorde: ${snap.record.passed}`);

  // RMK-06: na r3 o banner não comemora de novo; o marcador segue a rodada atual.
  snap = await nextRound(snap);
  assert(snap.hud.banner === 'Rodada 3', `RMK-06: a comemoração sai uma vez por run: ${show(snap)}`);
  assert(sameMarker(snap, 'Recorde: r3', true), `RMK-07: r3 em destaque: ${show(snap)}`);

  // RST-05: morrer na r3 bate o recorde em memória; a run nova (J depois da trava) mostra `Recorde: r3` sem destaque.
  await page.keyboard.press('Digit3', { delay: 50 });
  for (let i = 0; i < 60 && snap.run.state !== 'gameOver'; i++) snap = await step(17);
  assert(snap.run.state === 'gameOver' && snap.record.lastDeathRecord, `a morte na r3 vira recorde: ${show(snap)}`);
  assert(snap.record.marker.visible === false, `RMK-04: escondido no gameOver: ${show(snap)}`);
  snap = await step(1100);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await step(50);
  assert(snap.run.state === 'roundActive' && snap.run.round === 1, `RST-05: run nova: ${JSON.stringify(snap.run)}`);
  assert(sameMarker(snap, 'Recorde: r3', false), `RST-05: marcador com o recorde recém-batido: ${show(snap)}`);
  assert(snap.hud.banner === 'Rodada 1', `RMK-05: r1 da run nova sem comemoração: ${show(snap)}`);

  // RMK-03: sem recorde (`nosave=1`) o marcador fica escondido e o banner nunca comemora.
  snap = await open('nosave=1');
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await step(50);
  assert(snap.run.state === 'roundActive', `a run sem recorde deveria começar: ${JSON.stringify(snap.run)}`);
  assert(snap.record.marker.visible === false && snap.record.best === null, `RMK-03: sem recorde: ${show(snap)}`);
  assert(snap.hud.banner === 'Rodada 1', `RMK-05: sem recorde não comemora: ${show(snap)}`);
  assert(errors.length === 0, `erros na página: ${errors.join(' | ')}`);
}
