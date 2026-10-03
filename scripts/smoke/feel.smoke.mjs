// Movimento suave (ITP-05, ITP-06, ITP-07, ITP-08, ITP-10, CAM-07, EDG-02): o sprite do player e o do inimigo são desenhados entre os dois
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

  // --- Objeto na mão (ITP-08): a cadeira acompanha o sprite, não o corpo ---------------------------------------
  const chair = s.worldProps.filter((pr) => pr.key === 'chair').sort((a, b) => a.x - b.x)[0];
  assert(chair, `nenhuma cadeira no mapa: ${JSON.stringify(s.worldProps)}`);
  for (let i = 0; i < 400 && Math.abs(s.player.x - chair.x) > 14; i++) {
    const dir = chair.x > s.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    s = await frame();
    await page.keyboard.up(dir);
  }
  for (let i = 0; i < 8; i++) s = await frame();
  await page.keyboard.down('KeyE');
  for (let i = 0; i < 3; i++) s = await frame();
  await page.keyboard.up('KeyE');
  s = await frame();
  assert(s.hud.heldItem !== null, `ITP-08: deveria estar segurando a cadeira: ${JSON.stringify(s.hud.heldItem)}`);
  await page.keyboard.down('KeyA');
  let heldFrames = 0;
  for (let i = 0; i < 36; i++) {
    s = await frame();
    const held = s.worldProps.find((pr) => pr.state === 'held');
    assert(held, `ITP-08: a cadeira deveria continuar na mão: ${JSON.stringify(s.worldProps)}`);
    if (i < 10) continue; // já em velocidade de cruzeiro
    const expected = s.player.view.x - 8 * s.player.facing;
    assert(Math.abs(held.x - expected) <= 0.01, `ITP-08: cadeira em ${held.x}, deveria estar em ${expected} (view ${s.player.view.x})`);
    heldFrames++;
  }
  await page.keyboard.up('KeyA');
  assert(heldFrames >= 20 && s.player.facing === -1, `ITP-08: esperava 20+ quadros correndo para a esquerda: ${heldFrames}`);
  // Larga a cadeira (S + E) para ficar de mãos livres.
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyE');
  for (let i = 0; i < 3; i++) s = await frame();
  await page.keyboard.up('KeyE');
  await page.keyboard.up('KeyS');
  for (let i = 0; i < 20; i++) s = await frame();
  assert(s.hud.heldItem === null, `deveria ter largado a cadeira: ${JSON.stringify(s.hud.heldItem)}`);

  // --- Aura de conjuração (ITP-10): tecla 1 do laboratório, com o player correndo ------------------------------
  await page.keyboard.down('KeyD');
  for (let i = 0; i < 12; i++) s = await frame();
  await page.keyboard.down('Digit1');
  s = await frame();
  await page.keyboard.up('Digit1');
  let auraFrames = 0;
  for (let i = 0; i < 40; i++) {
    s = await frame();
    if (!s.fx.aura) continue;
    assert(
      Math.abs(s.fx.aura.x - s.player.view.x) <= 0.01 && Math.abs(s.fx.aura.y - s.player.view.y) <= 0.01,
      `ITP-10: aura em ${JSON.stringify(s.fx.aura)}, sprite em ${JSON.stringify(s.player.view)}`,
    );
    auraFrames++;
  }
  await page.keyboard.up('KeyD');
  assert(auraFrames >= 8, `ITP-10: a aura deveria aparecer por pelo menos 8 quadros com o player correndo: ${auraFrames}`);

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
  // --- Renascer (EDG-02): morrer a menos de 48 px do spawn e recomeçar não faz o sprite deslizar ----------------
  s = await kit.boot('enemyGuard=0');
  const spawnX = s.level.playerSpawn.x;
  await kit.down('KeyD');
  for (let i = 0; i < 9; i++) s = await kit.frame();
  await kit.up('KeyD');
  s = await kit.snap(120);
  const away = Math.abs(s.player.x - spawnX);
  // Menos que os 48 px do teleporte: sem o `snap` do Player, o sprite deslizaria do ponto da morte até o spawn.
  assert(away > 15 && away < 48, `EDG-02: o player deveria morrer entre 15 e 48 px do spawn: ${away}`);
  await page.keyboard.press('Digit3', { delay: 50 }); // tecla de debug: mata o player pelo caminho normal
  s = await kit.snap(1200);
  assert(s.run.state === 'gameOver' && s.player.dead === true, `EDG-02: esperava gameOver: ${JSON.stringify(s.run)}`);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let fresh = 0;
  for (let i = 0; i < 12 && fresh < 3; i++) {
    s = await kit.frame();
    if (s.run.state !== 'roundActive') continue;
    assert(Math.abs(s.player.x - spawnX) < 1, `EDG-02: o corpo deveria estar no spawn: ${s.player.x} vs ${spawnX}`);
    assert(
      Math.abs(s.player.view.x - s.player.x) <= 0.01 && Math.abs(s.player.view.y - s.player.y) <= 0.01,
      `EDG-02: quadro ${fresh} da run nova: sprite em ${JSON.stringify(s.player.view)}, corpo em ${s.player.x},${s.player.y}`,
    );
    fresh++;
  }
  assert(fresh === 3, `EDG-02: a run nova deveria começar em até 12 quadros: ${JSON.stringify(s.run)}`);
}
