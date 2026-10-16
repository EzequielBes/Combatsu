// Escala do inimigo por rodada (ESC-01, ESC-04) com `?debug&hd=1&area=modular&seed=1&round=N`: o comum que nasce na
// rodada 9 tem 89 de HP e o da rodada 11 tem 96, lidos do inimigo vivo (maxHp e damage do EnemyBrain e do golpe). A
// rodada 10 nunca entra: é de chefe e não tem comum para medir (ESC-04.11).
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  /** Abre o jogo já na rodada `round`, começa a run e devolve um snapshot com pelo menos um inimigo comum. */
  const spawnAt = async (round) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=1&round=${round}`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__game?.snapshot === 'function', { timeout: 15_000 });
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let snap = await stepAndSnap(300);
    for (let i = 0; i < 40 && snap.enemies.length === 0; i++) snap = await stepAndSnap(300);
    assert(snap.run.round === round, `a run deveria começar na rodada ${round}: ${JSON.stringify(snap.run)}`);
    assert(snap.enemies.length > 0, `nenhum inimigo comum nasceu na rodada ${round}`);
    return snap;
  };

  for (const [round, hp, damage] of [
    [9, 89, 17],
    [11, 96, 18],
  ]) {
    let snap = await spawnAt(round);
    for (const e of snap.enemies) {
      assert(e.maxHp === hp, `ESC-01.2: o comum da rodada ${round} deveria ter ${hp} de HP: ${JSON.stringify(e)}`);
    }
    // O `damage` do snapshot inclui a arma do inimigo armado (ARM-): o dano escalado se lê no comum sem arma.
    let bare = snap.enemies.find((e) => e.weapon === null);
    for (let i = 0; i < 40 && !bare; i++) {
      snap = await stepAndSnap(300);
      bare = snap.enemies.find((e) => e.weapon === null);
    }
    assert(bare, `nenhum comum sem arma na rodada ${round}: ${JSON.stringify(snap.enemies)}`);
    assert(
      bare.damage === damage,
      `ESC-01: o comum da rodada ${round} deveria bater com ${damage}: ${JSON.stringify(bare)}`,
    );
    assert(
      snap.difficulty.round === round && Math.abs(snap.difficulty.hpMul - (1 + 0.06 * (round - 1))) < 1e-9,
      `ESC-05: difficulty da rodada ${round} errado: ${JSON.stringify(snap.difficulty)}`,
    );
  }
}
