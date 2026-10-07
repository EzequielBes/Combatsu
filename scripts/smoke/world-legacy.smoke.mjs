// Modos da cena (LEG-01, LEG-02, LEG-04): `area=sala` e `fxlab` usam a `LEVEL_1` com o fluxo antigo (intermission de
// 2500 ms, loja na mesma sala, sem selo nem konbini); `?debug` puro é o mundo modular. A sala tem 40 colunas.
const ROOM_PX = 40 * 32;

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
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** Abre `query` sem passar pelo `page.goto` do runner (que acrescentaria `area=sala` à URL pura). */
  const openRaw = async (query) => {
    await page.goto(`${baseUrl}?debug&area=sala`, { waitUntil: 'load' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.evaluate((url) => window.location.assign(url), `${baseUrl}${query}`),
    ]);
    await ready();
    return stepAndSnap(20);
  };

  // LEG-01: `area=sala` constrói a LEVEL_1, sem selo, e o fluxo antigo termina na loja na mesma sala.
  await page.goto(`${baseUrl}?debug&area=sala&enemyGuard=0&seed=1`, { waitUntil: 'load' });
  await ready();
  let snap = await stepAndSnap(20);
  const room = (s, where) => {
    assert(
      s.area.mode === 'sala' &&
        s.area.modules.length === 0 &&
        s.area.widthPx === ROOM_PX &&
        s.area.heightPx === 17 * 32,
      `${where}: esperava a sala de 40x17 sem módulos: ${JSON.stringify(s.area)}`,
    );
    assert(
      s.area.sealed === false && s.area.exitX === null,
      `${where}: a sala não tem selo: ${JSON.stringify(s.area)}`,
    );
  };
  room(snap, 'sala (título)');
  const bodies = snap.area.staticBodies;
  assert(bodies > 0, `a sala deveria ter corpos estáticos: ${bodies}`);

  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(50);
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `rodada 1 deveria começar: ${JSON.stringify(snap.run)}`,
  );
  room(snap, 'sala (rodada 1)');
  assert(
    Math.abs(snap.player.x - snap.level.playerSpawn.x) < 1,
    `player deveria nascer no spawn da LEVEL_1: ${snap.player.x} != ${snap.level.playerSpawn.x}`,
  );
  for (let i = 0; i < 60 && snap.run.state === 'roundActive'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  // Sem `traverse`: a onda limpa leva à intermission, e 2500 ms depois à loja, na mesma sala.
  assert(snap.run.state === 'intermission', `LEG-01: esperava intermission, sem traverse: ${JSON.stringify(snap.run)}`);
  assert(
    !snap.events.some((e) => e.startsWith('areaBuilt:')),
    `LEG-01: a sala não reconstrói: ${JSON.stringify(snap.events)}`,
  );
  let elapsed = 0;
  for (let i = 0; i < 200 && snap.run.state === 'intermission'; i++) {
    snap = await stepAndSnap(50);
    elapsed += 50;
    assert(snap.run.state !== 'traverse', 'LEG-01: a sala nunca entra em traverse');
  }
  assert(snap.run.state === 'shop', `LEG-01: a intermission deveria terminar na loja: ${JSON.stringify(snap.run)}`);
  assert(elapsed >= 2300 && elapsed <= 2700, `LEG-01: intermission de ${elapsed} ms (esperava ~2500)`);
  room(snap, 'sala (loja)');
  assert(
    snap.area.staticBodies === bodies && snap.shop.open === true,
    `a loja abre na mesma sala: corpos ${bodies} -> ${snap.area.staticBodies}, shop.open=${snap.shop.open}`,
  );
  assert(
    !snap.events.some((e) => e.startsWith('areaBuilt:')),
    `LEG-01: a sala não reconstrói: ${JSON.stringify(snap.events)}`,
  );

  // LEG-02: o fxlab usa a sala, com ou sem `modules=`, mesmo com `area=modular`.
  for (const query of [
    '?debug&fxlab&modules=rua',
    '?debug&fxlab&area=modular',
    '?debug&fxlab&area=modular&modules=beco',
  ]) {
    snap = await openRaw(query);
    room(snap, `fxlab ${query}`);
    assert(snap.fxlab !== null, `${query}: o laboratório de efeitos deveria estar ligado`);
  }

  // LEG-04: `?debug` puro (sem `area=sala` nem `fxlab`) é o mundo modular; a rodada 1 troca o fundo pela área sorteada.
  snap = await openRaw('?debug&seed=1');
  assert(snap.area.mode === 'modular', `LEG-04: esperava o mundo modular: ${JSON.stringify(snap.area)}`);
  assert(
    snap.area.sealed === true && snap.area.exitX !== null,
    `o fundo do título é uma área selada: ${JSON.stringify(snap.area)}`,
  );
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(50);
  assert(snap.run.state === 'roundActive', `a run deveria começar: ${JSON.stringify(snap.run)}`);
  assert(
    snap.area.mode === 'modular' && snap.area.modules.length === 2 && snap.area.widthPx !== ROOM_PX,
    `LEG-04: a rodada 1 modular tem 2 módulos: ${JSON.stringify(snap.area)}`,
  );
  assert(snap.fxlab === null, 'sem fxlab o laboratório não existe');
}
