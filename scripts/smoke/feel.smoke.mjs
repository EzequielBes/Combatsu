// Movimento suave (ITP-05, ITP-06, ITP-07, CAM-07): o sprite do player e o do inimigo são desenhados entre os dois
// últimos passos de física, e a câmera do mundo segue o player sem o `startFollow` do Phaser e sem tremer.
// No harness cada `frame()` costuma ser um passo de física, mas a sobra no acumulador do Matter depende do que o loop
// em tempo real deixou antes do primeiro `step()`. Por isso o alfa vem do snapshot (`physics.alpha`) e só contam os
// quadros com exatamente um passo: neles a posição de desenho é `anterior + (atual − anterior) × alfa`.
import { makeKit } from './fight-kit.mjs';

export default async function ({ page, baseUrl, assert }) {
  const waitReady = () =>
    page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
  const frame = () =>
    page.evaluate(() => {
      window.__game.step(16);
      return window.__game.snapshot();
    });

  // --- Player e câmera, no laboratório (sem ondas: nada interrompe a corrida) ---------------------------------
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1&noshop=1&fxlab`, { waitUntil: 'load' });
  await waitReady();
  await frame();
  await page.keyboard.press('KeyJ', { delay: 50 });
  let s = await page.evaluate(() => {
    window.__game.step(300);
    return window.__game.snapshot();
  });
  assert(s.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(s.run)}`);

  // CAM-07: a câmera do mundo não arredonda pixels nem usa o seguidor do Phaser.
  assert(s.camera.roundPixels === false, `CAM-07: roundPixels deveria estar desligado: ${s.camera.roundPixels}`);
  assert(s.camera.phaserFollow === false, `CAM-07: o startFollow do Phaser não deveria estar ligado`);

  // Parado: a posição de desenho é a do corpo e o scroll está na grade de pixel de tela.
  assert(
    Math.abs(s.player.view.x - s.player.x) <= 0.01 && Math.abs(s.player.view.y - s.player.y) <= 0.01,
    `parado, view deveria ser o corpo: ${JSON.stringify({ view: s.player.view, x: s.player.x, y: s.player.y })}`,
  );

  await page.keyboard.down('KeyD');
  const rows = [];
  for (let i = 0; i < 220; i++) {
    s = await frame();
    rows.push({ x: s.player.x, view: s.player.view.x, alpha: s.physics.alpha, scroll: s.camera.scroll.x, zoom: s.camera.zoom, frozen: s.hitstop.frozen });
  }
  await page.keyboard.up('KeyD');
  assert(rows.every((r) => !r.frozen), 'pré-condição: nenhum hitstop durante a corrida no laboratório');
  const cruise = rows[rows.length - 1].x - rows[rows.length - 2].x;
  assert(Math.abs(cruise - 220 / 60) < 0.01, `pré-condição: velocidade de cruzeiro de 220 px/s: dx ${cruise}`);

  // ITP-05: nos quadros com exatamente um passo (dx de cruzeiro), view.x = anterior + (atual − anterior) × alfa.
  let oneStep = 0;
  for (let i = 1; i < rows.length; i++) {
    const dx = rows[i].x - rows[i - 1].x;
    if (Math.abs(dx - 220 / 60) > 1e-3) continue;
    const expected = rows[i - 1].x + dx * rows[i].alpha;
    assert(Math.abs(rows[i].view - expected) <= 0.01, `ITP-05: quadro ${i}: view ${rows[i].view} deveria ser ${expected} (alfa ${rows[i].alpha})`);
    oneStep++;
  }
  assert(oneStep >= 150, `ITP-05: esperava pelo menos 150 quadros de um passo em cruzeiro: ${oneStep}`);
  // A interpolação está ligada de verdade: o alfa fica dentro de 0..1 e, abaixo de 1, o sprite fica atrás do corpo.
  assert(rows.every((r) => r.alpha >= 0 && r.alpha <= 1), 'o alfa deveria ficar entre 0 e 1');
  const behind = rows.filter((r, i) => i > 60 && r.alpha < 0.99 && r.x - r.view > 0.03).length;
  assert(behind >= 100 || rows.slice(60).every((r) => r.alpha >= 0.99), `correndo, o sprite deveria ficar atrás do corpo: ${behind}`);

  // A câmera saiu do limite esquerdo e passou a andar junto: só então vale o regime.
  const moving = rows.findIndex((r, i) => i > 0 && r.scroll !== rows[i - 1].scroll);
  assert(moving > 0 && moving < 120, `a câmera deveria começar a seguir antes do quadro 120: ${moving}`);
  // CAM-06 no jogo: o scroll aplicado é múltiplo de 1/zoom.
  for (const r of rows) {
    const px = r.scroll * r.zoom;
    assert(Math.abs(px - Math.round(px)) < 1e-6, `scroll fora da grade de pixel de tela: ${r.scroll} (zoom ${r.zoom})`);
  }
  // ITP-06: em regime (60 quadros depois de a câmera começar a andar), o player varia no máximo 1 px na tela.
  const steady = rows.slice(moving + 60);
  assert(steady.length >= 40, `poucos quadros em regime: ${steady.length}`);
  const screen = steady.map((r) => (r.view - r.scroll) * r.zoom);
  let worst = 0;
  for (let i = 1; i < screen.length; i++) worst = Math.max(worst, Math.abs(screen[i] - screen[i - 1]));
  assert(worst <= 1, `ITP-06: variação na tela de ${worst.toFixed(3)} px, deveria ser <= 1`);
  // E a câmera anda de verdade: o scroll avança junto com o player.
  assert(steady[steady.length - 1].scroll - steady[0].scroll > 100, 'a câmera deveria acompanhar a corrida');

  // --- Inimigo comum andando (ITP-07) --------------------------------------------------------------------------
  const kit = makeKit({ page, baseUrl, assert });
  s = await kit.boot('enemyGuard=0');
  let hist = [];
  let checked = 0;
  for (let i = 0; i < 400 && checked < 30; i++) {
    s = await kit.frame();
    const e = s.enemies[0];
    if (!e || s.hitstop.frozen || e.state !== 'idle' || (hist.length > 0 && hist[0].id !== e.id)) {
      hist = [];
      continue;
    }
    hist.push({ id: e.id, x: e.x });
    if (hist.length < 3) continue;
    const [a, b, c] = hist.slice(-3);
    const d1 = b.x - a.x;
    const d2 = c.x - b.x;
    // Dois quadros seguidos com o mesmo dx: velocidade constante e exatamente um passo de física neste quadro.
    if (Math.abs(d2) > 0.3 && Math.abs(d2 - d1) < 1e-3) {
      const expected = b.x + d2 * s.physics.alpha;
      assert(Math.abs(e.view.x - expected) <= 0.01, `ITP-07: inimigo ${e.id}: view ${e.view.x} deveria ser ${expected} (alfa ${s.physics.alpha})`);
      checked++;
    }
  }
  assert(checked >= 30, `ITP-07: o inimigo deveria andar pelo menos 30 quadros seguidos: ${checked}`);
}
