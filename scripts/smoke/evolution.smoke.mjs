// Evolução Vazio Roxo (EVO-01, EVO-03, EVO-05, EVO-06) em HD. Na sala, com Azul e Vermelho no nível 3, a loja da
// rodada oferece o Vazio Roxo; comprar funde os slots. No laboratório de efeitos, a esfera atravessa os três bonecos
// e tira 60 de cada um uma vez só.
export default async function ({ page, baseUrl, assert }) {
  const step = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&enemyGuard=0&seed=1&${query}`, { waitUntil: 'load' });
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
    await page.keyboard.press('KeyJ', { delay: 50 });
    return step(50);
  };
  // A loja lê `JustDown`: a tecla fica segurada durante um passo do jogo.
  const tap = async (code) => {
    await page.keyboard.down(code);
    await step(50);
    await page.keyboard.up(code);
    return step(20);
  };

  // EVO-01: vence a rodada na sala; a loja abre com o Vazio Roxo entre as ofertas, por 60 fragmentos.
  let s = await open('area=sala&tech=azul:3,vermelho:3&fragments=200&maxAlive=2&regen=0');
  assert(
    s.tech.slots[0]?.id === 'azul' && s.tech.slots[0]?.level === 3 && s.tech.slots[1]?.id === 'vermelho',
    `tech com nível do debug: ${JSON.stringify(s.tech.slots)}`,
  );
  for (let i = 0; i < 400 && s.run.state !== 'shop'; i++) {
    await page.keyboard.press('Digit2', { delay: 20 });
    s = await step(80);
    assert(!s.player.dead, 'o player morreu antes da loja');
  }
  assert(s.run.state === 'shop', `deveria chegar à loja: ${s.run.state}`);
  const slot = s.shop.offers.findIndex((o) => o.id === 'roxo');
  assert(slot >= 0, `EVO-01: a loja deveria oferecer o Vazio Roxo: ${JSON.stringify(s.shop.offers)}`);
  assert(s.shop.offers[slot].cost === 60, `EVO-04: preço ${s.shop.offers[slot].cost}`);

  // EVO-03: comprar funde: Vazio Roxo nível 1 no slot do Azul, o do Vermelho vazio, e os 60 saem da carteira.
  const before = s.wallet.fragments;
  s = await tap(`Digit${slot + 1}`);
  assert(
    s.tech.slots[0]?.id === 'roxo' && s.tech.slots[0]?.level === 1 && s.tech.slots[1] === null,
    `EVO-03: fusão: ${JSON.stringify(s.tech.slots)}`,
  );
  assert(before - s.wallet.fragments === 60, `EVO-04: carteira ${before} -> ${s.wallet.fragments}`);
  assert(s.events.includes('evolve:roxo'), `EVO-03: evento da fusão: ${JSON.stringify(s.events)}`);

  // EVO-05/06: no laboratório, conjura o Vazio Roxo de frente para os três bonecos; cada um perde 60 uma vez só.
  s = await open('fxlab&noshop=1&tech=roxo&regen=0');
  const dummies = s.fxlab.dummies;
  assert(dummies.length === 3, `três bonecos no laboratório: ${JSON.stringify(dummies)}`);
  const low = new Map(dummies.map((d) => [d.id, d.hp]));
  let launched = null;
  // Os eventos do snapshot se acumulam: o número de acertos é a diferença entre o fim e o começo.
  const hitsIn = (snap) => snap.events.filter((e) => e === 'purpleHit').length;
  const hits0 = hitsIn(s);
  let maxTraveled = 0;
  await page.keyboard.down('KeyL');
  s = await step(17);
  await page.keyboard.up('KeyL');
  for (let i = 0; i < 160; i++) {
    s = await step(17);
    const orb = s.techObjects.find((o) => o.kind === 'purple');
    if (orb) {
      launched ??= orb;
      maxTraveled = Math.max(maxTraveled, orb.traveled);
    }
    for (const d of s.fxlab.dummies) low.set(d.id, Math.min(low.get(d.id), d.hp));
    if (launched && !orb) break;
  }
  assert(launched, 'EVO-05: a esfera deveria nascer');
  // O último quadro com a esfera viva fica até 2 passos (2 × 17 ms × 180 px/s ≈ 6,1 px) antes do fim dos 1600 ms.
  assert(
    maxTraveled <= 288 && maxTraveled >= 288 - 6.2,
    `EVO-05: a esfera anda 180 px/s por 1600 ms (288 px): andou ${maxTraveled}`,
  );
  assert(hitsIn(s) - hits0 === 3, `EVO-06: um acerto por boneco (3): ${hitsIn(s) - hits0}`);
  for (const d of dummies) {
    assert(d.hp - low.get(d.id) === 60, `EVO-06: o boneco ${d.id} perdeu ${d.hp - low.get(d.id)} (esperava 60)`);
  }

  // EVO-06 no chefe: na arena do Oni, de frente para ele e a curta distância, a esfera tira 60 uma vez só.
  s = await open('area=modular&round=5&tech=roxo&regen=0');
  for (let i = 0; i < 200 && !(s.boss && s.boss.state !== 'intro'); i++) s = await step(50);
  assert(s.boss, 'o chefe deveria estar na arena');
  // Tenta até 4 vezes: chega a 140..260 px do chefe, de frente, com ele fora de um ataque, e conjura. Se o chefe cortar
  // a conjuração (golpe sofrido), espera a recarga e tenta de novo; vale a primeira tentativa em que a esfera voou.
  let flew = false;
  let bossHp0 = 0;
  let bossLow = 0;
  let bossHits0 = 0;
  for (let attempt = 0; attempt < 4 && !flew; attempt++) {
    for (let i = 0; i < 300; i++) {
      const d = s.boss.x - s.player.x;
      const calm = s.boss.state === 'rest';
      if (Math.abs(d) >= 140 && Math.abs(d) <= 260 && calm) break;
      const key = Math.abs(d) > 260 === d > 0 ? 'KeyD' : 'KeyA';
      await page.keyboard.down(key);
      s = await step(34);
      await page.keyboard.up(key);
    }
    const face = s.boss.x > s.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(face);
    s = await step(17);
    await page.keyboard.up(face);
    bossHp0 = s.boss.hp;
    bossLow = bossHp0;
    bossHits0 = hitsIn(s);
    await page.keyboard.down('KeyL');
    s = await step(17);
    await page.keyboard.up('KeyL');
    for (let i = 0; i < 160; i++) {
      s = await step(17);
      const orb = s.techObjects.find((o) => o.kind === 'purple');
      if (orb) flew = true;
      if (s.boss) bossLow = Math.min(bossLow, s.boss.hp);
      if (flew && !orb) break;
      if (!flew && !s.tech.cast) break;
    }
    if (!flew) s = await step(6500);
    assert(!s.player.dead, 'o player morreu tentando acertar o chefe');
  }
  assert(
    flew,
    `EVO-06: a esfera deveria voar na arena: ce ${s.ce.cur} cast ${JSON.stringify(s.tech)} ${JSON.stringify(s.events.slice(-8))} boss ${JSON.stringify(s.boss && { x: s.boss.x, st: s.boss.state })} p ${s.player.x}`,
  );
  assert(hitsIn(s) - bossHits0 === 1, `EVO-06: um acerto no chefe: ${hitsIn(s) - bossHits0}`);
  assert(bossHp0 - bossLow === 60, `EVO-06: o chefe perdeu ${bossHp0 - bossLow} (esperava 60)`);
}
