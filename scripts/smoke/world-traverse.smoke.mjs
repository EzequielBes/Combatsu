// Travessia, selo e konbini (TRV-01/02/03/05/07/08/10, KON-01/02/03/05, ARE-09/10/11, LEG-05) com
// `?debug&modules=beco,parque&maxAlive=1&seed=3`: a área 1 é beco (20) + parque (32) = 54 colunas com a parede e o
// selo; anda até o selo fechado, derruba a onda (tecla 2), cruza a saída, passa pela konbini e fecha a loja.
const TILE = 32;
// Corpos estáticos de uma área plana: a parede (linhas 0 a 14, um retângulo por linha) e o chão (linhas 15 e 16).
const FLAT_SOLIDS = 17;
const MODULE_COLS = { rua: 40, beco: 20, parque: 32, konbini: 20, santuario: 40 };

export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&enemyGuard=0&modules=beco,parque&maxAlive=1&seed=3`, { waitUntil: 'load' });
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
  const colOf = (snap) => Math.floor(snap.player.x / TILE);
  const widthOf = (ids) => (ids.reduce((n, id) => n + MODULE_COLS[id], 0) + 2) * TILE;

  // L-043: o scroll vivo da câmera nunca mostra além da área (`worldView` vivo, ARE-10), lido do motor a cada quadro medido.
  let camChecks = 0;
  const checkCamera = (snap, where) => {
    const { worldView } = snap.camera;
    camChecks++;
    assert(
      worldView.left >= -1 && worldView.right <= snap.area.widthPx + 1,
      `${where}: vista fora da área (ARE-10): ${JSON.stringify(worldView)} em ${snap.area.widthPx}px`,
    );
  };

  // Antes da run: o fundo do título é o `rua` selado (ARE-09), em modo modular.
  let snap = await stepAndSnap(20);
  assert(snap.area.mode === 'modular', `o modo padrão deveria ser modular (LEG-04): ${snap.area.mode}`);
  assert(snap.run.state === 'title', `boot deveria começar em title: ${snap.run.state}`);

  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(50);

  // ARE-01/09/10/12: 2 módulos na ordem forçada, 54 colunas, player na coluna 3, câmera limitada pela área.
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `rodada 1 deveria começar: ${JSON.stringify(snap.run)}`,
  );
  assert(
    JSON.stringify(snap.area.modules) === '["beco","parque"]',
    `esperava beco,parque (ARE-12): ${JSON.stringify(snap.area.modules)}`,
  );
  assert(
    snap.area.widthPx === 54 * TILE && snap.area.heightPx === 17 * TILE,
    `tamanho da área: ${JSON.stringify(snap.area)}`,
  );
  assert(colOf(snap) === 3, `player deveria nascer na coluna 3 (ARE-09): x=${snap.player.x}`);
  assert(
    snap.area.sealed === true && snap.area.exitX === 53 * TILE,
    `TRV-01: o selo deveria estar fechado em ${53 * TILE}: ${JSON.stringify(snap.area)}`,
  );
  // ARE-11: corpos estáticos do mundo = sólidos mesclados da área + o selo.
  assert(
    snap.area.staticBodies === FLAT_SOLIDS + 1,
    `ARE-11: esperava ${FLAT_SOLIDS + 1} corpos estáticos: ${snap.area.staticBodies}`,
  );
  const exitX = snap.area.exitX;
  checkCamera(snap, 'início da rodada 1');

  // TRV-08 (pré-condição): a garrafa fixa do beco vai para a mão do player.
  const bottle = snap.worldProps
    .filter((p) => p.key === 'bottle')
    .reduce((a, b) => (Math.abs(a.x - snap.player.x) <= Math.abs(b.x - snap.player.x) ? a : b), { x: Infinity });
  assert(bottle.x !== Infinity, `esperava a garrafa fixa do beco: ${JSON.stringify(snap.worldProps)}`);
  for (let i = 0; i < 100 && Math.abs(snap.player.x - bottle.x) > 4; i++) {
    const dir = bottle.x >= snap.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    snap = await stepAndSnap(50);
    await page.keyboard.up(dir);
  }
  await page.keyboard.down('KeyE');
  snap = await stepAndSnap(20);
  await page.keyboard.up('KeyE');
  snap = await stepAndSnap(50);
  assert(snap.hud.heldItem !== null, `deveria estar com a garrafa na mão: ${JSON.stringify(snap.hud.heldItem)}`);

  // TRV-01: andando para a direita em roundActive o player para antes do selo, que segue fechado. Inimigos no
  // caminho caem pela tecla 2 (no máximo 3 abates, para a onda de 6 continuar aberta).
  await page.keyboard.down('KeyD');
  let still = 0;
  let prevX = snap.player.x;
  for (let i = 0; i < 400 && still < 5; i++) {
    if (snap.run.kills < 3 && snap.enemies.some((e) => e.hp > 0)) await page.keyboard.press('Digit2', { delay: 20 });
    snap = await stepAndSnap(100);
    checkCamera(snap, 'andando até o selo');
    assert(snap.run.state === 'roundActive', `a onda não deveria acabar andando: ${JSON.stringify(snap.run)}`);
    assert(!snap.player.dead, 'o player morreu andando até o selo');
    assert(snap.player.x < exitX, `TRV-01: player passou do selo fechado: x=${snap.player.x} exitX=${exitX}`);
    still = snap.player.x - prevX < 0.5 && snap.player.x > exitX - 120 ? still + 1 : 0;
    prevX = snap.player.x;
  }
  assert(still >= 5, `player não chegou ao selo: x=${snap.player.x} exitX=${exitX}`);
  assert(
    snap.area.sealed === true && snap.player.x < exitX && snap.player.x > exitX - 80,
    `TRV-01: o player deveria estar parado junto ao selo: x=${snap.player.x} ${JSON.stringify(snap.area)}`,
  );
  assert(snap.hud.heldItem !== null, 'a garrafa deveria seguir na mão até a saída');

  // TRV-02/03: a onda acaba com o player junto ao selo (a tecla 2 derruba quem estiver vivo); o último abate
  // deixa fragmentos no chão da área, que a saída tem de creditar.
  let cleared = null;
  for (let i = 0; i < 600 && snap.run.state === 'roundActive'; i++) {
    if (snap.enemies.some((e) => e.hp > 0)) {
      await page.keyboard.press('Digit2', { delay: 20 });
    }
    snap = await stepAndSnap(50);
    checkCamera(snap, 'fechando a onda');
    if (snap.run.state === 'traverse') cleared = snap;
  }
  assert(
    cleared !== null,
    `a onda não fechou: ${JSON.stringify(snap.run)} p=${snap.player.x} ${JSON.stringify(snap.enemies.map((e) => [e.id, e.x, e.hp, e.state]))}`,
  );
  assert(
    cleared.run.state === 'traverse' && cleared.area.sealed === false,
    `TRV-02/03: no fim da onda esperava traverse com o selo aberto: ${JSON.stringify({ run: cleared.run, area: cleared.area })}`,
  );
  assert(cleared.run.kills === 6, `a rodada 1 tem 6 inimigos: kills=${cleared.run.kills}`);
  assert(
    cleared.area.staticBodies === FLAT_SOLIDS,
    `TRV-03: o corpo do selo deveria sair do mundo: ${cleared.area.staticBodies}`,
  );
  assert(cleared.events.includes('roundCleared') || cleared.hud.banner !== null, 'faltou o aviso de rodada concluída');
  const ground = cleared.pickups.filter((p) => p.kind === 'fragment');
  assert(ground.length > 0, `esperava fragmentos no chão ao fechar a onda: ${JSON.stringify(cleared.pickups)}`);

  // TRV-04/05/10: em traverse o player anda e cruza a saída; a câmera escurece por 250 ms e a área vira a konbini.
  snap = cleared;
  let before = snap;
  let crossedAt = -1;
  let frames = 0;
  // TRV-10: `KeyD` segue apertada desde a caminhada; no primeiro quadro do fade de saída aperta-se `KeyJ` também.
  const fadeOut = [];
  for (let i = 0; i < 1200 && snap.area.modules[0] !== 'konbini'; i++) {
    before = snap;
    snap = await stepAndSnap(16);
    frames++;
    if (crossedAt < 0 && snap.player.x > exitX) crossedAt = frames;
    if (snap.area.modules[0] !== 'konbini') {
      checkCamera(snap, 'travessia');
      if (snap.area.transitioning) {
        if (fadeOut.length === 0) await page.keyboard.press('KeyJ', { delay: 20 });
        fadeOut.push(snap);
      }
    }
    assert(!snap.player.dead, 'o player morreu em traverse');
  }
  assert(
    snap.area.modules[0] === 'konbini',
    `a saída não levou à konbini: ${JSON.stringify(snap.area)} x=${snap.player.x}`,
  );
  assert(crossedAt > 0, 'o player deveria cruzar o selo aberto antes da troca');
  // TRV-10: o fade de saída dura 250 ms (15 quadros de 16,7 ms), com folga de 3 quadros para o disparo e o fim.
  const fadeFrames = frames - crossedAt;
  assert(fadeFrames >= 12 && fadeFrames <= 19, `TRV-10: fade de saída de ${fadeFrames} quadros (esperava ~15)`);
  // TRV-10: no fade de saída a câmera escurece (`out`) e o input é neutro: sem golpe e sem acelerar (D segue apertada).
  assert(
    fadeOut.length >= 12 && fadeOut.every((s) => s.area.fade.running && s.area.fade.out),
    `TRV-10: a câmera deveria escurecer em todo o fade de saída: ${JSON.stringify(fadeOut.map((s) => s.area.fade))}`,
  );
  assert(
    fadeOut.every((s) => s.player.move === null),
    `TRV-10: o player golpeou com J apertada durante a transição: ${JSON.stringify(fadeOut.map((s) => s.player.move))}`,
  );
  const dxs = fadeOut.slice(1).map((s, i) => s.player.x - fadeOut[i].player.x);
  assert(
    dxs.every((dx, i) => i === 0 || dx <= dxs[i - 1] + 0.01) && dxs[dxs.length - 1] < dxs[0] * 0.25,
    `TRV-10: com D apertada o player deveria só perder velocidade no fade de saída: ${JSON.stringify(dxs)}`,
  );

  // KON-01: konbini com a loja aberta, player na coluna 3, selo e saída ausentes.
  assert(
    JSON.stringify(snap.area.modules) === '["konbini"]' && snap.area.widthPx === 22 * TILE,
    `KON-01: área da konbini errada: ${JSON.stringify(snap.area)}`,
  );
  assert(
    snap.run.state === 'shop' && snap.run.round === 1,
    `KON-01: esperava shop na rodada 1: ${JSON.stringify(snap.run)}`,
  );
  assert(
    snap.shop.open === true && snap.events.includes('shopOpen:1'),
    `KON-01: loja não abriu: ${JSON.stringify(snap.events)}`,
  );
  assert(colOf(snap) === 3, `KON-01: player deveria estar na coluna 3 da konbini: x=${snap.player.x}`);
  assert(
    snap.area.sealed === false && snap.area.exitX === null && snap.area.staticBodies === FLAT_SOLIDS,
    `ARE-11: konbini sem selo com ${FLAT_SOLIDS} corpos: ${JSON.stringify(snap.area)}`,
  );
  checkCamera(snap, 'konbini');
  // TRV-07: os fragmentos que sobravam no chão entram na carteira (valor antes + valor vivo).
  const swept = before.pickups.filter((p) => p.kind === 'fragment').reduce((n, p) => n + p.value, 0);
  assert(swept > 0, `os fragmentos do chão deveriam existir até a saída: ${JSON.stringify(before.pickups)}`);
  assert(
    snap.wallet.fragments === before.wallet.fragments + swept,
    `TRV-07: carteira ${snap.wallet.fragments} != ${before.wallet.fragments} + ${swept} varridos`,
  );
  assert(!snap.pickups.some((p) => p.kind === 'fragment'), `TRV-07: sobrou fragmento: ${JSON.stringify(snap.pickups)}`);
  // TRV-08: o objeto da mão some com a área.
  assert(snap.hud.heldItem === null, `TRV-08: a mão deveria estar vazia: ${JSON.stringify(snap.hud.heldItem)}`);
  // ARE-11: nenhum objeto da área anterior sobrevive (a konbini não tem objetos).
  assert(snap.worldProps.length === 0, `ARE-11: objetos da área anterior: ${JSON.stringify(snap.worldProps)}`);
  // TRV-10: o fade de entrada clareia a câmera por ~250 ms (12 a 19 quadros) e só então `transitioning` cai.
  let fadeIn = 1;
  assert(
    snap.area.transitioning && !snap.area.fade.out,
    `TRV-10: a konbini deveria nascer clareando: ${JSON.stringify(snap.area)}`,
  );
  for (let i = 0; i < 60 && snap.area.transitioning; i++) {
    snap = await stepAndSnap(16);
    if (snap.area.transitioning) fadeIn++;
  }
  assert(fadeIn >= 12 && fadeIn <= 19, `TRV-10: fade de entrada da konbini de ${fadeIn} quadros (esperava ~15)`);
  // KON-05: nenhum inimigo vivo e nenhum nasce na konbini, mesmo com a loja aberta por 1 s.
  const known = new Set(snap.enemies.map((e) => e.id));
  assert(
    snap.run.alive === 0 && snap.enemies.every((e) => e.hp <= 0),
    `KON-05: inimigo vivo na konbini: ${JSON.stringify(snap.enemies)}`,
  );
  snap = await stepAndSnap(1000);
  assert(
    snap.run.alive === 0 && snap.enemies.every((e) => known.has(e.id)),
    `KON-05: nasceu inimigo na konbini: ${JSON.stringify(snap.enemies)}`,
  );
  assert(snap.run.state === 'shop', `a loja deveria segurar a rodada: ${snap.run.state}`);

  // KON-03/TRV-10: Enter fecha a loja com fade e a rodada 2 começa numa área nova, com o player na coluna 3.
  await page.keyboard.down('Enter');
  snap = await stepAndSnap(16);
  await page.keyboard.up('Enter');
  // TRV-10: fecha a loja com D apertada; o fade de saída (loja) e o de entrada (rodada 2) duram ~250 ms cada, e no de
  // entrada o player fica parado no spawn e sem golpear mesmo com `KeyJ` apertada (input neutro nos 500 ms).
  let shopFadeOut = 0;
  const roundFadeIn = [];
  for (let i = 0; i < 120 && !(roundFadeIn.length > 0 && !snap.area.transitioning); i++) {
    snap = await stepAndSnap(16);
    if (snap.area.transitioning && snap.area.fade.out) shopFadeOut++;
    if (snap.run.state === 'roundActive' && snap.area.transitioning && !snap.area.fade.out) {
      if (roundFadeIn.length === 0) await page.keyboard.press('KeyJ', { delay: 20 });
      roundFadeIn.push(snap);
    }
  }
  assert(
    shopFadeOut >= 11 && shopFadeOut <= 19,
    `TRV-10: fade de saída da loja de ${shopFadeOut} quadros (esperava ~15)`,
  );
  assert(
    roundFadeIn.length >= 12 && roundFadeIn.length <= 19,
    `TRV-10: fade de entrada da rodada 2 de ${roundFadeIn.length} quadros (esperava ~15)`,
  );
  const spawnX = roundFadeIn[0].level.playerSpawn.x;
  assert(
    roundFadeIn.every((s) => Math.abs(s.player.x - spawnX) < 0.5 && s.player.move === null),
    `TRV-10: o player saiu do spawn ${spawnX} ou golpeou na transição: ${JSON.stringify(roundFadeIn.map((s) => [s.player.x, s.player.move]))}`,
  );
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 2,
    `KON-03: a rodada 2 deveria começar: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.area.modules.length === 2, `ARE-01: a rodada 2 tem 2 módulos: ${JSON.stringify(snap.area.modules)}`);
  assert(
    JSON.stringify(snap.area.modules) === '["beco","parque"]',
    `ARE-12: a rodada 2 deveria seguir o modules= : ${JSON.stringify(snap.area.modules)}`,
  );
  assert(colOf(snap) === 3, `KON-03: player na coluna 3 da área nova: x=${snap.player.x}`);
  assert(snap.shop.open === false, 'KON-03: a loja deveria estar fechada');
  assert(
    snap.events.filter((e) => e === 'shopClose').length === 1,
    `esperava um shopClose: ${JSON.stringify(snap.events)}`,
  );
  // ARE-11/LEG-05: corpos estáticos = sólidos mesclados da área nova + o selo, e a vista cabe na área.
  assert(
    snap.area.widthPx === widthOf(snap.area.modules) && snap.area.sealed === true,
    `área da rodada 2: ${JSON.stringify(snap.area)}`,
  );
  assert(
    snap.area.staticBodies === FLAT_SOLIDS + 1 && snap.area.exitX === snap.area.widthPx - TILE,
    `ARE-11: esperava ${FLAT_SOLIDS + 1} corpos estáticos e selo em ${snap.area.widthPx - TILE}: ${JSON.stringify(snap.area)}`,
  );
  checkCamera(snap, 'rodada 2');
  snap = await stepAndSnap(1000);
  checkCamera(snap, 'rodada 2 depois de 1 s');
  assert(
    snap.run.state === 'roundActive' && snap.run.queued + snap.run.alive > 0,
    `rodada 2 sem onda: ${JSON.stringify(snap.run)}`,
  );
  assert(camChecks > 30, `a câmera deveria ter sido medida várias vezes: ${camChecks}`);
}
