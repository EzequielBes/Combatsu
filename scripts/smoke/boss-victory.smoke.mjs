// Barra do chefe, faixas e vitória (BHUD-01..07, BWIN-01..03, BOSS-04/07), com `?debug&seed=1&round=5`.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1&round=5`, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    try {
      return !!window.__game.snapshot();
    } catch {
      return false;
    }
  }, { timeout: 15_000 });
  const step = (ms) => page.evaluate((m) => {
    window.__game.step(m);
    return window.__game.snapshot();
  }, ms);
  const press = async (key, ms = 17) => {
    await page.keyboard.press(key, { delay: 50 });
    return step(ms);
  };

  await step(20);
  let s = await press('KeyJ', 50);
  assert(s.boss && s.boss.name === 'Oni do Portão', `chefe esperado na rodada 5: ${JSON.stringify(s.boss)}`);

  // BHUD-05: faixa do chefe visível em ~1400 ms e fora em ~1600 ms.
  assert(s.hud.banner === 'Chefe: Oni do Portão', `faixa de entrada: ${s.hud.banner}`);
  s = await step(1350);
  assert(s.hud.banner === 'Chefe: Oni do Portão', `faixa deveria seguir em ~1400 ms: ${s.hud.banner}`);
  s = await step(200);
  assert(s.hud.banner !== 'Chefe: Oni do Portão', `faixa deveria ter sumido em ~1600 ms: ${s.hud.banner}`);

  // BHUD-01/07: barra de 400 px com nome e marcas em 66% e 33%, fora da câmera do mundo.
  const bar = s.hud.bossBar;
  assert(bar.visible && bar.name === 'Oni do Portão', `barra: ${JSON.stringify(bar)}`);
  assert(bar.width === 400, `largura da barra ${bar.width}`);
  assert(Math.abs(bar.marks[0] - 264) <= 1 && Math.abs(bar.marks[1] - 132) <= 1, `marcas ${JSON.stringify(bar.marks)}`);
  assert(s.hud.bossBarIgnoredByMain === true, 'barra do chefe deveria ser ignorada pela câmera principal');

  // BHUD-02: depois de um golpe, o preenchimento acompanha hp / maxHp.
  s = await press('Digit2', 100);
  assert(s.boss.hp < s.boss.maxHp, `golpe de teste deveria tirar hp: ${s.boss.hp}`);
  const expected = (400 * s.boss.hp) / s.boss.maxHp;
  assert(Math.abs(s.hud.bossBar.fillWidth - expected) <= 1, `fill ${s.hud.bossBar.fillWidth} esperado ${expected}`);

  // Golpes de teste até o chefe morrer, medindo a vida do player logo antes de cada golpe.
  const killsBefore = s.run.kills;
  let hpBefore = s.player.hp;
  for (let i = 0; i < 200 && s.boss && s.boss.state !== 'dead' && s.run.state === 'roundActive'; i++) {
    hpBefore = s.player.hp;
    s = await press('Digit2', 17);
    if (s.events.includes('bossDefeatedFx')) break;
    s = await step(80);
  }
  assert(s.events.includes('bossDefeatedFx'), `chefe não morreu: ${JSON.stringify(s.boss)} player ${s.player.hp}`);
  assert(!s.player.dead, 'o player morreu antes do chefe');

  // BWIN-02: logo após o golpe fatal, congelado com ~250 ms restantes (o golpe de 90 ms não encurta).
  assert(s.hitstop.frozen && s.hitstop.remainingMs > 200 && s.hitstop.remainingMs <= 250,
    `hitstop da vitória: ${JSON.stringify(s.hitstop)}`);
  // BWIN-01: cura de round(0,3 × 100) = 30, com teto em 100.
  assert(s.player.hp === Math.min(100, hpBefore + 30), `cura: antes ${hpBefore}, depois ${s.player.hp}`);
  // BHUD-03: barra some na hora.
  assert(s.hud.bossBar.visible === false, 'barra deveria sumir ao derrotar o chefe');

  s = await step(300);
  assert(!s.hitstop.frozen, 'hitstop deveria ter acabado');
  // BOSS-04/07: um abate e intermission; o chefe some depois do hitstop.
  assert(s.run.kills === killsBefore + 1, `kills ${killsBefore} -> ${s.run.kills}`);
  assert(s.run.state === 'intermission', `estado ${s.run.state}`);
  assert(s.boss === null, `chefe deveria sumir: ${JSON.stringify(s.boss)}`);
  // BHUD-03: "Chefe derrotado!" por 2000 ms de jogo (o hitstop congela o tempo, então dos 300 ms acima só ~50
  // contam) e depois "Rodada 5 concluída".
  assert(s.hud.banner === 'Chefe derrotado!', `faixa da vitória: ${s.hud.banner}`);
  s = await step(1850);
  assert(s.hud.banner === 'Chefe derrotado!', `faixa da vitória deveria seguir em ~1900 ms: ${s.hud.banner}`);
  s = await step(150);
  assert(s.hud.banner === 'Rodada 5 concluída', `depois da vitória: ${s.hud.banner}`);
  // BWIN-03: um único efeito de derrota.
  assert(s.events.filter((e) => e === 'bossDefeatedFx').length === 1, `bossDefeatedFx: ${JSON.stringify(s.events)}`);
}
