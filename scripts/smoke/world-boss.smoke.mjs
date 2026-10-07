// Santuário (ARE-03, TRV-02/03 com o chefe) com `?debug&round=5&seed=5`: a rodada de chefe é só o módulo `santuario`,
// o Oni nasce, e a vitória leva a `traverse` com o selo aberto. O `area=modular` evita que o runner force a sala.
const TILE = 32;

export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&area=modular&enemyGuard=0&seed=5&round=5`, { waitUntil: 'load' });
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
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const press = async (key, ms = 17) => {
    await page.keyboard.press(key, { delay: 50 });
    return step(ms);
  };

  await step(20);
  let s = await press('KeyJ', 50);

  // ARE-03: a rodada de chefe é só o santuário (40 colunas + parede + selo), com o selo fechado.
  assert(s.run.round === 5 && s.run.state === 'roundActive', `esperava a rodada 5 ativa: ${JSON.stringify(s.run)}`);
  assert(
    JSON.stringify(s.area.modules) === '["santuario"]',
    `ARE-03: esperava só o santuario: ${JSON.stringify(s.area.modules)}`,
  );
  assert(s.area.mode === 'modular' && s.area.widthPx === 42 * TILE, `largura do santuario: ${JSON.stringify(s.area)}`);
  assert(
    s.area.sealed === true && s.area.exitX === 41 * TILE,
    `o selo do santuario deveria estar fechado: ${JSON.stringify(s.area)}`,
  );
  const staticBefore = s.area.staticBodies;
  assert(s.boss && s.boss.name === 'Oni do Portão', `o chefe deveria nascer: ${JSON.stringify(s.boss)}`);
  // O chefe nasce dentro da área do santuário (0 a 1344 px), não nas coordenadas da sala.
  assert(s.boss.x >= 0 && s.boss.x <= s.area.widthPx, `chefe fora da área: x=${s.boss.x}`);

  // Golpes de teste até o chefe morrer; o player recebe cura na vitória, então a tecla 4 não é preciso.
  for (let i = 0; i < 200 && s.boss && s.boss.state !== 'dead' && s.run.state === 'roundActive'; i++) {
    s = await press('Digit2', 17);
    if (s.events.includes('bossDefeatedFx')) break;
    s = await step(80);
    assert(!s.player.dead, 'o player morreu antes do chefe');
  }
  assert(s.events.includes('bossDefeatedFx'), `chefe não morreu: ${JSON.stringify(s.boss)} player ${s.player.hp}`);

  // Edge case: vencer o chefe leva a traverse e o selo do santuário abre como qualquer outro (TRV-02/03).
  for (let i = 0; i < 100 && s.run.state === 'roundActive'; i++) s = await step(50);
  assert(
    s.run.state === 'traverse' && s.run.round === 5,
    `depois da vitória esperava traverse na rodada 5: ${JSON.stringify(s.run)}`,
  );
  assert(s.area.sealed === false, `o selo do santuario deveria abrir: ${JSON.stringify(s.area)}`);
  assert(
    s.area.staticBodies === staticBefore - 1,
    `o corpo do selo deveria sair do mundo: ${staticBefore} -> ${s.area.staticBodies}`,
  );
  assert(s.boss === null, `o chefe deveria sumir: ${JSON.stringify(s.boss)}`);
}
