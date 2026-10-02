// Loja de técnica e maestria (ECN-05/08, MST-01/03/07/08), com `?debug&seed=1`.
// 1) `tech=vermelho&round=2&fragments=60`: na loja da rodada 2, `offers[0]` é o Vermelho com "Nv 2/3" e custo 45.
// 2) `tech=vermelho&mastery=14`: um Vermelho que acerta um inimigo sobe para o Nv2, com banner, e a barra de maestria
//    volta a 0 (o limiar passa a 25).
export default async function ({ page, baseUrl, assert }) {
  const ready = () =>
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
  const snap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => snap(16);
  const tap = async (code) => {
    await page.keyboard.down(code);
    await snap(50);
    await page.keyboard.up(code);
    return snap(20);
  };
  const boot = async (query) => {
    await page.goto(`${baseUrl}?debug&seed=1&enemyGuard=0&${query}`, { waitUntil: 'load' });
    await ready();
    await snap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    const s = await snap(300);
    assert(s.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(s.run)}`);
    return s;
  };

  // --- 1) Loja da rodada 2: o upgrade da técnica equipada é a primeira oferta -----------------------------------------
  {
    let s = await boot('tech=vermelho&round=2&fragments=60');
    assert(s.run.round === 2, `deveria começar na rodada 2: ${JSON.stringify(s.run)}`);
    for (let i = 0; i < 120 && s.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 50 });
      s = await snap(300);
    }
    for (let i = 0; i < 400 && s.run.state !== 'shop'; i++) s = await snap(50);
    assert(s.run.state === 'shop' && s.run.round === 2, `a loja da rodada 2 deveria abrir: ${JSON.stringify(s.run)}`);
    // ECN-05: o slot 0 é o Vermelho; ECN-08: a carta mostra `Nv 2/3`; custo 30 + 15 = 45 (ECN-01).
    const o = s.shop.offers[0];
    assert(o && o.id === 'vermelho' && o.level === 1 && o.maxLevel === 3 && o.cost === 45, `ECN-05: offers[0] deveria ser o Vermelho Nv1 a 45: ${JSON.stringify(s.shop.offers)}`);
    const card = s.shop.panel.cards[0].lines;
    assert(card.includes('Nv 2/3'), `ECN-08: a carta deveria mostrar "Nv 2/3": ${JSON.stringify(card)}`);
    assert(card.includes('45'), `ECN-01: a carta deveria mostrar o custo 45: ${JSON.stringify(card)}`);
    assert(s.wallet.fragments >= 60, `a carteira deveria ter os 60 do debug: ${s.wallet.fragments}`);
    // Comprar leva o Vermelho ao Nv2 e cobra 45.
    const wallet = s.wallet.fragments;
    s = await tap('Digit1');
    assert(s.events.includes('buy:vermelho:45'), `esperava buy:vermelho:45: ${JSON.stringify(s.events)}`);
    assert(s.wallet.fragments === wallet - 45, `a carteira deveria cair 45: ${wallet} -> ${s.wallet.fragments}`);
    assert(s.tech.slots[0].id === 'vermelho' && s.tech.slots[0].level === 2, `o Vermelho deveria ir ao Nv2: ${JSON.stringify(s.tech.slots[0])}`);
  }

  // --- 2) Maestria: o acerto que completa 15 pontos sobe o nível ------------------------------------------------------------
  {
    let s = await boot('maxAlive=1&noshop=1&tech=vermelho&mastery=14');
    const slot = s.tech.slots[0];
    assert(slot.id === 'vermelho' && slot.level === 1, `o Vermelho deveria começar no Nv1: ${JSON.stringify(slot)}`);
    assert(slot.mastery.points === 14 && slot.mastery.threshold === 15, `MST-03: ?mastery=14 deveria dar 14/15: ${JSON.stringify(slot.mastery)}`);
    const bar14 = s.hud.energy.masteryBars[0];
    assert(typeof bar14 === 'number' && bar14 > 0, `MST-08: a barra com 14/15 deveria estar quase cheia: ${JSON.stringify(s.hud.energy.masteryBars)}`);

    // Espera um inimigo e fica a ~150 px dele, de frente, para o orbe acertar direto (padrão do techniques.smoke).
    let target = s.enemies[0];
    for (let i = 0; i < 40 && !target; i++) {
      s = await snap(300);
      target = s.enemies[0];
    }
    assert(target, `nenhum inimigo nasceu: ${JSON.stringify(s.enemies)}`);
    for (let i = 0; i < 400; i++) {
      const t = s.enemies.find((e) => e.id === target.id);
      if (!t) break;
      const dx = t.x - s.player.x;
      if (Math.abs(dx - 150) <= 20) break;
      const dir = dx > 150 ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      s = await snap(50);
      await page.keyboard.up(dir);
    }
    s = await snap(20);
    const t0 = s.enemies.find((e) => e.id === target.id);
    assert(t0 && Math.abs(t0.x - s.player.x - 150) <= 40, `não cheguei perto o bastante do alvo: ${JSON.stringify(t0)}`);
    const pointsBefore = s.tech.slots[0].mastery.points;
    s = await tap('KeyL');
    assert(s.tech.cast && s.tech.cast.id === 'vermelho', `o Vermelho deveria ter começado: ${JSON.stringify(s.tech.cast)}`);
    // Até a soltura (sign + charge) e o toque no alvo: o acerto soma 1 ponto (14 -> 15) e sobe de nível.
    let up = null;
    let bannerSeen = null;
    for (let i = 0; i < 120 && up === null; i++) {
      s = await frame();
      if (s.hud.banner && /Nv 2!$/.test(s.hud.banner)) bannerSeen = s.hud.banner;
      if (s.tech.slots[0].level === 2) up = s;
    }
    assert(up, `MST-03: o acerto do Vermelho nunca subiu o nível (pontos ${pointsBefore}): ${JSON.stringify(s.tech.slots[0])}`);
    // MST-07: banner "{nome} Nv 2!" (o nome é o da loja).
    for (let i = 0; i < 10 && !bannerSeen; i++) {
      s = await frame();
      if (s.hud.banner && /Nv 2!$/.test(s.hud.banner)) bannerSeen = s.hud.banner;
    }
    assert(bannerSeen && /Vermelho Nv 2!$/.test(bannerSeen), `MST-07: o banner do Nv2 não apareceu: ${s.hud.banner}`);
    // MST-01/08: os pontos zeram, o limiar vira 25 e a barra volta a 0.
    assert(up.tech.slots[0].mastery.points === 0 && up.tech.slots[0].mastery.threshold === 25, `MST-03: depois do Nv2 a maestria deveria ser 0/25: ${JSON.stringify(up.tech.slots[0].mastery)}`);
    // O HUD só redesenha fora do hitstop do acerto.
    for (let i = 0; i < 60 && (s.hitstop.frozen || s.hud.energy.masteryBars[0] !== 0); i++) s = await frame();
    assert(s.hud.energy.masteryBars[0] === 0, `MST-08: a barra de maestria deveria voltar a 0: ${JSON.stringify(s.hud.energy.masteryBars)}`);
  }
}
