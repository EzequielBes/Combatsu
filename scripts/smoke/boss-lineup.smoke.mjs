// Escalação do chefe sorteada pela seed (BLN-08, BLN-09, BLN-11), em `?debug&hd=1&area=modular&round=5`.
// 1º cenário: duas seeds na r5 dão chefes diferentes (seed 1: Oni Ígneo; seed 5: Tecelã Invocadora); o snapshot traz
// `affixes` e `finger` do chefe vivo, iguais à escalação que a área pediu, e o fundo da arena usa o mesmo arquétipo.
// `bossArch=tecela` na r5 vale e não mexe nos afixos sorteados (o stream é consumido igual).

export default async function ({ page, baseUrl, assert }) {
  /** Abre a URL, começa a run (J) e devolve o snapshot com o chefe da r5 já em cena. */
  const bossAt = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&round=5&${query}`, { waitUntil: 'load' });
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
    await step(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let s = await step(50);
    for (let i = 0; i < 20 && !s.boss; i++) s = await step(50);
    assert(s.boss, `[${query}] o chefe deveria nascer na r5: ${JSON.stringify(s.run)}`);
    return s;
  };

  /** O chefe vivo, a escalação do diretor e o fundo da arena contam a mesma história (BLN-08, BLN-11). */
  const checkCoherent = (s, label) => {
    const lineup = s.bossLineup;
    assert(lineup && lineup.round === 5, `[${label}] escalação da r5 no snapshot: ${JSON.stringify(lineup)}`);
    assert(
      Array.isArray(s.boss.affixes) && typeof s.boss.finger === 'boolean',
      `[${label}] BLN-11: affixes e finger no snapshot do chefe: ${JSON.stringify(s.boss)}`,
    );
    assert(
      s.boss.archetype === lineup.archetype &&
        JSON.stringify(s.boss.affixes) === JSON.stringify(lineup.affixes) &&
        s.boss.finger === lineup.finger,
      `[${label}] o chefe vivo difere da escalação: ${JSON.stringify(s.boss)} x ${JSON.stringify(lineup)}`,
    );
    assert(
      s.area.arenaVariant === s.boss.archetype && s.area.background.variant === s.boss.archetype,
      `[${label}] BLN-08: fundo da arena (${s.area.arenaVariant}/${s.area.background.variant}) x chefe ${s.boss.archetype}`,
    );
    // BLN-05/PDD-01: a r5 leva um afixo leve e nunca o Portador.
    assert(
      s.boss.affixes.length === 1 && ['igneo', 'invocador'].includes(s.boss.affixes[0]) && s.boss.finger === false,
      `[${label}] r5 com 1 afixo leve e sem Portador: ${JSON.stringify(s.boss)}`,
    );
  };

  const a = await bossAt('seed=1');
  checkCoherent(a, 'seed=1');
  const b = await bossAt('seed=5');
  checkCoherent(b, 'seed=5');
  assert(
    a.boss.archetype !== b.boss.archetype || JSON.stringify(a.boss.affixes) !== JSON.stringify(b.boss.affixes),
    `goal 1: seeds 1 e 5 deveriam dar chefes diferentes: ${JSON.stringify(a.bossLineup)} x ${JSON.stringify(b.bossLineup)}`,
  );
  const names = { oni: 'Oni do Portão', tecela: 'Tecelã de Maldições' };
  assert(a.boss.name === names[a.boss.archetype], `nome do arquétipo: ${a.boss.name}`);
  assert(b.boss.name === names[b.boss.archetype], `nome do arquétipo: ${b.boss.name}`);

  // BLN-09: `bossArch` vale na r5 e os afixos seguem os do sorteio da mesma seed (o override não move o stream).
  // A seed 1 sorteia o Oni na r5, então `bossArch=tecela` troca de fato o arquétipo.
  assert(a.boss.archetype === 'oni', `a seed 1 deveria sortear o Oni na r5: ${JSON.stringify(a.bossLineup)}`);
  const tecela = await bossAt('seed=1&bossArch=tecela');
  checkCoherent(tecela, 'bossArch=tecela');
  assert(tecela.boss.archetype === 'tecela', `BLN-09: bossArch=tecela na r5: ${tecela.boss.archetype}`);
  assert(
    JSON.stringify(tecela.boss.affixes) === JSON.stringify(a.boss.affixes),
    `BLN-09: afixos com bossArch deveriam ser os do sorteio: ${JSON.stringify(tecela.boss.affixes)} x ${JSON.stringify(a.boss.affixes)}`,
  );

  // BLN-09/10: `bossAffix=none` tira os afixos e `finger=1` liga o Portador mesmo na r5 (é debug).
  const bare = (await bossAt('seed=1&bossAffix=none&finger=1')).boss;
  assert(
    JSON.stringify(bare.affixes) === '[]' && bare.finger === true && bare.archetype === a.boss.archetype,
    `BLN-09: bossAffix=none&finger=1: ${JSON.stringify(bare)}`,
  );
}
