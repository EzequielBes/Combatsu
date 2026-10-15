// Save do recorde (SAVE-*, REC-*) em HD no mundo modular. Parte de carga: cada bloco grava a chave à mão, abre a
// página com a sua query e confere `snapshot().record`. Parte de morte: morre sem inimigos (`spawn=0`) e lê a chave. O runner acrescenta `nosave=1` a toda URL sem `nosave=` nem
// `record=`; aqui cada URL diz o que quer. A chave é limpa no começo e no fim para não vazar para outro cenário.
const KEY = 'combatsu.save';
const RECORD = {
  round: 3,
  kills: 12,
  build: { techniques: [{ id: 'azul', level: 2 }], perks: ['executor'], relic: null, weapon: null, vows: [] },
};
const VALID = JSON.stringify({ version: 1, record: RECORD });

export default async function ({ page, baseUrl, assert }) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    // O 404 do favicon não é erro do jogo (mesmo filtro do `hd.smoke`).
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) errors.push(msg.text());
  });

  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&${query}`, { waitUntil: 'load' });
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
    return page.evaluate(() => {
      window.__game.step(20);
      return window.__game.snapshot().record;
    });
  };
  const readKey = () => page.evaluate((k) => localStorage.getItem(k), KEY);
  const writeKey = (value) =>
    page.evaluate((k, v) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)), KEY, value);
  const show = (r) => JSON.stringify({ best: r.best, storage: r.storage, locked: r.locked });
  /** Começa a run sem inimigos (0 abates) e mata o player pela tecla 3; devolve `record` no `gameOver`. */
  const die = async (query) => {
    await open(`spawn=0&${query}`);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let snap = await page.evaluate(() => {
      window.__game.step(300);
      return window.__game.snapshot();
    });
    await page.keyboard.press('Digit3', { delay: 50 });
    for (let i = 0; i < 30 && snap.run.state !== 'gameOver'; i++) {
      snap = await page.evaluate(() => {
        window.__game.step(50);
        return window.__game.snapshot();
      });
    }
    if (snap.run.state !== 'gameOver')
      throw new Error(`o player deveria morrer (${query}): ${JSON.stringify(snap.run)}`);
    return snap.record;
  };

  // A origem precisa estar aberta para mexer no `localStorage`.
  await open('nosave=1');
  await writeKey(null);
  try {
    // Chave válida: o recorde lido, armazenamento local; o marcador nasce escondido na tela de título.
    await writeKey(VALID);
    let r = await open('nosave=0');
    assert(
      JSON.stringify(r.best) === JSON.stringify(RECORD) && r.storage === 'local' && r.locked === false,
      `chave válida deveria carregar o recorde: ${show(r)}`,
    );
    assert(
      r.marker.visible === false && r.panel.visible === false,
      `vistas escondidas no título: ${JSON.stringify(r)}`,
    );

    // SAVE-05: JSON quebrado dá recorde vazio, armazenamento local.
    await writeKey('lixo{');
    r = await open('nosave=0');
    assert(r.best === null && r.storage === 'local' && !r.locked, `SAVE-05: JSON quebrado: ${show(r)}`);

    // REC-07: nosave=1 não lê a chave (válida) e começa sem recorde.
    await writeKey(VALID);
    r = await open('nosave=1');
    assert(r.best === null && r.storage === 'off', `REC-07: nosave=1: ${show(r)}`);
    assert((await readKey()) === VALID, 'REC-07: nosave=1 não pode mexer na chave');

    // REC-08: record=4 começa em r4, 0 abates, build vazia, sem tocar a chave; ganha de nosave=1.
    const r4 = { round: 4, kills: 0, build: { techniques: [], perks: [], relic: null, weapon: null, vows: [] } };
    for (const query of ['record=4', 'record=4&nosave=1']) {
      r = await open(query);
      assert(JSON.stringify(r.best) === JSON.stringify(r4) && r.storage === 'off', `REC-08 (${query}): ${show(r)}`);
      assert((await readKey()) === VALID, `REC-08 (${query}): a chave não pode mudar`);
    }

    // Caso de borda: record= inválido é ignorado e o save carrega como sempre.
    r = await open('record=abc');
    assert(
      JSON.stringify(r.best) === JSON.stringify(RECORD) && r.storage === 'local',
      `record=abc deveria ser ignorado: ${show(r)}`,
    );

    // R no meio da run reinicia a cena e reaproveita o diretor: as vistas nascem de novo (o snapshot as lê sem erro),
    // o recorde em memória continua e a chave não muda.
    await page.keyboard.press('KeyJ', { delay: 50 });
    await page.evaluate(() => window.__game.step(300));
    await page.keyboard.press('KeyR', { delay: 50 });
    const afterR = await page.evaluate(() => {
      window.__game.step(100);
      return window.__game.snapshot();
    });
    // A cena nova volta à tela de título: prova que o R reiniciou de fato.
    assert(afterR.run.state === 'title', `R deveria reiniciar a cena: ${JSON.stringify(afterR.run)}`);
    r = afterR.record;
    assert(JSON.stringify(r.best) === JSON.stringify(RECORD), `R: o recorde deveria continuar: ${show(r)}`);
    assert(r.marker.visible === false && r.panel.visible === false, `R: vistas novas escondidas: ${JSON.stringify(r)}`);
    assert((await readKey()) === VALID, 'R: a chave não pode mudar');

    // REC-01/04, SAVE-02: sem recorde, a morte na r1 vira o recorde com a build daquele instante e grava a chave.
    await writeKey(null);
    const buildQuery = 'tech=azul:2&perks=executor&arsenal=manoplas,manoplas,bastao&vows=semGuarda';
    r = await die(`nosave=0&${buildQuery}`);
    const firstKey = await readKey();
    const expected = {
      version: 1,
      record: {
        round: 1,
        kills: 0,
        build: {
          techniques: [{ id: 'azul', level: 2 }],
          perks: ['executor'],
          relic: { id: 'manoplas', level: 2 },
          weapon: { id: 'bastao', level: 1 },
          vows: ['semGuarda'],
        },
      },
    };
    assert(
      firstKey !== null && JSON.stringify(JSON.parse(firstKey)) === JSON.stringify(expected),
      `REC-01/04: chave gravada na morte: ${firstKey}`,
    );
    assert(r.lastDeathRecord === true, `REC-10: a morte deveria marcar recorde novo: ${JSON.stringify(r)}`);
    assert(r.panel.lines.includes('Recorde!'), `END-10: painel com Recorde!: ${JSON.stringify(r.panel.lines)}`);

    // REC-05: recarregar traz o mesmo recorde.
    r = await open('nosave=0');
    assert(
      JSON.stringify(r.best) === JSON.stringify(expected.record) && r.storage === 'local',
      `REC-05: recarregar deveria trazer o recorde gravado: ${show(r)}`,
    );

    // REC-03: morrer de novo na r1 com 0 abates empata; a chave fica igual byte a byte e o painel mostra o recorde.
    r = await die('nosave=0');
    assert((await readKey()) === firstKey, 'REC-03: empate não pode reescrever a chave');
    assert(r.lastDeathRecord === false, `REC-03: empate não é recorde novo: ${JSON.stringify(r)}`);
    assert(
      r.panel.lines.includes('Recorde: r1') && !r.panel.lines.includes('Recorde!'),
      `END-11: painel com Recorde: r1: ${JSON.stringify(r.panel.lines)}`,
    );

    // REC-09: com `round=3` a morte na r3 seria melhor, mas não grava nem troca o recorde.
    r = await die('nosave=0&round=3');
    assert((await readKey()) === firstKey, 'REC-09: round=3 não pode gravar');
    assert(r.lastDeathRecord === false && r.best.round === 1, `REC-09: round=3 não troca o recorde: ${show(r)}`);

    // REC-06: R no meio da run (sem chave) não grava nada.
    await writeKey(null);
    await open('nosave=0&spawn=0');
    await page.keyboard.press('KeyJ', { delay: 50 });
    await page.evaluate(() => window.__game.step(300));
    await page.keyboard.press('KeyR', { delay: 50 });
    await page.evaluate(() => window.__game.step(100));
    assert((await readKey()) === null, 'REC-06: R durante a run não pode gravar');

    // SAVE-07 na escrita: `setItem` lançando (só nas páginas com `failset=1`) cai para `'memory'`, o painel comemora e
    // o recorde em memória é atualizado.
    await page.evaluateOnNewDocument(() => {
      if (!location.search.includes('failset=1')) return;
      Storage.prototype.setItem = () => {
        throw new Error('armazenamento cheio');
      };
    });
    r = await die('nosave=0&failset=1');
    assert(
      r.storage === 'memory' && r.best?.round === 1 && r.lastDeathRecord === true,
      `SAVE-07: setItem lançando: ${show(r)}`,
    );
    assert(r.panel.lines.includes('Recorde!'), `SAVE-07: painel com Recorde!: ${JSON.stringify(r.panel.lines)}`);
    await open('nosave=1');
    assert((await readKey()) === null, 'SAVE-07: setItem lançando não grava');

    // SAVE-04: save de versão mais nova trava a escrita, começa sem recorde e a chave fica intacta.
    const newer = JSON.stringify({ version: 9, record: RECORD });
    await writeKey(newer);
    r = await open('nosave=0');
    assert(r.best === null && r.storage === 'local' && r.locked === true, `SAVE-04: versão 9: ${show(r)}`);
    assert((await readKey()) === newer, 'SAVE-04: a chave da versão 9 não pode mudar');

    // SAVE-07: `getItem` lançando vira `'memory'`, sem recorde e sem erro no console. Fica por último: o script vale
    // para toda navegação seguinte desta página.
    await writeKey(VALID);
    await page.evaluateOnNewDocument(() => {
      Storage.prototype.getItem = () => {
        throw new Error('armazenamento bloqueado');
      };
    });
    r = await open('nosave=0');
    assert(r.best === null && r.storage === 'memory' && !r.locked, `SAVE-07: getItem lançando: ${show(r)}`);
    assert(errors.length === 0, `console com erro: ${errors.join(' | ')}`);
  } finally {
    await writeKey(null).catch(() => {});
  }
}
