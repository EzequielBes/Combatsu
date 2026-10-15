// Tela de fim e recomeço rápido (END-*, RST-*, DMG-06) em HD no mundo modular. O jogo só anda por `step`, em passos
// fixos de 1000/60 ms: o tempo desde a morte é contado em passos a partir do update que emitiu o `gameOver`.
const STEP_MS = 1000 / 60;

export default async function ({ page, baseUrl, assert }) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  // Sem inimigos (`spawn=0`): ninguém bate no player e a run morre sem dano causado (END-09).
  const open = async () => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&nosave=1&spawn=0`, { waitUntil: 'load' });
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
  };
  const stepSnap = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const frames = (n) => stepSnap(n * STEP_MS);

  /** Começa a run e mata o player pela tecla 3; devolve o snapshot do update da morte (tempo 0). */
  const startAndDie = async () => {
    await open();
    await page.keyboard.press('KeyJ', { delay: 50 });
    let snap = await stepSnap(300);
    assert(snap.run.state === 'roundActive', `a run deveria começar: ${JSON.stringify(snap.run)}`);
    await page.keyboard.press('Digit3', { delay: 50 });
    for (let i = 0; i < 120 && snap.run.state !== 'gameOver'; i++) snap = await frames(1);
    assert(snap.run.state === 'gameOver', `o player deveria morrer: ${JSON.stringify(snap.run)}`);
    return snap;
  };

  // END-01/02/03/09/12/15: o painel abre na morte com o resumo e o texto central some.
  let snap = await startAndDie();
  const panel = snap.record.panel;
  assert(panel.visible, `END-01: painel deveria abrir na morte: ${JSON.stringify(panel)}`);
  assert(snap.hud.center === null, `END-02: hud.center deveria ser null: ${JSON.stringify(snap.hud.center)}`);
  const expected = [
    `Rodada alcançada: ${snap.run.round}`,
    `Abates: ${snap.run.kills}`,
    `Fragmentos: ${snap.wallet.fragments}`,
    'Dano: nenhum',
  ];
  for (const line of expected)
    assert(panel.lines.includes(line), `END-03/09: falta "${line}": ${JSON.stringify(panel.lines)}`);
  assert(
    panel.lines.at(-1) === 'J / Enter para tentar de novo',
    `END-12: última linha: ${JSON.stringify(panel.lines)}`,
  );
  const { x, y, w, h } = panel.bounds;
  assert(
    x >= 0 && y >= 0 && x + w <= 960 && y + h <= 540,
    `END-01: painel fora de 960x540: ${JSON.stringify(panel.bounds)}`,
  );
  assert(
    Math.abs(x + w / 2 - 480) <= 1 && Math.abs(y + h / 2 - 270) <= 1,
    `END-01: painel fora do centro: ${JSON.stringify(panel.bounds)}`,
  );
  assert(
    snap.record.marker.visible === false,
    `RMK-04: marcador escondido no gameOver: ${JSON.stringify(snap.record.marker)}`,
  );

  // RST-03: J apertado aos 966 ms (o último passo cujo update seguinte ainda cai antes de 1000 ms) não sai do gameOver.
  snap = await frames(58);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await frames(1);
  assert(
    snap.run.state === 'gameOver',
    `RST-03: J antes de 1000 ms deveria ficar em gameOver: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.record.panel.visible, 'RST-03: o painel deveria continuar visível');

  // RST-01/02/04: nova morte; J aos 1000 ms → `roundActive` na r1 no update seguinte e o player pronto antes de 3000 ms.
  snap = await startAndDie();
  const pageId = await page.evaluate(() => (window.__recordEndPage ??= Math.random()));
  snap = await frames(60);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let elapsed = 60;
  snap = await frames(1);
  elapsed++;
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `RST-01: J aos 1000 ms deveria abrir a r1 no update seguinte: ${JSON.stringify(snap.run)}`,
  );
  const ready = (s) => s.run.state === 'roundActive' && !s.player.dead && s.player.hp === s.player.maxHp;
  while (!ready(snap) && elapsed * STEP_MS < 3000) {
    snap = await frames(1);
    elapsed++;
  }
  assert(
    ready(snap) && elapsed * STEP_MS <= 3000,
    `RST-02: player pronto em ${Math.round(elapsed * STEP_MS)} ms: ${JSON.stringify({ run: snap.run, player: snap.player })}`,
  );
  // END-13 e DMG-06: o painel some e o registro de dano zera na run nova.
  assert(snap.record.panel.visible === false, `END-13: o painel deveria sumir: ${JSON.stringify(snap.record.panel)}`);
  const damage = Object.values(snap.record.damage);
  assert(
    damage.length > 0 && damage.every((d) => d === 0),
    `DMG-06: dano zerado: ${JSON.stringify(snap.record.damage)}`,
  );
  // RST-04: a mesma página (sem recarregar).
  assert(
    (await page.evaluate(() => window.__recordEndPage)) === pageId,
    'RST-04: o recomeço não pode recarregar a página',
  );
  assert(errors.length === 0, `erros na página: ${errors.join(' | ')}`);
}
