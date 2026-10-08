// Builds e passivas (BLD-01, BLD-07) com `?debug&round=2&perks=condutor&fragments=N`: a run começa com a passiva do
// debug, a loja da rodada 2 oferece passivas, comprar uma a registra e ela some das ofertas seguintes.
const PERK_IDS = ['punhoPesado', 'executor', 'refluxo', 'condutor', 'passoSombrio', 'contraAfiado'];

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

  await page.goto(`${baseUrl}?debug&hd=1&enemyGuard=0&seed=1&fragments=5000&round=2&perks=condutor,naoExiste`, {
    waitUntil: 'load',
  });
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

  // BLD-01: a passiva do debug entra na run; id desconhecido é ignorado. Uma passiva vale 2 pontos na build dela.
  assert(
    JSON.stringify(snap.build.perks) === '["condutor"]',
    `esperava só a passiva do debug: ${JSON.stringify(snap.build)}`,
  );
  assert(
    snap.build.points.feiticeiro === 2 && snap.build.build === 'feiticeiro',
    `BLD-02/03: condutor deveria dar a build feiticeiro: ${JSON.stringify(snap.build)}`,
  );

  for (let i = 0; i < 60 && snap.run.state === 'roundActive'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  for (let i = 0; i < 300 && snap.run.state !== 'shop'; i++) snap = await stepAndSnap(20);
  assert(snap.run.state === 'shop', `a loja da rodada 2 deveria abrir: ${JSON.stringify(snap.run)}`);

  // BLD-07: rerola até aparecer uma passiva; a que já é do jogador nunca volta.
  const perkSlot = (s) => s.shop.offers.findIndex((o) => PERK_IDS.includes(o.id) && !o.sold);
  for (let i = 0; i < 15 && perkSlot(snap) < 0; i++) {
    assert(!snap.shop.offers.some((o) => o.id === 'condutor'), 'BLD-07: passiva já comprada voltou à loja');
    snap = await tap('KeyR');
  }
  const slot = perkSlot(snap);
  assert(slot >= 0, `nenhuma passiva em 15 rerolls: ${JSON.stringify(snap.shop.offers)}`);
  const offer = snap.shop.offers[slot];
  assert(offer.id !== 'condutor', 'BLD-07: passiva já comprada voltou à loja');
  const card = snap.shop.panel.cards[slot].lines.join(' | ');

  const walletBefore = snap.wallet.fragments;
  snap = await tap(`Digit${slot + 1}`);
  assert(
    snap.build.perks.includes(offer.id) && snap.build.perks.includes('condutor'),
    `BLD-01: ${offer.id} deveria estar nas passivas (carta: ${card}): ${JSON.stringify(snap.build)}`,
  );
  assert(
    snap.wallet.fragments === walletBefore - offer.cost,
    `a passiva deveria custar ${offer.cost}: ${walletBefore} -> ${snap.wallet.fragments}`,
  );
  assert(snap.shop.offers[slot].sold === true, `a carta deveria ficar vendida: ${JSON.stringify(snap.shop.offers)}`);
  assert(
    snap.events.includes(`buy:${offer.id}:${offer.cost}`),
    `esperava o evento de compra: ${JSON.stringify(snap.events)}`,
  );
}
