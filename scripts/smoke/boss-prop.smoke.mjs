// Objeto arremessado acerta o chefe (PRB-04) e o sprite do chefe é desenhado entre os passos de física (ITP-07),
// com `?debug&seed=1&round=5`. O player pega a garrafa (x=368), anda até x~700 e espera: a investida do chefe sai
// de x~1228, anda 360 px e para em `rest` a ~170 px, fora do alcance da hitbox dela. Aí a garrafa é arremessada.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1&round=5`, { waitUntil: 'load' });
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
  const snap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => snap(16);
  const hold = async (code, ms) => {
    await page.keyboard.down(code);
    const s = await snap(ms);
    await page.keyboard.up(code);
    return s;
  };

  await snap(20);
  await hold('KeyJ', 50);
  let s = await snap(50);
  assert(s.run.state === 'roundActive' && s.boss !== null, `a rodada 5 deveria ter um chefe: ${JSON.stringify(s.run)}`);
  const maxHp = s.boss.maxHp;

  // Pega a garrafa mais perto do spawn.
  const bottle = s.worldProps.filter((p) => p.key === 'bottle').sort((a, b) => a.x - b.x)[0];
  assert(bottle, `nenhuma garrafa no mapa: ${JSON.stringify(s.worldProps)}`);
  for (let i = 0; i < 200 && Math.abs(s.player.x - bottle.x) > 14; i++) s = await hold('KeyD', 16);
  s = await snap(60);
  await hold('KeyE', 50);
  s = await snap(20);
  assert(s.hud.heldItem !== null, `deveria estar segurando a garrafa: ${JSON.stringify(s.hud.heldItem)}`);

  // Anda até x~700 enquanto o chefe prepara e faz a investida; confere a posição de desenho do chefe em movimento.
  let bossHist = [];
  let bossFrames = 0;
  const watchBoss = (sn) => {
    if (!sn.boss || sn.hitstop.frozen || sn.boss.state !== 'charge') {
      bossHist = [];
      return;
    }
    bossHist.push(sn.boss.x);
    if (bossHist.length < 3) return;
    const [a, b, c] = bossHist.slice(-3);
    // Dois quadros seguidos com o mesmo dx: exatamente um passo de física neste quadro.
    if (Math.abs(c - b) > 1 && Math.abs(c - b - (b - a)) < 1e-3) {
      const expected = b + (c - b) * sn.physics.alpha;
      assert(Math.abs(sn.boss.view.x - expected) <= 0.01, `ITP-07: chefe: view ${sn.boss.view.x} deveria ser ${expected} (alfa ${sn.physics.alpha})`);
      bossFrames++;
    }
  };
  for (let i = 0; i < 400 && s.player.x < 700; i++) {
    s = await hold('KeyD', 16);
    watchBoss(s);
  }
  // Espera o chefe parar em `rest` entre 100 e 240 px à frente (a investida acabou).
  let ready = false;
  for (let i = 0; i < 400; i++) {
    const dx = s.boss.x - s.player.x;
    if (s.boss.state === 'rest' && dx >= 100 && dx <= 240) {
      ready = true;
      break;
    }
    s = await frame();
    watchBoss(s);
  }
  assert(ready, `o chefe deveria parar em rest à frente do player: ${JSON.stringify({ boss: s.boss, player: s.player.x })}`);
  assert(bossFrames >= 10, `ITP-07: a investida deveria dar pelo menos 10 quadros medidos: ${bossFrames}`);
  assert(s.player.facing === 1 && s.player.hp === s.player.maxHp, `o player deveria estar inteiro e virado para o chefe: ${JSON.stringify(s.player)}`);
  assert(s.boss.hp === maxHp, `pré-condição: chefe com a vida cheia: ${s.boss.hp}`);

  // PRB-04: arremessa; a garrafa toca o chefe, tira exatamente 12 e quebra.
  const held = s.worldProps.find((p) => p.state === 'held');
  assert(held, `nenhum objeto na mão: ${JSON.stringify(s.worldProps)}`);
  await page.keyboard.down('KeyE');
  let hit = false;
  for (let i = 0; i < 60; i++) {
    s = await frame();
    if (i === 3) await page.keyboard.up('KeyE');
    if (s.boss.hp < maxHp) {
      hit = true;
      break;
    }
  }
  await page.keyboard.up('KeyE');
  assert(hit, `PRB-04: a garrafa deveria acertar o chefe: ${JSON.stringify({ boss: s.boss, props: s.worldProps })}`);
  assert(s.boss.hp === maxHp - 12, `PRB-04: a garrafa tira exatamente 12: ${maxHp} -> ${s.boss.hp}`);
  const after = s.worldProps.find((p) => p.id === held.id);
  assert(after && after.state === 'breaking', `PRB-04: a garrafa deveria estar quebrando: ${JSON.stringify(after)}`);
}
