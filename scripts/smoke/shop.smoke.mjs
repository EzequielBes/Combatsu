// Loja da run (SHOP-01..47, MOD-04) com `?debug&seed=1&fragments=N`: limpa a rodada 1, a loja abre com a carteira
// cheia, nada anda, compra, recusa, rerola, navega com D/J e `Enter` começa a rodada 2.
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  // A loja lê `JustDown` no update: a tecla fica segurada durante um passo.
  const tap = async (code) => {
    await page.keyboard.down(code);
    await stepAndSnap(50);
    await page.keyboard.up(code);
    return stepAndSnap(20);
  };

  /** Começa uma run e limpa a rodada 1 até a loja abrir; devolve o último snapshot antes dela e o primeiro nela. */
  const openShop = async (fragments) => {
    await page.goto(`${baseUrl}?debug&seed=1&fragments=${fragments}`, { waitUntil: 'load' });
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
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let snap = await stepAndSnap(50);
    assert(snap.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(snap.run)}`);
    for (let i = 0; i < 40 && snap.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 50 });
      snap = await stepAndSnap(300);
    }
    assert(snap.run.state === 'intermission', `rodada 1 não limpou: ${JSON.stringify(snap.run)}`);
    let before = snap;
    for (let i = 0; i < 200 && snap.run.state === 'intermission'; i++) {
      before = snap;
      snap = await stepAndSnap(20);
    }
    return { before, snap };
  };

  // SHOP-23: a run começa com os 200 fragmentos do debug.
  let { before, snap } = await openShop(200);

  // SHOP-01/32: a intermissão termina na loja, com um único `shopOpen:1`.
  assert(snap.run.state === 'shop' && snap.run.round === 1, `loja deveria abrir após a rodada 1: ${JSON.stringify(snap.run)}`);
  assert(snap.events.filter((e) => e === 'shopOpen:1').length === 1, `esperava um shopOpen:1: ${JSON.stringify(snap.events)}`);
  assert(snap.shop.open === true, `shop.open deveria ser true (SHOP-22): ${JSON.stringify(snap.shop)}`);

  // SHOP-05/36/37: fragmentos do chão vão para a carteira; gotas de cura ficam onde estavam.
  const swept = before.pickups.filter((p) => p.kind === 'fragment').reduce((n, p) => n + p.value, 0);
  assert(
    snap.wallet.fragments === before.wallet.fragments + swept,
    `carteira ${snap.wallet.fragments} != ${before.wallet.fragments} + ${swept} varridos (SHOP-05)`,
  );
  assert(snap.wallet.fragments >= 200, `carteira deveria ter os 200 do debug: ${snap.wallet.fragments}`);
  assert(!snap.pickups.some((p) => p.kind === 'fragment'), `SHOP-36: fragmento sobrou na loja: ${JSON.stringify(snap.pickups)}`);
  const healsBefore = before.pickups.filter((p) => p.kind === 'heal').map((p) => p.id).sort();
  const healsNow = snap.pickups.filter((p) => p.kind === 'heal').map((p) => p.id).sort();
  assert(JSON.stringify(healsBefore) === JSON.stringify(healsNow), `SHOP-37: gotas mudaram: ${JSON.stringify(snap.pickups)}`);

  // SHOP-06/27/17: 3 ofertas distintas, seleção no slot 0 e reroll a 5.
  assert(snap.shop.offers.length === 3, `esperava 3 ofertas: ${JSON.stringify(snap.shop.offers)}`);
  assert(new Set(snap.shop.offers.map((o) => o.id)).size === 3, `ofertas repetidas: ${JSON.stringify(snap.shop.offers)}`);
  assert(snap.shop.selected === 0 && snap.shop.rerollCost === 5, `seleção/reroll iniciais errados: ${JSON.stringify(snap.shop)}`);

  // SHOP-02/33: 1 s de loja não move nada nem faz nascer inimigo.
  const frozen = await stepAndSnap(1000);
  assert(frozen.run.state === 'shop' && frozen.run.round === 1, `loja deveria segurar a rodada: ${JSON.stringify(frozen.run)}`);
  // Corpos da rodada 1 ficam congelados na cena; nascer = id novo.
  const knownIds = new Set(snap.enemies.map((e) => e.id));
  assert(
    frozen.run.alive === 0 && frozen.enemies.every((e) => knownIds.has(e.id)),
    `SHOP-02: inimigo nasceu na loja: ${JSON.stringify(frozen.enemies)}`,
  );
  assert(
    frozen.player.x === snap.player.x && frozen.player.y === snap.player.y,
    `SHOP-33: player andou na loja: ${snap.player.x},${snap.player.y} -> ${frozen.player.x},${frozen.player.y}`,
  );
  assert(
    JSON.stringify(frozen.pickups) === JSON.stringify(snap.pickups),
    `SHOP-33: pickups mudaram na loja: ${JSON.stringify(frozen.pickups)}`,
  );
  snap = frozen;

  // SHOP-13: `cura` com a vida cheia é recusada (só se ela estiver na loja e o player estiver cheio).
  const curaSlot = snap.shop.offers.findIndex((o) => o.id === 'cura');
  if (curaSlot >= 0 && snap.player.hp === snap.player.maxHp) {
    const wallet = snap.wallet.fragments;
    snap = await tap(`Digit${curaSlot + 1}`);
    assert(snap.events.includes('buyRefused:cura:fullHp'), `SHOP-13: esperava buyRefused:cura:fullHp: ${JSON.stringify(snap.events)}`);
    assert(snap.wallet.fragments === wallet, `SHOP-13: carteira mudou na recusa: ${snap.wallet.fragments}`);
  }

  // SHOP-45/19/41/42/43: compra a primeira oferta de modificador pela tecla do slot.
  const slot = snap.shop.offers.findIndex((o) => o.id !== 'cura');
  const offer = snap.shop.offers[slot];
  const walletBefore = snap.wallet.fragments;
  const levelBefore = snap.modifiers[offer.id];
  const maxHpBefore = snap.player.maxHp;
  snap = await tap(`Digit${slot + 1}`);
  assert(snap.wallet.fragments === walletBefore - offer.cost, `SHOP-19: carteira ${walletBefore} - ${offer.cost} != ${snap.wallet.fragments}`);
  assert(snap.modifiers[offer.id] === levelBefore + 1, `SHOP-41: nível de ${offer.id} não subiu: ${JSON.stringify(snap.modifiers)}`);
  assert(snap.shop.offers[slot].sold === true, `SHOP-42: oferta não ficou vendida: ${JSON.stringify(snap.shop.offers)}`);
  assert(
    snap.events.filter((e) => e === `buy:${offer.id}:${offer.cost}`).length === 1,
    `SHOP-43: esperava um buy:${offer.id}:${offer.cost}: ${JSON.stringify(snap.events)}`,
  );
  // MOD-04: comprar `vida` sobe a vida máxima em 15.
  if (offer.id === 'vida') assert(snap.player.maxHp === maxHpBefore + 15, `MOD-04: maxHp ${snap.player.maxHp}`);

  // SHOP-11: a mesma tecla de novo não compra a carta vendida.
  const afterBuy = snap.wallet.fragments;
  snap = await tap(`Digit${slot + 1}`);
  assert(snap.wallet.fragments === afterBuy, `SHOP-11: comprou carta vendida: ${snap.wallet.fragments}`);

  // SHOP-16/25/46: reroll custa 5, sobe para 10 e a dica mostra o novo custo.
  const walletBeforeReroll = snap.wallet.fragments;
  snap = await tap('KeyR');
  assert(snap.run.state === 'shop', `R não pode reiniciar a cena na loja: ${JSON.stringify(snap.run)}`);
  assert(snap.wallet.fragments === walletBeforeReroll - 5, `SHOP-16: reroll deveria custar 5: ${snap.wallet.fragments}`);
  assert(snap.shop.rerollCost === 10, `SHOP-25: reroll deveria ir para 10: ${snap.shop.rerollCost}`);
  assert(snap.shop.offers.every((o) => !o.sold), `reroll deveria trazer 3 ofertas novas: ${JSON.stringify(snap.shop.offers)}`);

  // SHOP-28/30: D, D leva a seleção ao slot 2 e J compra essa carta.
  snap = await tap('KeyD');
  snap = await tap('KeyD');
  assert(snap.shop.selected === 2, `SHOP-28: seleção deveria estar no slot 2: ${snap.shop.selected}`);
  const third = snap.shop.offers[2];
  const canBuyThird = third.affordable && !(third.id === 'cura' && snap.player.hp === snap.player.maxHp);
  const walletBeforeJ = snap.wallet.fragments;
  snap = await tap('KeyJ');
  if (canBuyThird) {
    assert(snap.events.includes(`buy:${third.id}:${third.cost}`), `SHOP-30: J não comprou o slot 2: ${JSON.stringify(snap.events)}`);
    assert(snap.wallet.fragments === walletBeforeJ - third.cost, `SHOP-30: carteira errada: ${snap.wallet.fragments}`);
  }

  // SHOP-03/35: Enter fecha a loja e começa a rodada 2.
  snap = await tap('Enter');
  assert(snap.run.state === 'roundActive' && snap.run.round === 2, `SHOP-03: rodada 2 não começou: ${JSON.stringify(snap.run)}`);
  assert(snap.events.filter((e) => e === 'shopClose').length === 1, `SHOP-35: esperava um shopClose: ${JSON.stringify(snap.events)}`);
  assert(snap.shop.open === false, `shop.open deveria ser false fora da loja: ${JSON.stringify(snap.shop)}`);

  // SHOP-20: fora da loja, Enter não compra nada.
  const buys = snap.events.filter((e) => e.startsWith('buy')).length;
  snap = await tap('Enter');
  assert(snap.events.filter((e) => e.startsWith('buy')).length === buys, `SHOP-20: comprou fora da loja: ${JSON.stringify(snap.events)}`);

  // SHOP-10: sem fragmentos, qualquer compra é recusada por saldo e nada muda.
  ({ snap } = await openShop(0));
  const pricey = snap.shop.offers.findIndex((o) => o.cost > snap.wallet.fragments && o.id !== 'cura');
  assert(pricey >= 0, `esperava uma oferta cara com a carteira ${snap.wallet.fragments}: ${JSON.stringify(snap.shop.offers)}`);
  const poor = snap.wallet.fragments;
  const levels = JSON.stringify(snap.modifiers);
  const id = snap.shop.offers[pricey].id;
  snap = await tap(`Digit${pricey + 1}`);
  assert(snap.events.includes(`buyRefused:${id}:funds`), `SHOP-10: esperava buyRefused:${id}:funds: ${JSON.stringify(snap.events)}`);
  assert(snap.wallet.fragments === poor && JSON.stringify(snap.modifiers) === levels, 'SHOP-10: recusa mudou carteira ou níveis');
  // SHOP-26: reroll sem saldo também é recusado (só quando o saldo não cobre os 5).
  if (snap.wallet.fragments < 5) {
    snap = await tap('KeyR');
    assert(snap.events.includes('rerollRefused'), `SHOP-26: esperava rerollRefused: ${JSON.stringify(snap.events)}`);
  }
}
