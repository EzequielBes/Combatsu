// Save do recorde (SAVE-*, REC-*) em HD no mundo modular. Parte de carga: cada bloco grava a chave à mão, abre a
// página com a sua query e confere `snapshot().record`. O runner acrescenta `nosave=1` a toda URL sem `nosave=` nem
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
