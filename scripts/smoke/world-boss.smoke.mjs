// Santuário (ARE-03, ARN-12: 48 colunas + parede + selo; TRV-02/03 com o chefe) com `?debug&round=5&seed=5`: a rodada de chefe é só o módulo `santuario`,
// o Oni nasce, e a vitória leva a `traverse` com o selo aberto. O `area=modular` evita que o runner force a sala.
const TILE = 32;

export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=5&round=5`, { waitUntil: 'load' });
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
  assert(s.area.mode === 'modular' && s.area.widthPx === 50 * TILE, `largura do santuario: ${JSON.stringify(s.area)}`);
  assert(
    s.area.sealed === true && s.area.exitX === 49 * TILE,
    `o selo do santuario deveria estar fechado: ${JSON.stringify(s.area)}`,
  );
  // ARN-05: o fundo da arena recebe o arquétipo do chefe da rodada (o Oni na rodada 5).
  assert(s.area.arenaVariant === 'oni', `ARN-05: arquétipo da arena: ${s.area.arenaVariant}`);
  // ARN-01/05: lido das camadas vivas do fundo: o céu do Véu na distante e o Oni na média.
  assert(
    s.area.background.far === 'veil' && s.area.background.variant === 'oni',
    `ARN-01/05: fundo da arena do Oni: ${JSON.stringify(s.area.background)}`,
  );
  const staticBefore = s.area.staticBodies;
  assert(s.boss && s.boss.name === 'Oni do Portão', `o chefe deveria nascer: ${JSON.stringify(s.boss)}`);
  // O chefe nasce dentro da área do santuário (0 a 1600 px), não nas coordenadas da sala.
  assert(s.boss.x >= 0 && s.boss.x <= s.area.widthPx, `chefe fora da área: x=${s.boss.x}`);

  // ARN-07: a arena fecha dos dois lados; o selo da esquerda usa o frame do talismã.
  assert(
    s.area.leftSeal && s.area.leftSeal.frame === 'seal' && s.area.leftSeal.alpha === 1,
    `ARN-07: selo da esquerda na luta: ${JSON.stringify(s.area.leftSeal)}`,
  );
  // ARN-09/10: o véu vermelho existe, preso à câmera na profundidade −7, apagado na fase 1.
  const RED = 0xb3314f;
  assert(
    s.area.veil && s.area.veil.depth === -7 && s.area.veil.color === RED && s.area.veil.scroll === 0,
    `ARN-09: véu da arena: ${JSON.stringify(s.area.veil)}`,
  );
  assert(
    s.boss.phase === 1 && s.area.veil.alpha === 0,
    `ARN-10: véu apagado na fase 1: ${JSON.stringify(s.area.veil)}`,
  );

  // Golpes de teste até o chefe morrer; o player recebe cura na vitória, então a tecla 4 não é preciso.
  let sawPhase2 = false;
  for (let i = 0; i < 200 && s.boss && s.boss.state !== 'dead' && s.run.state === 'roundActive'; i++) {
    s = await press('Digit2', 17);
    if (s.events.includes('bossDefeatedFx')) break;
    s = await step(80);
    assert(!s.player.dead, 'o player morreu antes do chefe');
    // ARN-09: nas fases 2 e 3 (chefe vivo) o véu fica em 0,18.
    if (s.boss && s.boss.hp > 0 && s.boss.phase >= 2) {
      sawPhase2 = true;
      assert(Math.abs(s.area.veil.alpha - 0.18) < 1e-9, `ARN-09: véu na fase ${s.boss.phase}: ${s.area.veil.alpha}`);
    }
  }
  assert(sawPhase2, 'o chefe deveria passar pela fase 2 antes de morrer');
  assert(s.events.includes('bossDefeatedFx'), `chefe não morreu: ${JSON.stringify(s.boss)} player ${s.player.hp}`);
  // ARN-11: 600 ms depois da vitória o véu já desceu a 0; antes disso ainda estava aceso.
  const veilAtDeath = s.area.veil.alpha;
  s = await step(650);
  assert(veilAtDeath > 0, `ARN-11: o véu deveria estar aceso na morte do chefe: ${veilAtDeath}`);
  assert(
    s.area.veil && s.area.veil.alpha === 0,
    `ARN-11: véu 650 ms depois da vitória: ${JSON.stringify(s.area.veil)}`,
  );

  // Edge case: vencer o chefe leva a traverse e o selo do santuário abre como qualquer outro (TRV-02/03).
  for (let i = 0; i < 100 && s.run.state === 'roundActive'; i++) s = await step(50);
  assert(
    s.run.state === 'traverse' && s.run.round === 5,
    `depois da vitória esperava traverse na rodada 5: ${JSON.stringify(s.run)}`,
  );
  assert(s.area.sealed === false, `o selo do santuario deveria abrir: ${JSON.stringify(s.area)}`);

  // ARN-08: o selo da esquerda queima junto com o da direita. Os tweens andam no relógio de parede (ver world-exit):
  // passos curtos com pausa real até os dois sumirem, conferindo que os dois esmaecem lado a lado.
  const burn = await page.evaluate(async () => {
    const t0 = performance.now();
    const pairs = [];
    for (;;) {
      window.__game.step(16);
      const a = window.__game.snapshot().area;
      if ((a.leftSeal === null && a.seal === null) || performance.now() - t0 > 3000) {
        return { ms: performance.now() - t0, pairs, left: a.leftSeal, right: a.seal };
      }
      pairs.push([a.leftSeal?.alpha ?? 0, a.seal?.alpha ?? 0]);
      await new Promise((resolve) => setTimeout(resolve, 4));
    }
  });
  assert(burn.left === null && burn.right === null, `ARN-08: os dois selos deveriam sumir: ${JSON.stringify(burn)}`);
  assert(
    burn.pairs.length > 3 && burn.pairs.every(([l, r]) => Math.abs(l - r) < 0.15),
    `ARN-08: o selo da esquerda deveria esmaecer junto com o da direita: ${JSON.stringify(burn.pairs)}`,
  );
  assert(
    s.area.staticBodies === staticBefore - 1,
    `o corpo do selo deveria sair do mundo: ${staticBefore} -> ${s.area.staticBodies}`,
  );
  assert(s.boss === null, `o chefe deveria sumir: ${JSON.stringify(s.boss)}`);

  // ARN-05: na rodada 15 a arena é da Tecelã, lida do jogo vivo.
  await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=5&round=15`, { waitUntil: 'load' });
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
  await step(20);
  s = await press('KeyJ', 50);
  assert(
    s.run.round === 15 && s.area.arenaVariant === 'tecela',
    `ARN-05: arena da rodada 15: ${s.run.round} ${s.area.arenaVariant}`,
  );
  assert(
    s.area.background.far === 'veil' && s.area.background.variant === 'tecela',
    `ARN-01/05: fundo da arena da Tecelã: ${JSON.stringify(s.area.background)}`,
  );
}
